import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {SpiceSession} from '../app/spice-session.js';
import {TennisCircuit} from '../app/circuit.js';

const root=new URL('../',import.meta.url);
const bytes=await readFile(new URL('app/vendor/spice.wasm',root));
const netlist=await readFile(new URL('app/tennis.cir',root),'utf8');
const spice=new SpiceSession();await spice.start(bytes);
const report={profile:'gremlin-tennis-spice-0.3.1',date:new Date().toISOString(),
  scope:'Numerical and functional checks of this declared macromodel; no measurement of original hardware.',
  solver:(await spice.commands(['version'])).join('\n'),tests:[],metrics:{}};
let completed=false;
process.on('exit',()=>{if(!completed)process.exitCode=1;});
const close=(a,b,tolerance)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b} (limit ${tolerance})`);
async function test(name,fn){
  const begin=performance.now();try{
    const result=await fn();
    if(result?.skipped){report.tests.push({name,...result});console.log('SKIP',name,result.reason);return;}
    report.tests.push({name,passed:true,seconds:(performance.now()-begin)/1000});console.log('PASS',name);
  }
  catch(error){report.tests.push({name,passed:false,error:String(error.stack)});console.error('FAIL',name,String(error));}
}
async function simple(text,commands,nodes){await spice.load(text);await spice.commands(commands);return spice.snapshot(nodes);}
async function game(options={}){
  const c=new TennisCircuit(netlist,options);c.spice=spice;
  if(options.controls)c.controls=options.controls;if(options.gravity)c.gravity=options.gravity;
  await c.start();return c;
}

await test('Pinned WASM bytes match the declared modified build',async()=>{
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'7e92084ce97153e5288919cfcd64a2255dad37a7e5d9abf2d1350f09df667a5c');
});
await test('RC charge and altered-source resume retain charge',async()=>{
  let s=await simple('RC\nV1 in 0 10\nR1 in out 50k\nC1 out 0 1u ic=0\n.save v(out)\n.end',
    ['stop when time = .01','stop when time = .02','tran 10u .03 0 10u uic'],['v(out)']);
  close(s['v(out)'],10*(1-Math.exp(-.01/.05)),1e-5);
  await spice.commands(['alter V1 = 0','resume']);s=await spice.snapshot(['v(out)']);
  close(s['v(out)'],10*(1-Math.exp(-.01/.05))*Math.exp(-.01/.05),2e-5);
});
await test('R-L coil current agrees with analytic transient',async()=>{
  const s=await simple('RL\nV1 in 0 10\nR1 in a 10k\nL1 a 0 10 ic=0\n.save i(l1)\n.end',
    ['tran 1u .001 0 1u uic'],['i(l1)']);
  close(s['i(l1)'],.001*(1-Math.exp(-1)),2e-9);
});
await test('Capacitor switching gives charge-sharing bounce without reset',async()=>{
  const s=await simple('Charge sharing\nVgate gate 0 PULSE(0 100 .01 1u 1u 1 2)\nC1 a 0 1u ic=10\nC2 b 0 10u ic=-10\nS1 a b gate 0 SW1\n.model SW1 SW(Ron=50 Roff=1e12 Vt=50 Vh=5)\n.save v(a) v(b)\n.end',
    ['tran 10u .02 0 10u uic'],['v(a)','v(b)']);
  close(s['v(a)'],-90/11,1e-6);close(s['v(b)'],-90/11,1e-6);
});
await test('Finite amplifier gain and rail saturation',async()=>{
  const sub=netlist.match(/\.subckt OA[\s\S]*?\.ends OA/)[0];
  const prefix='OA check\n.param A0=10k FP=1 VRAIL=110 ROUT=100\n.global railp railm\nVp railp 0 110\nVm railm 0 -110\n.model DCLAMP D(Is=1e-12 N=1 Rs=1)\n';
  let s=await simple(prefix+sub+'\nVin in 0 .001\nX1 in out OA\nRload out 0 1meg\n.save v(out)\n.end',
    ['tran 1m 1.5 0 1m uic'],['v(out)']);close(s['v(out)'],-10,0.003);
  s=await simple(prefix+sub+'\nVin in 0 1\nX1 in out OA\nRload out 0 1meg\n.save v(out)\n.end',
    ['tran 1m .1 0 1m uic'],['v(out)']);assert.ok(s['v(out)'] < -109&&s['v(out)']>-112);
});
await test('Malformed simulator command fails explicitly',async()=>{
  await assert.rejects(()=>spice.commands(['stop when time >= 1']),/Syntax error/);
});
let reference=[];
await test('Serve, opponent interlock and two electrical returns',async()=>{
  const c=await game();let s=c.last,returns=0,hitCount=0,maxPositionChange=0;
  assert.deepEqual(s.can,[true,false]);
  for(let i=0;i<260;i++){
    let hits=i===0?[0]:[];
    if(s.mode&&s.eligible===1&&s.x>25){hits=[1];returns++;}
    if(s.mode&&s.eligible===0&&s.x < -25){hits=[0];returns++;}
    // A repeated button press during the shooter's locked interval is ignored
    // by the circuit's interlock, even if the host sends the voltage pulse.
    if(i===12)hits=[0];
    const old=s;s=await c.step({hits});reference.push(s);
    if(s.events&1)hitCount++;
    maxPositionChange=Math.max(maxPositionChange,Math.abs(s.x-old.x),Math.abs(s.y-old.y));
    if(i===12)assert.equal(s.relays.bank,0);
    assert.ok(s.can.filter(Boolean).length<=1);
  }
  assert.ok(returns>=2);assert.ok(hitCount>=3);assert.ok(maxPositionChange<3);
  report.metrics.rally={returns,hitCount,maxPositionChange_V:maxPositionChange};
});
await test('Net and ground bounces arise in switched holding networks',async()=>{
  const c=await game({controls:[0,0],gravity:100});let s=c.last,events=0,minY=100,ended=false;
  for(let i=0;i<150;i++){s=await c.step({hits:i===0?[0]:[]});events|=s.events;minY=Math.min(minY,s.y);if(s.reason)ended=true;}
  assert.ok(events&4,'No net relay event');assert.ok(events&2,'No ground relay event');
  assert.ok(ended,'Court-limit relay did not end the rally');assert.equal(s.mode,0);
  assert.ok(minY>-2,'Excessive ground penetration');
  report.metrics.bounces={eventMask:events,minHeight_V:minY};
});
await test('Right end selects right serve; manual reset restores left',async()=>{
  const c=await game();let s=c.last;
  for(let i=0;i<155;i++)s=await c.step({hits:i===0?[0]:[]});
  assert.equal(s.mode,0);assert.equal(s.server,1);close(s.x,62,.02);
  for(let i=0;i<15;i++)s=await c.step({reset:i===0});
  assert.equal(s.mode,0);assert.equal(s.server,0);close(s.x,-62,.02);
  assert.deepEqual(s.can,[true,false]);
});
await test('Rolling C/L checkpoints preserve an active rally',async()=>{
  const c=await game({rebaseSeconds:.5});let s=c.last,maxError=0,returns=0;
  for(let i=0;i<reference.length;i++){
    let hits=i===0?[0]:[];
    if(s.mode&&s.eligible===1&&s.x>25){hits=[1];returns++;}
    if(s.mode&&s.eligible===0&&s.x < -25){hits=[0];returns++;}
    if(i===12)hits=[0];
    s=await c.step({hits});
    maxError=Math.max(maxError,Math.abs(s.x-reference[i].x),Math.abs(s.y-reference[i].y));
    close(s.time,reference[i].time,1e-9);
  }
  assert.ok(s.checkpoints>=6);assert.ok(returns>=2);assert.ok(maxError<.005,`Checkpoint error ${maxError} V`);
  report.metrics.checkpoints={count:s.checkpoints,maxPositionError_V:maxError,limit_V:.005};
});
await test('Halving maximum integration step converges on the rally',async()=>{
  const c=await game({maxStep:.0005});let s=c.last,maxError=0;
  for(let i=0;i<reference.length;i++){
    let hits=i===0?[0]:[];
    if(s.mode&&s.eligible===1&&s.x>25)hits=[1];
    if(s.mode&&s.eligible===0&&s.x < -25)hits=[0];
    if(i===12)hits=[0];s=await c.step({hits});
    maxError=Math.max(maxError,Math.abs(s.x-reference[i].x),Math.abs(s.y-reference[i].y));
  }
  report.metrics.stepConvergence={maxPositionError_V:maxError,maxSteps_s:[.001,.0005],limit_V:.01};
  assert.ok(maxError<.01,`Step convergence error ${maxError} V`);
});
await test('Default 30-second rolling window bounds the saved plot',async()=>{
  const c=await game();let s=c.last;
  for(let i=0;i<3300;i++)s=await c.step();
  const text=(await spice.commands(['let saved_points = length(time)','print saved_points'])).join('\n');
  const count=Number(text.match(/saved_points\s*=\s*([-+0-9.eE]+)/)[1]);
  assert.equal(s.checkpoints,2);assert.ok(count<7000);close(s.time,66,1e-7);
  report.metrics.boundedHistory={simulated_s:s.time,checkpoints:s.checkpoints,savedPointsAfterSecondCheckpoint:count,
    wasmHeapBytes:spice.module.HEAPU8?.byteLength||null};
});

await test('Stable solver tolerances agree with the previous strict profile',async()=>{
  const input=k=>({controls:[.58,.62],hits:k===0?[0]:k===85?[1]:k===145?[0]:[]});
  const stable=await game(),history=[];
  for(let k=0;k<160;k++)history.push(await stable.step(input(k)));
  const strict=new TennisCircuit(netlist.replace('reltol=1e-5 abstol=1e-9 vntol=1e-6 chgtol=1p','reltol=1e-6 abstol=1e-10 vntol=1e-7'));
  strict.spice=spice;await strict.start();let max=0;
  for(let k=0;k<160;k++){const v=await strict.step(input(k));max=Math.max(max,Math.abs(v.x-history[k].x),Math.abs(v.y-history[k].y));}
  assert.ok(max<.01,`Tolerance profile drift ${max} V`);
  report.metrics.solverToleranceComparison={simulated_s:3.2,maxPositionError_V:max,limit_V:.01,reference_reltol:1e-6,stable_reltol:1e-5};
});

const numericalNetlist=netlist.replace('VbuttonL button_l_input 0 0','VbuttonL button_l_input 0 PWL(0 0 .25 0 .25000001 10 .31 10 .31000001 0)')
  .replace('VbuttonR button_r_input 0 0','VbuttonR button_r_input 0 PWL(0 0 1.75 0 1.75000001 10 1.81 10 1.81000001 0)');
let wholeRun;
const columns=['v(x)','v(y)','v(u1)','v(u6)'];
const parse=data=>data.trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number));
await test('Continuous and sliced transient agree on the same netlist',async()=>{
  await spice.load(numericalNetlist);
  await spice.commands(['tran 1m 3 0 1m uic','set wr_singlescale','set numdgt=15','wrdata /whole.dat '+columns.join(' ')]);
  wholeRun=parse(spice.read('/whole.dat'));
  await spice.load(numericalNetlist);let maxError=0,stopId=null;
  for(let k=1;k<=150;k++){
    const target=k*.02;
    const status=(await spice.commands([...(stopId?[`delete ${stopId}`]:[]),`stop when time > ${target-1e-10}`,'status'])).join('\n');
    stopId=Number(status.match(/(?:^|\n)(\d+)\s+stop\s+when time/)[1]);
    await spice.commands([k===1?'tran 1m 3.1 0 1m uic':'resume']);
    const sample=await spice.snapshot(columns);
    const row=wholeRun.reduce((best,r)=>Math.abs(r[0]-target)<Math.abs(best[0]-target)?r:best);
    close(sample.time,row[0],1e-9);
    columns.forEach((n,i)=>{maxError=Math.max(maxError,Math.abs(sample[n]-row[i+1]));});
  }
  assert.ok(maxError<.03,`Slicing error ${maxError} V`);
  report.metrics.slicedTransient={maxOutputError_V:maxError,limit_V:.03};
});
await test('Native ngspice and WASM agree on identical circuit and inputs',async()=>{
  const binary=process.env.NGSPICE;
  if(!binary)return {skipped:true,reason:'Set NGSPICE to native binary'};
  const work=await mkdtemp(join(tmpdir(),'tennis-spice-'));
  const out=join(work,'native.dat'),log=join(work,'native.log'),cir=join(work,'native.cir');
  const control=`\n.control\nset numdgt=15\ntran 1m 3 0 1m uic\nset wr_singlescale\nwrdata ${out} ${columns.join(' ')}\nquit\n.endc\n.end\n`;
  await writeFile(cir,numericalNetlist.replace(/\n\.end\s*$/i,control));
  const p=spawnSync(binary,['-b','-o',log,cir],{encoding:'utf8',timeout:60000});
  assert.equal(p.status,0,p.stderr||p.error?.message);
  const nativeLog=await readFile(log,'utf8');assert.ok(!/Timestep too small|simulation.*aborted|fatal error/i.test(nativeLog),nativeLog);
  const native=parse(await readFile(out,'utf8'));assert.equal(native.length,wholeRun.length);
  const errors=[0,0,0,0];let worst={error_V:0};
  native.forEach((row,k)=>{
    close(row[0],wholeRun[k][0],1e-9);
    for(let j=1;j<row.length;j++){
      const error=Math.abs(row[j]-wholeRun[k][j]);errors[j-1]=Math.max(errors[j-1],error);
      if(error>worst.error_V)worst={error_V:error,time_s:row[0],node:columns[j-1],native_V:row[j],wasm_V:wholeRun[k][j]};
    }
  });
  report.metrics.nativeComparison={maxErrors_V:Object.fromEntries(columns.map((n,i)=>[n,errors[i]])),worst,rows:native.length,banner:p.stdout.split('\n').slice(0,9).join('\n')};
  assert.ok(Math.max(errors[0],errors[1])<.005,`Native/WASM position error ${errors.slice(0,2)} V`);
  assert.ok(Math.max(errors[2],errors[3])<.1,`Native/WASM velocity-output error ${errors.slice(2)} V`);
});

report.hashes={};for(const name of ['app/tennis.cir','app/circuit.js','app/spice-session.js','app/vendor/spice.wasm'])report.hashes[name]=createHash('sha256').update(await readFile(new URL(name,root))).digest('hex');
report.passed=report.tests.filter(t=>t.passed).length;report.failed=report.tests.filter(t=>t.passed===false).length;
await mkdir(new URL('app/docs/',root),{recursive:true});
await writeFile(new URL('app/docs/validation.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,metrics:report.metrics},null,2));
completed=true;
process.exit(report.failed?1:0);
