import createSpice from './vendor/spice.js';

// Serial command adapter for EEcircuit's ngspice/Asyncify build. A stopped
// transient resumes in the SAME simulator; no capacitor state is reconstructed.
export class SpiceSession {
  module=null; queue=[]; wake=null; completion=null; lines=[]; ready=null;
  async start(wasmBinary) {
    if(this.module)return;
    const options={noInitialRun:true,print:s=>this.output(s),printErr:s=>this.output(s)};
    if(wasmBinary)options.instantiateWasm=(imports,receive)=>{
      WebAssembly.instantiate(wasmBinary,imports).then(({instance})=>receive(instance));return {};
    };
    this.module=await createSpice(options);
    const fs=this.module.FS;
    try{fs.mkdir('/proc');}catch{}
    fs.writeFile('/proc/meminfo','MemTotal: 524288 kB\nMemFree: 262144 kB\nMemAvailable: 262144 kB\n');
    fs.writeFile('/spinit','set noaskquit\nset numdgt=15\n');
    this.module.setGetInput(()=>this.queue.shift()??' ');
    this.module.setHandleThings(()=>this.module.Asyncify.handleAsync(async()=>{
      if(this.queue.length===0){
        const complete=this.completion;this.completion=null;if(complete)complete();
        await new Promise(resolve=>{this.wake=resolve;});
      }
    }));
    const ready=new Promise(resolve=>{this.completion=resolve;});
    this.module.runThings();await ready;
    await this.commands(['set numdgt=15','set noaskquit','set nomoremode']);
  }
  output(value) {this.lines.push(String(value).replace(/ngspice \d+ ->\s*/g,''));if(this.lines.length>3000)this.lines.shift();}
  async commands(commands) {
    if(!this.module||!this.wake||this.completion)throw Error('SPICE command overlap');
    if(!commands.length)return [];
    this.lines=[];this.queue.push(...commands);
    const wait=new Promise(resolve=>{this.completion=resolve;});
    const wake=this.wake;this.wake=null;wake();await wait;
    const text=this.lines.join('\n');
    if(/(?:^|\n)(?:Error:|Error on line|Fatal error|Syntax error|.*Timestep too small|.*singular matrix.*failed|.*simulation(?:\(s\))? aborted)/i.test(text))throw Error(text.slice(-5000));
    return this.lines.slice();
  }
  write(path,text){this.module.FS.writeFile(path,text);}
  read(path){return this.module.FS.readFile(path,{encoding:'utf8'});}
  async load(netlist){
    this.write('/tennis.cir',netlist);
    await this.commands(['destroy all','delete all',...(this.loaded?['remcirc']:[]),'source /tennis.cir']);
    this.loaded=true;
  }
  async snapshot(nodes) {
    const lines=await this.commands(['let frame_index = length(time)-1',
      'print time[frame_index] '+nodes.map(node=>`${node}[frame_index]`).join(' ')]);
    const text=lines.join('\n'),values={};
    for(const name of ['time',...nodes]){
      const literal=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const match=text.match(new RegExp(literal+'\\[frame_index\\]\\s*=\\s*([-+0-9.eE]+)','i'));
      if(!match||!Number.isFinite(Number(match[1])))throw Error('Missing SPICE output '+name+': '+text.slice(-2500));
      values[name]=Number(match[1]);
    }
    return values;
  }
}
