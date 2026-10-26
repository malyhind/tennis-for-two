import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {ControllerMechanics,CONTROLLER_MODEL as M} from '../app/controller-mechanics.js';
const report={release:'0.8.1',dateUTC:new Date().toISOString(),scope:'Planck controller dynamics and input semantics; numerical checks of the declared proxy, not measurements of the lost controls.',tests:[],metrics:{}};
const run=(c,seconds,frame=.001)=>{for(let t=0;t<seconds-1e-10;t+=frame)c.advance(Math.min(frame,seconds-t));};
async function test(name,fn){try{await fn();report.tests.push({name,passed:true});console.log('PASS',name);}catch(e){report.tests.push({name,passed:false,error:String(e.stack)});console.error('FAIL',name,String(e));}}
await test('Default mechanics has inertia; ordinary target commands cannot teleport a shaft',()=>{
  const c=new ControllerMechanics({control:.5});c.setTarget(.8);assert.equal(c.control,.5);c.advance(.001);assert.ok(c.control>.5&&c.control<.8);run(c,.3);assert.ok(Math.abs(c.control-.8)<.003);
});
await test('Releasing a rotating shaft dissipates kinetic energy and comes to rest',()=>{
  const c=new ControllerMechanics();c.rotor.setAngularVelocity(4);let energy=Infinity;
  for(let i=0;i<300;i++){c.advance(.001);const next=.5*M.knob.inertia_kg_m2*c.rotor.getAngularVelocity()**2;assert.ok(next<=energy+1e-12);energy=next;}
  assert.equal(c.rotor.getAngularVelocity(),0);
});
await test('Historical torque range and button spring sensitivity preserve limits and actuation',()=>{
  const rows=[];
  for(const frictionScale of [1,1.25])for(const springScale of [.5,1,1.5]){
    const c=new ControllerMechanics({frictionScale,springScale});c.setTarget(.75);run(c,.3);assert.ok(Math.abs(c.control-.75)<.005);
    c.pulse();let closeAt=null;
    for(let k=1;k<=250;k++){c.advance(.001);if(c.drainEdges().includes('close')&&closeAt===null)closeAt=k;assert.ok(c.depth>=0&&c.depth<=M.button.travel_m);}
    assert.ok(closeAt>0&&closeAt<30);assert.equal(c.closed,false);assert.ok(c.depth<1e-5);rows.push({frictionScale,springScale,close_ms:closeAt});
  }
  report.metrics.sensitivity=rows;
});
await test('Home and End load the physical stops; reversal takes up finite coupling play',()=>{
  const c=new ControllerMechanics();for(const target of [0,1,0]){c.setTarget(target);run(c,.8);assert.ok(Math.abs(c.control-target)<1e-6);assert.ok(Math.abs(c.angle)<=M.knob.travel_rad/2+.002);}
  c.syncControl(.5);const initial=c.control;c.rotor.setTransform({x:0,y:0},.001);c.step();assert.ok(Math.abs(c.control-initial)<.0001);
});
await test('Press, hold and release yield one close edge and one return edge',()=>{
  const c=new ControllerMechanics();c.setHeld(true);let edges=[];for(let k=0;k<1000;k++){c.advance(.001);edges.push(...c.drainEdges());}
  assert.deepEqual(edges,['close']);assert.equal(c.closed,true);assert.ok(c.depth>.0029);
  c.setHeld(false);run(c,.15);assert.deepEqual(c.drainEdges(),['open']);assert.ok(c.depth<1e-5);assert.equal(c.closed,false);
});
await test('A short tap completes one stroke; retriggering while down does not autofire',()=>{
  const c=new ControllerMechanics();c.setHeld(true);c.setHeld(false);assert.equal(c.pulse(),false);run(c,.2);assert.deepEqual(c.drainEdges(),['close','open']);
});
await test('Disabling mechanics preserves angle, cancels a pending press and restores direct input',()=>{
  const c=new ControllerMechanics();c.setTarget(.75);run(c,.3);const v=c.control;c.pulse();c.setEnabled(false);assert.equal(c.control,v);assert.equal(c.depth,0);assert.deepEqual(c.drainEdges(),[]);
  c.setTarget(.23);assert.ok(Math.abs(c.control-.23)<1e-12);c.pulse();assert.deepEqual(c.drainEdges(),['close']);c.setEnabled(true);run(c,.2);assert.deepEqual(c.drainEdges(),[]);assert.equal(c.closed,false);
});
await test('Fixed integration is independent of presentation frame chunks',()=>{
  const a=new ControllerMechanics(),b=new ControllerMechanics();for(const c of [a,b]){c.setTarget(.22);c.pulse();}
  run(a,1,.001);run(b,1,1/60);assert.ok(Math.abs(a.control-b.control)<1e-12);assert.ok(Math.abs(a.angle-b.angle)<1e-12);assert.deepEqual(a.drainEdges(),b.drainEdges());
});
await test('Halving the step bounds angular trace differences and contact timing',()=>{
  const a=new ControllerMechanics({control:.5}),b=new ControllerMechanics({control:.5,stepSeconds:M.step_s/2});a.setTarget(.8);b.setTarget(.8);a.pulse();b.pulse();let angle=0,first=[null,null];
  for(let k=1;k<=300;k++){a.advance(.001);b.advance(.001);angle=Math.max(angle,Math.abs(a.angle-b.angle));[a,b].forEach((c,i)=>{if(c.drainEdges().includes('close')&&first[i]===null)first[i]=k;});}
  assert.ok(angle<Math.PI/180*1.2,`angle difference ${angle}`);assert.ok(Math.abs(first[0]-first[1])<=1);report.metrics.refinement={maxAngleDifference_deg:angle*180/Math.PI,closure_ms:first,step_s:[M.step_s,M.step_s/2]};
});
await test('Four-body controller cost fits a small fraction of a 60 Hz frame on this host',()=>{
  const controls=[new ControllerMechanics(),new ControllerMechanics()],start=performance.now();
  for(let k=0;k<20000;k++)for(let i=0;i<2;i++){if(k%100===0)controls[i].setTarget(.5+.3*Math.sin(k*.001+i));if(k%500===0)controls[i].pulse();controls[i].advance(.001);controls[i].drainEdges();}
  const wall=performance.now()-start;report.metrics.performance={host:'Linux/Node; not M1 or browser FPS',mechanisms:2,dynamicBodies:4,simulated_s:20,wall_ms:wall,equivalent60HzFrame_ms:wall/1200};assert.ok(wall/1200<2);
});
report.passed=report.tests.filter(t=>t.passed).length;report.failed=report.tests.length-report.passed;
await writeFile(new URL('../app/docs/mechanics-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,metrics:report.metrics}));process.exitCode=report.failed?1:0;
