// Moving-Gaussian integral / quad construction adapted from m1el/woscope (MIT).
// See vendor/woscope/LICENSE and PROVENANCE.json. GLSL ES3, HDR persistence,
// measured segment timing and matching CPU fallback are our integration.
import {CRT,BeamStream,beamResponse} from './beam-model.js';
import {GlassProjection} from './glass-optics.js';

const postVertex=`#version 300 es
precision highp float;
out vec2 uv;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0,1);}`;
const decayFragment=`#version 300 es
precision highp float;
uniform sampler2D previous;uniform vec2 decay;
in vec2 uv;out vec4 color;
void main(){color=vec4(texture(previous,uv).rg*decay,0.,1.);}`;
const compositeFragment=`#version 300 es
precision highp float;
uniform sampler2D energy;uniform float exposure;uniform float radius;
uniform sampler2D glassGeometry;uniform sampler2D glassGains;uniform int opticsEnabled;
in vec2 uv;out vec4 color;
float pixelEnergy(ivec2 p){
 ivec2 n=textureSize(energy,0);if(any(lessThan(p,ivec2(0)))||any(greaterThanEqual(p,n)))return 0.;
 vec2 q=(vec2(p)+.5)/vec2(n)*2.-1.;if(dot(q,q)>radius*radius)return 0.;
 vec2 e=texelFetch(energy,p,0).rg;return e.r+e.g;
}
float sampleEnergy(vec2 coordinate){
 vec2 q=vec2(coordinate.x,1.-coordinate.y)*vec2(textureSize(energy,0))-.5;
 ivec2 b=ivec2(floor(q));vec2 f=fract(q);
 return mix(mix(pixelEnergy(b),pixelEnergy(b+ivec2(1,0)),f.x),mix(pixelEnergy(b+ivec2(0,1)),pixelEnergy(b+ivec2(1,1)),f.x),f.y);
}
void main(){
 if(length(uv*2.-1.)>radius){color=vec4(vec3(5.,9.,7.)/255.,1.);return;}
 float dose,reflection=0.;
 if(opticsEnabled==1){
  ivec2 n=textureSize(energy,0),p=ivec2(gl_FragCoord.x,float(n.y)-gl_FragCoord.y);
  vec4 m=texelFetch(glassGeometry,p,0),g=texelFetch(glassGains,p,0);
  dose=sampleEnergy(m.xy)*g.x+sampleEnergy(m.zw)*g.y;reflection=g.z;
 }else{vec2 e=texture(energy,uv).rg;dose=e.r+e.g;}
 float lum=1.-exp(-max(0.,dose)*exposure);
 vec3 linear=min(vec3(1.),vec3(.0015,.006,.003)+vec3(.10,1.,.045)*lum+vec3(.85,.9,1.)*reflection);
 color=vec4(pow(linear,vec3(1./2.2)),1.);
}`;
const beamVertex=`#version 300 es
precision highp float;
layout(location=0)in vec2 start;layout(location=1)in vec2 finish;layout(location=2)in vec2 energy;
uniform float size;uniform float padding;
out vec2 local;flat out float beamLength;flat out vec2 dose;
void main(){
 const vec2 corners[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));
 vec2 q=corners[gl_VertexID];vec2 delta=finish-start;float len=length(delta);
 vec2 direction=len>1e-8?delta/len:vec2(1,0),normal=vec2(-direction.y,direction.x);
 float along=q.x<0.?-padding:len+padding;local=vec2(along,q.y*padding);
 vec2 pixel=start+direction*along+normal*local.y;
 gl_Position=vec4(pixel.x/size*2.-1.,1.-pixel.y/size*2.,0,1);
 beamLength=len;dose=energy;
}`;
const beamFragment=`#version 300 es
precision highp float;
uniform vec2 sigma;uniform float halo;
in vec2 local;flat in float beamLength;flat in vec2 dose;
out vec4 color;
float erfApprox(float x){float s=sign(x),a=abs(x);x=1.+(0.278393+(0.230389+(0.000972+0.078108*a)*a)*a)*a;x*=x;return s-s/(x*x);}
float integral(float a,float b,float len,float s){
 if(len<.01*s){float d=a-len*.5;return exp(-(d*d+b*b)/(2.*s*s))/(6.283185307179586*s*s);}
 float f=max(0.,erfApprox(a/(1.4142135623730951*s))-erfApprox((a-len)/(1.4142135623730951*s)));
 return f*exp(-b*b/(2.*s*s))/(2.*2.5066282746310002*s*len);
}
void main(){float v=(1.-halo)*integral(local.x,local.y,beamLength,sigma.x)+halo*integral(local.x,local.y,beamLength,sigma.y);color=vec4(dose*v,0.,0.);}`;

function program(gl,vertex,fragment){
  const shaders=[];const result=gl.createProgram();
  try{
    for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
      const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('CRT shader: '+gl.getShaderInfoLog(shader));
      gl.attachShader(result,shader);
    }
    gl.linkProgram(result);if(!gl.getProgramParameter(result,gl.LINK_STATUS))throw Error('CRT link: '+gl.getProgramInfoLog(result));
    return result;
  }catch(error){gl.deleteProgram(result);throw error;}
  finally{for(const shader of shaders)gl.deleteShader(shader);}
}

