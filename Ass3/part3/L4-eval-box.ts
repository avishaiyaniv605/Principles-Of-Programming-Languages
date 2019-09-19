// L4-eval-box.ts
// L4 with mutation (set!) and env-box model
// Direct evaluation of letrec with mutation, define supports mutual recursion.

import { map, reduce, repeat, zipWith } from "ramda";
import { allT, first, rest, isBoolean, isEmpty, isNumber, isString, isArray } from "./list";
import { getErrorMessages, hasNoError, isError , safeF}  from "./error";
import { isBoolExp, isCExp, isLitExp, isNumExp, isPrimOp, isStrExp, isVarRef, isSetExp,
         isAppExp, isDefineExp, isExp, isIfExp, isLetrecExp, isLetExp, isProcExp, isProgram, 
         Binding, PrimOp, VarDecl, CExp, Exp, IfExp, LetrecExp, LetExp, Parsed, ProcExp, Program, SetExp,
         parse, unparse } from "./L4-ast";
import { applyEnv, applyEnvBdg, globalEnvAddBinding, makeExtEnv, setFBinding,
            theGlobalEnv, Env,ExtEnv, persistentEnv, generateBodyId, isGlobalEnv, FBinding, unbox, Box, setBox, makeBox, BodyId, getFBindingVal, Frame, clearGlobal,clearPersistentEnv, bodyIdCounter, envIdCounter} from "./L4-env-box";
import { isEmptySExp, isSymbolSExp, isClosure, isCompoundSExp, makeClosure, makeCompoundSExp, Closure, 
         CompoundSExp, EmptySExp, makeEmptySExp, Value , SExp} from "./L4-value-box";
import { Graph } from "graphlib";
import dot = require("graphlib-dot");

// ========================================================
// Eval functions

const applicativeEval = (exp: CExp | Error, env: Env): Value | Error =>
    isError(exp)  ? exp :
    isNumExp(exp) ? exp.val :
    isBoolExp(exp) ? exp.val :
    isStrExp(exp) ? exp.val :
    isPrimOp(exp) ? exp :
    isVarRef(exp) ? applyEnv(env, exp.var) :
    isLitExp(exp) ? exp.val :
    isIfExp(exp) ? evalIf(exp, env) :
    isProcExp(exp) ? evalProc(exp, env) :
    isLetExp(exp) ? evalLet(exp, env) :
    isLetrecExp(exp) ? evalLetrec(exp, env) :
    isSetExp(exp) ? evalSet(exp, env) :
    isAppExp(exp) ? applyProcedure(applicativeEval(exp.rator, env),
                                   map((rand: CExp) => applicativeEval(rand, env),
                                        exp.rands), env) :
    Error(`Bad L4 AST ${exp}`);

export const isTrueValue = (x: Value | Error): boolean | Error =>
    isError(x) ? x :
    ! (x === false);

const evalIf = (exp: IfExp, env: Env): Value | Error => {
    const test = applicativeEval(exp.test, env);
    return isError(test) ? test :
        isTrueValue(test) ? applicativeEval(exp.then, env) :
        applicativeEval(exp.alt, env);
};

const evalProc = (exp: ProcExp, env: Env): Closure =>{
    const resClosure: Closure = makeClosure(exp.args, exp.body, env);
    const bID = generateBodyId();
    env.closures[bID] = resClosure;
    resClosure.id = bID;
    return resClosure;
}

// @Pre: none of the args is an Error (checked in applyProcedure)
// KEY: This procedure does NOT have an env parameter.
//      Instead we use the env of the closure.
const applyProcedure = (proc: Value | Error, args: Array<Value | Error>, callingEnv: Env): Value | Error =>
    isError(proc) ? proc :
    !hasNoError(args) ? Error(`Bad argument: ${getErrorMessages(args)}`) :
    isPrimOp(proc) ? applyPrimitive(proc, args) :
    isClosure(proc) ? applyClosure(proc, args, callingEnv) :
    Error(`Bad procedure ${JSON.stringify(proc)}`);

const applyClosure = (proc: Closure, args: Value[], callingEnv: Env): Value | Error => {
    let vars = map((v: VarDecl) => v.var, proc.params);
    return evalExps(proc.body, makeExtEnv(vars, args, proc.env, callingEnv));
}

// Evaluate a sequence of expressions (in a program)
export const evalExps = (exps: Exp[], env: Env): Value | Error =>
    isEmpty(exps) ? Error("Empty program") :
    isDefineExp(first(exps)) ? evalDefineExps(first(exps), rest(exps)) :
    evalCExps(first(exps), rest(exps), env);
    
