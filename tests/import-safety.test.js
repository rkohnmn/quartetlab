import test from 'node:test';
import assert from 'node:assert/strict';
import {assertInputSize, assertTableSize, readDelimitedRecords, missingNumber} from '../js/import-safety.js';
test('interactive byte and cell bounds reject large inputs', () => {
  assert.doesNotThrow(()=>assertInputSize(2*1024*1024));
  assert.throws(()=>assertInputSize(2*1024*1024+1), /2 MB/);
  assert.throws(()=>assertInputSize('🙂'.repeat(600000)), /2 MB/);
  assert.throws(()=>assertTableSize(5001,2), /5,000/);
  assert.throws(()=>assertTableSize(3000,40), /100,000/);
});
test('quoted records preserve commas, escaped quotes, BOM and embedded newlines', () => {
  const {records} = readDelimitedRecords('\uFEFFlabel,value\r\n"A, B",2\r\n"A\nB",3\r\n"He said ""yes""",4');
  assert.deepEqual(records, [['label','value'],['A, B','2'],['A\nB','3'],['He said "yes"','4']]);
});
test('malformed quoted records are rejected',()=>{
  assert.throws(()=>readDelimitedRecords('a,b\n"open,2'),/Unclosed/);
  assert.throws(()=>readDelimitedRecords('a,b\n"closed"oops,2'),/Unexpected/);
});
test('missing values are never converted to observed zero',()=>{
  for (const x of [null,undefined,'',' ','NA','null',false,{}]) assert.ok(Number.isNaN(missingNumber(x)));
  assert.equal(missingNumber('0'),0);
  assert.equal(missingNumber('-12.5'),-12.5);
});
import {parseDelimitedText} from '../js/exporters.js';
test('Quartet rejects missing coordinates and partial data before loading',()=>{
  for(const value of ['', 'NA','Infinity']) {
    const result=parseDelimitedText(`x,y\n1,2\n2,4\n3,6\n4,${value}`);
    assert.equal(result.points.length,0);assert.ok(result.errors.length);
  }
});
test('Quartet handles quoted labels and preserves numeric labels as labels',()=>{
  const result=parseDelimitedText('label,x,y\n"A, B",1,2\n"A\nB",2,4\n001,3,6');
  assert.equal(result.errors.length,0);assert.equal(result.points[0].label,'A, B');assert.equal(result.points[1].label,'A\nB');assert.equal(result.points[2].label,'001');assert.equal(result.points[2].x,3);
});
