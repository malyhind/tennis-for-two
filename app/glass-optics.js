// Independent MIT implementation of plane-parallel faceplate optics.
// References: DuMont 5ADP manufacturer sheet (flat face), Snell/Fresnel
// equations explained in PBRT 4e, and Deering US5446834A (CRT refraction).
// No PBRT or patent implementation code is included. See docs/glass-optics.md.
import {CRT} from './beam-model.js';

export const GLASS_MODEL=Object.freeze({
  version:'0.8.4-lighting2',shape:'plane-parallel',curvature_per_m:0,
  thickness_m:.004,refractiveIndex:1.52,viewDistance_m:.5,absorption_per_m:1,
  ambientRadiance:.012,lampRadiance:.45,lampDirection:Object.freeze([-.06,-.06,1]),lampWidth_rad:.04,
  reflectionColor:Object.freeze([.85,.9,1]),internalRoundTrips:1,
  provenance:'Flat face: DuMont 5ADP data, printed p.48. Thickness, IOR, viewing distance, absorption and room lighting are declared reconstruction choices, not measurements of the original instrument.'
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function fresnel(cosine,nFrom=1,nTo=GLASS_MODEL.refractiveIndex){
  const ci=clamp(cosine,0,1),st2=(nFrom/nTo)**2*Math.max(0,1-ci*ci);
  if(st2>=1)return {s:1,p:1,reflectance:1,cosTransmitted:0,totalInternalReflection:true};
  const ct=Math.sqrt(1-st2);
  if(nFrom===nTo)return {s:0,p:0,reflectance:0,cosTransmitted:ci,totalInternalReflection:false};
  const s=((nFrom*ci-nTo*ct)/(nFrom*ci+nTo*ct))**2;
  const p=((nTo*ci-nFrom*ct)/(nTo*ci+nFrom*ct))**2;
  return {s,p,reflectance:(s+p)/2,cosTransmitted:ct,totalInternalReflection:false};
}

// Backtrace one eye ray from the outside face to the phosphor at its inner
// face. Coordinates are fractions of the existing physical CRT field.
export function faceplateRay(u,v,model=GLASS_MODEL){
  const field=CRT.fieldIn*.0254,x=(u-.5)*field,y=(v-.5)*field;
  const d=model.viewDistance_m,length=Math.hypot(x,y,d),ci=d/length;
  const f=fresnel(ci,1,model.refractiveIndex),ct=f.cosTransmitted;
  const gx=x/length/model.refractiveIndex,gy=y/length/model.refractiveIndex;
  const dx=model.thickness_m*gx/ct,dy=model.thickness_m*gy/ct;
  const path=model.thickness_m/ct,a=Math.exp(-model.absorption_per_m*path);
  const direct=a*((1-f.s)**2+(1-f.p)**2)/2;
  const ghost=a**3*((1-f.s)**2*f.s**2+(1-f.p)**2*f.p**2)/2;
  const tail=[f.s,f.p].reduce((sum,r)=>{const q=r*r*a*a;return sum+(1-r)**2*a*q*q/(1-q);},0)/2;
  const lamp=model.lampDirection,lampLength=Math.hypot(...lamp);
  const dot=clamp((x*lamp[0]+y*lamp[1]+d*lamp[2])/(length*lampLength),-1,1);
  const angle=Math.acos(dot),room=model.ambientRadiance+model.lampRadiance*Math.exp(-.5*(angle/model.lampWidth_rad)**2);
  return {u:u+dx/field,v:v+dy/field,ghostU:u+3*dx/field,ghostV:v+3*dy/field,
    direct,ghost,reflection:f.reflectance*room,path_m:path,
    cosAir:ci,cosGlass:ct,omittedTransmission:tail};
}

function checkedModel(overrides){
  const m={...GLASS_MODEL,...overrides};
  for(const k of ['thickness_m','refractiveIndex','viewDistance_m','absorption_per_m','ambientRadiance','lampRadiance','lampWidth_rad'])if(!Number.isFinite(m[k]))throw Error('Invalid faceplate parameter: '+k);
  if(m.thickness_m<0||m.refractiveIndex<1||m.viewDistance_m<=0||m.absorption_per_m<0||m.ambientRadiance<0||m.lampRadiance<0||m.lampWidth_rad<=0)throw Error('Invalid faceplate parameters');
  if(m.shape!=='plane-parallel'||m.curvature_per_m!==0||m.internalRoundTrips!==1)throw Error('Unsupported faceplate geometry');
  if(m.lampDirection.length!==3||!m.lampDirection.every(Number.isFinite)||Math.hypot(...m.lampDirection)===0)throw Error('Invalid room light direction');
  return Object.freeze(m);
}

// Built once per renderer. CPU and WebGL consume these same ray coordinates
// and gains; optical geometry is never recomputed by the circuit solver.
export class GlassProjection{
  constructor(size,{model={},cpuSampling=false}={}){
    this.size=size;this.model=checkedModel(model);this.radius=CRT.diameterIn/CRT.fieldIn;
    this.geometry=new Float32Array(size*size*4);this.gains=new Float32Array(size*size*4);
    this.aperture=new Uint8Array(size*size);this.maxOmittedTransmission=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=y*size+x,u=(x+.5)/size,v=(y+.5)/size;
      if(Math.hypot(u*2-1,v*2-1)>this.radius)continue;
      this.aperture[i]=1;const r=faceplateRay(u,v,this.model);
      this.geometry.set([r.u,r.v,r.ghostU,r.ghostV],i*4);
      this.gains.set([r.direct,r.ghost,r.reflection,1],i*4);
      this.maxOmittedTransmission=Math.max(this.maxOmittedTransmission,r.omittedTransmission);
    }
    if(cpuSampling)this.prepareSampling();
  }
  prepareSampling(){
    const n=this.size;this.indices=new Uint32Array(n*n*8);this.weights=new Float32Array(n*n*8);
    for(let i=0;i<n*n;i++)if(this.aperture[i])for(let path=0;path<2;path++){
      const u=this.geometry[i*4+path*2],v=this.geometry[i*4+path*2+1];
      const x=u*n-.5,y=v*n-.5,bx=Math.floor(x),by=Math.floor(y),fx=x-bx,fy=y-by;
      for(let k=0;k<4;k++){
        const sx=bx+(k&1),sy=by+(k>>1),slot=i*8+path*4+k;
        if(sx<0||sy<0||sx>=n||sy>=n||!this.aperture[sy*n+sx])continue;
        this.indices[slot]=sy*n+sx;
        this.weights[slot]=(k&1?fx:1-fx)*(k>>1?fy:1-fy)*this.gains[i*4+path];
      }
    }
  }
  energy(fast,slow,pixel){
    let sum=0;const base=pixel*8;
    for(let k=0;k<8;k++){const j=this.indices[base+k];sum+=(fast[j]+slow[j])*this.weights[base+k];}
    return sum;
  }
}

export function glassColor(energy,reflection,model=GLASS_MODEL){
  const lum=1-Math.exp(-Math.max(0,energy)*CRT.exposure),channels=[.10,1,.045],base=[.0015,.006,.003];
  return [...channels.map((c,i)=>Math.round(255*Math.pow(Math.min(1,base[i]+c*lum+model.reflectionColor[i]*reflection),1/2.2))),255];
}