const evalCExps = (exp1: Exp, exps: Exp[], env: Env): Value | Error =>
    isCExp(exp1) && isEmpty(exps) ? applicativeEval(exp1, env) :
    isCExp(exp1) ? (isError(applicativeEval(exp1, env)) ? Error("error") :
                    evalExps(exps, env)) :
    Error("Never");

// Eval a sequence of expressions when the first exp is a Define.
// Compute the rhs of the define, extend the env with the new binding
// then compute the rest of the exps in the new env.
// L4-BOX @@
// define always updates theGlobalEnv
// We also only expect defineExps at the top level.
const evalDefineExps = (def: Exp, exps: Exp[]): Value | Error => {
    if (isDefineExp(def)) {
        let rhs = applicativeEval(def.val, theGlobalEnv);
        if (isError(rhs))
            return rhs;
        else {
            globalEnvAddBinding(def.var.var, rhs);
            return evalExps(exps, theGlobalEnv);
        }
    } else {
        return Error("unexpected " + def);
    }
}

// Main program
// L4-BOX @@ Use GE instead of empty-env
export const evalProgram = (program: Program): Value | Error =>
    evalExps(program.exps, theGlobalEnv);

export const evalParse = (s: string): Value | Error => {
    let ast: Parsed | Error = parse(s);
    if (isProgram(ast)) {
        return evalProgram(ast);
    } else if (isExp(ast)) {
        return evalExps([ast], theGlobalEnv);
    } else {
        return ast;
    }
}

// LET: Direct evaluation rule without syntax expansion
// compute the values, extend the env, eval the body.
const evalLet = (exp: LetExp, env: Env): Value | Error => {
    const vals: Value[] = map((v: CExp) => applicativeEval(v, env), map((b: Binding) => b.val, exp.bindings));
    const vars = map((b: Binding) => b.var.var, exp.bindings);
    if (hasNoError(vals)) {
        return evalExps(exp.body, makeExtEnv(vars, vals, env, env));
    } else {
        return Error(getErrorMessages(vals));
    }
}

// @@ L4-EVAL-BOX 
// LETREC: Direct evaluation rule without syntax expansion
// 1. extend the env with vars initialized to void (temporary value)
// 2. compute the vals in the new extended env
// 3. update the bindings of the vars to the computed vals
// 4. compute body in extended env
const evalLetrec = (exp: LetrecExp, env: Env): Value | Error => {
    const vars = map((b: Binding) => b.var.var, exp.bindings);
    const vals = map((b: Binding) => b.val, exp.bindings);
    const extEnv = makeExtEnv(vars, repeat(undefined, vars.length), env, env);
    // @@ Compute the vals in the extended env
    const cvals = map((v: CExp) => applicativeEval(v, extEnv), vals);
    if (hasNoError(cvals)) {
        // Bind vars in extEnv to the new values
        zipWith((bdg, cval) => setFBinding(bdg, cval), extEnv.frame.fbindings, cvals);
        return evalExps(exp.body, extEnv);
    } else {
        return Error(getErrorMessages(cvals));
    }
};

// L4-eval-box: Handling of mutation with set!
const evalSet = (exp: SetExp, env: Env): Value | Error => {
    const v = exp.var.var;
    const val = applicativeEval(exp.val, env);
    if (isError(val))
        return val;
    else {
        const bdg = applyEnvBdg(env, v);
        if (isError(bdg)) {
            return Error(`Var not found ${v}`)
        } else {
            setFBinding(bdg, val);
            return undefined;
        }
    }
};

// ========================================================
// Primitives

const zero: number = 0;
const one: number = 1;

// @Pre: none of the args is an Error (checked in applyProcedure)
// TODO: Add explicit type checking in all primitives
export const applyPrimitive = (proc: PrimOp, args: Value[]): Value | Error =>
    proc.op === "+" ? (allT(isNumber, args) ? reduce((x: number, y: number) => x + y, zero, args) : Error("+ expects numbers only")) :
    proc.op === "-" ? minusPrim(args) :
    proc.op === "*" ? (allT(isNumber, args) ? reduce((x: number, y: number) => x * y, one, args) : Error("* expects numbers only")) :
    proc.op === "/" ? divPrim(args) :
    proc.op === ">" ? ((allT(isNumber, args) || allT(isString, args)) ? args[0] > args[1] : Error("> expects numbers or strings only")) :
    proc.op === "<" ? ((allT(isNumber, args) || allT(isString, args)) ? args[0] < args[1] : Error("< expects numbers or strings only")) :
    proc.op === "=" ? args[0] === args[1] :
    proc.op === "not" ? ! args[0] :
    proc.op === "and" ? isBoolean(args[0]) && isBoolean(args[1]) && args[0] && args[1] :
    proc.op === "or" ? isBoolean(args[0]) && isBoolean(args[1]) && (args[0] || args[1]) :
    proc.op === "eq?" ? eqPrim(args) :
    proc.op === "string=?" ? args[0] === args[1] :
    proc.op === "cons" ? consPrim(args[0], args[1]) :
    proc.op === "car" ? carPrim(args[0]) :
    proc.op === "cdr" ? cdrPrim(args[0]) :
    proc.op === "list" ? listPrim(args) :
    proc.op === "list?" ? isListPrim(args[0]) :
    proc.op === "pair?" ? isPairPrim(args[0]) :
    proc.op === "number?" ? typeof(args[0]) === 'number' :
    proc.op === "boolean?" ? typeof(args[0]) === 'boolean' :
    proc.op === "symbol?" ? isSymbolSExp(args[0]) :
    proc.op === "string?" ? isString(args[0]) :
    Error("Bad primitive op " + proc.op);

