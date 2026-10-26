// Browser-only checks of the same modules used by the standalone instrument.
const en=document.documentElement.lang==='en';
const tr=(ru,english)=>en?english:ru;
const run=document.querySelector('#run'),stop=document.querySelector('#stop'),save=document.querySelector('#save');
const status=document.querySelector('#status'),output=document.querySelector('#report');
let cancelled=false,report=null,downloadURL=null;
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const update=()=>{output.textContent=JSON.stringify(report,null,2);};
const cancel=()=>{cancelled=true;status.textContent=tr('Останавливаемся после текущей операции…','Stopping after the current operation…');};
stop.onclick=cancel;
run.onclick=async()=>{
 run.disabled=true;stop.hidden=false;save.hidden=true;cancelled=false;
 report={dateUTC:new Date().toISOString(),userAgent:navigator.userAgent,scope:'Browser smoke checks of the declared model; not hardware calibration or the complete Node numerical suite.',tests:[]};
 const test=async(name,fn)=>{
  if(cancelled)return;
  status.textContent=name;
  try{const result=await fn();report.tests.push({name,...(result?.cancelled?{}:{passed:true}),...result});}
  catch(error){report.tests.push({name,passed:false,error:String(error.stack||error)});}
  update();
 };
 try{
  await test(tr('Браузер, Worker и WebAssembly','Browser, Worker and WebAssembly'),async()=>{
   assert(typeof Worker==='function','Worker is unavailable');assert(typeof WebAssembly==='object','WebAssembly is unavailable');
   const response=await fetch(new URL('../app/vendor/spice.wasm',import.meta.url));assert(response.ok,`WASM HTTP ${response.status}`);
   const bytes=await response.arrayBuffer();assert(WebAssembly.validate(bytes),'Invalid WebAssembly module');
   const version=await fetch(new URL('../publication.json',import.meta.url)).then(r=>r.ok?r.json():null).catch(()=>null);
   if(version)report.publication=version;
   return {wasmBytes:bytes.byteLength};
  });
  await test(tr('Ручка и замыкание кнопки · Planck.js','Knob and button contacts · Planck.js'),async()=>{
   const {ControllerMechanics}=await import('../app/controller-mechanics.js');
   const c=new ControllerMechanics({control:.5});c.setTarget(.8);c.advance(.001);
   assert(c.control>.5&&c.control<.8,'The shaft did not retain inertia');
   for(let k=0;k<400;k++)c.advance(.001);
   assert(Math.abs(c.control-.8)<.005,'Knob target not reached');
   c.pulse();const edges=[];for(let k=0;k<250;k++){c.advance(.001);edges.push(...c.drainEdges());}
   assert(JSON.stringify(edges)==='["close","open"]','Contact stroke did not close and reopen once');
   return {knobControl:c.control,contactEdges:edges,buttonTravel_m:c.depth};
  });
  await test(tr('Стекло сохраняет энергию люминофора','Glass preserves phosphor energy'),async()=>{
   const {CPUPhosphor}=await import('../app/phosphor-cpu.js');
   const p=new CPUPhosphor(96);p.append(new Float64Array([0,-10,0,25e-6,.001,10,0,25e-6]));
   const energy=p.energy(),time=p.stream.time,on=p.image().slice();p.setOpticsEnabled(false);const off=p.image().slice();p.setOpticsEnabled(true);
   assert(on.some((v,i)=>v!==off[i]),'Optics did not change presentation');
   assert(p.image().every((v,i)=>v===on[i])&&p.energy()===energy&&p.stream.time===time,'Optics altered excitation');
   return {energy,simulated_s:time};
  });
  await test(tr('Непрерывная схема · ngspice/WASM','Continuous circuit · ngspice/WASM'),async()=>{
   const [{loadEngine},{ControllerMechanics},{CPUPlayer,operatorView}]=await Promise.all([
    import('../app/engine.js'),import('../app/controller-mechanics.js'),import('../app/cpu-player.js')]);
   let engine;
   try{
    const boot=performance.now();engine=await loadEngine();const startup_s=(performance.now()-boot)/1000;
    if(cancelled)return {cancelled:true};
    let s=engine.state;const origin=s.time,duration=Number(document.querySelector('#duration').value);
    const controls=[new ControllerMechanics(),new ControllerMechanics()];let seed=44;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const players=[new CPUPlayer(0,'gremlin',{random,time:s.time}),new CPUPlayer(1,'fox',{random,time:s.time})];
    let steps=0,points=0,hits=0,solver_ms=0;
    while(s.time-origin<duration&&!cancelled){
     players.forEach((p,i)=>{const a=p.update(operatorView(s,i));controls[i].setTarget(a.control);if(a.hit)controls[i].pulse();});
     const pressed=[];controls.forEach((c,i)=>{c.advance(.005);if(c.drainEdges().includes('close')&&s.can[i])pressed.push(i);});
     const previous=s.time,begin=performance.now();
     ({state:s}=await engine.stepAcrossWorkers({controls:controls.map(c=>c.control),hits:pressed}));solver_ms+=performance.now()-begin;
     assert(s.time>previous&&s.time-previous<.005051,'Circuit time is discontinuous');
     assert([s.x,s.y,s.vx,s.vy,...s.beam].every(Number.isFinite),'Non-finite circuit output');
     assert(s.beam.length>=4&&s.beam.length%4===0,'Missing beam samples');
     let last=previous-1e-9;for(let k=0;k<s.beam.length;k+=4){assert(s.beam[k]>=last,'Beam time went backwards');last=s.beam[k];}
     points+=s.beam.length/4;hits+=!!(s.events&1);engine.acceptState(s);engine.drainBeams();steps++;
     status.textContent=tr('Схема: ','Circuit: ')+(s.time-origin).toFixed(2)+' / '+duration.toFixed(2)+' s';
    }
    const simulated_s=s.time-origin;
    return {cancelled,requested_s:duration,simulated_s,startup_s,solverWall_s:solver_ms/1000,
     wallSecondsPerSimulatedSecond:solver_ms/1000/simulated_s,tempo:simulated_s/(solver_ms/1000),
     measurement:'Awaited circuit worker steps and state transfers; startup, mechanics, screen and background-tab delays outside these calls are excluded.',
     steps,beamPoints:points,hits,workerHandoffs:engine.workerRestarts,finalBall_V:[s.x,s.y]};
   }finally{engine?.close();}
  });
 }catch(error){report.tests.push({name:'Browser harness',passed:false,error:String(error.stack||error)});}
 finally{
  report.cancelled=cancelled;report.failed=report.tests.filter(t=>t.passed===false).length;
  report.passed=report.tests.filter(t=>t.passed&&!t.cancelled).length;update();
  status.textContent=cancelled?tr('Проверка остановлена.','Check stopped.'):tr(`Пройдено: ${report.passed}. Ошибок: ${report.failed}.`,`Passed: ${report.passed}. Failed: ${report.failed}.`);
  run.disabled=false;stop.hidden=true;if(downloadURL)URL.revokeObjectURL(downloadURL);
  downloadURL=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}));
  save.href=downloadURL;save.hidden=false;
 }
};
