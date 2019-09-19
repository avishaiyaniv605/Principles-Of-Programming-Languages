// L5-typecheck
import { strict as assert } from 'assert';
import { L5typeof } from './L5-typecheck';
import { makeBoolTExp, makeNumTExp, makeProcTExp, makeTVar, makeVoidTExp, parseTE, unparseTExp , makeUnionTExp, makeStrTExp, parseTExp} from './TExp';


// Example:
// assert.deepEqual(L5typeof("(number | boolean)"), L5typeof("(boolean | number)"));


//Union
assert.deepEqual(parseTE("((number | boolean) -> void)"), makeProcTExp([makeUnionTExp([makeBoolTExp(), makeNumTExp()])], makeVoidTExp()));
assert.deepEqual(parseTE("((number | boolean | string) -> (number | boolean))"), makeProcTExp([makeUnionTExp([makeBoolTExp(), makeNumTExp(), makeStrTExp()])], makeUnionTExp([makeBoolTExp(), makeNumTExp()])));
assert.deepEqual(parseTE("((number | (boolean | string)) -> (boolean | number))"), makeProcTExp([makeUnionTExp([makeBoolTExp(), makeNumTExp(), makeStrTExp()])], makeUnionTExp([makeBoolTExp(), makeNumTExp()])));
assert.deepEqual(parseTE("(((number | boolean) | string) -> (boolean | number))"), makeProcTExp([makeUnionTExp([makeBoolTExp(), makeNumTExp(), makeStrTExp()])], makeUnionTExp([makeBoolTExp(), makeNumTExp()])));
assert.deepEqual(parseTE("((boolean | boolean) -> boolean)"), makeProcTExp([makeUnionTExp([makeBoolTExp()])], makeBoolTExp()));
assert.deepEqual(parseTE("((boolean | boolean | boolean | boolean | boolean) -> (boolean | number | boolean | number))"), makeProcTExp([makeUnionTExp([makeBoolTExp()])], makeUnionTExp([makeBoolTExp(), makeNumTExp()])));
assert.deepEqual(parseTE("((T1 | T2 | boolean | boolean | boolean) -> (boolean | number | boolean | number))"), makeProcTExp([makeUnionTExp([makeBoolTExp(),makeTVar("T1"),makeTVar("T2")])], makeUnionTExp([makeBoolTExp(), makeNumTExp()])));
assert.deepEqual(parseTE("((T1 | T2 | T1) -> (T1 | T2))"), makeProcTExp([makeUnionTExp([makeTVar("T1"),makeTVar("T2")])], makeUnionTExp([makeTVar("T1"),makeTVar("T2")])));

assert.deepEqual(unparseTExp(makeProcTExp([makeUnionTExp([makeBoolTExp(), makeNumTExp(), makeStrTExp()])], makeUnionTExp([makeBoolTExp(), makeNumTExp()]))), "((boolean | number | string) -> (boolean | number))");
assert.deepEqual(unparseTExp(makeProcTExp([makeNumTExp()], makeProcTExp([makeNumTExp()], makeNumTExp()))), "(number -> (number -> number))");


// if
assert.deepEqual(L5typeof("(if (> 5 0) 5 #t)"), "(boolean | number)");
assert.deepEqual(L5typeof("(if (> 5 0) 5 6)"), "number");
assert.deepEqual(L5typeof("(if (> 5 0) #t #f)"), "boolean");
assert.deepEqual(L5typeof("(if (> 5 0) (lambda (x) x) #f)") , "(boolean | (T_1 -> T_2))");
