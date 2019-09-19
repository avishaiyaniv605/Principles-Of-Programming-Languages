import { map, zipWith, concat } from "ramda";
import { CExp, Exp, Binding,AtomicExp, CompoundExp, Parsed, PrimOp, AppExp, LitExp, isCompoundExp, makeNumExp, isExp, LetExp, isBinding, isNumericString, parseL3, parseL3CExp } from "./imp/L3-ast";
import { makeAppExp, makeDefineExp, makeIfExp, makeProcExp, makeProgram, makePrimOp, makeLetExp, makeBinding, makeLitExp } from "./imp/L3-ast";
import { isAppExp, isAtomicExp, isCExp, isDefineExp, isIfExp, isLetExp, isLitExp, isPrimOp, isProcExp, isProgram } from "./imp/L3-ast";
import {isError} from './imp/error';
import { makeEmptySExp, isEmptySExp, isCompoundSExp, makeSymbolSExp, makeCompoundSExp, SExp, CompoundSExp, isSExp, makeClosure, isClosure } from "./imp/L3-value";
import {first, second, rest} from './imp/list';

/*
Purpose: Transfering l3 programs into l30 programs, 
means changing any format of list (Literal Expression or AppExpression) to format of chained cons.
Signature: l3ToL30(exp)
Type: [Parsed => Parsed]
*/
export const l3ToL30 = (exp: Parsed | Error): Parsed | Error =>
   isError(exp) ? exp :
   isExp(exp) ? l3Tol30_Exp(exp) :
   isProgram(exp) ? makeProgram(map(l3Tol30_Exp, exp.exps)) :
   exp;

const l3Tol30_Exp = (exp: Exp): Exp =>
   isCExp(exp) ? l3Tol30_CExp(exp) :
   isDefineExp(exp) ? makeDefineExp(exp.var, l3Tol30_CExp(exp.val)) :
   exp;

const l3Tol30_CExp = (exp: CExp): CExp =>
   isAtomicExp(exp) ? exp :
   isLitExp(exp) ? l3Tol30_LitExp(exp) :
   isIfExp(exp) ? makeIfExp(l3Tol30_CExp(exp.test),
                           l3Tol30_CExp(exp.then),
                           l3Tol30_CExp(exp.alt)) :
   isAppExp(exp) ? l3Tol30_AppExp(exp) :
   isProcExp(exp) ?  makeProcExp(exp.args, map(l3Tol30_CExp, exp.body)) :
   isLetExp(exp) ? makeLetExp(map(l3Tol30_BindingExp, exp.bindings) ,map(l3Tol30_CExp, exp.body)) : 
   exp;

const l3Tol30_BindingExp = (b: Binding): Binding => 
   makeBinding(b.var.var, l3Tol30_CExp(b.val))

const l3Tol30_LitExp = (e: LitExp):  AppExp | LitExp  => 
   isClosure(e) ? makeLitExp (makeClosure(e.params, map(l3Tol30_CExp,e.body))):
      isCompoundSExp(e.val) && isList(e.val) ? 
         isEmptySExp(e.val.val1) ? makeLitExp(makeEmptySExp()):
         isCompoundSExp(e.val.val1) ? 
            makeAppExp(makePrimOp("cons"),[l3Tol30_CExp(makeLitExp(e.val.val1)), l3Tol30_CExp(makeLitExp(e.val.val2))]):
         makeAppExp(makePrimOp("cons"),[makeLitExp(e.val.val1), l3Tol30_CExp(makeLitExp(e.val.val2))]):
   e 
   
const isList = (s:SExp): boolean => {
   return isEmptySExp(s) ? true:
   isCompoundSExp(s) ? isList(s.val2):
   false
}
   
const l3Tol30_AppExp = (exp: AppExp): AppExp | LitExp  =>                      
   isPrimOp(exp.rator) && exp.rator.op === "list" ? handleListOp(exp):
   isPrimOp(exp.rator) && exp.rator.op === "cons" ? handleConsOp(exp):
   isProcExp(exp.rator) ? handleProcOp(exp):
   exp

 const handleListOp = (exp : AppExp): AppExp | LitExp =>
   exp.rands.length === 0 ? makeLitExp(makeEmptySExp()):
         makeAppExp(makePrimOp("cons"),[l3Tol30_CExp(first(exp.rands)), l3Tol30_CExp(makeAppExp(makePrimOp("list"), rest(exp.rands)))])

const handleProcOp = (exp: AppExp): AppExp =>  
   isProcExp(exp.rator) ?
      makeAppExp(makeProcExp(exp.rator.args ,map(l3Tol30_CExp, exp.rator.body)),map(l3Tol30_CExp, exp.rands)):
   exp

const handleConsOp = (exp: AppExp): AppExp =>  
   !isAtomicExp(first(exp.rands)) && !isAtomicExp(second(exp.rands)) ?
   makeAppExp(makePrimOp("cons"),
   [l3Tol30_CExp(first(exp.rands))].concat([l3Tol30_CExp(second(exp.rands))])):

   !isAtomicExp(first(exp.rands)) && isAtomicExp(second(exp.rands)) ?
   makeAppExp(makePrimOp("cons"),
   [l3Tol30_CExp(first(exp.rands))].concat([second(exp.rands)])):

   isAtomicExp(first(exp.rands)) && !isAtomicExp(second(exp.rands)) ?
   makeAppExp(makePrimOp("cons"),
   [first(exp.rands)].concat([l3Tol30_CExp(second(exp.rands))])):

   exp