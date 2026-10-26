import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {SpiceSession,runDisplay,displayDeck,parseDisplay,displayMetrics,DISPLAY_COLUMNS} from '../app/display-circuit.js';

const root=new URL('../',import.meta.url),sub=await readFile(new URL('app/display-switch.cir',root),'utf8');
const spice=new SpiceSession();await spice.start(await readFile(new URL('app/vendor/spice.wasm',root)));
const report={release:'0.5.2',date:new Date().toISOString(),scope:'Discrete display timing/key bank with preliminary Ge device models and nominal DC supply ports. Numerical agreement is not historical calibration.',tests:[],metrics:{}};
let complete=false,baseline;
process.on('exit',()=>{if(!complete)process.exitCode=1;});
async function test(name,fn){try{
  const result=await fn();report.tests.push({name,...(result?.skipped?result:{passed:true})});console.log(result?.skipped?'SKIP':'PASS',name);
}catch(error){report.tests.push({name,passed:false,error:String(error.stack)});console.error('FAIL',name,String(error));}}
function clock(metrics){
  assert.ok(metrics.repeat_Hz>20&&metrics.repeat_Hz<70,'Missing divided clock');
  const f=metrics.frequency_Hz;assert.ok(Math.abs(f[0]/f[1]-2)<.02);assert.ok(Math.abs(f[1]/f[2]-1)<.01);
  assert.ok(metrics.selected_fraction[0]>.45&&metrics.selected_fraction[0]<.55);
  for(const duty of metrics.selected_fraction.slice(1))assert.ok(duty>.18&&duty<.32);
  assert.ok(metrics.overlap_fraction<.001,'Conflicting selectors');assert.ok(metrics.blank_fraction<.005,'Excessive blanking');
}
function compareBounded(ref,fast){
  const step=ref.options.sample,margin=Math.ceil(.0001/step),n=Math.min(ref.data.length,fast.data.length)/6;
  const excluded=new Uint8Array(n);let maxEdge=0,maxScope=0,sum=0,count=0;
  for(let i=1;i<n;i++){
    assert.ok(Math.abs(ref.data[i*6]-fast.data[i*6])<1e-9,'Observation grids differ');
    for(let j=1;j<=3;j++)if(Math.sign(ref.data[i*6+j])!==Math.sign(ref.data[(i-1)*6+j])||Math.sign(fast.data[i*6+j])!==Math.sign(fast.data[(i-1)*6+j])){
      excluded.fill(1,Math.max(0,i-margin),Math.min(n,i+margin+1));
    }
  }
  for(let j=0;j<3;j++)for(const time of ref.metrics.edge_times_s[j]){
    if(time>fast.options.duration-.001)continue;
    maxEdge=Math.max(maxEdge,Math.min(...fast.metrics.edge_times_s[j].map(t=>Math.abs(t-time))));
  }
  for(let i=0;i<n;i++)if(ref.data[i*6]>.04&&!excluded[i])for(let j=4;j<=5;j++){
    const error=Math.abs(ref.data[i*6+j]-fast.data[i*6+j]);maxScope=Math.max(maxScope,error);sum+=error*error;count++;
  }
  const frequency=Math.abs(ref.metrics.repeat_Hz-fast.metrics.repeat_Hz)/ref.metrics.repeat_Hz;
  const duty=Math.max(...ref.metrics.selected_fraction.map((v,i)=>Math.abs(v-fast.metrics.selected_fraction[i])));
  const m={relative_frequency_error:frequency,max_edge_difference_s:maxEdge,max_settled_scope_error_V:maxScope,
    settled_scope_RMS_error_V:Math.sqrt(sum/count),max_duty_difference:duty,excluded_transition_margin_s:.0001};
  assert.ok(frequency<.001,JSON.stringify(m));assert.ok(maxEdge<50e-6,JSON.stringify(m));
  assert.ok(maxScope<.01,JSON.stringify(m));assert.ok(m.settled_scope_RMS_error_V<.003,JSON.stringify(m));
  assert.ok(duty<.003,JSON.stringify(m));return m;
}
await test('Discrete astable and bistable select three channels without an external clock',async()=>{
  baseline=await runDisplay(spice,sub);clock(baseline.metrics);
  report.metrics.baseline={...baseline.metrics,wall_s:baseline.wall_s,options:baseline.options};
});
await test('Reducing maximum step from 20 us to 2 us preserves the cycle',async()=>{
  const fine=await runDisplay(spice,sub,{maxStep:2e-6});clock(fine.metrics);
  const difference=Math.abs(fine.metrics.repeat_Hz-baseline.metrics.repeat_Hz);
  const duty=Math.max(...fine.metrics.selected_fraction.map((v,i)=>Math.abs(v-baseline.metrics.selected_fraction[i])));
  report.metrics.stepConvergence={maxSteps_s:[20e-6,2e-6],frequency_difference_Hz:difference,max_duty_difference:duty};
  assert.ok(difference<.03,`Frequency drift ${difference} Hz`);assert.ok(duty<.003,`Duty drift ${duty}`);
});
await test('Bounded profile speeds the same circuit within declared error limits',async()=>{
  const fast=await runDisplay(spice,sub,{accuracy:'bounded',duration:.24});clock(fast.metrics);
  const errors=compareBounded(baseline,fast);
  const short=await runDisplay(spice,sub,{accuracy:'bounded'});clock(short.metrics);
  report.metrics.boundedProfile={errors,same_window_s:.24,reference_wall_s:baseline.wall_s,bounded_wall_s:fast.wall_s,
    same_window_speedup:baseline.wall_s/fast.wall_s,short_window_s:short.options.duration,short_wall_s:short.wall_s,
    limits:{relative_frequency_error:.001,max_edge_difference_s:50e-6,max_settled_scope_error_V:.01,settled_scope_RMS_error_V:.003,max_duty_difference:.003}};
});
await test('Every selected key passes its own input and rejects the other axis',async()=>{
  const results=[];
  for(const [index,name] of ['av','ah','bv','bh','cv','ch'].entries()){
    const chosen=Math.floor(index/2),axis=index%2===0?2:1;
    const deck='Key DC transfer\n'+['av','ah','bv','bh','cv','ch'].map(n=>`V${n} ${n} 0 0`).join('\n')+'\n'+
      ['a','b','c'].map((n,j)=>`V${n} ${n} 0 ${j===chosen?-6:6}`).join('\n')+
      '\nXkeys av ah bv bh cv ch sy sx a b c TFT_KEYS\nRy sy 0 1meg\nRx sx 0 1meg\n.temp 25\n'+sub+'\n.end\n';
    await spice.load(deck);await spice.commands([`dc v${name} -10 10 10`,'set wr_singlescale','set numdgt=15','wrdata /keys.dat v(sx) v(sy)']);
    const rows=spice.read('/keys.dat').trim().split('\n').map(l=>l.trim().split(/\s+/).map(Number));
    assert.equal(rows.length,3);const gain=(rows[2][axis]-rows[0][axis])/20;
    const cross=(rows[2][axis===1?2:1]-rows[0][axis===1?2:1])/20;
    assert.ok(gain>.01&&gain<.03,`${name} gain ${gain}`);assert.ok(Math.abs(cross)<1e-7,`${name} cross-axis ${cross}`);
    results.push({input:name,selected_gain:gain,cross_axis_gain:cross});
  }
  report.metrics.keyTransfers=results;
});
await test('Inactive key input remains isolated from the common output',async()=>{
  const prefix='Key isolation\nVa a 0 -6\nVb b 0 6\nVc c 0 6\n'+
    ['av','ah','bv','bh','cv','ch'].map(n=>`V${n} ${n} 0 0`).join('\n')+
    '\nXkeys av ah bv bh cv ch sy sx a b c TFT_KEYS\nRy sy 0 1meg\nRx sx 0 1meg\n.temp 25\n';
  await spice.load(prefix+sub+'\n.end\n');
  await spice.commands(['dc vbv -10 10 10','set wr_singlescale','set numdgt=15','wrdata /isolation.dat v(sy)']);
  const rows=spice.read('/isolation.dat').trim().split('\n').map(l=>l.trim().split(/\s+/).map(Number));
  const leak=(rows[2][1]-rows[0][1])/20;report.metrics.inactive_key_gain=leak;assert.ok(Math.abs(leak)<1e-5);
});
await test('Test sweep sources produce nonconstant scope outputs through the key bank',async()=>{
  const r=await runDisplay(spice,sub,{mode:'sweeps',duration:.12});clock(r.metrics);
  const fast=await runDisplay(spice,sub,{mode:'sweeps',accuracy:'bounded'});clock(fast.metrics);
  const boundedErrors=compareBounded(r,fast);
  const range=index=>{const values=[];for(let k=0;k<r.data.length;k+=6)if(r.data[k]>.04)values.push(r.data[k+index]);return Math.max(...values)-Math.min(...values);};
  report.metrics.sweepOutputs={scope_X_range_V:range(4),scope_Y_range_V:range(5),wall_s:r.wall_s,bounded_errors:boundedErrors};
  assert.ok(range(4)>2);assert.ok(range(5)>.4);
});
await test('Captured U7/U2 values are transmitted by channel A',async()=>{
  const base=await runDisplay(spice,sub,{mode:'sweeps',duration:.12});
  const frame=await runDisplay(spice,sub,{mode:'snapshot',ballX:37.5,ballY:48,accuracy:'bounded'});
  clock(frame.metrics);
  const selected=data=>{const xy=[[],[]];for(let k=6;k<data.length;k+=6)if(data[k]>.04&&data[k+1]<0&&data[k-5]<0){xy[0].push(data[k+4]);xy[1].push(data[k+5]);}return xy.map(a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)]);};
  const a=selected(base.data),b=selected(frame.data),gain=.0188488398685;
  assert.ok(Math.abs((b[0]-a[0])-77.5*gain)<.005);
  assert.ok(Math.abs((b[1]-a[1])-28*gain)<.005);
  report.metrics.capturedFrame={U7_X_V:37.5,U2_Y_V:48,selected_output_change_V:b.map((v,i)=>v-a[i]),expected_change_V:[77.5*gain,28*gain]};
});
await test('Exposed model variations retain three-phase operation',async()=>{
  const results=[];
  for(const options of [{beta:50},{beta:100},{temperature:10},{temperature:40},
    {beta:50,temperature:10},{beta:50,temperature:40},{beta:100,temperature:10},{beta:100,temperature:40}]){
    const r=await runDisplay(spice,sub,{...options,duration:.12});clock(r.metrics);
    const fast=await runDisplay(spice,sub,{...options,accuracy:'bounded'});clock(fast.metrics);
    results.push({options,repeat_Hz:r.metrics.repeat_Hz,selected_fraction:r.metrics.selected_fraction,bounded_errors:compareBounded(r,fast)});
  }
  report.metrics.sensitivity=results;
});
await test('Native ngspice and WASM agree on identical discrete network and sources',async()=>{
  if(!process.env.NGSPICE)return {skipped:true,reason:'Set NGSPICE to the matching native binary'};
  const dir=await mkdtemp(join(tmpdir(),'tft-display-')),out=join(dir,'native.dat'),log=join(dir,'native.log'),cir=join(dir,'native.cir');
  const o=baseline.options;
  const control=`\n.control\nset numdgt=15\ntran ${o.sample} ${o.duration} 0 ${o.maxStep} uic\nlinearize ${DISPLAY_COLUMNS.join(' ')}\nset wr_singlescale\nwrdata ${out} ${DISPLAY_COLUMNS.join(' ')}\nquit\n.endc\n.end\n`;
  await writeFile(cir,displayDeck(sub,o).replace(/\n\.end\s*$/i,control));
  const proc=spawnSync(process.env.NGSPICE,['-b','-o',log,cir],{encoding:'utf8',timeout:45000});
  assert.equal(proc.status,0,proc.stderr||proc.error?.message);const logText=await readFile(log,'utf8');
  assert.ok(!/timestep too small|simulation.*aborted|fatal error/i.test(logText),logText);
  let native=parseDisplay(await readFile(out,'utf8'));if(native[0]===0)native=native.slice(6);assert.equal(native.length,baseline.data.length);
  let max=0,maxScope=0;
  for(let k=0;k<native.length;k++){
    const err=Math.abs(native[k]-baseline.data[k]);
    if(k%6===0)assert.ok(err<1e-10);else max=Math.max(max,err);
    if(k%6>=4)maxScope=Math.max(maxScope,err);
  }
  report.metrics.nativeComparison={rows:native.length/6,max_voltage_difference_V:max,max_scope_difference_V:maxScope,frequency_difference_Hz:Math.abs(displayMetrics(native).repeat_Hz-baseline.metrics.repeat_Hz)};
  assert.ok(max<.03,`Native/WASM voltage difference ${max} V`);assert.ok(maxScope<.005,`Scope difference ${maxScope} V`);
});
report.hashes={};
for(const file of ['app/display-switch.cir','app/display-circuit.js','app/spice-session.js','app/vendor/spice.wasm'])report.hashes[file]=createHash('sha256').update(await readFile(new URL(file,root))).digest('hex');
report.passed=report.tests.filter(x=>x.passed).length;report.failed=report.tests.filter(x=>x.passed===false).length;
await writeFile(new URL('app/docs/display-validation.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,metrics:report.metrics},null,2));
complete=true;process.exit(report.failed?1:0);
