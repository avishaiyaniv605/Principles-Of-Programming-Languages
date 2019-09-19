// L5-typecheck
import { strict as assert } from 'assert';
import { checkCompatibleTypes } from './L5-typecheck';
import { makeBoolTExp, makeNumTExp, makeProcTExp, makeTVar, makeVoidTExp, parseTE, unparseTExp, makeUnionTExp, makeStrTExp } from './TExp';


// --------------- pos tests :
// atomic:
// both same atomic
assert.deepEqual(checkCompatibleTypes(makeBoolTExp(), makeBoolTExp()),   true);     // both atomic
// union which includes an atomic
assert.deepEqual(checkCompatibleTypes(makeBoolTExp(), makeUnionTExp([makeBoolTExp(),makeNumTExp()])),   true);

// union:
// union and union which are equal
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp()]), makeUnionTExp([makeBoolTExp(),makeNumTExp()])),   true);
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp()]), makeUnionTExp([makeNumTExp(),makeBoolTExp()])),   true);
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp(),makeNumTExp(),makeNumTExp()]), makeUnionTExp([makeNumTExp(),makeBoolTExp()])),   true);
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeUnionTExp([makeNumTExp()]),makeBoolTExp(),makeNumTExp(),makeNumTExp(),makeNumTExp()]), 
    makeUnionTExp([makeNumTExp(),makeBoolTExp(),makeUnionTExp([makeNumTExp(),makeUnionTExp([makeNumTExp()])])])),   true);
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeUnionTExp([makeBoolTExp()]),makeNumTExp(),makeBoolTExp(),makeBoolTExp(),makeBoolTExp()]), 
    makeUnionTExp([makeNumTExp(),makeBoolTExp(),makeUnionTExp([makeUnionTExp([makeBoolTExp()]),makeNumTExp(),makeUnionTExp([makeNumTExp()])])])),   true);
assert.deepEqual(checkCompatibleTypes(parseTE("((number | boolean) -> boolean)"), 
    makeProcTExp([makeUnionTExp([makeBoolTExp(),makeNumTExp()])],makeBoolTExp())),true);
assert.deepEqual(checkCompatibleTypes(parseTE("((number | boolean | (boolean | number)) -> boolean)"), 
    makeProcTExp([makeUnionTExp([makeBoolTExp(),makeNumTExp()])],makeBoolTExp())),true);
assert.deepEqual(checkCompatibleTypes(parseTE("((number | (boolean) | (boolean | number)) -> boolean)"), 
    makeProcTExp([makeUnionTExp([makeBoolTExp(),makeNumTExp()])],makeBoolTExp())),true);

// proc:
// proc and proc
assert.deepEqual(checkCompatibleTypes(makeBoolTExp(), makeBoolTExp()),   true);
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp(),makeBoolTExp(), makeUnionTExp([makeStrTExp(),makeNumTExp()])],makeBoolTExp()) ,
                 makeProcTExp([makeNumTExp(),makeBoolTExp(),makeStrTExp()],makeBoolTExp())),   true);
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp(),makeBoolTExp(), makeUnionTExp([makeStrTExp(),makeNumTExp()])], makeNumTExp()) ,
                 makeProcTExp([makeNumTExp(),makeBoolTExp(),makeStrTExp()],makeUnionTExp([makeBoolTExp(),makeNumTExp()]))),   true);


// --------------- neg tests :
// atomic:
// different atomics
assert.deepEqual(checkCompatibleTypes(makeBoolTExp(), makeNumTExp()),    false);    
// union which doesnt include an atomic
assert.deepEqual(checkCompatibleTypes(makeBoolTExp(), makeUnionTExp([makeStrTExp(),makeNumTExp()])),    false); 
// atomic and proc
assert.deepEqual(checkCompatibleTypes(makeBoolTExp(), makeProcTExp([makeBoolTExp(),makeBoolTExp()],makeBoolTExp())),   false);

// union:
// union and atomic
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp()]), makeNumTExp()),    false);
// union and union which differ in types
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeNumTExp()]), makeUnionTExp([makeStrTExp()])),    false);
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeUnionTExp([makeBoolTExp()]),makeBoolTExp(),makeBoolTExp(),makeBoolTExp(),makeBoolTExp()]), 
    makeUnionTExp([makeNumTExp(),makeBoolTExp(),makeUnionTExp([makeNumTExp(),makeUnionTExp([makeNumTExp()])])])),   false);
// union and proc
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeUnionTExp([makeBoolTExp()]),makeBoolTExp(),makeBoolTExp(),makeBoolTExp(),makeBoolTExp()]), 
    makeProcTExp([makeNumTExp(),makeBoolTExp()],makeBoolTExp())),   false);


// proc:
// proc and atomic
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp(),makeBoolTExp()],makeBoolTExp()),makeUnionTExp([makeNumTExp()])),    false);
// proc and union
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp(),makeBoolTExp()],makeBoolTExp()),makeNumTExp()),    false);
// proc and proc
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp(),makeBoolTExp(),makeStrTExp()],makeBoolTExp()) ,
                 makeProcTExp([makeNumTExp(),makeBoolTExp()],makeBoolTExp())),   false);
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp(),makeBoolTExp(),makeStrTExp(), makeUnionTExp([makeStrTExp(),makeNumTExp()])],makeBoolTExp()) ,
                 makeProcTExp([makeNumTExp(),makeBoolTExp()],makeBoolTExp())),   false);
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp(),makeBoolTExp(), makeUnionTExp([makeStrTExp(),makeNumTExp()])],makeBoolTExp()) ,
                 makeProcTExp([makeNumTExp(),makeBoolTExp(),makeStrTExp()],makeNumTExp())),   false);
