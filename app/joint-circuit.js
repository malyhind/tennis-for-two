import {TennisCircuit} from './circuit.js';
import {INSTRUMENT_CIRCUIT} from './instrument-model.js';

// Port of the existing research coupledDeck, now used by the playable instrument.
// Every circuit component shares one ngspice transient and one adaptive clock.
export const JOINT_MAX_STEP=50e-6;
export const SAMPLE_PERIOD=.005;
export const BEAM_COLUMNS=['v(plate_x)','v(plate_y)','v(beam_i)'];
export const JOINT_PROFILE=Object.freeze({version:'0.7.0',maxStep:JOINT_MAX_STEP,
  reltol:1e-4,abstol:1e-9,vntol:1e-6,checkpointSeconds:.5,
  sweepHz:60,output:'adaptive solver points; no interp/linearize in the live session'});
const displayState=['base_l','base_r','emit_l','emit_r','ff_bl','ff_br','ff_el','ff_er','ff_l','ff_r','osc_l','osc_r','pulse_tap','trigger']
  .map(n=>`v(xdisplay.${n})`);
for(const key of ['ah','av','bh','bv','ch','cv'])for(const terminal of ['b','c'])displayState.push(`v(xdisplay.xkeys.${key}_${terminal})`);
const scopeState=['pole_x','pole_y'].map(n=>`v(xscope.${n})`);

export function jointDeck(raw,switchCircuit,scopeCircuit,{reltol=JOINT_PROFILE.reltol,epoch=0}={}){
  if(!Number.isFinite(epoch)||!Number.isFinite(reltol)||reltol<=0)throw Error('Invalid joint parameters');
  // ngspice 45.2's persistent interp flag is inappropriate for these dense
  // resumed plots. Keep actual accepted points, including switching transients.
  return raw.replace(/^\.options interp\s*$/m,'')
    .replace(/^\.options method=.*$/m,`.options method=gear maxord=2 reltol=${reltol} abstol=1e-9 vntol=1e-6 chgtol=1p`)
    .replace(/\n\.end\s*$/i,'\n')+`
* One electrical solve: computer, loaded line controls, passive supply,
* all fifteen PNP selectors and the declared scope terminal macro.
.param DISPLAY_EPOCH=${epoch.toPrecision(17)}
Bmains mains 0 V=165.4629867976521*sin(376.9911184307752*(time+DISPLAY_EPOCH))
Xinstrument mains net_v net_h court_v court_h dpp12 dpp6 dmm6 dmm22 TFT_INSTRUMENT
Xdisplay y x net_v net_h court_v court_h screen_y screen_x phase_a phase_b phase_c dpp12 dpp6 dmm6 dmm22 TFT_DISPLAY BETA=75
Xscope screen_x screen_y plate_x plate_y beam_i TFT_SCOPE
.ic v(xdisplay.base_l)=.01 v(xdisplay.base_r)=.02 v(xdisplay.ff_bl)=.01 v(xdisplay.ff_br)=.02
.temp 25
* Keep capacitor/selector states and probes, rather than all algebraic branch
* currents. The circuit solve is identical; only stored plot size changes.
.save ${[...displayState,...scopeState,'v(plate_x)','v(plate_y)','v(beam_i)','v(screen_x)','v(screen_y)','v(phase_a)','v(phase_b)','v(phase_c)','v(net_v)','v(court_h)'].join(' ')}
.save all
${switchCircuit}
${scopeCircuit}
${INSTRUMENT_CIRCUIT}
.end
`;
}

