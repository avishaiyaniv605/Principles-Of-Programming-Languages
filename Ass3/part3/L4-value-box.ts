// ========================================================
// L4-value-box: Value type definition for L4-eval-box
// Changes wrt L4-value:
// 1. refer to env-box in Closure
// 2. introduce void value type

import { append, map } from 'ramda';
import { isError } from './error';
import { isArray, isNumber, isString } from './list';
import { CExp, isPrimOp, PrimOp, VarDecl, unparse } from './L4-ast';
import { Env, BodyId } from './L4-env-box';

// Add void for value of side-effect expressions - set! and define
export type Value = SExp | Closure

export type Functional = PrimOp | Closure;
export const isFunctional = (x: any): x is Functional => isPrimOp(x) || isClosure(x);

// ========================================================
// Closure for L4
export interface Closure {
    tag: "Closure";
    params: VarDecl[];
    body: CExp[];
    env: Env;
    id: BodyId;
};
export const makeClosure = (params: VarDecl[], body: CExp[], env: Env): Closure =>
    ({tag: "Closure", params, body, env,id: ""});
export const isClosure = (x: any): x is Closure => x.tag === "Closure";


// ========================================================
// SExp
export interface CompoundSExp {
    tag: "CompoundSexp";
    val1: SExp;
    val2: SExp;
};
export interface EmptySExp {
    tag: "EmptySExp";
};
export interface SymbolSExp {
    tag: "SymbolSExp";
    val: string;
};

// @@L4-BOX-VALUE
// Add void for value of side-effect expressions - set! and define
export type SExp = undefined | number | boolean | string | PrimOp | Closure | SymbolSExp | EmptySExp | CompoundSExp;
export const isSExp = (x: any): x is SExp =>
    typeof(x) === 'string' || typeof(x) === 'boolean' || typeof(x) === 'number' ||
    isSymbolSExp(x) || isCompoundSExp(x) || isEmptySExp(x) || isPrimOp(x) || isClosure(x);

export const makeCompoundSExp = (val1: SExp, val2: SExp): CompoundSExp =>
    ({tag: "CompoundSexp", val1: val1, val2 : val2});
export const isCompoundSExp = (x: any): x is CompoundSExp => x.tag === "CompoundSexp";

export const makeEmptySExp = (): EmptySExp => ({tag: "EmptySExp"});
export const isEmptySExp = (x: any): x is EmptySExp => x.tag === "EmptySExp";

export const makeSymbolSExp = (val: string): SymbolSExp =>
    ({tag: "SymbolSExp", val: val});
export const isSymbolSExp = (x: any): x is SymbolSExp => x.tag === "SymbolSExp";

// LitSExp are equivalent to JSON - they can be parsed and read as literal values
// like SExp except that non functional values (PrimOp and Closures) can be embedded at any level.
export type LitSExp = number | boolean | string | SymbolSExp | EmptySExp | CompoundSExp;

// Printable form for values
export const closureToString = (c: Closure): string =>
    `<Closure ${c.params} ${map(unparse, c.body)}>`

export const compoundSExpToArray = (cs: CompoundSExp, res: string[]): string[] | { s1: string[], s2: string } =>
    isEmptySExp(cs.val2) ? append(valueToString(cs.val1), res) :
    isCompoundSExp(cs.val2) ? compoundSExpToArray(cs.val2, res.concat([valueToString(cs.val1)])) :
    ({ s1: res.concat([valueToString(cs.val1)]), s2: valueToString(cs.val2)})
 
export const compoundSExpToString = (cs: CompoundSExp, css = compoundSExpToArray(cs, [])): string => 
    isArray(css) ? `(${css.join(' ')})` :
    `(${css.s1.join(' ')} . ${css.s2})`

export const valueToString = (val: Value): string =>
    isNumber(val) ?  val.toString() :
    val === true ? '#t' :
    val === false ? '#f' :
    isString(val) ? `"${val}"` :
    isClosure(val) ? closureToString(val) :
    isPrimOp(val) ? val.op :
    isSymbolSExp(val) ? val.val :
    isEmptySExp(val) ? "'()" :
    isCompoundSExp(val) ? compoundSExpToString(val) :
    "Error: unknown value type "+val 

export const parsedToString = (val: Value | Error): string =>
    isError(val) ? `Error: ${val.message}` :
    valueToString(val)
