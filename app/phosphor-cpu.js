import {CRT,BeamStream,beamIntegral,beamResponse} from './beam-model.js';
import {GlassProjection} from './glass-optics.js';

// CPU implementation of the same woscope moving-beam integral used by GLSL.
// It receives electrical beam samples, never the game's ball/court geometry.
export class CPUPhosphor{
  constructor(size=384,{opticsEnabled=true,glassModel={}}={}){
    this.size=size;this.stream=new BeamStream(size);this.fast=new Float64Array(size*size);this.slow=new Float64Array(size*size);
    this.sigma=CRT.sigmaIn/CRT.fieldIn*size;
    const {coreSigma,haloSigma}=beamResponse(0,0,this.sigma,this.sigma*CRT.haloScale);
    this.coreSigma=coreSigma;this.haloSigma=haloSigma;this.padding=4*haloSigma;
    this.pixels=new Uint8ClampedArray(size*size*4);this.packets=0;
    this.opticsEnabled=opticsEnabled;this.projection=new GlassProjection(size,{model:glassModel,cpuSampling:true});
    this.imageRevision=-1;this.imagePackets=-1;this.revision=0;
  }
  clear(){this.fast.fill(0);this.slow.fill(0);this.stream.clear();this.packets=0;this.revision++;}
  append(trace){
    const batch=this.stream.prepare(trace);if(!batch)return false;
    const decayFast=Math.exp(-batch.dt/CRT.fastTau),decaySlow=Math.exp(-batch.dt/CRT.slowTau);
    for(let i=0;i<this.fast.length;i++){this.fast[i]*=decayFast;this.slow[i]*=decaySlow;}
    const w=this.size,p=this.padding;
    for(const [x0,y0,x1,y1,fast,slow] of batch.segments){
      const dx=x1-x0,dy=y1-y0,length=Math.hypot(dx,dy),ux=length>1e-12?dx/length:1,uy=length>1e-12?dy/length:0;
      const xmin=Math.max(0,Math.floor(Math.min(x0,x1)-p)),xmax=Math.min(w-1,Math.ceil(Math.max(x0,x1)+p));
      const ymin=Math.max(0,Math.floor(Math.min(y0,y1)-p)),ymax=Math.min(w-1,Math.ceil(Math.max(y0,y1)+p));
      for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
        const a=x+.5-x0,b=y+.5-y0,along=a*ux+b*uy,across=-a*uy+b*ux;
        const value=(1-CRT.haloFraction)*beamIntegral(along,across,length,this.coreSigma)
          +CRT.haloFraction*beamIntegral(along,across,length,this.haloSigma);
        const i=y*w+x;this.fast[i]+=fast*value;this.slow[i]+=slow*value;
      }
    }
    this.packets++;return true;
  }
  image(){
    if(this.imageRevision===this.revision&&this.imagePackets===this.packets)return this.pixels;
    const w=this.size,p=this.projection,a=this.pixels,color=p.model.reflectionColor;
    for(let i=0;i<w*w;i++){
      const j=i*4;a[j+3]=255;
      if(!p.aperture[i]){a[j]=5;a[j+1]=9;a[j+2]=7;continue;}
      const energy=this.opticsEnabled?p.energy(this.fast,this.slow,i):this.fast[i]+this.slow[i];
      const reflection=this.opticsEnabled?p.gains[j+2]:0,lum=1-Math.exp(-Math.max(0,energy)*CRT.exposure);
      a[j]=Math.round(255*Math.pow(Math.min(1,.0015+.10*lum+color[0]*reflection),1/2.2));
      a[j+1]=Math.round(255*Math.pow(Math.min(1,.006+lum+color[1]*reflection),1/2.2));
      a[j+2]=Math.round(255*Math.pow(Math.min(1,.003+.045*lum+color[2]*reflection),1/2.2));
    }
    this.imageRevision=this.revision;this.imagePackets=this.packets;
    return this.pixels;
  }
  setOpticsEnabled(value){if(this.opticsEnabled===!!value)return;this.opticsEnabled=!!value;this.imageRevision=-1;}
  energy(){return this.fast.reduce((a,b)=>a+b,0)+this.slow.reduce((a,b)=>a+b,0);}
}
