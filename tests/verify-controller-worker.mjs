import {Worker} from 'node:worker_threads';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ControllerMechanics} from '../app/controller-mechanics.js';
import {CPUPlayer,operatorView} from '../app/cpu-player.js';
globalThis.Worker=class{
 constructor(url){this.worker=new Worker(new URL('./node-worker-adapter.mjs',import.meta.url),{workerData:{moduleURL:url.href}});this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',e=>this.onerror?.({message:String(e.stack)}));}
 postMessage(value){this.worker.postMessage(value);}terminate(){return this.worker.terminate();}
};
const {loadEngine}=await import('../app/engine.js');
const report={release:'0.8.3',dateUTC:new Date().toISOString(),scope:'Production WorkerEngine/spice-worker, mechanical controls, CPU rallies and low-angle human/reset sequence with actual heap transfers. Offline fixed-time input, not measured browser performance.',tests:[]};
const e=await loadEngine();let s=e.state,seed=44;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const cpu=[new CPUPlayer(0,'gremlin',{random,time:s.time}),new CPUPlayer(1,'fox',{random,time:s.time})],models=[new ControllerMechanics(),new ControllerMechanics()];
let hits=0,steps=0,maxRetries=0,manual=false,resetSent=false,manualSent=false,peak=0;
try{
 while(s.time<30){
  let reset=false;
  if(s.time>=13.9&&!resetSent){reset=true;resetSent=true;manual=true;models.forEach(m=>m.cancelPress());}
  if(manual){models[0].setTarget(.184);models[1].setTarget(.305);if(s.time>=17.2&&!manualSent&&s.can[0]){models[0].pulse();manualSent=true;}}
  else cpu.forEach((c,i)=>{const a=c.update(operatorView(s,i));models[i].setTarget(a.control);if(a.hit)models[i].pulse();});
  models.forEach(m=>m.advance(.005));const pressed=[];
  models.forEach((m,i)=>{for(const edge of m.drainEdges())if(edge==='close'&&s.can[i])pressed.push(i);});
  const before=s.time;({state:s}=await e.stepAcrossWorkers({controls:models.map(m=>m.control),hits:pressed,reset}));
  assert.ok(s.time>before&&s.time-before<.005051);assert.ok(s.beam.every(Number.isFinite));
  if(s.events&1)hits++;maxRetries=Math.max(maxRetries,s.scope.restartRetries||0);peak=Math.max(peak,s.scope.heapBytes);
  e.acceptState(s);e.drainBeams();steps++;
  if(steps%400===0)console.log('CONTROLLER WORKER',s.time.toFixed(2),hits,e.workerRestarts,maxRetries);
 }
 assert.ok(hits>=3&&e.workerRestarts>=2&&manualSent);assert.ok(peak<400*1024*1024);
 report.tests.push({name:'Thirty-second production transfer and controller sequence',passed:true,simulated_s:s.time,hits,workerRestarts:e.workerRestarts,maxRestartRetries:maxRetries,manualServe:manualSent,peakHeapBytes:peak});
}catch(error){report.tests.push({name:'Thirty-second production transfer and controller sequence',passed:false,atTime_s:s.time,error:String(error.stack)});process.exitCode=1;}
finally{e.close();await writeFile(new URL('../app/docs/controller-worker-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
