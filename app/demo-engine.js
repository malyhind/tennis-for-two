import {decodeBeam} from './demo-codec.js';
export const DEMO_MODE=Object.freeze({label:'Демо — запись расчёта',names:['Гремлин','Лиса'],cpu:['gremlin','fox'],recorded:true});
const lowerBound=(a,t,stride=1)=>{let lo=0,hi=a.length/stride;while(lo<hi){const mid=(lo+hi)>>>1;if(a[mid*stride]<t)lo=mid+1;else hi=mid;}return lo;};
async function inflated(url,signal){
 const r=await fetch(url,{signal});if(!r.ok)throw Error(`Demo: HTTP ${r.status}`);
 let bytes=new Uint8Array(await r.arrayBuffer());
 // Some servers already decode .gz through Content-Encoding; support both.
 if(bytes[0]===31&&bytes[1]===139){
  if(typeof DecompressionStream!=='function')throw Error('Gzip decompression is unavailable');
  bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
 }
 return bytes;
}
export async function loadDemoEngine({signal,presentationHz=30}={}){
 const base=new URL('./demo/',import.meta.url),response=await fetch(new URL('manifest.json',base),{signal});
 if(!response.ok)throw Error(`Demo manifest: HTTP ${response.status}`);
 const manifest=await response.json();
 if(manifest.format!=='tft-demo-1'||!Number.isFinite(manifest.duration_s)||manifest.duration_s<=0||manifest.duration_s>120)throw Error('Invalid demo manifest');
 const [frameBytes,beamBytes]=await Promise.all([inflated(new URL(manifest.frames.url,base),signal),inflated(new URL(manifest.beam.url,base),signal)]);
 const framesData=JSON.parse(new TextDecoder().decode(frameBytes)),trace=decodeBeam(beamBytes);
 return new DemoEngine(manifest,trace,framesData.frames,{presentationHz});
}
export class DemoEngine{
 constructor(manifest,trace,frames,{presentationHz=30}={}){
  this.kind='demo';this.manifest=manifest;this.trace=trace;this.frames=frames;this.duration=manifest.duration_s;
  if(!Array.isArray(frames)||frames.length<2||frames[0].t!==0||trace.length/4!==manifest.beam.rows||trace[0]!==0||trace.at(-4)>=this.duration)throw Error('Invalid demo recording');
  let previous=-1;
  for(const f of frames){
   if(!Number.isFinite(f.t)||f.t<=previous||f.t>=this.duration||!f.state||f.state.nodes?.length!==4||f.mechanics?.length!==2)throw Error('Invalid demo frame');
   previous=f.t;
   for(const m of f.mechanics)if(![m.control,m.angle,m.depth].every(Number.isFinite)||m.control<0||m.control>1||m.depth<0)throw Error('Invalid recorded controller');
  }
  this.frameTimes=Float64Array.from(frames,f=>f.t);this.presentationPeriod=1/Math.max(1,presentationHz);
  this.error=null;this.closed=false;this.paused=false;this.version='Precomputed ngspice / f64 / real-time replay';this.reset();
 }
 reset(){
  this.elapsed=0;this.anchor=null;this.anchorElapsed=0;this.frameLoop=0;this.frameIndex=1;
  this.beamLoop=0;this.beamIndex=0;this.lastPresentation=-Infinity;this.events=0;this.samples=[];this.beams=[];this.buttonEdges=[];this.sequence=0;
  this.state={...this.frames[0].state,time:0};this.mechanicsStates=this.frames[0].mechanics;this.contacts=this.mechanicsStates.map(m=>m.closed);
  // Warm the phosphor from the real recorded tail. The wrap never clears it.
  const i=lowerBound(this.trace,this.duration-.15,4),warm=this.trace.slice(i*4);
  for(let k=0;k<warm.length;k+=4)warm[k]-=this.duration;
  this.beams.push(warm,null);
 }
 setPaused(value){
  this.paused=!!value;this.anchor=null;this.anchorElapsed=this.elapsed;
 }
 advanceTo(now){
  if(this.closed||this.paused||!Number.isFinite(now))return;
  if(this.anchor===null){this.anchor=now;this.anchorElapsed=this.elapsed;}
  const target=this.anchorElapsed+Math.max(0,(now-this.anchor)/1000);
  this.elapsed=Math.max(this.elapsed,target);
  while(true){
   if(this.frameIndex===this.frames.length){this.frameIndex=0;this.frameLoop++;}
   const f=this.frames[this.frameIndex],time=this.frameLoop*this.duration+f.t;
   if(time>this.elapsed+1e-10)break;
   this.frameIndex++;this.sequence++;
   const sample={...f.state,time,sequence:this.sequence,scope:{execution:'precomputed-demo',playbackRate:1}};
   this.state=sample;this.mechanicsStates=f.mechanics;this.samples.push(sample);this.events|=f.state.events;
   f.mechanics.forEach((m,i)=>{if(!!m.closed!==!!this.contacts[i]){this.contacts[i]=!!m.closed;this.buttonEdges.push(!!m.closed);}});
  }
  if(this.elapsed-this.lastPresentation>=this.presentationPeriod-1e-10){this.collectBeam(this.elapsed);this.lastPresentation=this.elapsed;}
 }
 collectBeam(target){
  const count=this.trace.length/4;
  while(true){
   const offset=this.beamLoop*this.duration;
   if(this.beamIndex===count){
    if(target<offset+this.duration-1e-10)break;
    this.beamIndex=0;this.beamLoop++;this.beams.push(null);continue;
   }
   let end=this.beamIndex;
   while(end<count&&offset+this.trace[end*4]<=target+1e-10)end++;
   if(end===this.beamIndex)break;
   const packet=this.trace.slice(this.beamIndex*4,end*4);
   for(let k=0;k<packet.length;k+=4)packet[k]+=offset;
   this.beams.push(packet);this.beamIndex=end;
  }
 }
 get loop(){return Math.floor(this.elapsed/this.duration);}
 getControl(side){return this.state.controls[side];}setControl(){}setGravity(){}
 getGravity(){return this.state.gravity;}getTime(){return this.state.time;}getTimeStep(){return this.manifest.solver.maxStep_s;}
 canHit(){return false;}hit(){return false;}
 popEvents(){const value=this.events;this.events=0;return value;}
 drainSamples(){return this.samples.splice(0);}drainBeams(){return this.beams.splice(0);}drainButtonEdges(){return this.buttonEdges.splice(0);}
 fail(error){this.error=error;this.closed=true;}
 close(){this.closed=true;this.trace=null;this.frames=[];this.frameTimes=null;this.samples=[];this.beams=[];this.buttonEdges=[];}
}
