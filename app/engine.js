import {SAMPLE_PERIOD,JOINT_MAX_STEP as MAX_STEP} from './joint-circuit.js';

export async function loadEngine(options={}){
  const engine=new WorkerEngine(options);
  try{await engine.ready;return engine;}catch(error){engine.close();throw error;}
}

class WorkerEngine {
  constructor(options={}){
    this.initInput=options;
    this.serial=0;this.requests=new Map();this.pending=0;this.busy=false;
    this.closed=false;this.paused=false;this.events=0;this.samples=[];this.hits=[];
    this.controls=[.65,.65];this.gravity=60;this.resetPending=false;this.error=null;this.beams=[];this.workerRestarts=0;this.activeWallMs=0;
    this.deferredRestarts=0;this.lastRestartError=null;this.candidate=null;
    this.openWorker();
    this.ready=this.request('init',this.initInput).then(({state,version})=>{this.acceptState(state);this.version=version;});
  }
  createWorker(){
    const worker=new Worker(new URL('./spice-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      const request=this.requests.get(data.id);if(!request)return;
      this.requests.delete(data.id);clearTimeout(request.timeout);
      if(data.error)request.reject(Error(data.error));else request.resolve(data);
    };
    worker.onerror=event=>{
      const error=Error(event.message||'Worker failed');
      if(worker===this.worker)this.fail(error);
      else for(const [id,request] of this.requests)if(request.worker===worker){
        this.requests.delete(id);clearTimeout(request.timeout);request.reject(error);
      }
    };
    return worker;
  }
  openWorker(){this.worker=this.createWorker();}
  request(type,input,worker=this.worker){
    if(this.closed)return Promise.reject(Error('Circuit worker closed'));
    const id=++this.serial;
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{
        this.requests.delete(id);reject(Error('Circuit calculation timed out'));
      },type==='init'?120000:60000);
      this.requests.set(id,{resolve,reject,timeout,worker});worker.postMessage({id,type,input});
    });
  }
  fail(error){
    if(this.error)return;this.error=error;
    for(const {reject,timeout} of this.requests.values()){clearTimeout(timeout);reject(error);}
    this.requests.clear();this.worker.terminate();this.candidate?.terminate();this.closed=true;
  }
  close(){
    if(this.closed)return;this.closed=true;this.worker.terminate();this.candidate?.terminate();
    for(const {reject,timeout} of this.requests.values()){clearTimeout(timeout);reject(Error('Circuit worker closed'));}
    this.requests.clear();
  }
  setPaused(value){this.paused=value;this.pending=0;}
  advance(dt){
    if(this.closed||this.paused)return;
    this.pending=Math.min(.1,this.pending+Math.max(0,Math.min(.05,dt)));
    this.pump();
  }
  pump(){
    if(this.closed||this.paused||this.busy||this.pending<SAMPLE_PERIOD-1e-9)return;
    this.pending-=SAMPLE_PERIOD;this.busy=true;
    const input={controls:this.controls.slice(),gravity:this.gravity,hits:this.hits.splice(0),reset:this.resetPending};
    this.resetPending=false;
    const begin=performance.now();
    this.stepAcrossWorkers(input).then(({state})=>{
      this.activeWallMs+=performance.now()-begin;
      state.scope={...state.scope,workerRestarts:this.workerRestarts,activeWallMs:this.activeWallMs,
        deferredRestarts:this.deferredRestarts,lastRestartError:this.lastRestartError};
      this.acceptState(state);this.events|=state.events;this.samples.push(this.state);
      if(this.samples.length>10)this.samples.shift();
    }).catch(error=>{if(!this.closed)this.fail(error);}).finally(()=>{this.busy=false;this.pump();});
  }
  async stepAcrossWorkers(input){
    let result=await this.request('step',input);
    if(result.recycle){
      this.lastCheckpoint=result.recycle;
      const previous=this.worker,candidate=this.createWorker();this.candidate=candidate;
      try{
        await this.request('init',{...this.initInput,restore:result.recycle},candidate);
        if(this.closed)throw Error('Instrument closed during state transfer');
      }catch(error){
        candidate.terminate();if(this.candidate===candidate)this.candidate=null;
        if(this.closed||!/Timestep too small;\s*initial timepoint/i.test(String(error)))throw error;
        this.deferredRestarts++;this.lastRestartError=String(error);
        // The candidate never advanced the accepted session. The previous
        // worker still owns its exact live solver state and consumes input once.
        return this.request('continue',input,previous);
      }
      this.worker=candidate;this.candidate=null;previous.terminate();this.workerRestarts++;
      result=await this.request('step',input);
      if(result.recycle)throw Error('Fresh circuit worker exceeded its heap bound');
    }
    return result;
  }
  hit(side){
    if(this.closed||this.paused||!this.canHit(side)||this.hits.length)return false;
    this.hits.push(side);this.state={...this.state,can:[false,false],eligible:-1};return true;
  }
  reset(){if(this.closed)return;this.hits=[];this.resetPending=true;}
  setControl(side,value){if(Number.isFinite(value))this.controls[side]=Math.max(0,Math.min(1,value));}
  setGravity(value){if(Number.isFinite(value))this.gravity=Math.max(5,Math.min(100,value));}
  getControl(side){return this.controls[side];} getGravity(){return this.gravity;}
  getTime(){return this.state.time;} getTicks(){return this.state.sequence;}
  getX(){return this.state.x;} getY(){return this.state.y;}
  getVX(){return this.state.vx;} getVY(){return this.state.vy;}
  getMode(){return this.state.mode;} getEligible(){return this.state.eligible;}
  getServer(){return this.state.server;} getReason(){return this.state.reason;}
  getRelay(){return this.state.relay;} getNode(n){return this.state.nodes[({3:0,5:1,7:2,9:3})[n]];}
  getCapCurrent(n){return this.state.currents[n];}getPrecharge(n){return this.state.precharge[n];}
  getTimeStep(){return MAX_STEP;}canHit(side){return this.state.can[side]&&!this.hits.length;}
  acceptState(state){
    if(state.beam?.length)this.beams.push(state.beam);
    // At most one request is in flight; drain on the next animation frame.
    // Electrical samples are never replaced by a synthetic visual trajectory.
    const {beam,...publicState}=state;this.state=publicState;
  }
  drainBeams(){return this.beams.splice(0);}
  popEvents(){const events=this.events;this.events=0;return events;}
  drainSamples(){return this.samples.splice(0);}
}
export function snapshot(e){return e.state;}
