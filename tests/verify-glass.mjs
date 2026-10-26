import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLASS_MODEL,GlassProjection,faceplateRay,fresnel} from '../app/glass-optics.js';
import {CPUPhosphor} from '../app/phosphor-cpu.js';
import {CRT,displayColor} from '../app/beam-model.js';
const root=new URL('../',import.meta.url),report={release:'0.8.5',dateUTC:new Date().toISOString(),scope:'Declared plane-parallel faceplate, presentation invariance, sensitivity and Linux/Node timing. Not original-glass metrology or hardware GPU verification.',tests:[],metrics:{}};
const test=async(name,fn)=>{try{await fn();report.tests.push({name,passed:true});console.log('PASS',name);}catch(e){report.tests.push({name,passed:false,error:String(e.stack)});console.error('FAIL',name,e.message);}};
const near=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<=t,`${a} versus ${b}`);
await test('Normal-incidence Fresnel and Snell match closed forms',()=>{
 const f=fresnel(1),r=((1-1.52)/(1+1.52))**2;near(f.reflectance,r);near(f.cosTransmitted,1);
 const ray=faceplateRay(.5,.5);near(ray.u,.5);near(ray.v,.5);near(ray.direct,(1-r)**2*Math.exp(-.004));near(ray.ghost,(1-r)**2*r*r*Math.exp(-.012));
});
await test('Snell reciprocity and total internal reflection',()=>{
 for(const angle of [0,.1,.5,1,1.4]){const ci=Math.cos(angle),f=fresnel(ci),back=fresnel(f.cosTransmitted,1.52,1);near(back.cosTransmitted,ci,3e-14);near(back.reflectance,f.reflectance,3e-14);}
 assert.equal(fresnel(.5,1.52,1).totalInternalReflection,true);
});
await test('Known plane-parallel lateral shift follows the analytical ray',()=>{
 const u=.9,v=.65,r=faceplateRay(u,v),field=CRT.fieldIn*.0254;
 const x=(u-.5)*field,y=(v-.5)*field,air=Math.atan2(Math.hypot(x,y),.5),glass=Math.asin(Math.sin(air)/1.52);
 near(Math.hypot(r.u-u,r.v-v)*field,.004*Math.tan(glass));
 near(1.52*Math.sqrt(1-r.cosGlass**2),Math.sqrt(1-r.cosAir**2));
 assert.ok(Math.hypot(r.ghostU-u,r.ghostV-v)>Math.hypot(r.u-u,r.v-v));
 report.metrics.edgeRay={...faceplateRay(.94,.5),coordinateShift_pixelsAt512:(faceplateRay(.94,.5).u-.94)*512};
});
await test('Transparent zero-thickness limit has identity mapping and unit transmission',()=>{
 const m={...GLASS_MODEL,thickness_m:0,refractiveIndex:1,ambientRadiance:0,lampRadiance:0};
 for(const [u,v] of [[.5,.5],[.9,.3],[.1,.7]]){const r=faceplateRay(u,v,m);near(r.u,u);near(r.v,v);near(r.direct,1);near(r.ghost,0);near(r.reflection,0);}
});
await test('Only one internal round trip is retained with a measured omitted tail',()=>{
 const p=new GlassProjection(192);assert.ok(p.maxOmittedTransmission<4e-6);
 report.metrics.omittedTransmissionMax=p.maxOmittedTransmission;
 for(let i=0;i<p.gains.length;i+=4){assert.ok(p.gains[i]+p.gains[i+1]<=1+1e-6);assert.ok(p.gains[i]>=0&&p.gains[i+1]>=0);}
});
await test('Faceplate sensitivity stays finite and separates choices from known geometry',()=>{
 const values=[];for(const thickness of [.002,.004,.008])for(const n of [1.48,1.52,1.56]){
  const p=new GlassProjection(32,{model:{thickness_m:thickness,refractiveIndex:n},cpuSampling:true});assert.ok(p.geometry.every(Number.isFinite));assert.ok(p.gains.every(Number.isFinite));
  const r=faceplateRay(.94,.5,{...GLASS_MODEL,thickness_m:thickness,refractiveIndex:n});values.push({thickness_m:thickness,refractiveIndex:n,edgeShift_pixelsAt512:(r.u-.94)*512,transmission:r.direct+r.ghost});
 }
 report.metrics.sensitivity=values;
 assert.throws(()=>new GlassProjection(16,{model:{thickness_m:-1}}));
});
await test('CPU off mode is byte-identical to the old flat-screen image',()=>{
 const p=new CPUPhosphor(96,{opticsEnabled:false});for(let i=0;i<p.fast.length;i++){p.fast[i]=(i%37)/12;p.slow[i]=(i%13)/21;}
 const actual=p.image(),expected=new Uint8ClampedArray(actual.length);
 for(let y=0;y<96;y++)for(let x=0;x<96;x++){const i=y*96+x;expected.set(displayColor(p.fast[i]+p.slow[i],Math.hypot((x+.5)/96*2-1,(y+.5)/96*2-1)),i*4);}
 assert.deepEqual(actual,expected);
});
await test('Live optics toggle preserves phosphor energy, packet time and circuit trace',()=>{
 const p=new CPUPhosphor(96);p.append(new Float64Array([0,-10,0,25e-6,.001,10,0,25e-6]));
 const fast=p.fast.slice(),slow=p.slow.slice(),time=p.stream.time,before=p.energy(),on=p.image().slice();
 p.setOpticsEnabled(false);const off=p.image().slice();assert.notDeepEqual(on,off);
 p.setOpticsEnabled(true);assert.deepEqual(p.image(),on);assert.deepEqual(p.fast,fast);assert.deepEqual(p.slow,slow);assert.equal(p.energy(),before);assert.equal(p.stream.time,time);
});
await test('Presentation cache invalidates on clear, new beam and toggle',()=>{
 const p=new CPUPhosphor(64);p.append(new Float64Array([0,0,0,25e-6,.001,0,0,25e-6]));const lit=p.image().slice();p.clear();assert.notDeepEqual(p.image(),lit);
 p.append(new Float64Array([0,0,0,25e-6,.001,0,0,25e-6]));assert.deepEqual(p.image(),lit);assert.strictEqual(p.image(),p.image());
});
await test('Electrical fixture renders through the glass with unchanged excitation code',async()=>{
 const bytes=await readFile(new URL('tests/fixtures/joint-beam.f64',root));const trace=new Float64Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/8),p=new CPUPhosphor(192);
 let begin=0;for(let k=4;k<trace.length;k+=4)if(trace[k]-trace[begin]>=.005){p.append(trace.slice(begin,k));begin=k;}p.append(trace.slice(begin));
 const image=p.image();let bright=0;for(let i=1;i<image.length;i+=4)if(image[i]>100)bright++;assert.ok(bright>25);
 report.metrics.electricalFixture={points:trace.length/4,brightPixels:bright,storedEnergy:p.energy()};
 const baseline=JSON.parse(await readFile(new URL('app/docs/optics-baseline-0.8.1.json',root),'utf8'));
 const sha=value=>createHash('sha256').update(value).digest('hex');
 for(const [file,methods] of Object.entries(baseline.methods)){
  const current=await readFile(new URL(file,root),'utf8');
  for(const [method,digest] of Object.entries(methods)){
   const text=method==='append'?current.match(/  append\(trace\)\{[\s\S]*?\n  \}/)[0]:current.match(new RegExp('const '+method+'=`[\\s\\S]*?`;'))[0];assert.equal(sha(text),digest,file+': '+method);
  }
 }
 const continuation=JSON.parse(await readFile(new URL('app/docs/continuation-fix-2026-10-25.json',root),'utf8'));
 for(const [file,digest] of Object.entries(baseline.files)){
  const current=await readFile(new URL(file,root)),actual=sha(current);
  if(actual===digest)continue;
  assert.equal(continuation.base_sha256[file],digest,file+': declared original continuation hash');
  assert.equal(actual,continuation.sha256[file],file+': checked continuation revision');
  if(file==='app/joint-circuit.js')assert.equal(sha(current.toString().split('export class JointCircuit')[0]),continuation.deckDefinitionSha256);
 }

});
await test('CPU presentation timing and unchanged-frame caching are measured separately',()=>{
 const p=new CPUPhosphor(384),on=[],off=[];for(let i=0;i<p.fast.length;i++)p.fast[i]=(i%29)/10;
 for(let k=0;k<22;k++)for(const [flag,results] of [[true,on],[false,off]]){p.setOpticsEnabled(flag);const start=performance.now();p.image();if(k>=5)results.push(performance.now()-start);}
 const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];const start=performance.now();for(let i=0;i<10000;i++)p.image();const cached=(performance.now()-start)/10000;
 report.metrics.performance={host:'Linux/Node; not M1/Firefox or GPU',size:384,opticsOnMedian_ms:median(on),opticsOffMedian_ms:median(off),cachedPresentation_ms:cached,geometryBuiltOnce:true};
 assert.ok(median(on)<100);assert.ok(cached<.1);
});
report.passed=report.tests.filter(t=>t.passed).length;report.failed=report.tests.length-report.passed;
await writeFile(new URL('app/docs/glass-validation.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.metrics,null,2));process.exitCode=report.failed?1:0;