const minusPrim = (args: Value[]): number | Error => {
    // TODO complete
    let x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return x - y;
    } else {
        return Error(`Type error: - expects numbers ${args}`)
    }
}

const divPrim = (args: Value[]): number | Error => {
    // TODO complete
    let x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return x / y;
    } else {
        return Error(`Type error: / expects numbers ${args}`)
    }
}

const eqPrim = (args: Value[]): boolean | Error => {
    let x = args[0], y = args[1];
    if (isSymbolSExp(x) && isSymbolSExp(y)) {
        return x.val === y.val;
    } else if (isEmptySExp(x) && isEmptySExp(y)) {
        return true;
    } else if (isNumber(x) && isNumber(y)) {
        return x === y;
    } else if (isString(x) && isString(y)) {
        return x === y;
    } else if (isBoolean(x) && isBoolean(y)) {
        return x === y;
    } else {
        return false;
    }
}

const carPrim = (v: Value): Value | Error =>
    isCompoundSExp(v) ? v.val1 :
    Error(`Car: param is not compound ${v}`);

const cdrPrim = (v: Value): Value | Error =>
    isCompoundSExp(v) ? v.val2 :
    Error(`Cdr: param is not compound ${v}`);

const consPrim = (v1: Value, v2: Value): CompoundSExp =>
    makeCompoundSExp(v1, v2);

export const listPrim = (vals: Value[]): EmptySExp | CompoundSExp =>
    vals.length === 0 ? makeEmptySExp() :
    makeCompoundSExp(first(vals), listPrim(rest(vals)))

const isListPrim = (v: Value): boolean =>
    isEmptySExp(v) || isCompoundSExp(v);

const isPairPrim = (v: Value): boolean =>
    isCompoundSExp(v);
    
interface Tree {
    tag: "Tree",
    rootId: string,
    graph: Graph, 
}

let bodyFrameCounter: Box<number> = makeBox(0);

const generateEdgeID = (): BodyId => {
    let currentId = unbox(bodyFrameCounter);
    setBox(bodyFrameCounter, currentId + 1);
    return "E" + currentId;
}

const astToDot = (ast: Tree): string => dot.write(ast.graph);

const createExtNode = (resGraph: Graph, env: ExtEnv) : void => {
    if (isGlobalEnv(env)) return createNode(resGraph,env);  
    let envIdExt: string = env.callingEnv.name,
    isDashed: string = envIdExt + '_link',
    shape: string = 'plaintext',
    style: string = 'dashed',
    label: string = envIdExt;
    resGraph.setNode(isDashed, {label, shape});
    resGraph.setEdge(env.name, env.env.name);
    resGraph.setEdge(env.name,isDashed, {style});
    createNode(resGraph,env);     
}

const createEdge = (closID: string, env: ExtEnv, resGraph: Graph): void => {
    let str: string[] = closureStrCreator(env.closures[closID], closID),
    color = str[2],
    shape = str[1],
    label = str[0], 
    nameFun: string = env.bodyCircles[closID];
    resGraph.setNode(closID, { label, shape, color});
    // if(nameFun){
    //     // resGraph.setEdge(env.name, closID, {tailport: nameFun, headport:'0'});
    // }
    // if (!nameFun){
    //     resGraph.setEdge(findEnvName(closID), closID, {tailport: findClosName(closID), headport:'0'});
    // }
    resGraph.setEdge(closID, env.name , {tailport:'0'},generateEdgeID);
}

const findClosName = (closID: string): string => {
    return Object.keys(persistentEnv).reduce((acc: string , curr) => {
        let tmp: Env = persistentEnv[curr];
        if (tmp.bodyCircles[closID]){
            return acc + tmp.bodyCircles[closID];
        }
        return acc+"";
    } , ""); 
}