export class GPUPhosphor{
  constructor(canvas,size=512,{opticsEnabled=true}={}){
    this.canvas=canvas;this.size=size;canvas.width=canvas.height=size;
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});
    if(!gl)throw Error('WebGL2 unavailable');this.gl=gl;
    if(!gl.getExtension('EXT_color_buffer_float')||!gl.getExtension('EXT_float_blend'))throw Error('HDR float rendering/blending unavailable');
    this.stream=new BeamStream(size);this.current=0;this.packets=0;this.targets=[];
    this.decayProgram=program(gl,postVertex,decayFragment);this.beamProgram=program(gl,beamVertex,beamFragment);this.outputProgram=program(gl,postVertex,compositeFragment);
    this.postVAO=gl.createVertexArray();this.beamVAO=gl.createVertexArray();this.buffer=gl.createBuffer();
    gl.bindVertexArray(this.beamVAO);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,2,gl.FLOAT,false,24,i*8);gl.vertexAttribDivisor(i,1);}
    for(let i=0;i<2;i++){
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,size,size,0,gl.RGBA,gl.FLOAT,null);
      const framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete CRT HDR framebuffer');
      this.targets.push({texture,framebuffer});
    }
    this.opticsEnabled=opticsEnabled;this.projection=new GlassProjection(size);this.glassTextures=[];
    for(const data of [this.projection.geometry,this.projection.gains]){
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,size,size,0,gl.RGBA,gl.FLOAT,data);this.glassTextures.push(texture);
    }
    const base=CRT.sigmaIn/CRT.fieldIn*size,{coreSigma,haloSigma}=beamResponse(0,0,base,base*CRT.haloScale);
    this.sigma=[coreSigma,haloSigma];this.padding=4*haloSigma;
    this.clear();
  }
  uniform(program,name){return this.gl.getUniformLocation(program,name);}
  clear(){
    const g=this.gl;for(const t of this.targets){g.bindFramebuffer(g.FRAMEBUFFER,t.framebuffer);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);}
    this.stream.clear();this.packets=0;this.present();
  }
  append(trace){
    const batch=this.stream.prepare(trace);if(!batch)return false;
    const g=this.gl,source=this.targets[this.current],target=this.targets[1-this.current];
    g.viewport(0,0,this.size,this.size);g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,target.framebuffer);
    g.bindVertexArray(this.postVAO);g.useProgram(this.decayProgram);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,source.texture);
    g.uniform1i(this.uniform(this.decayProgram,'previous'),0);
    g.uniform2f(this.uniform(this.decayProgram,'decay'),Math.exp(-batch.dt/CRT.fastTau),Math.exp(-batch.dt/CRT.slowTau));
    g.drawArrays(g.TRIANGLES,0,3);
    if(batch.segments.length){
      const data=new Float32Array(batch.segments.length*6);batch.segments.forEach((s,i)=>data.set(s,i*6));
      g.useProgram(this.beamProgram);g.bindVertexArray(this.beamVAO);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,data,g.DYNAMIC_DRAW);
      g.uniform1f(this.uniform(this.beamProgram,'size'),this.size);g.uniform1f(this.uniform(this.beamProgram,'padding'),this.padding);
      g.uniform2fv(this.uniform(this.beamProgram,'sigma'),this.sigma);g.uniform1f(this.uniform(this.beamProgram,'halo'),CRT.haloFraction);
      g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE);
      g.drawArraysInstanced(g.TRIANGLES,0,6,batch.segments.length);g.disable(g.BLEND);
    }
    this.current=1-this.current;this.packets++;this.present();
    const error=g.getError();if(error!==g.NO_ERROR)throw Error('CRT WebGL error '+error);return true;
  }
  present(){
    const g=this.gl;if(g.isContextLost())return;
    g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,this.size,this.size);g.bindVertexArray(this.postVAO);g.useProgram(this.outputProgram);
    g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.targets[this.current].texture);
    g.uniform1i(this.uniform(this.outputProgram,'energy'),0);g.uniform1f(this.uniform(this.outputProgram,'exposure'),CRT.exposure);
    g.uniform1f(this.uniform(this.outputProgram,'radius'),CRT.diameterIn/CRT.fieldIn);
    for(let i=0;i<2;i++){g.activeTexture(g.TEXTURE1+i);g.bindTexture(g.TEXTURE_2D,this.glassTextures[i]);}
    g.uniform1i(this.uniform(this.outputProgram,'glassGeometry'),1);g.uniform1i(this.uniform(this.outputProgram,'glassGains'),2);
    g.uniform1i(this.uniform(this.outputProgram,'opticsEnabled'),this.opticsEnabled?1:0);g.drawArrays(g.TRIANGLES,0,3);
  }
  setOpticsEnabled(value){this.opticsEnabled=!!value;}
  readEnergy(){
    const g=this.gl,a=new Float32Array(this.size*this.size*4);g.bindFramebuffer(g.FRAMEBUFFER,this.targets[this.current].framebuffer);
    g.readPixels(0,0,this.size,this.size,g.RGBA,g.FLOAT,a);g.bindFramebuffer(g.FRAMEBUFFER,null);return a;
  }
  readImage(){
    this.present();const g=this.gl,a=new Uint8Array(this.size*this.size*4);
    g.readPixels(0,0,this.size,this.size,g.RGBA,g.UNSIGNED_BYTE,a);return a;
  }
  dispose(){
    const g=this.gl;for(const t of this.targets){g.deleteTexture(t.texture);g.deleteFramebuffer(t.framebuffer);}
    for(const t of this.glassTextures)g.deleteTexture(t);
    for(const p of [this.decayProgram,this.beamProgram,this.outputProgram])g.deleteProgram(p);
    g.deleteBuffer(this.buffer);g.deleteVertexArray(this.beamVAO);g.deleteVertexArray(this.postVAO);
  }
}
