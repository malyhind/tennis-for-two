import {Worker} from 'node:worker_threads';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CPUPlayer,operatorView} from '../app/cpu-player.js';
globalThis.Worker=class{
 constructor(url){this.worker=new Worker(new URL('./node-worker-adapter.mjs',import.meta.url),{workerData:{moduleURL:url.href}});this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',e=>this.onerror?.({message:String(e.stack)}));}
 postMessage(value){this.worker.postMessage(value);}terminate(){return this.worker.terminate();}
};
const {loadEngine}=await import('../app/engine.js');
const report={date:new Date().toISOString(),transport:'Real Node worker_threads adapter around the production browser WorkerEngine and spice-worker; browser fetching replaced by local files only.',tests:[]};
async function test(name,fn){try{const result=await fn();report.tests.push({name,passed:true,...result});console.log('PASS',name,result);}catch(error){report.tests.push({name,passed:false,error:String(error.stack)});console.error('FAIL',name,error);}await writeFile(new URL('../app/docs/worker-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
await test('Fresh workers resume the same electrical state without warm-up or time reset',async()=>{
 const e=await loadEngine({recycleHeapBytes:16*1024*1024});let state=e.state,previous=state.time,peakHeap=0;
 try{
  for(let k=0;k<8;k++){
   const {state:s}=await e.stepAcrossWorkers({controls:[.65,.65]});
   assert.ok(s.time>previous&&s.time-previous<.005051);assert.ok(Math.abs(s.x-state.x)<.005);assert.ok(s.beam[0]>=previous-1e-9);
   peakHeap=Math.max(peakHeap,s.scope.heapBytes);previous=s.time;state=s;e.acceptState(s);e.drainBeams();
  }
  assert.ok(e.workerRestarts>=4);return {workerRestarts:e.workerRestarts,simulated_s:state.time,peakHeapBytes:peakHeap,forcedHeapBoundBytes:16*1024*1024};
 }finally{e.close();}
});
await test('CPU match and operator pulses survive production heap recycling',async()=>{
 const e=await loadEngine();let s=e.state,seed=44;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const cpu=[new CPUPlayer(0,'gremlin',{random,time:s.time}),new CPUPlayer(1,'fox',{random,time:s.time})];
 const duration=Number(process.env.WORKER_SOAK_SECONDS||12);let hits=0,peakHeap=0,steps=0;
 try{
  while(s.time<duration){
   const actions=cpu.map((c,i)=>c.update(operatorView(s,i))),before=s.time;
   const result=await e.stepAcrossWorkers({controls:actions.map(a=>a.control),hits:actions.flatMap((a,i)=>a.hit?[i]:[])});s=result.state;
   assert.ok(s.time>before&&s.time-before<.005051);assert.ok(s.beam.every(Number.isFinite));
   if(s.events&1)hits++;peakHeap=Math.max(peakHeap,s.scope.heapBytes);e.acceptState(s);e.drainBeams();steps++;
   if(steps%200===0)console.log('WORKER SOAK',s.time.toFixed(2),hits,e.workerRestarts,peakHeap);
  }
  assert.ok(hits>=3);assert.ok(peakHeap<400*1024*1024);assert.ok(e.workerRestarts>=1);
  return {simulated_s:s.time,steps,hits,workerRestarts:e.workerRestarts,peakHeapBytes:peakHeap,productionHeapBoundBytes:240*1024*1024,targetHardwareMeasured:false};
 }finally{e.close();}
});
process.exit(report.tests.some(t=>!t.passed)?1:0);
