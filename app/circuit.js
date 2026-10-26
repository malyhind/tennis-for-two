import {SpiceSession} from './spice-session.js';

export const SAMPLE_PERIOD=.02;
export const MAX_STEP=.001;
export const OBSERVATION_PERIOD=.001;
export const PUBLIC_NODES=['v(x)','v(y)','v(u1)','v(u6)',
  'v(pre_lx)','v(pre_ly)','v(pre_rx)','v(pre_ry)',
  'v(run)','v(run_contact)','v(can_l)','v(can_r)','v(server)','v(bank)',
  'v(ground_contact)','v(net_contact)','v(centre_contact)','v(end_contact)',
  'i(v.xground.vsense)','i(v.xnet.vsense)','i(v.xrun.vsense)',
  'i(v.xlx.vsense)','i(v.xly.vsense)','i(v.xrx.vsense)','i(v.xry.vsense)'];
export const STATE_NODES=[...new Set([
  ...PUBLIC_NODES.filter(n=>n.startsWith('v(')&&!n.startsWith('v(pre_')),
  ...['railp','railm','logic','grav','sy','sx','py','px','ga','gb','na','nb','edge_source','edge','button_l','button_r','reset',
    'permit_l','permit_r','xly.cp','lyn','xry.cp','ryn','xlx.cp','lxn','xrx.cp','rxn',
    'xu1.pole','xu2.pole','xu3.pole','xu4.pole','xu6.pole','xu7.pole',
    'hit_l_contact','hit_r_contact'].map(n=>`v(${n})`),
  ...['ground','net','run','end','centre','hitl','hitr'].map(n=>`i(v.x${n}.vsense)`)
])];
const observed=['hit_l_contact','hit_r_contact','ground_contact','net_contact','end_contact'];
const finite=(x,min,max)=>{if(!Number.isFinite(x))throw Error('Non-finite circuit input');return Math.min(max,Math.max(min,x));};

