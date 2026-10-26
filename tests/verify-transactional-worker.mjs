import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {readFile,writeFile} from 'node:fs/promises';
import {JointCircuit} from '../app/joint-circuit.js';
globalThis.Worker=class{
 constructor(url){this.worker=new Worker(new URL('./node-worker-adapter.mjs',import.meta.url),{workerData:{moduleURL:url.href}});this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',e=>this.onerror?.({message:String(e.stack)}));}
 postMessage(value){this.worker.postMessage(value);}terminate(){return this.worker.terminate();}
};
const {loadEngine}=await import('../app/engine.js');
const root=new URL('../app/',import.meta.url);
const [raw,sub,scope,wasm]=await Promise.all(['tennis.cir','display-switch.cir','scope.cir','vendor/spice.wasm'].map(n=>readFile(new URL(n,root),n.endsWith('.cir')?'utf8':undefined)));
const report={dateUTC:new Date().toISOString(),scope:'Real production WASM and worker transport; candidate init rejection is injected using the error captured on the public 0.8.1 page. This is not an exact replay of the lost internal SPICE state.',tests:[]};
let failed=false;
async function test(name,fn){try{const result=await fn();report.tests.push({name,passed:true,...result});console.log('PASS',name,result);}catch(error){failed=true;report.tests.push({name,passed:false,error:String(error.stack)});console.error('FAIL',name,error);}}
await test('Rejected candidates leave live Gear history, clock and beam bit-identical',async()=>{
 const reference=new JointCircuit(raw,sub,scope,{automaticCheckpoints:false});await reference.start(wasm);
 const e=await loadEngine({recycleHeapBytes:16*1024*1024});const request=e.request.bind(e);
 let rejectCandidates=true,rejections=0;
 e.request=async(type,input,worker)=>{
  if(type==='init'&&input?.restore&&rejectCandidates){rejections++;throw Error('Timestep too small; initial timepoint: trouble with dclamp-instance d.xu1.dpositive');}
  return request(type,input,worker);
 };
 let s=e.state,acceptedSamples=0;
 try{
  for(let k=0;k<45;k++){
   const input={controls:[.184,.305],hits:k===0?[0]:[],reset:false};
   const expected=await reference.step(input),{state:actual}=await e.stepAcrossWorkers(input);
   for(const key of ['time','x','y','vx','vy','mode','relay','eligible','sequence'])assert.equal(actual[key],expected[key],key);
   for(const key of ['nodes','currents','precharge','coilCurrents','controls','beam'])assert.deepEqual(actual[key],expected[key],key);
   s=actual;e.acceptState(actual);e.drainBeams();acceptedSamples++;
  }
  assert.ok(rejections>=2);assert.equal(e.deferredRestarts,rejections);assert.equal(e.workerRestarts,0);assert.equal(e.error,null);
  rejectCandidates=false;
  const previous=s.time;
  for(let k=0;k<25&&e.workerRestarts===0;k++)({state:s}=await e.stepAcrossWorkers({controls:[.184,.305]}));
  assert.equal(e.workerRestarts,1);assert.ok(s.time>previous&&s.time-previous<.13);assert.ok(s.beam.every(Number.isFinite));
  return {bitIdenticalSamples:acceptedSamples,rejectedCandidates:rejections,recoveredWorkerRestarts:e.workerRestarts,finalTime_s:s.time};
 }finally{e.close();}
});
await test('Unrelated candidate errors remain fatal instead of being silently deferred',async()=>{
 const e=await loadEngine({recycleHeapBytes:16*1024*1024}),request=e.request.bind(e);
 e.request=async(type,input,worker)=>{if(type==='init'&&input?.restore)throw Error('tennis.cir: HTTP 404');return request(type,input,worker);};
 try{await assert.rejects(e.stepAcrossWorkers({}),/HTTP 404/);assert.equal(e.deferredRestarts,0);assert.equal(e.workerRestarts,0);return {deferredRestarts:0};}
 finally{e.close();}
});
await writeFile(new URL('../app/docs/transactional-worker-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
process.exit(failed?1:0);
