// Analytic moving-Gaussian beam integral adapted from m1el/woscope (MIT),
// shaders/fsLine.glsl, pinned at 74af1e3f3c1ff9e0da8e82bf01b5b2dd52f3da5d.
// Copyright (c) 2015 Igor Null, Chad von Nau. See vendor/woscope/LICENSE.
// Our changes: area normalization, actual SPICE timestamps/current, physical
// plate-to-inch calibration, two declared decay components, CPU/GPU parity.
export const CRT=Object.freeze({diameterIn:4.25,fieldIn:4.5,xVoltsPerIn:48,yVoltsPerIn:36.8,
  sigmaIn:.009,haloScale:3.5,haloFraction:.04,referenceCurrent:25e-6,
  fastTau:.002858327788613309,slowTau:.020931598704111952,slowFraction:.047185863151480566,energyGain:29500,exposure:3,
  // Generic RCA P1 removal-curve fit; impulse weights assume linear steady excitation.
  // Source/assumption: docs/sources.md. Brightness and optics are our calibration.
  model:'5ADP-family calibration; RCA P1 reference with declared excitation assumption'});

export function erf(x){
  const sign=Math.sign(x),a=Math.abs(x);
  let p=1+(0.278393+(0.230389+(0.000972+0.078108*a)*a)*a)*a;p*=p;
  return sign-sign/(p*p);
}
export function beamIntegral(along,across,length,sigma){
  if(length<.01*sigma){
    const d=along-length*.5;return Math.exp(-(d*d+across*across)/(2*sigma*sigma))/(2*Math.PI*sigma*sigma);
  }
  return Math.max(0,erf(along/(Math.SQRT2*sigma))-erf((along-length)/(Math.SQRT2*sigma)))
    *Math.exp(-across*across/(2*sigma*sigma))/(2*Math.sqrt(2*Math.PI)*sigma*length);
}
export function platePoint(px,py,size){
  return [size*(.5+px/CRT.xVoltsPerIn/CRT.fieldIn),size*(.5-py/CRT.yVoltsPerIn/CRT.fieldIn)];
}
// Bounds and subdivision are shared by the two renderers. No scene objects,
// ball coordinates, phase labels, or guessed retrace blanking enter this path.
export class BeamStream{
  constructor(size){this.size=size;this.last=null;this.time=null;}
  clear(){this.last=null;this.time=null;}
  prepare(trace){
    if(!(trace instanceof Float64Array)||trace.length%4)throw Error('Invalid beam packet');
    if(!trace.length)return null;
    const end=trace.at(-4),previous=this.time;
    if(!Number.isFinite(end))throw Error('Non-finite beam time');
    if(previous!==null&&end<=previous+1e-12)return null;
    const segments=[];let first=previous;
    for(let k=0;k<trace.length;k+=4){
      const row=Array.from(trace.subarray(k,k+4));
      if(row.some(x=>!Number.isFinite(x))||row[3]<0)throw Error('Invalid beam sample');
      if(this.last&&row[0]<this.last[0]-1e-10)throw Error('Backward beam clock');
      if(this.last&&row[0]>this.last[0]+1e-12){
        const before=this.last,dt=row[0]-before[0];
        // Individual accepted circuit intervals are <=50us; also bound fixtures
        // and checkpoint joins so midpoint temporal weighting has the same limit.
        const parts=Math.max(1,Math.ceil(dt/50e-6));
        if(parts>10000)throw Error('Beam trace has an unbounded gap');
        for(let j=0;j<parts;j++){
          const f=j/parts,g=(j+1)/parts;
          const point=u=>platePoint(before[1]+(row[1]-before[1])*u,before[2]+(row[2]-before[2])*u,this.size);
          const a=point(f),b=point(g),mid=(f+g)/2;
          const current=before[3]+(row[3]-before[3])*mid;
          const energy=current/CRT.referenceCurrent*dt/parts*CRT.energyGain;
          const age=end-(before[0]+dt*mid);
          segments.push([...a,...b,energy*(1-CRT.slowFraction)*Math.exp(-age/CRT.fastTau),
            energy*CRT.slowFraction*Math.exp(-age/CRT.slowTau)]);
        }
      }
      if(first===null)first=row[0];this.last=row;
    }
    this.time=end;
    return {segments,dt:Math.max(0,end-(previous??first)),time:end};
  }
}

export function beamResponse(x,y,sigma,haloSigma){
  // The pixel box footprint adds variance 1/12 to both axes. This avoids
  // flickering when a physically narrow spot is smaller than one output pixel.
  const c=Math.sqrt(sigma*sigma+1/12),h=Math.sqrt(haloSigma*haloSigma+1/12);
  return {coreSigma:c,haloSigma:h};
}
export function displayColor(energy,radius){
  if(radius>CRT.diameterIn/CRT.fieldIn)return [5,9,7,255];
  const lum=1-Math.exp(-Math.max(0,energy)*CRT.exposure);
  // Linear-light green phosphor, followed by a display transfer. Colour and
  // exposure are declared visual calibration; energy remains unclipped in HDR.
  const channels=[.10,1,.045],glass=[.0015,.006,.003];
  return [...channels.map((c,i)=>Math.round(255*Math.pow(Math.min(1,glass[i]+c*lum),1/2.2))),255];
}