// The host changes voltage sources only. Every C/L state and relay decision is
// evaluated by ngspice. No projectile integrator or collision response here.
export class TennisCircuit {
  constructor(netlist,{maxStep=MAX_STEP,rebaseSeconds=30}={}){
    this.baseNetlist=netlist;this.netlist=netlist;this.spice=new SpiceSession();
    this.maxStep=maxStep;this.rebaseSeconds=rebaseSeconds;this.localTime=0;
    this.origin=-.25;this.controls=[.65,.65];this.gravity=60;
    this.buttons=[0,0];this.resetUntil=0;this.inputValues={};
    this.previousIndex=0;this.observedHigh=observed.map(()=>false);this.sequence=0;
    this.breakpoint=null;this.checkpoints=0;this.last=null;
  }
  async start(wasmBinary){
    await this.spice.start(wasmBinary);
    this.version=(await this.spice.commands(['version'])).join('\n');
    await this.load(this.baseNetlist);
    await this.runTo(.25,true);
    return this.sample();
  }
  async load(netlist){
    this.netlist=netlist;await this.spice.load(netlist);this.breakpoint=null;this.previousIndex=0;this.fresh=true;
    // Reapply operator settings to a new circuit; these are independent sources.
    await this.spice.commands([`alter Vgravity = ${-this.gravity}`,
      `alter VknobL = ${this.controls[0]}`,`alter VknobR = ${this.controls[1]}`]);
    this.inputValues={gravity:this.gravity,left:this.controls[0],right:this.controls[1],bl:0,br:0,reset:0};
  }
  async runTo(target,first=this.fresh){
    const s=this.spice;
    const commands=[...(this.breakpoint!==null?[`delete ${this.breakpoint}`]:[]),
      `stop when time > ${(target-1e-10).toPrecision(16)}`,'status'];
    const status=(await s.commands(commands)).join('\n');
    const match=status.match(/(?:^|\n)(\d+)\s+stop\s+when time/);
    if(!match)throw Error('ngspice did not register a stop condition: '+status);
    this.breakpoint=Number(match[1]);
    const horizon=Math.max(2,this.rebaseSeconds+1);
    await s.commands([first?`tran ${OBSERVATION_PERIOD} ${horizon} 0 ${this.maxStep} uic`:'resume']);
    this.localTime=target;this.fresh=false;
  }
  async applyInputs(input){
    if(input.controls)this.controls=input.controls.map(x=>finite(x,0,1));
    if(input.gravity!==undefined)this.gravity=finite(input.gravity,5,100);
    const now=this.origin+this.localTime;
    if(input.reset){this.resetUntil=now+.06;this.buttons=[0,0];}
    for(const side of input.hits||[]){
      if(side!==0&&side!==1)throw Error('Invalid player');
      this.buttons[side]=Math.max(this.buttons[side],now+.06);
    }
    const next={gravity:this.gravity,left:this.controls[0],right:this.controls[1],
      bl:this.buttons[0]>now+1e-9?10:0,br:this.buttons[1]>now+1e-9?10:0,
      reset:this.resetUntil>now+1e-9?100:0};
    const sources={gravity:'Vgravity',left:'VknobL',right:'VknobR',bl:'VbuttonL',br:'VbuttonR',reset:'Vreset'};
    const commands=Object.entries(next).filter(([key,value])=>this.inputValues[key]!==value)
      .map(([key,value])=>`alter ${sources[key]} = ${key==='gravity'?-value:value}`);
    if(commands.length)await this.spice.commands(commands);
    this.inputValues=next;
  }
  async step(input={}){
    if(this.localTime>=this.rebaseSeconds+.25&&this.resetUntil<=this.origin+this.localTime&&this.buttons.every(t=>t<=this.origin+this.localTime))await this.checkpoint();
    await this.applyInputs(input);
    await this.runTo(this.localTime+SAMPLE_PERIOD);
    return this.sample();
  }
  async sample(){
    const values=await this.spice.snapshot(PUBLIC_NODES);
    const commands=observed.map((n,i)=>`let peak_${i} = vecmax(v(${n})[${this.previousIndex},frame_index])`);
    commands.push('print frame_index '+observed.map((_,i)=>`peak_${i}`).join(' '));
    const text=(await this.spice.commands(commands)).join('\n');
    const scalar=name=>{
      const match=text.match(new RegExp('(?:^|\\n)'+name+'\\s*=\\s*([-+0-9.eE]+)'));
      if(!match)throw Error('Missing event vector '+name+': '+text);return Number(match[1]);
    };
    this.previousIndex=scalar('frame_index');
    let events=0;
    observed.forEach((_,i)=>{
      const high=scalar(`peak_${i}`)>50;
      if(high&&!this.observedHigh[i])events|=[1,1,2,4,16][i];
      this.observedHigh[i]=high;
    });
    if(this.last&&this.last.eligible<0&&(values['v(can_l)']>50||values['v(can_r)']>50)&&values['v(run_contact)']>50)events|=8;
    const value=n=>values[`v(${n})`];
    const mode=value('run_contact')>50?1:0;
    const relays={run:mode,ground:value('ground_contact')>50,net:value('net_contact')>50,
      centre:value('centre_contact')>50,end:value('end_contact')>50,bank:value('bank')>50?1:0};
    const state={time:this.origin+values.time,sequence:++this.sequence,x:value('x'),y:value('y')+20,
      vx:-value('u6'),vy:-value('u1'),mode,server:value('server')>50?1:0,
      eligible:value('can_l')>50?0:value('can_r')>50?1:-1,
      can:[value('can_l')>50,value('can_r')>50],
      reason:this.last?.reason||0,events,relays,
      relay:mode|(+relays.ground<<1)|(+relays.net<<2)|(+relays.centre<<3)|(+relays.end<<4)|(relays.bank<<5),
      nodes:['u1','y','u6','x'].map(value),
      precharge:['pre_lx','pre_ly','pre_rx','pre_ry'].map(value),
      currents:['lx','ly','rx','ry'].map(n=>values[`i(v.x${n}.vsense)`]),
      coilCurrents:['ground','net','run'].map(n=>values[`i(v.x${n}.vsense)`]),
      gravity:this.gravity,controls:this.controls.slice(),checkpoints:this.checkpoints};
    if(this.last?.mode&&!mode)state.reason=1;
    if(mode)state.reason=0;
    if(!Object.values(values).every(Number.isFinite))throw Error('Non-finite SPICE output');
    // The stop must correspond to the requested output-grid point. A failed
    // resume must never silently show a stale frame or jump to TSTOP.
    if(Math.abs(values.time-this.localTime)>1e-6)throw Error(`SPICE clock mismatch: ${values.time} / ${this.localTime}`);
    this.last=state;return state;
  }
  async checkpoint(){
    const state=await this.spice.snapshot(STATE_NODES);
    let netlist=this.baseNetlist;
    for(const name of ['ground','net','run','end','centre','hitl','hitr']){
      const current=state[`i(v.x${name}.vsense)`];
      const pattern=new RegExp(`^(X${name}\\s+.*?RELAY)\\s*$`,'im');
      if(!pattern.test(netlist))throw Error('Missing relay in checkpoint '+name);
      netlist=netlist.replace(pattern,`$1 I0=${current.toPrecision(16)}`);
    }
    const ic=STATE_NODES.filter(n=>n.startsWith('v(')).map(n=>`${n}=${state[n].toPrecision(16)}`).join('\n+ ');
    netlist=netlist.replace(/\n\.end\s*$/i,`\n.ic ${ic}\n.end\n`);
    this.origin+=state.time;this.localTime=0;this.checkpoints++;
    await this.load(netlist);
    // The next run starts from every stored C/L state, with no serve/warm-up.
  }
}
