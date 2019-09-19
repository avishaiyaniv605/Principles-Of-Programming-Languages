import { Graph } from "graphlib";
import dot = require("graphlib-dot");
import { length, map, range, zipWith } from "ramda";
import {
    AtomicExp, Exp, IfExp, Parsed, VarDecl, isAtomicExp, DefineExp, AppExp, ProcExp,
    isAppExp, isDefineExp, isExp, isIfExp, isProcExp, parse, unparse, isProgram, CExp, isCExp, isLitExp, isLetExp, isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef, makeProgram, LetExp, Binding, LitExp } from "./L4-ast";
import { safeF2, safeFL, safeF, isError } from "./error";
import { isNumber, isBoolean, isString } from "./list";
import { isClosure, isSymbolSExp, isEmptySExp, isCompoundSExp, SExp, CompoundSExp, Closure } from "./L4-value";

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

interface Tree {
    tag: "Tree",
    rootId: string,
    graph: Graph, 
}

export const isTree = (x: any): x is Tree => x.tag === "Tree";

const makeLeaf = (label: string): Tree => {
    let graph = new Graph();
    const headId = generateId();
    if (label == "<")
        label = "\\<";
    else if (label == ">")
        label = "\\>";
    graph.setNode(headId, { label, shape: "record" });
    return { tag: "Tree", rootId: headId, graph };
}


const makeTree = (label: string, nodes: Tree[], edgesLabels: string[]): Tree => {
    let graph = new Graph();
    const headId = generateId();
    graph.setNode(headId, { label, shape: "record" });
    zipWith(
        (t, edgeLabel) => {
            map(n => graph.setNode(n, t.graph.node(n)), t.graph.nodes());
            map(e => graph.setEdge(e.v, e.w, t.graph.edge(e)), t.graph.edges());
            graph.setEdge(headId, t.rootId, {label: edgeLabel});
        },
        nodes,
        edgesLabels
    )
    return { tag: "Tree", rootId: headId, graph };
}

const astToDot = (ast: Tree): string => dot.write(ast.graph);

const expToTree = (exp: string) =>
    safeF(astToDot)(safeF(makeAST)(parse(exp)));


export const makeAST = (exp: Parsed): Tree | Error => {
    if (isProgram(exp)) 
        return makeTree(exp.tag,[makeTree(":",map(makeAST,exp.exps),exp.exps.map((curr,index)=> ""+index))],["exps"]) 
    else if (isDefineExp(exp)) {
        let ans : Tree | Error = makeCExpTree(exp.val);
        if (isError (ans)) 
            return ans 
        else
            return makeTree(exp.tag,[makeTree(exp.var.tag,[makeLeaf(exp.var.var)],["var"]),ans],["var","val"])
    } 
    else if (isCExp(exp)) 
        return makeCExpTree(exp) 
    else 
        return Error(`Parse: Unexpected type ${exp}`);
}

export const makeCExpTree = (exp: CExp): Tree | Error => 
    isAppExp (exp) ? handleAppExp(exp):
    isLitExp(exp) ?  handleLitExp(exp):
    isIfExp(exp) ?  handleIfExp(exp):
    isProcExp(exp) ? handleProcExp(exp):
    isLetExp(exp) ? handleLetExp(exp):
    isAtomicExp(exp) ? makeAtomicLeaf(exp) :
    Error(`Parse: Unexpected type ${exp}`);

export const handleAppExp = (exp: AppExp): Tree | Error => {
    let ans : Tree | Error = makeAST(exp.rator);
    if(isTree(ans)){
       return makeTree(exp.tag, [ans, makeTree(":", map(makeAST,exp.rands), exp.rands.map((curr,index)=> ""+index))],["rator","rands"])
    }
    return ans;
}

export const handleLitExp = (exp: LitExp): Tree | Error =>  {
    let ans : Tree | Error = handleSexp(exp.val);
    if (isError (ans)) 
        return ans 
    return makeTree(exp.tag, [ans], ["val"])
}

