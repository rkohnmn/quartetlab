import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDatasetDiagnostics, studentTTwoSidedPValue } from '../js/math-engine.js';
import { exportToCSV, exportToRScript, exportToPythonScript, exportToTI84Command, encodeStateToHash, decodeStateFromHash } from '../js/exporters.js';

const linear = [1,2,3,4,5].map((x, idx) => ({ id: `p${idx}`, x, y: 2*x+1 }));
const diag = () => computeDatasetDiagnostics(linear);
const meta = {title:'Shared dataset', xLabel:'X', yLabel:'Y', xUnit:'seconds', yUnit:'points'};

test('rejects nonfinite and singular coordinate datasets', () => {
  assert.equal(computeDatasetDiagnostics([{x:1,y:1},{x:1,y:2},{x:1,y:3}]).valid, false);
  assert.equal(computeDatasetDiagnostics([{x:1,y:2},{x:2,y:2},{x:3,y:2}]).valid, false);
  assert.equal(computeDatasetDiagnostics([{x:1,y:2},{x:2,y:Infinity},{x:3,y:4}]).valid, false);
  assert.equal(computeDatasetDiagnostics([{x:1,y:2},{x:2,y:NaN},{x:3,y:4}]).valid, false);
});

test('perfect slope does not report t=0 and p=1', () => {
  const d=diag();
  assert.equal(d.valid, true);
  assert.equal(d.pSlope, 0);
  assert.ok(d.tSlope === Infinity || d.tSlope > 1e9);
  assert.equal(studentTTwoSidedPValue(Infinity, 3), 0);
});

test('small but nonzero numerical scales retain nonzero slope', () => {
  const d=computeDatasetDiagnostics([1,2,3,4].map(x=>({x:x*1e-8,y:0.5+x*1e-7})));
  assert.equal(d.valid, true);
  assert.ok(Math.abs(d.slope-10)<0.01);
});

test('CSV neutralizes formula-like labels but leaves negative numeric coordinates numeric', () => {
  const d=diag();
  d.points[0].label='=HYPERLINK("https://example.com","open")';
  d.points[1].x=-123.5;
  const csv=exportToCSV({ ...meta, xLabel:'@SUM(1,2)' },d);
  assert.match(csv.split('\n')[0], /^obs_id,label,"'@SUM/);
  assert.match(csv.split('\n')[1], /'=?=HYPERLINK/);
  assert.match(csv.split('\n')[2], /,-123\.5000,/);
});

test('R plot labels escape quotations, backslashes and newline injection', () => {
  const malicious='X"); system("do_not_execute"); #\nstop("x")';
  const output=exportToRScript({ ...meta, xLabel:malicious },diag());
  const lines=output.split('\n');
  const labelLine=lines.find(x=>x.includes('xlab ='));
  assert.ok(labelLine);
  assert.ok(labelLine.includes('\\"'));
  assert.ok(labelLine.includes('\\n'));
  assert.ok(!lines.some(x=>x.startsWith('stop("x")')));
});

test('script comment titles cannot inject standalone statements', () => {
  const title='ok\nmessage("do_not_execute")';
  const r=exportToRScript({...meta,title},diag());
  const py=exportToPythonScript({...meta,title},diag());
  const ti=exportToTI84Command({...meta,title},diag());
  assert.ok(r.split('\n')[0].includes('ok message'));
  assert.ok(py.split('\n')[0].includes('ok message'));
  assert.ok(ti.split('\n')[0].includes('ok message'));
  assert.ok(!r.split('\n').some(s=>s.startsWith('message("do_not_execute")')));
});

test('share links reject malformed coordinates and oversize payloads', () => {
  const invalid={v:1,t:'x',pts:[[1,2,'a'],[2,3,'b'],[null,4,'c']]};
  assert.equal(decodeStateFromHash('state='+Buffer.from(JSON.stringify(invalid)).toString('base64url')),null);
  const huge={...meta,points:Array.from({length:500},(_,i)=>({x:i,y:2*i,label:`observation-${i}`}))};
  assert.throws(()=>encodeStateToHash(huge),/too large/i);
});

test('short finite share links preserve full coordinate precision', () => {
  const source={...meta,points:linear.map((p,i)=>i===0?{...p,x:0.123456789123456}:p)};
  const hash=encodeStateToHash(source);
  const decoded=decodeStateFromHash(hash);
  assert.ok(decoded);
  assert.deepEqual(decoded.points.map(p=>[p.x,p.y]),linear.map(p=>[p.x,p.y]));
});
