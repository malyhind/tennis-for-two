import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {JointCircuit,SAMPLE_PERIOD} from '../app/joint-circuit.js';
import {CPUPlayer,operatorView} from '../app/cpu-player.js';
import {ControllerMechanics} from '../app/controller-mechanics.js';
const read=n=>readFile(new URL('../app/'+n,import.meta.url),n.endsWith('.cir')?'utf8':undefined);
const [raw,sub,scope,wasm]=await Promise.all(['tennis.cir','display-switch.cir','scope.cir','vendor/spice.wasm'].map(read));
const report={release:'0.8.1',dateUTC:new Date().toISOString(),scope:'New controller output/contact bridge into the unchanged production joined SPICE circuit. Fixed-time offline scenario, not human-subject or browser-speed validation.',tests:[]};
let failed=0;
for(const enabled of [true,false]){
 try{
  const circuit=new JointCircuit(raw,sub,scope);let state=await circuit.start(wasm),seed=1234567;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const cpu=[new CPUPlayer(0,'gremlin',{random,time:state.time}),new CPUPlayer(1,'fox',{random,time:state.time})];
  const models=[new ControllerMechanics({enabled}),new ControllerMechanics({enabled})];
  let closes=0,hits=0;const bySide=[0,0];
  while(state.time<5){
   const actions=cpu.map((p,i)=>p.update(operatorView(state,i)));
   actions.forEach((a,i)=>{models[i].setTarget(a.control);if(a.hit)models[i].pulse();models[i].advance(SAMPLE_PERIOD);});
   const pressed=[];models.forEach((m,i)=>{for(const e of m.drainEdges())if(e==='close'){closes++;pressed.push(i);bySide[i]++;}});
   state=await circuit.step({controls:models.map(m=>m.control),hits:pressed});if(state.events&1)hits++;
   assert.ok(Number.isFinite(state.x)&&Number.isFinite(state.y));
  }
  assert.ok(hits>=3);assert.ok(bySide.every(x=>x>0));
  report.tests.push({name:enabled?'Mechanical controllers sustain real joined-circuit play':'Direct controllers sustain real joined-circuit play',passed:true,simulated_s:state.time,contactClosures:closes,contactsBySide:bySide,acceptedHitEvents:hits,checkpoints:state.checkpoints});
  console.log('PASS',JSON.stringify(report.tests.at(-1)));circuit.spice=null;
 }catch(error){failed++;report.tests.push({enabled,passed:false,error:String(error.stack)});console.error('FAIL',String(error));}
 await writeFile(new URL('../app/docs/mechanics-joint-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
process.exitCode=failed?1:0;
