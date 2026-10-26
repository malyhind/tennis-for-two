import {GPUPhosphor} from '../app/phosphor-webgl.js';
import {CPUPhosphor} from '../app/phosphor-cpu.js';
import {ScopeRenderer} from '../app/scope-renderer.js';
const status=document.querySelector('#status'),out=document.querySelector('#json');
document.querySelector('#run').onclick=async()=>{
 document.querySelector('#run').disabled=true;status.textContent='Сравниваем численные результаты…';
 const report={date:new Date().toISOString(),userAgent:navigator.userAgent,tests:[],measurements:{}};
 const test=async(name,fn)=>{try{const value=await fn();report.tests.push({name,...(value?.skipped?{}:{passed:true}),...value});}catch(e){report.tests.push({name,passed:false,error:String(e.stack||e)});}out.textContent=JSON.stringify(report,null,2);};
 let gpu,cpu;
 await test('WebGL2 supports a complete RGBA32F accumulation target',()=>{
  try{gpu=new GPUPhosphor(document.querySelector('#gpu'),192);cpu=new CPUPhosphor(192);}catch(e){return {skipped:true,reason:String(e.message),requiredOnTarget:true};}
  return {extensions:gpu.gl.getSupportedExtensions(),renderer:gpu.gl.getParameter(gpu.gl.RENDERER)};
 });
 const compare=()=>{
  const a=gpu.readEnergy(),b=cpu;let squared=0,peak=0,max=0,count=0,totalA=0,totalB=0;
  for(let y=0;y<192;y++)for(let x=0;x<192;x++)for(let c=0;c<2;c++){
   const v=a[((191-y)*192+x)*4+c],w=(c?b.slow:b.fast)[y*192+x];
   const e=Math.abs(v-w);max=Math.max(max,e);squared+=e*e;peak=Math.max(peak,w);totalA+=v;totalB+=w;count++;
  }
  return {maxAbsolute:max,maxRelativeToPeak:max/peak,rmsRelativeToPeak:Math.sqrt(squared/count)/peak,totalRelativeError:Math.abs(totalA/totalB-1)};
 };
 const append=trace=>{gpu.append(trace);cpu.append(trace);document.querySelector('#cpu').getContext('2d').putImageData(new ImageData(cpu.image(),192,192),0,0);};
 if(gpu)await test('Moving beam and stationary dwell agree between GPU and CPU',()=>{
  const rows=[];for(let k=0;k<=800;k++){const t=k*25e-6,a=t*2*Math.PI*180;rows.push(t,65*Math.sin(a),42*Math.sin(a*.7),25e-6);}
  append(new Float64Array(rows));const r=compare();if(r.rmsRelativeToPeak>.002||r.maxRelativeToPeak>.02)throw Error(JSON.stringify(r));return r;
 });
 if(gpu)await test('A repeated packet does not excite the phosphor again',()=>{
  const before=cpu.energy(),t=cpu.stream.time,packet=new Float64Array([t,0,0,25e-6]);
  if(gpu.append(packet)!==false||cpu.append(packet)!==false||before!==cpu.energy())throw Error('Repeated packet changed energy');return compare();
 });
 if(gpu)await test('Actual coupled SPICE trace agrees between GPU and CPU',async()=>{
  gpu.clear();cpu.clear();const response=await fetch('./fixtures/joint-beam.f64');if(!response.ok)throw Error('Missing circuit fixture');
  const trace=new Float64Array(await response.arrayBuffer());
  // Stream in physical packet order, rather than presenting a whole 0.6s scan.
  let begin=0;for(let k=4;k<trace.length;k+=4)if(trace[k]-trace[begin]>=.005){append(trace.slice(begin,k));begin=k;}
  append(trace.slice(begin));const r=compare();if(r.rmsRelativeToPeak>.003||r.maxRelativeToPeak>.03)throw Error(JSON.stringify(r));return {...r,points:trace.length/4};
 });
 if(!gpu)for(const name of ['Moving beam and stationary dwell agree between GPU and CPU','A repeated packet does not excite the phosphor again','Actual coupled SPICE trace agrees between GPU and CPU'])await test(name,()=>({skipped:true,reason:'WebGL2 unavailable; numerical GPU check not executed'}));
 await test('Automatic fallback renders the electrical beam when WebGL is unavailable',()=>{const canvas=document.createElement('canvas');document.body.append(canvas);const r=new ScopeRenderer(canvas);r.append(new Float64Array([0,0,0,25e-6,.001,0,0,25e-6]));const value={backend:r.backend,fallbackReason:r.fallbackReason};if(!r.canvas.width)throw Error('Missing screen');r.dispose();r.canvas.remove();return value;});
 await test('Explicit CPU mode uses the same beam model',()=>{
  const c=document.createElement('canvas');document.body.append(c);const r=new ScopeRenderer(c,{preferred:'cpu'});
  r.append(new Float64Array([0,0,0,25e-6,.001,0,0,25e-6]));if(r.backend!=='CPU'||r.renderer.energy()<=0)throw Error('CPU fallback failed');r.dispose();r.canvas.remove();
 });
 await test('Context loss switches to CPU and replays the electrical trace',async()=>{
  const r=new ScopeRenderer(document.querySelector('#fallback canvas'));
  const trace=new Float64Array([0,-20,0,25e-6,.001,20,0,25e-6]);r.append(trace);
  const initial=r.backend;if(initial!=='WebGL2')return {skipped:true,reason:'WebGL2 unavailable in test browser',automaticFallback:r.backend};
  const complete=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Context-loss timeout')),5000);r.canvas.addEventListener('webglcontextlost',()=>{clearTimeout(timer);resolve();},{once:true});});
  r.renderer.gl.getExtension('WEBGL_lose_context').loseContext();await complete;
  if(r.backend!=='CPU'||r.renderer.energy()<=0)throw Error('Trace was lost');return {initial,after:r.backend,reason:r.fallbackReason,energy:r.renderer.energy()};
 });
 await test('Glass optics changes presentation and retains excitation through on/off switching',()=>{
  const p=new CPUPhosphor(96);p.append(new Float64Array([0,-10,0,25e-6,.001,10,0,25e-6]));const before=p.energy(),time=p.stream.time,on=p.image().slice();
  p.setOpticsEnabled(false);const off=p.image().slice();p.setOpticsEnabled(true);const again=p.image();
  if(!on.some((v,i)=>v!==off[i])||on.some((v,i)=>v!==again[i])||p.energy()!==before||p.stream.time!==time)throw Error('Optics changed excitation or failed to restore');
  return {storedEnergy:before,simulatedTime:time};
 });
 await test('CPU/WebGL final optical image agrees in both switch positions',()=>{
  if(!gpu)return {skipped:true,reason:'WebGL2 unavailable; final optical image parity requires target GPU'};
  const results=[];for(const enabled of [false,true]){
   gpu.setOpticsEnabled(enabled);cpu.setOpticsEnabled(enabled);const a=gpu.readImage(),b=cpu.image();let max=0,squared=0,count=0;
   for(let y=0;y<192;y++)for(let x=0;x<192;x++)for(let c=0;c<3;c++){
    const delta=Math.abs(a[((191-y)*192+x)*4+c]-b[(y*192+x)*4+c]);max=Math.max(max,delta);squared+=delta*delta;count++;
   }
   const r={enabled,maxByteDifference:max,rmsByteDifference:Math.sqrt(squared/count)};if(max>5||r.rmsByteDifference>.5)throw Error(JSON.stringify(r));results.push(r);
  }return {results};
 });
 const failed=report.tests.filter(t=>t.passed===false).length;status.textContent=failed?`Ошибок: ${failed}`:`Пройдено ${report.tests.filter(t=>t.passed).length}; пропущено ${report.tests.filter(t=>t.skipped).length}`;
 out.textContent=JSON.stringify(report,null,2);document.querySelector('details').open=true;document.querySelector('#run').disabled=false;
};
