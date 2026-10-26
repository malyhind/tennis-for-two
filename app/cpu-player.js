// Our optional operator layer. It has no ngspice access and never writes ball state.
export const PLAY_MODES=Object.freeze({
  opponent:Object.freeze({label:'Я и Противник',names:['Вы','Противник'],cpu:[null,'opponent']}),
  together:Object.freeze({label:'Я и Лиса',names:['Вы','Лиса'],cpu:[null,null]}),
  watch:Object.freeze({label:'Гремлин против Лисы',names:['Гремлин','Лиса'],cpu:['gremlin','fox']})
});
export const CPU_PROFILES=Object.freeze({
  opponent:Object.freeze({name:'Противник',reaction:[.22,.30],aim:.60,depth:31,spread:.055,motorA:.14,motorB:.20,maxSpeed:.60}),
  gremlin:Object.freeze({name:'Гремлин',reaction:[.22,.29],aim:.53,depth:24,spread:.07,motorA:.14,motorB:.20,maxSpeed:.60}),
  fox:Object.freeze({name:'Лиса',reaction:[.20,.28],aim:.65,depth:36,spread:.045,motorA:.14,motorB:.20,maxSpeed:.60})
});
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const smooth=t=>t*t*t*(10+t*(-15+6*t)); // finite motion, zero endpoint speed/acceleration
export function motorDuration(distance,profile=CPU_PROFILES.opponent){
  // Fitts form; OUR coefficients and tolerance, not measurements of the 1958 knob.
  const d=Math.abs(distance);
  return Math.max(profile.motorA+profile.motorB*Math.log2(1+d/.04),1.875*d/profile.maxSpeed);
}
export class CPUPlayer{
  constructor(side,persona='opponent',{random=Math.random,control=.65,time=0}={}){
    if(side!==0&&side!==1)throw Error('Invalid CPU side');
    if(!CPU_PROFILES[persona])throw Error('Invalid CPU persona');
    this.side=side;this.persona=persona;this.profile=CPU_PROFILES[persona];this.random=random;
    this.control=clamp(control,0,1);this.lastTime=time;this.samples=[];this.previous=null;
    this.reaction=this.range(...this.profile.reaction);this.move=null;this.incoming=false;
    this.acted=false;this.depth=this.profile.depth;this.serveAt=Infinity;this.turnPlanned=false;
  }
  range(a,b){return a+(b-a)*this.random();}
  plan(time,view,serve=false){
    const p=this.profile;
    // The target comes from noisy, delayed visible height, plus a per-stroke choice.
    // No instantaneous vx/vy, gravity, charge voltage or future circuit trajectory.
    const target=clamp(p.aim+(35-view.y)*.004+this.range(-p.spread,p.spread),.18,.82);
    this.depth=clamp(p.depth+this.range(-7,7),12,55);
    this.move={start:time,from:this.control,to:target,duration:motorDuration(target-this.control,p)};
    if(serve)this.serveAt=time+this.range(.65,1.05);
    this.turnPlanned=true;
  }
  update(view){
    const time=view.time;
    if(!Number.isFinite(time))return {control:this.control,hit:false};
    // A circuit reset starts a new clock. Discard the previous rally's delayed
    // observations and motor plan, while retaining this operator's current knob.
    if(time<this.lastTime-1e-9){
      this.lastTime=time;this.samples=[];this.previous=null;this.move=null;
      this.incoming=false;this.acted=false;this.serveAt=Infinity;this.turnPlanned=false;
      return {control:this.control,hit:false};
    }
    if(time<=this.lastTime+1e-9)return {control:this.control,hit:false};
    // Every item is an explicit copy of a PUBLIC observation, never a circuit state.
    this.samples.push({time,x:view.x,y:view.y,playing:!!view.playing,ready:!!view.ready,server:view.server});
    this.lastTime=time;
    let seen=null;
    while(this.samples.length&&this.samples[0].time<=time-this.reaction+1e-9)seen=this.samples.shift();
    if(seen){
      // Coarse visual localization; a tunable approximation, not biological calibration.
      const v={...seen,x:Math.round(seen.x*2)/2,y:Math.round(seen.y*2)/2};
      const prev=this.previous;
      const vx=prev&&v.time>prev.time?(v.x-prev.x)/(v.time-prev.time):0;
      const sign=this.side?1:-1;
      const incoming=v.playing&&vx*sign>3;
      if(incoming&&!this.incoming){this.turnPlanned=false;this.plan(time,v);}
      if(!v.ready){this.acted=false;this.serveAt=Infinity;}
      const newServe=!v.playing&&(prev?.playing||v.server!==prev?.server);
      if(v.ready&&(!prev?.ready||newServe)){
        if(!v.playing||!this.turnPlanned)this.plan(time,v,!v.playing);
        this.acted=false;
      }
      this.incoming=incoming;this.previous=v;
    }
    if(this.move){
      const m=this.move,t=clamp((time-m.start)/m.duration,0,1);
      this.control=m.from+(m.to-m.from)*smooth(t);
      if(t===1)this.move=null;
    }
    const v=this.previous;
    // Readiness is delayed as well. The common physical input gate can reject a
    // late press exactly as it can for a person; no privileged last-moment rescue.
    let hit=false;
    if(v?.ready&&!this.acted){
      const ownX=v.x*(this.side?1:-1);
      const serve=!v.playing&&v.server===this.side&&time>=this.serveAt;
      const returnBall=v.playing&&ownX>=this.depth;
      if(serve||returnBall){hit=true;this.acted=true;this.turnPlanned=false;}
    }
    return {control:this.control,hit};
  }
}
// Only the ball image and visible lamps/serve indication cross this boundary.
export function operatorView(state,side){
  return {time:state.time,x:state.x,y:state.y,playing:!!state.mode,ready:!!state.can[side],server:state.server};
}
