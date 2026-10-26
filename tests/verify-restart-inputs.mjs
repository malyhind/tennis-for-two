import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {JointCircuit} from '../app/joint-circuit.js';
const read=n=>readFile(new URL('../app/'+n,import.meta.url),n.endsWith('.cir')?'utf8':undefined);
const [raw,sub,scope,wasm]=await Promise.all(['tennis.cir','display-switch.cir','scope.cir','vendor/spice.wasm'].map(read));
const report={release:'0.8.3',dateUTC:new Date().toISOString(),scope:'Expired input source preservation, real fresh-session restore and an explicitly fault-injected retry. The injected failure is not an exact reproduction of the earlier unseeded browser state.',tests:[]};let failures=0;
for(const kind of ['button','reset']){
 try{
  const c=new JointCircuit(raw,sub,scope);await c.start(wasm);c.readBeam=async()=>new Float64Array();
  let s=await c.step(kind==='reset'?{reset:true}:{controls:[.184,.305],hits:[0]});
  while(!c.canCheckpoint())s=await c.step({});
  const key=kind==='reset'?'reset':'bl',expected=kind==='reset'?100:10,source=kind==='reset'?'reset_input':'button_l_input';
  assert.equal(c.inputValues[key],expected);const before=s.time;
  if(kind==='reset'){
   const run=c.runTo.bind(c);let inject=true;
   c.runTo=async(target,first)=>{if(inject&&first){inject=false;throw Error('Timestep too small; initial timepoint: injected restart test');}return run(target,first);};
   await c.checkpoint();assert.equal(c.restartRetries,1);assert.match(c.netlist,/itl4=200/);
   assert.equal(c.inputValues[key],expected);assert.ok(c.localTime>0&&c.localTime<.000051);
   const next=await c.step({});assert.ok(next.time>before&&next.time-before<.0051);assert.equal(c.inputValues[key],0);
   report.tests.push({name:'Reset voltage survives initial-point retry, then expires normally',passed:true,injectedFailure:true,retries:c.restartRetries});
  }else{
   const session=await c.exportSession();assert.equal(session.inputValues[key],expected);
   const fresh=new JointCircuit(raw,sub,scope);await fresh.restoreSession(session,wasm);fresh.readBeam=async()=>new Float64Array();
   assert.equal(fresh.inputValues[key],expected);
   const values=await fresh.spice.snapshot([`v(${source})`]);assert.ok(Math.abs(values[`v(${source})`]-expected)<1e-9);
   const next=await fresh.step({});assert.ok(next.time>before&&next.time-before<.0051);assert.equal(fresh.inputValues[key],0);
   report.tests.push({name:'Expired button source survives real fresh-WASM restore before release',passed:true,preservedSource_V:expected,timeAdvance_s:next.time-before});
  }
 }catch(error){failures++;report.tests.push({kind,passed:false,error:String(error.stack)});}
 await writeFile(new URL('../app/docs/restart-input-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));process.exitCode=failures?1:0;
