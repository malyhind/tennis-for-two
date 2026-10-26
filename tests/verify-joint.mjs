import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {JointCircuit,SAMPLE_PERIOD} from '../app/joint-circuit.js';
import {CPUPlayer,operatorView} from '../app/cpu-player.js';
import {CPUPhosphor} from '../app/phosphor-cpu.js';
import {CRT,beamIntegral} from '../app/beam-model.js';
const root=new URL('../',import.meta.url),out=new URL('app/docs/joint-validation.json',root);
const raw=await readFile(new URL('app/tennis.cir',root),'utf8'),sub=await readFile(new URL('app/display-switch.cir',root),'utf8'),scope=await readFile(new URL('app/scope.cir',root),'utf8'),wasm=await readFile(new URL('app/vendor/spice.wasm',root));
const report={release:'0.7.0',date:new Date().toISOString(),scope:'Shared electrical transient, rolling state, live beam, deterministic CPU operators. Linux Node/WASM; no Apple M1 or physical-machine accuracy claim.',tests:[],metrics:{}};
async function test(name,fn){try{const result=await fn();report.tests.push({name,passed:true,...result});console.log('PASS',name);}catch(error){report.tests.push({name,passed:false,error:String(error.stack)});console.log('FAIL',name,String(error));}await writeFile(out,JSON.stringify(report,null,2)+'\n');}
const make=options=>new JointCircuit(raw,sub,scope,options);
let baseline;
await test('Shared deck directly wires U2/U7 into transistor selectors and loaded scope',async()=>{
 const c=make();assert.match(c.netlist,/Xdisplay y x /);assert.match(c.netlist,/Xscope screen_x screen_y /);
 assert.doesNotMatch(c.netlist,/^\.options interp/m);assert.match(c.netlist,/RinputX in_x 0 2.2meg/);assert.match(c.netlist,/RinputY in_y 0 2meg/);assert.match(c.netlist,/CinputY in_y 0 50p/);
 assert.match(c.netlist,/Qav av_c av_b scope_v GE140/);assert.match(c.netlist,/Bgun anode 0 I=/);
});
await test('Actual adaptive beam trace is finite, monotone and reaches all display axes',async()=>{
 const c=make({rebaseSeconds:2});let s=await c.start(wasm);const times=[],samples=[],beams=[];
 for(let k=0;k<120;k++){
  s=await c.step({hits:k===0?[0]:[]});samples.push({...s,beam:undefined});beams.push(s.beam);
  for(let j=0;j<s.beam.length;j+=4){assert.ok([...s.beam.subarray(j,j+4)].every(Number.isFinite));assert.ok(s.beam[j+3]>0);times.push(s.beam[j]);}
 }
 for(let i=1;i<times.length;i++)assert.ok(times[i]>times[i-1]);
 assert.ok(times.length>10000);assert.ok(samples.at(-1).x>samples[0].x+20);
 baseline={samples,beams};report.metrics.uninterrupted={points:times.length,simulated_s:s.time,heapBytes:s.scope.heapBytes};
 await mkdir(new URL('tests/fixtures/',root),{recursive:true});
 const a=new Float64Array(beams.reduce((sum,b)=>sum+b.length,0));let offset=0;for(const b of beams){a.set(b,offset);offset+=b.length;}
 await writeFile(new URL('tests/fixtures/joint-beam.f64',root),new Uint8Array(a.buffer));
 c.spice=null;
});
await test('Rolling checkpoints retain ball, transistor phases and external sine time',async()=>{
 const c=make({rebaseSeconds:.15});let s=await c.start(wasm);let maxBall=0,maxBeam=0,edgeShift=0,previousEnd=-Infinity;
 const interpolate=(rows,time,key)=>{let i=rows.findIndex(r=>r.time>=time);if(i<0)return rows.at(-1)[key];if(i===0)return rows[0][key];const a=rows[i-1],b=rows[i],f=(time-a.time)/(b.time-a.time);return a[key]+f*(b[key]-a[key]);};
 for(let k=0;k<115;k++){
  s=await c.step({hits:k===0?[0]:[]});
  if(k>1)maxBall=Math.max(maxBall,Math.abs(s.x-interpolate(baseline.samples,s.time,'x')),Math.abs(s.y-interpolate(baseline.samples,s.time,'y')));
  assert.ok(s.time>previousEnd);previousEnd=s.time;
  const v=await c.spice.snapshot(['v(mains)','v(net_v)','v(court_h)']);
  assert.ok(Math.abs(v['v(mains)']-117*Math.SQRT2*Math.sin(2*Math.PI*60*(s.time+.25)))<.001);
  assert.ok(s.beam.every(Number.isFinite));
 }
 assert.ok(s.checkpoints>=3);assert.ok(maxBall<.05,`ball checkpoint error ${maxBall}V`);
 report.metrics.checkpoints={count:s.checkpoints,maxBallErrorV:maxBall,heapBytes:s.scope.heapBytes};
});
await test('woscope beam integral agrees with numerical Gaussian quadrature',async()=>{
 let max=0;
 for(const [a,b,len,s] of [[2,.3,4,1],[0,0,1,.8],[5,1,12,1.5],[.001,.4,.0001,.7]]){
  let sum=0;const n=50000;for(let k=0;k<n;k++){const q=a-len*(k+.5)/n;sum+=Math.exp(-(q*q+b*b)/(2*s*s))/(2*Math.PI*s*s*n);}
  max=Math.max(max,Math.abs(beamIntegral(a,b,len,s)-sum));
 }
 assert.ok(max<.0002);report.metrics.beamIntegralMaxAbsoluteError=max;
});
await test('Phosphor uses simulated time; repeated presentation adds no energy',async()=>{
 const p=new CPUPhosphor(96),trace=new Float64Array([0,0,0,25e-6,.001,0,0,25e-6]);
 p.append(trace);const before=p.energy();assert.ok(before>0);p.image();p.image();assert.equal(before,p.energy());
 assert.equal(p.append(trace),false);assert.equal(before,p.energy());
 const fast=p.fast.slice(),slow=p.slow.slice();p.append(new Float64Array([.011,0,0,0]));assert.ok(p.energy()>0);
 assert.throws(()=>p.append(new Float64Array([NaN,0,0,0])));
});
await test('Real joint electrical trace produces a screen without geometric game objects',async()=>{
 const p=new CPUPhosphor(192);for(const b of baseline.beams)p.append(b);
 const image=p.image();assert.ok(p.energy()>1);const pixels=[];
 for(let i=0;i<image.length;i+=4)if(image[i+1]>100)pixels.push(i/4);
 assert.ok(pixels.length>25);report.metrics.screen={brightPixels:pixels.length,energy:p.energy(),input:'plate X/Y and beam current only'};
});
await test('CPU versus CPU runs through multiple rallies/checkpoints with bounded memory',async()=>{
 const c=make();let s=await c.start(wasm),seed=1234567;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const cpu=[new CPUPlayer(0,'gremlin',{random,time:s.time}),new CPUPlayer(1,'fox',{random,time:s.time})];
 const duration=Number(process.env.JOINT_SOAK_SECONDS||10);let hits=0,rallies=0,peakHeap=0,samples=0;
 while(s.time<duration){
  const actions=cpu.map((p,i)=>p.update(operatorView(s,i))),before=s.mode;
  s=await c.step({controls:actions.map(a=>a.control),hits:actions.flatMap((a,i)=>a.hit?[i]:[])});
  if(s.events&1)hits++;if(!before&&s.mode)rallies++;peakHeap=Math.max(peakHeap,s.scope.heapBytes);samples++;
  assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y));
  if(samples%200===0)console.log('SOAK',s.time.toFixed(2),hits,rallies,s.checkpoints,peakHeap);
 }
 assert.ok(hits>=3);assert.ok(s.checkpoints>=4);assert.ok(peakHeap<600*1024*1024);
 report.metrics.soak={simulated_s:s.time,samples,hits,rallies,checkpoints:s.checkpoints,peakHeapBytes:peakHeap,targetHardwareMeasured:false};
});
const failed=report.tests.some(t=>!t.passed);console.log(JSON.stringify(report.metrics));process.exit(failed?1:0);
