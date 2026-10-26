import {CPUPhosphor} from './phosphor-cpu.js';
import {GPUPhosphor} from './phosphor-webgl.js';

export class ScopeRenderer{
  constructor(canvas,{preferred='auto',onCanvas=()=>{},opticsEnabled=true,cpuSize=384}={}){
    this.canvas=canvas;this.onCanvas=onCanvas;this.history=[];this.fallbackReason=null;this.closed=false;
    this.opticsEnabled=opticsEnabled;
    this.cpuSize=cpuSize;
    if(preferred!=='cpu'){
      try{this.renderer=new GPUPhosphor(canvas,512,{opticsEnabled});this.backend='WebGL2';}
      catch(error){this.fallbackReason=String(error.message);this.useCPU();}
    }else this.useCPU();
    this.lost=event=>{event.preventDefault();if(!this.closed&&this.backend!=='CPU'){this.fallbackReason='WebGL context lost';this.useCPU(true);}};
    this.canvas.addEventListener('webglcontextlost',this.lost);
  }
  useCPU(replay=false){
    const old=this.canvas;
    // A canvas has one context type. Replace it before selecting Canvas2D.
    const fresh=old.cloneNode(false);old.replaceWith(fresh);this.canvas=fresh;fresh.width=fresh.height=this.cpuSize;
    this.context=fresh.getContext('2d',{alpha:false});if(!this.context)throw Error('Canvas2D unavailable');
    this.renderer?.dispose?.();this.renderer=new CPUPhosphor(this.cpuSize,{opticsEnabled:this.opticsEnabled});this.backend='CPU';this.onCanvas(fresh);
    if(replay)for(const trace of this.history){if(trace===null)this.renderer.stream.last=null;else this.renderer.append(trace);}
    this.present();
  }
  append(trace){
    if(!trace.length)return;
    this.history.push(trace.slice());const time=trace.at(-4);
    // One simulated second covers >16 slow decay constants. Replay on context
    // loss has a bounded residual <6e-8 of old slow-component energy.
    while(this.history.length>1&&(this.history[0]===null||this.history[0].at(-4)<time-1))this.history.shift();
    try{this.renderer.append(trace);}catch(error){
      if(this.backend==='CPU')throw error;
      this.fallbackReason=String(error.message);this.useCPU(true);
    }
    if(this.backend==='CPU')this.present();
  }
  present(){
    if(this.backend==='CPU'){
      const r=this.renderer;this.context.putImageData(new ImageData(r.image(),r.size,r.size),0,0);
    }else this.renderer.present();
  }
  clear(){this.history=[];this.renderer.clear();this.present();}
  breakBeamPath(){this.history.push(null);this.renderer.stream.last=null;}
  setOpticsEnabled(value){this.opticsEnabled=!!value;this.renderer.setOpticsEnabled(this.opticsEnabled);this.present();}
  dispose(){this.closed=true;this.canvas.removeEventListener('webglcontextlost',this.lost);this.renderer.dispose?.();this.history=[];}
}
