// Offline recording of the unchanged production electrical/CPU/mechanical model.
import {Worker} from 'node:worker_threads';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {ControllerMechanics} from '../app/controller-mechanics.js';
import {CPUPlayer,operatorView} from '../app/cpu-player.js';
import {encodeBeam,decodeBeam} from '../app/demo-codec.js';
globalThis.Worker=class{
 constructor(url){this.worker=new Worker(new URL('../tests/node-worker-adapter.mjs',import.meta.url),{workerData:{moduleURL:url.href}});this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',e=>this.onerror?.({message:String(e.stack)}));}
 postMessage(value){this.worker.postMessage(value);}terminate(){return this.worker.terminate();}
};
const {loadEngine}=await import('../app/engine.js');
const targetDuration=Number(process.env.DEMO_SECONDS||30),warmup=1,seedInitial=44;
let duration=0,closing=false,finalReturn=false,parked=false,settledAt=null,naturalEndTime=null,closingResetTime=null,closingResetHeight=null;
if(!Number.isFinite(targetDuration)||targetDuration<2||targetDuration>60)throw Error('DEMO_SECONDS must be between 2 and 60');
const output=resolve(process.env.DEMO_OUTPUT||new URL('../app/demo/',import.meta.url).pathname);
await mkdir(output,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
let seed=seedInitial;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const e=await loadEngine(),models=[new ControllerMechanics({control:.1}),new ControllerMechanics({control:.1})];
const chunks=[],frames=[];let rows=0,s=e.state,start=null,steps=0,hits=0;
const mechanical=()=>models.map(m=>({control:m.control,angle:m.angle,depth:m.depth,closed:m.closed}));
const frame=(state,t)=>{const {beam,scope,...values}=state;return {t,state:{...values,time:t},mechanics:mechanical()};};
try{
 while(s.time<warmup){models.forEach(m=>{m.setTarget(.65);m.advance(.005);m.drainEdges();});({state:s}=await e.stepAcrossWorkers({controls:models.map(m=>m.control)}));e.acceptState(s);e.drainBeams();}
 start=s.time;frames.push(frame(s,0));
 const first=s.beam.slice(-4);first[0]=0;chunks.push(first);rows++;
 const cpu=[new CPUPlayer(0,'gremlin',{random,time:s.time}),new CPUPlayer(1,'fox',{random,time:s.time})];
 while(true){
  const elapsed=s.time-start;let reset=false;
  if(elapsed>targetDuration+60)throw Error('Unable to finish the rally naturally within the closing window');
  if(!closing&&elapsed>=targetDuration){closing=true;models.forEach(m=>m.cancelPress());}
  // An ordinary reset is allowed only after the ball has left the bottom
  // of the calibrated CRT aperture. No visible mid-air jump is introduced.
  if(closing&&closingResetTime===null&&s.mode===1&&s.y<=-40){reset=true;closingResetTime=elapsed;closingResetHeight=s.y;finalReturn=true;models.forEach(m=>m.cancelPress());}
  if(!closing){
   cpu.forEach((c,i)=>{const a=c.update(operatorView(s,i));models[i].setTarget(a.control);if(a.hit)models[i].pulse();});
  }else if(s.mode===0&&s.server===0){
   if(naturalEndTime===null){naturalEndTime=elapsed;models.forEach(m=>m.cancelPress());}
   // Approach the same initial knob positions from the same side. All motion
   // still goes through the unchanged controller mechanics, never interpolation.
   if(!parked){models.forEach(m=>m.setTarget(.1));if(models.every(m=>Math.abs(m.control-.1)<.003))parked=true;}
   else models.forEach(m=>m.setTarget(.65));
   const ready=parked&&models.every((m,i)=>Math.abs(m.control-frames[0].mechanics[i].control)<.0001&&!m.closed);
   if(ready&&settledAt===null)settledAt=elapsed;
   if(ready&&elapsed-settledAt>=.3){duration=elapsed;break;}
  }else{
   // Finish with an ordinary low return from the right, then let the ball
   // leave on the left. A right-side serve is also a valid ordinary return.
   models.forEach(m=>m.setTarget(.0));
   if(!finalReturn||(s.mode===0&&s.server===1)){
    for(let i=0;i<2;i++){
     const nearEdge=i?s.x>62:s.x< -62;
     const ordinaryServe=s.mode===0&&s.server===i;
     if(s.can[i]&&models[i].control<.01&&(nearEdge||ordinaryServe)){
      models[i].pulse();
      // Use several late, low returns to lower the visible ball before the
      // final left-side exit; only ordinary controls enter the circuit.
      if(i===1&&s.y<40)finalReturn=true;
     }
    }
   }
  }
  models.forEach(m=>m.advance(.005));const pressed=[];
  models.forEach((m,i)=>{for(const edge of m.drainEdges())if(edge==='close'&&s.can[i])pressed.push(i);});
  ({state:s}=await e.stepAcrossWorkers({controls:models.map(m=>m.control),hits:pressed,reset}));
  if(s.events&1)hits++;
  let count=0;const packet=s.beam.slice();
  for(let k=0;k<packet.length;k+=4){packet[k]-=start;if(packet[k]<0)throw Error('Backward recording');count+=4;}
  if(count){chunks.push(packet.subarray(0,count));rows+=count/4;}
  frames.push(frame(s,s.time-start));
  e.acceptState(s);e.drainBeams();steps++;
  if(steps%400===0){const progress={elapsed_s:s.time-start,targetDuration_s:targetDuration,closing,ball:[s.x,s.y],playing:s.mode,server:s.server,naturalEndTime_s:naturalEndTime,rows,hits,handoffs:e.workerRestarts};console.log('RECORD',JSON.stringify(progress));await writeFile(output+'/progress.json',JSON.stringify(progress));}
 }
 const all=new Float64Array(rows*4);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
 // Select an actual accepted scan point during the settled serve state.
 // Match beam position and scan direction across the wrap without synthesizing
 // or cross-fading any beam samples.
 const initialBeam=all.subarray(0,4),dx0=all[5]-initialBeam[1],dy0=all[6]-initialBeam[2];let cut=all.length/4-1,best=Infinity;
 for(let k=4;k<all.length;k+=4)if(all[k]>duration-.12){
  const dx=all[k+1]-all[k-3],dy=all[k+2]-all[k-2];
  if(dx*dx0+dy*dy0<0)continue;
  const score=(all[k+1]-initialBeam[1])**2+(all[k+2]-initialBeam[2])**2;
  if(score<best){best=score;cut=k/4;}
 }
 duration=all[cut*4];const trace=all.slice(0,cut*4);rows=trace.length/4;
 while(frames.at(-1).t>=duration)frames.pop();
 const lastFlight=frames.findLast(f=>f.state.mode===1);
 if(lastFlight&&lastFlight.state.y>45)throw Error('Closing rally still ends high; recording rejected');
 const encoded=encodeBeam(trace),packed=gzipSync(encoded,{level:9});
 const decoded=decodeBeam(gunzipSync(packed));
 if(!Buffer.from(decoded.buffer).equals(Buffer.from(trace.buffer)))throw Error('Lossless recording check failed');
 const frameBytes=Buffer.from(JSON.stringify({format:'tft-demo-frames-1',frames}));
 await writeFile(output+'/beam.bin.gz',packed);await writeFile(output+'/frames.json.gz',gzipSync(frameBytes,{level:9}));
 const files={};for(const n of ['joint-circuit.js','engine.js','spice-worker.js','tennis.cir','display-switch.cir','scope.cir','vendor/spice.wasm','controller-mechanics.js','cpu-player.js'])files[n]=hash(await readFile(new URL('../app/'+n,import.meta.url)));
 const manifest={format:'tft-demo-1',duration_s:duration,playbackRate:1,defaultEnabled:false,source:'ngspice 45.2 / production joint transient / IEEE-754 f64',seed:seedInitial,warmupBeforeRecording_s:warmup,recordOrigin_s:start,tailReset_s:closingResetTime===null?0:duration-closingResetTime,closingResetTime_s:closingResetTime,closingResetHeight_V:closingResetHeight,closingTarget_s:targetDuration,naturalEndTime_s:naturalEndTime,loopBoundary:"settled left serve after low closing rally; matched accepted beam phase",recordingRevision:5,mechanicsRecorded:true,frames:{url:'frames.json.gz',encoding:'gzip-json-utf8',count:frames.length,rawSHA256:hash(frameBytes),sha256:hash(gzipSync(frameBytes,{level:9})),compressedBytes:gzipSync(frameBytes,{level:9}).byteLength},beam:{url:'beam.bin.gz',encoding:'gzip-byte-plane-f64-le-v1',rows,compressedBytes:packed.byteLength,decodedBytes:trace.byteLength,sha256:hash(packed),rawSHA256:hash(Buffer.from(trace.buffer)),firstTime_s:trace[0],lastTime_s:trace.at(-4)},solver:{maxStep_s:50e-6,reltol:1e-4},hits,workerHandoffs:e.workerRestarts,deferredHandoffs:e.deferredRestarts,sourceSHA256:files,seam:{startBall:[frames[0].state.x,frames[0].state.y],endBall:[frames.at(-1).state.x,frames.at(-1).state.y],controlDelta:frames.at(-1).mechanics.map((m,i)=>m.control-frames[0].mechanics[i].control),beamPhaseError_V:Math.sqrt(best),beamPathBreak:true,phosphorReset:false},createdUTC:new Date().toISOString()};
 await writeFile(output+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');await unlink(output+'/progress.json').catch(()=>{});console.log('RECORDED',JSON.stringify(manifest));
}finally{e.close();}
