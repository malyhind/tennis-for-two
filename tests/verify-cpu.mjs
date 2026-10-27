import {PLAY_MODES} from '../app/play-modes.js';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CPUPlayer,CPU_PROFILES,motorDuration,operatorView} from '../app/cpu-player.js';
import {TennisCircuit} from '../app/circuit.js';
const root=new URL('../',import.meta.url),report={release:'0.5.0',date:new Date().toISOString(),scope:'Optional operator behavior and circuit integration; not human-subject validation.',tests:[],metrics:{}};
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
async function test(name,fn){try{await fn();report.tests.push({name,passed:true});console.log('PASS',name);}catch(e){report.tests.push({name,passed:false,error:String(e.stack)});console.error('FAIL',name,String(e));}}
await test('Only visible observations reach the operator',()=>{
  const allowed=new Set(['time','x','y','mode','can','server']);
  const state=new Proxy({time:1,x:12,y:30,mode:1,can:[false,true],server:0},{get:(o,k)=>{assert.ok(allowed.has(k),'Privileged state: '+k);return o[k];}});
  assert.deepEqual(operatorView(state,1),{time:1,x:12,y:30,playing:true,ready:true,server:0});
  assert.deepEqual(PLAY_MODES.together.cpu,[null,'fox']);assert.deepEqual(PLAY_MODES.opponent.cpu,[null,null]);assert.equal(Object.keys(PLAY_MODES).length,3);assert.deepEqual(PLAY_MODES.watch.cpu,['gremlin','fox']);
});
await test('A new visible opportunity cannot produce an immediate hit',()=>{
  const a=new CPUPlayer(1,'opponent',{random:()=>0});let first=null;
  for(let k=1;k<=30;k++){const t=k*.02,r=a.update({time:t,x:45,y:40,playing:true,ready:true,server:0});if(r.hit&&first===null)first=t;}
  assert.ok(first>=a.reaction+.02-1e-9&&first<.4);report.metrics.first_response_s=first;
});
await test('Knob motion is bounded, gradual and distance-dependent',()=>{
  const a=new CPUPlayer(0,'gremlin',{random:()=>0});let last=a.control,max=0;
  for(let k=1;k<=150;k++){const r=a.update({time:k*.02,x:-62,y:0,playing:false,ready:true,server:0});max=Math.max(max,Math.abs(r.control-last)/.02);last=r.control;assert.ok(r.control>=0&&r.control<=1);}
  assert.ok(max<=CPU_PROFILES.gremlin.maxSpeed+1e-9&&max>0);assert.ok(motorDuration(.5)>motorDuration(.05));report.metrics.max_knob_speed_fraction_per_s=max;
});
await test('Paused time freezes motion; a clock reset clears old decisions; memory stays bounded',()=>{
  const a=new CPUPlayer(0,'gremlin',{random:seeded(7)});let r;
  for(let k=1;k<=2000;k++)r=a.update({time:k*.02,x:-62,y:0,playing:false,ready:true,server:0});
  const value=r.control;for(let k=0;k<100;k++){const next=a.update({time:40,x:-62,y:0,playing:false,ready:true,server:0});assert.equal(next.control,value);assert.equal(next.hit,false);}
  assert.ok(a.samples.length<=16);report.metrics.observation_queue_length=a.samples.length;
  const reset=a.update({time:.02,x:-62,y:0,playing:false,ready:true,server:0});
  assert.equal(reset.hit,false);assert.equal(a.samples.length,0);assert.equal(a.previous,null);assert.equal(a.move,null);
  let served=false;for(let k=2;k<=120;k++)served ||= a.update({time:k*.02,x:-62,y:0,playing:false,ready:true,server:0}).hit;
  assert.ok(served,'Reset operator remained blocked by the previous 40-second clock');
});
await test('A permission leads to one press; a new opportunity re-arms the operator',()=>{
  const a=new CPUPlayer(1,'opponent',{random:()=>0});let hits=0;
  for(let k=1;k<=100;k++){const r=a.update({time:k*.02,x:45,y:35,playing:true,ready:k<25||k>55,server:0});hits+=+r.hit;}
  assert.equal(hits,2);
});
await test('Distinct personas make distinct decisions with the same observations',()=>{
  const g=new CPUPlayer(0,'gremlin',{random:()=>.5}),f=new CPUPlayer(0,'fox',{random:()=>.5});
  for(let k=1;k<=100;k++){const v={time:k*.02,x:-40,y:40,playing:true,ready:true,server:0};g.update(v);f.update(v);}
  assert.notEqual(g.control,f.control);assert.notEqual(g.depth,f.depth);
});
const bytes=await readFile(new URL('app/vendor/spice.wasm',root)),netlist=await readFile(new URL('app/tennis.cir',root),'utf8');
let circuit;
await test('Two operators sustain real SPICE rallies and automatically serve again',async()=>{
  circuit=new TennisCircuit(netlist);let state=await circuit.start(bytes);
  const players=[new CPUPlayer(0,'gremlin',{random:seeded(3)}),new CPUPlayer(1,'fox',{random:seeded(11)})];
  const hits=[0,0],serves=[0,0];let rallies=0,returns=0,maxY=0,previousPlaying=0;
  for(let k=0;k<1500;k++){
    const actions=players.map((p,i)=>p.update(operatorView(state,i)));
    // Deliberately omit one operator's returns for 3 s to exercise automatic serving after an ended rally.
    const pressed=[];
    actions.forEach((a,i)=>{if(a.hit&&!(i===0&&state.mode&&k>=600&&k<750)){pressed.push(i);hits[i]++;if(!state.mode)serves[i]++;else returns++;}});
    state=await circuit.step({controls:actions.map(a=>Math.round(a.control*1000)/1000),hits:pressed});
    if(state.mode&&!previousPlaying)rallies++;previousPlaying=state.mode;maxY=Math.max(maxY,state.y);
    assert.ok(Number.isFinite(state.x)&&Number.isFinite(state.y));
  }
  report.metrics.watch_mode={simulated_s:state.time,hits,serves,rallies,returns,max_height_V:maxY};
  assert.ok(hits.every(n=>n>=3),'One operator never returns the ball');assert.ok(returns>=6,'Insufficient sustained play');assert.ok(rallies>=2,'No automatic restart after a rally');
});
await test('A right-side operator also returns against ordinary manual button input',async()=>{
  // Same ports as the browser: a person supplies only controls + hits.
  circuit=new TennisCircuit(netlist);let state=await circuit.start(bytes);const right=new CPUPlayer(1,PLAY_MODES.together.cpu[1],{random:seeded(21)});let returned=0,manual=0;
  for(let k=0;k<700;k++){
    const a=right.update(operatorView(state,1)),hits=[];
    if(state.can[0]&&(!state.mode||state.x < -28)){hits.push(0);manual++;}
    if(a.hit){hits.push(1);if(state.mode)returned++;}
    state=await circuit.step({controls:[.58,a.control],hits});
  }
  assert.ok(returned>=2&&manual>=2);report.metrics.human_vs_cpu={manual_presses:manual,cpu_returns:returned,simulated_s:state.time};
});
report.hashes={};for(const f of ['app/cpu-player.js','app/analog-tennis.js','app/tennis.cir','app/circuit.js','app/engine.js'])report.hashes[f]=createHash('sha256').update(await readFile(new URL(f,root))).digest('hex');
report.passed=report.tests.filter(t=>t.passed).length;report.failed=report.tests.filter(t=>!t.passed).length;
await writeFile(new URL('app/docs/cpu-validation.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,metrics:report.metrics},null,2));process.exit(report.failed?1:0);