export class JointCircuit extends TennisCircuit{
  constructor(raw,switchCircuit,scopeCircuit,{rebaseSeconds=JOINT_PROFILE.checkpointSeconds,reltol=JOINT_PROFILE.reltol,maxStep=JOINT_MAX_STEP,automaticCheckpoints=true}={}){
    super(jointDeck(raw,switchCircuit,scopeCircuit,{reltol}),{maxStep,rebaseSeconds});
    this.beamIndex=0;this.epoch=0;this.voltageNodes=null;this.totalPoints=0;this.restartRetries=0;
    this.telemetry={stepWallMs:0,totalWallMs:0,steps:0};
    this.automaticCheckpoints=automaticCheckpoints;
  }
  async load(netlist){
    await super.load(netlist);this.beamIndex=0;
  }
  async runTo(target,first=this.fresh){
    const commands=[...(this.breakpoint!==null?[`delete ${this.breakpoint}`]:[]),
      `stop when time > ${(target-1e-10).toPrecision(17)}`,'status'];
    const status=(await this.spice.commands(commands)).join('\n');
    const match=status.match(/(?:^|\n)(\d+)\s+stop\s+when time/);
    if(!match)throw Error('Missing joint transient breakpoint: '+status);
    this.breakpoint=Number(match[1]);
    await this.spice.commands([first?`tran 20u ${Math.max(2,this.rebaseSeconds+1)} 0 ${this.maxStep} uic`:'resume']);
    const actual=(await this.spice.snapshot([])).time;
    // A breakpoint stops at an accepted adaptive point, rather than inventing
    // an interpolated state. Carry this actual clock into the next interval.
    if(actual<target-1e-7||actual>target+this.maxStep+1e-7)throw Error(`Joint clock mismatch: ${actual} / ${target}`);
    this.localTime=actual;this.fresh=false;
  }
  async sample(){
    const state=await super.sample();
    state.beam=await this.readBeam();
    state.scope={profile:JOINT_PROFILE.version,points:this.totalPoints,heapBytes:this.spice.module.HEAPU8.length,restartRetries:this.restartRetries,...this.telemetry};
    return state;
  }
  async readBeam(){
    const begin=this.beamIndex;
    this.lastBeamStart=begin;
    const names=['beam_px','beam_py','beam_current'];
    await this.spice.commands([
      `let beam_time = time[${begin},frame_index]`,
      ...BEAM_COLUMNS.map((node,i)=>`let ${names[i]} = ${node}[${begin},frame_index]`),
      'setscale beam_time','set wr_singlescale','set numdgt=17',
      'wrdata /beam.dat '+names.join(' '),'setscale time'
    ]);
    const text=this.spice.read('/beam.dat').trim();
    this.spice.module.FS.unlink('/beam.dat');
    const lines=text?text.split('\n'):[];
    const data=new Float64Array(lines.length*4);let count=0;
    for(const line of lines){
      const row=line.trim().split(/\s+/).map(Number);
      if(row.length!==4||row.some(x=>!Number.isFinite(x)))throw Error('Invalid live beam trace');
      const time=this.origin+row[0];
      if(time<-.08)continue; // Only the recent warm-up lights the initial screen.
      data.set([time,row[1],row[2],row[3]],count*4);count++;
    }
    this.beamIndex=this.previousIndex+1;this.totalPoints+=count;
    await this.spice.commands(['unlet beam_time '+names.join(' ')]);
    return data.slice(0,count*4);
  }
  async step(input={}){
    const begin=performance.now();
    if(this.automaticCheckpoints&&this.localTime>=this.rebaseSeconds&&this.resetUntil<=this.origin+this.localTime&&this.buttons.every(t=>t<=this.origin+this.localTime))await this.checkpoint();
    await this.applyInputs(input);await this.runTo(this.localTime+SAMPLE_PERIOD);
    const state=await this.sample();
    this.telemetry.stepWallMs=performance.now()-begin;
    this.telemetry.totalWallMs+=this.telemetry.stepWallMs;this.telemetry.steps++;
    Object.assign(state.scope,this.telemetry);
    return state;
  }
  async prepareCheckpoint(){
    const operatingInputs={...this.inputValues};
    // Discover the exposed capacitor-node set from ngspice, not a second
    // manually maintained copy of the transistor wiring.
    if(!this.voltageNodes){
      const display=(await this.spice.commands(['display'])).join('\n');
      this.voltageNodes=[...display.matchAll(/^\s*(\S+)\s*:\s*voltage,/gm)].map(m=>m[1]).filter(n=>!n.startsWith('beam_')&&!n.startsWith('peak_')).map(n=>`v(${n})`);
      if(this.voltageNodes.length<80)throw Error('Incomplete joint checkpoint node inventory');
    }
    const nodes=[...this.voltageNodes,...['ground','net','run','end','centre','hitl','hitr'].map(n=>`i(v.x${n}.vsense)`)];
    const state=await this.spice.snapshot(nodes);let deck=this.baseNetlist;
    // Retain algebraic node guesses as well as charge states. The high-gain
    // amplifier macros need these guesses to restart reliably from UIC.
    // Unneeded algebraic branch-current histories are not retained thereafter.
    deck=deck.replace(/^\.save all\s*$/m,'.save '+this.voltageNodes.join('\n+ '));
    for(const name of ['ground','net','run','end','centre','hitl','hitr']){
      const pattern=new RegExp(`^(X${name}\\s+.*?RELAY)\\s*$`,'im');
      if(!pattern.test(deck))throw Error('Missing checkpoint coil '+name);
      deck=deck.replace(pattern,`$1 I0=${state[`i(v.x${name}.vsense)`].toPrecision(17)}`);
    }
    const epoch=this.epoch+state.time;
    deck=deck.replace(/^\.param DISPLAY_EPOCH=.*$/m,`.param DISPLAY_EPOCH=${epoch.toPrecision(17)}`)
      .replace(/^\.ic .*$(?:\n\+.*)*/gm,'');
    const ic=this.voltageNodes.map(node=>`${node}=${state[node].toPrecision(17)}`).join('\n+ ');
    deck=deck.replace(/\n\.end\s*$/i,`\n.ic ${ic}\n.end\n`);
    return {deck,origin:this.origin+state.time,epoch,operatingInputs};
  }
  async checkpoint({prime=true}={}){
    const {deck,origin,epoch,operatingInputs}=await this.prepareCheckpoint();
    this.origin=origin;this.epoch=epoch;this.localTime=0;this.checkpoints++;
    await this.load(deck);
    await this.restoreOperatingInputs(operatingInputs);
    // Establish accepted UIC state before a changed control source can contradict
    // its saved algebraic initial guesses. This is a microsecond solver restart,
    // not a serve or a repeated .25s power-up.
    if(prime)await this.primeRestart(operatingInputs);
    // Gear history restarts. The resulting numerical boundary error is measured
    // against an uninterrupted joint solve; it is not claimed to be zero.
  }
  async restoreOperatingInputs(values){
    // A pulse can have expired at this boundary while its source still has the
    // old value. Preserve that value for UIC; applyInputs changes it afterwards.
    await this.spice.commands([`alter VbuttonL = ${values.bl}`,`alter VbuttonR = ${values.br}`,`alter Vreset = ${values.reset}`]);
    this.inputValues={...values};
  }
  async primeRestart(operatingInputs){
    try{await this.runTo(1e-6,true);}
    catch(error){
      // No accepted point exists for this failure. Retry the SAME charge/coil
      // state and input sources with a larger Newton iteration budget. Equations,
      // convergence tolerances and the maximum time step are unchanged.
      if(!/Timestep too small;\s*initial timepoint/i.test(String(error)))throw error;
      const retryDeck=this.netlist.replace(/\n\.end\s*$/i,'\n.options itl4=200\n.end\n');
      await this.load(retryDeck);await this.restoreOperatingInputs(operatingInputs);
      this.restartRetries++;await this.runTo(1e-6,true);
    }
  }
  canCheckpoint(){
    const now=this.origin+this.localTime;
    return this.resetUntil<=now&&this.buttons.every(t=>t<=now);
  }
  async exportSession({preserve=false}={}){
    if(!this.canCheckpoint())throw Error('Cannot transfer an active operator pulse');
    // A candidate worker may reject these initial conditions. Keep this live
    // circuit, its accepted Gear history and pending input intact until commit.
    const prepared=preserve?await this.prepareCheckpoint():null;
    if(!preserve)await this.checkpoint({prime:false});
    return {format:'gremlin-joint-session-1',netlist:prepared?.deck||this.netlist,baseNetlist:this.baseNetlist,
      origin:prepared?.origin??this.origin,epoch:prepared?.epoch??this.epoch,controls:this.controls.slice(),gravity:this.gravity,
      inputValues:{...this.inputValues},restartRetries:this.restartRetries,
      observedHigh:this.observedHigh.slice(),sequence:this.sequence,checkpoints:this.checkpoints+(preserve?1:0),
      last:{...this.last,beam:undefined},telemetry:{...this.telemetry},totalPoints:this.totalPoints};
  }
  async restoreSession(session,wasmBinary){
    if(session?.format!=='gremlin-joint-session-1'||!Number.isFinite(session.origin)||!Number.isFinite(session.epoch)
      ||typeof session.netlist!=='string'||session.netlist.length>250000)throw Error('Invalid joint session');
    this.controls=session.controls.slice();this.gravity=session.gravity;
    await this.spice.start(wasmBinary);this.version=(await this.spice.commands(['version'])).join('\n');
    this.baseNetlist=session.baseNetlist;this.origin=session.origin;this.epoch=session.epoch;
    this.observedHigh=session.observedHigh.slice();this.sequence=session.sequence;this.checkpoints=session.checkpoints;
    this.totalPoints=session.totalPoints;this.telemetry={...session.telemetry};
    this.restartRetries=session.restartRetries||0;
    this.last={...session.last,beam:new Float64Array(0)};
    await this.load(session.netlist);this.localTime=0;
    const operatingInputs=session.inputValues||{...this.inputValues};
    await this.restoreOperatingInputs(operatingInputs);await this.primeRestart(operatingInputs);
    return this.last;
  }
}