export const handleSexp = (exp: SExp): Tree | Error =>  
    isNumber(exp) || isString(exp) ? makeLeaf("" + exp) : 
    isBoolean(exp) && exp ? makeLeaf("#t"):
    isBoolean(exp) && !exp ? makeLeaf("#f"):
    isPrimOp(exp) ? makeTree(exp.tag,[makeLeaf(exp.op)], ["val"]) :
    isClosure(exp) ? handleClosure(exp) : 
    isSymbolSExp(exp) ? makeTree(exp.tag,[makeLeaf(exp.val)], ["val"]):
    isEmptySExp(exp) ? makeLeaf(exp.tag) :
    isCompoundSExp(exp) ? handleCompound(exp):
    Error(`Parse: Unexpected type ${exp}`);

export const handleClosure = (exp: Closure): Tree | Error =>  {
        let params : Tree | Error = makeTree(":",exp.params.map(x=> makeTree(x.tag,[makeLeaf(x.var)],["var"])),exp.params.map((curr,index)=> ""+index)),
         body : Tree | Error = makeTree(":",map(makeCExpTree,exp.body),exp.params.map((curr,index)=> ""+index));
        //  env : Tree | Error =  ;
        if (isError (params) || isError(body)) 
            return  Error(`Parse: Unexpected type ${exp}`); 
        return makeTree(exp.tag,[params,body], ["params","body"])
    }  

export const handleCompound = (exp: CompoundSExp): Tree | Error =>  {
    let val1 : Tree | Error = handleSexp(exp.val1),
     val2 : Tree | Error = handleSexp(exp.val2);
    if (isError (val1) || isError(val2)) 
        return  Error(`Parse: Unexpected type ${exp}`); 
    return makeTree(exp.tag,[val1,val2], ["val1","val2"])
}
    
export const handleLetExp = (exp: LetExp): Tree | Error =>  
    makeTree(exp.tag, [makeTree(":", map(handleBinding, exp.bindings), exp.bindings.map((curr,index)=> ""+index)), makeTree(":", map(makeCExpTree, exp.body), exp.body.map((curr,index)=> ""+index))],["bindings", "body"])

export const handleBinding = (exp: Binding): Tree | Error => { 
    let ans : Tree | Error = makeCExpTree(exp.val);
    if(isTree(ans)){
        return makeTree(exp.tag, [makeTree(exp.var.tag, [makeLeaf(exp.var.var)], ["var"]), ans],["var", "val"])
    }
    return ans;
}

export const handleIfExp = (exp: IfExp): Tree | Error => {
    let test : Tree | Error = makeCExpTree(exp.test),
        then: Tree | Error = makeCExpTree(exp.then),
        alt: Tree | Error = makeCExpTree(exp.alt);
    if (isError(test) || isError(then) || isError(alt)){
        return Error(`Parse: Unexpected type ${exp}`);
    }
    return makeTree(exp.tag, [test, then, alt], ["test", "then", "alt"]);
}

export const handleProcExp = (exp: ProcExp): Tree | Error => {
    let ans : Tree | Error = makeTree(":", map(makeCExpTree, exp.body),exp.body.map((curr,index)=> ""+index)) ;
    if(isTree(ans)){
        return makeTree(exp.tag, [makeTree(":", map(x => makeTree(x.tag, [makeLeaf(x.var)], ["var"]), exp.args), exp.args.map((curr,index)=> ""+index)), ans], ["args", "body"])
    }
    return ans;

}

export const makeAtomicLeaf = (exp: AtomicExp): Tree | Error => 
    isError(exp) ? exp:
    isNumExp(exp) || isStrExp(exp) ? makeTree(exp.tag,[makeLeaf(""+exp.val)],["val"]) :
    isBoolExp(exp) && exp.val ? makeTree(exp.tag,[makeLeaf("#t")],["val"]):
    isBoolExp(exp) && !exp.val ? makeTree(exp.tag,[makeLeaf("#f")],["val"]):
    isPrimOp(exp) ? makeTree(exp.tag,[makeLeaf(exp.op)],["op"]) :
    isVarRef(exp) ? makeTree(exp.tag,[makeLeaf(exp.var)],["var"]) :
    Error(`Parse: Unexpected type ${exp}`);

// Tests. Please uncomment
// const p1 = "(define x 4)";
// console.log(expToTree(p1));

// const p2 = "(define y (+ x 4))";
// console.log(expToTree(p2));

// const p3 = "(if #t (+ x 4) 6)";
// console.log(expToTree(p3));

// const p4 = "(lambda (x y) x)";
// console.log(expToTree(p4));