const findEnvName = (closID: string): string => {
    return Object.keys(persistentEnv).reduce((acc: string , curr) => {
        let tmp: Env = persistentEnv[curr];
        if (tmp.bodyCircles[closID]){
            return acc + tmp.name;
        }
        return acc+"";
    } , ""); 
}

const createNode = (resGraph: Graph, env: ExtEnv) : void => {
    const envStr : envStr = envStrCreator(env);
    let shape: string = envStr.shape,
    label: string = envStr.name;
    resGraph.setNode(env.name, {label, shape});
    return resGraph;     
}

interface envStr {
    tag: "envStr";
    name: string;
    shape: string;
};

const envStrCreator = (env :Env): envStr => {
    let delimiter: string = '\\l',
    shape: string = 'Mrecord',
    bindings: FBinding[],
    currEnvStr: envStr = {tag :"envStr", name: "", shape: ""};

    if(isGlobalEnv(env)){  
        let unboxed: Frame = unbox(env.frame);
        bindings = unboxed.fbindings;
    }
    else{
         bindings = env.frame.fbindings;
    }
    currEnvStr.name = '{' + env.name +bindings.map((x) => {
            const exp: SExp = getFBindingVal(x);
            if(!isClosure(exp))
                return  "|" +  x.var + ':' + x.val.toString();
            else{
                if (env.bodyCircles[exp.id]){
                    env.bodyCircles[exp.id].push(x.var);
                }
                else
                    env.bodyCircles[exp.id] = [x.var];
                return  '|<' + x.var + '>' + x.var + ':';}
    }).join(delimiter) + delimiter + "}";
    currEnvStr.shape = shape;
    return currEnvStr;
}

const closureStrCreator = (exp: Closure, currClosure: string): string[] => {
    let params: string[] = exp.params.map((v) => v.var);
    let paramsStr: string = "p:" + params.join(", ") + "\\l|";
    let body: string[] = exp.body.map((x) => unparse(x));
    let bodyStr: string = currClosure + ": " + body.join(" ") + "\\l|";
    let closureSymb: string = '<0>\u25EF\u25EF\\l|';
    let label: string = '{' + closureSymb + paramsStr + " " + bodyStr + '}';
    let shape: string = 'record';
    let color: string = 'white';
    return [label, shape, color];
}

const createEdges = (resGraph: Graph, env: ExtEnv) : void => {
    const closures: string[] = Object.keys(env.closures);
    if(!isEmpty(closures) && !(closures === undefined))
        closures.map((x) => createEdge(x, env, resGraph));
    
    const bodies:string[] = Object.keys(env.bodyCircles);
    if(!isEmpty(bodies) && !(bodies === undefined))
        bodies.map((x) => {
            env.bodyCircles[x].map((y) =>{
            resGraph.setEdge(env.name, x, {tailport: y, headport:'0'},generateEdgeID())
            }
             )
        });

    return resGraph; 
}

export const drawEnvDiagram = (pEnv: {}): Tree | Error => {
    let resultGraph: Graph = new Graph({ multigraph: true });
    map((x) => createExtNode(resultGraph, pEnv[x]), Object.keys(pEnv)); // draws ext envs graphs
    map((x) => createEdges(resultGraph, pEnv[x]), Object.keys(pEnv)); //draws edges
    const resTree: Tree = {tag: "Tree", rootId: "0" , graph: resultGraph};  // create a tree out of graphs
    return resTree;    
}
export const evalParseDraw = (s: string): Value | Error => {
    clearData();
    persistentEnv["GE"] = theGlobalEnv;
    const ast: Value|Error = evalParse(s);
    const astTree = drawEnvDiagram(persistentEnv);
    if(isError(astTree))
        return astTree; 
    const ans: string|Error = safeF(astToDot)(astTree); 
    console.log(ans);
    return ans;  
}
export const clearData = (): void => {
    clearGlobal();
    clearPersistentEnv();
    setBox(bodyFrameCounter,0);
    setBox(bodyIdCounter,0);
    setBox(envIdCounter,0);
}
// let x = evalParseDraw('(L4 (define z 4) (define foo (lambda (x y) (+ x y))) (foo 4 5))');
// console.log('x');



// let x = evalParseDraw('(L4   (define sq (lambda (x) (* x x)))   (define sum-of-square (lambda (x y) (+ (sq x) (sq y))))  (define f (lambda (a) (sum-of-square (+ a 1) (* a 2))))  (f 5 )  )');
// console.log(x);

  

