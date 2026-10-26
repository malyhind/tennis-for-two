import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {DemoEngine} from '../app/demo-engine.js';
import {encodeBeam,decodeBeam} from '../app/demo-codec.js';
import {CPUPhosphor} from '../app/phosphor-cpu.js';
import {ScopeRenderer} from '../app/scope-renderer.js';
import {CRT} from '../app/beam-model.js';
const report={release:'0.8.5',dateUTC:new Date().toISOString(),scope:'Lossless production recording, absolute-clock replay, loops, pause, path discontinuity and CPU cost. Native M1 and hardware WebGL are separate.',tests:[],metrics:{}};
let failures=0;
async function test(name,fn){try{const result=await fn();report.tests.push({name,passed:true,...result});console.log('PASS',name);}catch(error){failures++;report.tests.push({name,passed:false,error:String(error.stack)});console.error('FAIL',name,error);}}
const hash=x=>createHash('sha256').update(x).digest('hex');
const synthetic=()=>{
 const trace=new Float64Array([0,0,0,25e-6,.25,1,0,25e-6,.5,2,0,25e-6,.75,3,0,25e-6]);
 const frames=[0,.25,.5,.75].map(t=>({t,state:{time:t,x:t,y:20,vx:1,vy:0,mode:1,eligible:0,server:0,reason:0,events:0,relay:1,can:[true,false],nodes:[0,0,0,t],currents:[0,0,0,0],precharge:[0,0,0,0],coilCurrents:[0,0,0],controls:[.65,.65],gravity:60,checkpoints:0},mechanics:[0,1].map(()=>({control:.65,angle:0,depth:0,closed:false}))}));
 return new DemoEngine({format:'tft-demo-1',duration_s:1,beam:{rows:4},solver:{maxStep_s:50e-6}},trace,frames,{presentationHz:20});
};
await test('Binary64 shuffle roundtrip preserves every source bit',()=>{
 const a=new Float64Array([0,-110.123456789,Number.MIN_VALUE,0,.000000001,1.0000000000000002,-0,25e-6]);
 const restored=decodeBeam(encodeBeam(a));assert.deepEqual(new Uint8Array(restored.buffer),new Uint8Array(a.buffer));
 const bad=encodeBeam(a);bad[0]=0;assert.throws(()=>decodeBeam(bad));assert.throws(()=>decodeBeam(encodeBeam(a).subarray(0,50)));
});
await test('Wall-clock tempo is exactly 1x at 30, 60, 144 Hz and irregular delivery',()=>{
 for(const hz of [30,60,144]){const e=synthetic();e.advanceTo(1000);for(let k=1;k<=hz*2;k++){e.advanceTo(1000+k*1000/hz);e.drainBeams();e.drainSamples();}assert.ok(Math.abs(e.elapsed-2)<1e-12);e.close();}
 const e=synthetic();for(const ms of [1000,1011,1038,1120,1500,2000,3017]){e.advanceTo(ms);e.drainBeams();e.drainSamples();}assert.equal(e.elapsed,2.017);assert.equal(e.loop,2);e.close();
});
await test('Pause and reset do not catch up hidden time',()=>{
 const e=synthetic();e.advanceTo(10);e.advanceTo(510);assert.equal(e.elapsed,.5);e.setPaused(true);e.advanceTo(10510);assert.equal(e.elapsed,.5);e.setPaused(false);e.advanceTo(20000);e.advanceTo(21000);assert.equal(e.elapsed,1.5);e.reset();assert.equal(e.elapsed,0);assert.equal(e.loop,0);e.close();
});
await test('Loop timestamps remain monotone and path breaks delimit each wrap',()=>{
 const e=synthetic();e.drainBeams();e.advanceTo(0);e.drainBeams();e.advanceTo(2250);const packets=e.drainBeams();assert.equal(packets.filter(x=>x===null).length,2);let last=-Infinity;
 for(const p of packets)if(p)for(let k=0;k<p.length;k+=4){assert.ok(p[k]>=last);last=p[k];}
 assert.equal(e.loop,2);assert.equal(e.state.time,2.25);assert.equal(e.state.x,.25);assert.equal(e.hit(0),false);e.close();
});
await test('Wrap breaks the beam path while retaining phosphor and simulated time',()=>{
 const p=new CPUPhosphor(64);p.append(new Float64Array([0,-20,0,25e-6,.001,-20,0,25e-6]));const fast=p.fast.slice(),slow=p.slow.slice(),time=p.stream.time;
 const scope={renderer:p,history:[]};ScopeRenderer.prototype.breakBeamPath.call(scope);assert.deepEqual(p.fast,fast);assert.deepEqual(p.slow,slow);assert.equal(p.stream.time,time);
 p.append(new Float64Array([.001001,20,0,25e-6]));let expected=0;for(let k=0;k<fast.length;k++)expected+=fast[k]*Math.exp(-.000001/CRT.fastTau)+slow[k]*Math.exp(-.000001/CRT.slowTau);
 assert.ok(Math.abs(p.energy()-expected)<1e-9);assert.deepEqual(scope.history,[null]);
});
let trace,frames;
const manifest=JSON.parse(await readFile(new URL('../app/demo/manifest.json',import.meta.url),'utf8'));
if(manifest.available!==false){
await test('Bundled recording hashes and all original model files agree',async()=>{
 const base=new URL('../app/demo/',import.meta.url);
 const b=await readFile(new URL(manifest.beam.url,base)),f=await readFile(new URL(manifest.frames.url,base));assert.equal(hash(b),manifest.beam.sha256);assert.equal(hash(f),manifest.frames.sha256);
 trace=decodeBeam(gunzipSync(b));frames=JSON.parse(gunzipSync(f)).frames;
 assert.equal(hash(Buffer.from(trace.buffer)),manifest.beam.rawSHA256);assert.equal(hash(gunzipSync(f)),manifest.frames.rawSHA256);
 for(const [file,digest] of Object.entries(manifest.sourceSHA256))assert.equal(hash(await readFile(new URL('../app/'+file,import.meta.url))),digest,file);
 assert.ok(manifest.duration_s>=(manifest.closingTarget_s||30)&&manifest.duration_s<=120);assert.equal(manifest.defaultEnabled,false);assert.equal(manifest.playbackRate,1);assert.ok(manifest.hits>=3);assert.ok(manifest.seam.startBall.every((x,i)=>Math.abs(x-manifest.seam.endBall[i])<.001));
 const e=new DemoEngine(manifest,trace,frames);e.advanceTo(0);e.drainBeams();e.advanceTo((manifest.duration_s+.5)*1000);assert.ok(Math.abs(e.elapsed-manifest.duration_s-.5)<1e-9);assert.equal(e.loop,1);assert.ok(e.drainBeams().some(x=>x===null));e.close();
 report.metrics.recording={duration_s:manifest.duration_s,hits:manifest.hits,rows:manifest.beam.rows,compressedBytes:b.byteLength+f.byteLength,lossless:true,loopGap_s:manifest.duration_s-trace.at(-4)};
});
await test('Recorded beam is presented with live CPU optics within a measured budget',()=>{
 const p=new CPUPhosphor(128),limit=.6;let begin=0,packets=0;const start=performance.now();
 for(let k=4;k<trace.length&&trace[k]<limit;k+=4)if(trace[k]-trace[begin]>=.05){p.append(trace.subarray(begin,k));p.image();begin=k;packets++;}
 const wall_ms=performance.now()-start;assert.ok(p.energy()>0);assert.ok(p.image().some((x,i)=>i%4===1&&x>60));
 report.metrics.cpuFallback={size:128,presentationHz:20,simulated_s:trace[begin],wall_ms,wallPerSimulatedSecond:wall_ms/1000/trace[begin],host:'Linux/Node, not M1/Firefox or a browser FPS result',packets};
});
 }else{
 for(const name of ['Recorded trace hashes and model compatibility','Recorded trace CPU budget']){
  report.tests.push({name,skipped:true,reason:'Optional recording is absent. Run node tools/record-demo.mjs, then repeat this test.'});console.log('SKIP',name);
 }
}
if(process.env.DEMO_CPU_FULL==='1'&&trace){
 report.metrics.fullCPU=[];
 for(const size of [128,96,64]){
  const p=new CPUPhosphor(size),windows=[];let begin=0,lastTime=0,lastWall=performance.now();const start=lastWall;
  for(let k=4;k<trace.length;k+=4)if(trace[k]-trace[begin]>=.05){
   p.append(trace.subarray(begin,k));p.image();begin=k;
   if(trace[k]>=lastTime+2){const now=performance.now();windows.push({through_s:trace[k],wallPerSimulatedSecond:(now-lastWall)/1000/(trace[k]-lastTime)});lastTime=trace[k];lastWall=now;}
  }
  p.append(trace.subarray(begin));p.image();report.metrics.fullCPU.push({size,totalWall_ms:performance.now()-start,maxWindowRatio:Math.max(...windows.map(w=>w.wallPerSimulatedSecond)),windows});
 }
}
await writeFile(new URL('../app/docs/demo-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');process.exitCode=failures?1:0;
