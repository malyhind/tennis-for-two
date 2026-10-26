// Our controller model; Planck.js/Box2D solves the rigid-body motion and joints.
// Parameters below are declared working choices, not measured 1958 hardware.
import {World,Vec2,RevoluteJoint,PrismaticJoint,Settings} from './vendor/planck/planck.mjs';

// This private module is the game's only Planck world. Millimetre button travel
// needs tighter joint tolerances than the engine's metre-scale game defaults.
Settings.linearSlop=1e-6;Settings.angularSlop=Math.PI/3600;
export const CONTROLLER_MODEL=Object.freeze({
  engine:'Planck.js 1.5.0 / Box2D',step_s:.0005,
  comparison:Object.freeze({source:'General Radio Experimenter, January 1955, p.4',
    url:'https://www.grwiki.org/grwiki/images/4/4d/GR_Exp_970_Series_01_1955.pdf',
    sections:2,pairAverageTorqueRange_Nm:Object.freeze([.0141231,.0176539]),
    interpretation:'Add average torque of two compact period potentiometers; original part identity unestablished.'}),
  knob:Object.freeze({travel_rad:1.5*Math.PI,inertia_kg_m2:2e-5,mass_kg:.08,
    staticTorque_Nm:.01883,slidingTorque_Nm:.0141231,viscous_Nm_s:.0012,
    handStiffness_Nm_rad:2,handDamping_Nm_s:.012,maxHandTorque_Nm:.15,
    backlash_rad:Math.PI/450}),
  button:Object.freeze({mass_kg:.012,travel_m:.003,preload_N:.65,
    stiffness_N_m:500,damping_N_s_m:3,handForce_N:3,
    staticFriction_N:.12,slidingFriction_N:.08,
    close_m:.0017,open_m:.0009,pulse_s:.07}),
  scope:'Reconstruction parameters; no identification of original control mechanics; one clean closure edge per press. Pointer has no force feedback.'
});
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const K=CONTROLLER_MODEL.knob,B=CONTROLLER_MODEL.button,H=CONTROLLER_MODEL.step_s;
const limit=K.travel_rad/2;

export class ControllerMechanics{
  constructor({control=.65,enabled=true,frictionScale=1,springScale=1,stepSeconds=H}={}){
    this.frictionScale=frictionScale;this.springScale=springScale;
    this.stepSeconds=stepSeconds;
    this.enabled=!!enabled;this.world=new World({gravity:Vec2(0,0),allowSleep:false});
    this.ground=this.world.createBody();
    this.rotor=this.world.createDynamicBody({allowSleep:false});
    this.rotor.setMassData({mass:K.mass_kg,center:Vec2(0,0),I:K.inertia_kg_m2});
    this.hinge=this.world.createJoint(new RevoluteJoint({enableLimit:true,
      lowerAngle:-limit,upperAngle:limit,enableMotor:true,motorSpeed:0,
      maxMotorTorque:K.staticTorque_Nm},this.ground,this.rotor,Vec2(0,0)));
    this.plunger=this.world.createDynamicBody({allowSleep:false});
    this.plunger.setMassData({mass:B.mass_kg,center:Vec2(0,0),I:1e-7});
    this.guide=this.world.createJoint(new PrismaticJoint({enableLimit:true,
      lowerTranslation:0,upperTranslation:B.travel_m,enableMotor:true,
      motorSpeed:0,maxMotorForce:B.staticFriction_N},this.ground,this.plunger,Vec2(0,0),Vec2(0,1)));
    this.held=false;this.pulseRemaining=0;this.closed=false;this.driving=false;
    this.accumulator=0;this.edges=[];this.syncControl(control);
  }
  syncControl(value){
    value=clamp(value,0,1);this.target=value;
    this.wiper=-limit+value*K.travel_rad;
    this.rotor.setTransform(Vec2(0,0),this.wiper);this.rotor.setAngularVelocity(0);
  }
  setEnabled(value){
    const control=this.control;this.cancelPress();this.driving=false;
    this.enabled=!!value;this.accumulator=0;this.syncControl(control);
  }
  setTarget(value){
    if(!Number.isFinite(value))return;
    this.target=clamp(value,0,1);this.driving=true;
    if(!this.enabled)this.syncControl(this.target);
  }
  releaseKnob(){this.driving=false;this.target=this.control;}
  setHeld(value){
    value=!!value;if(value===this.held)return;
    this.held=value;
    if(value&&this.enabled)this.pulseRemaining=Math.max(this.pulseRemaining,B.pulse_s);
    if(!this.enabled)this.contact(value);
  }
  pulse(){
    // Accessibility clicks, short taps and CPU commands are one physical press.
    if(this.held||this.pulseRemaining>0||this.closed)return false;
    this.pulseRemaining=B.pulse_s;
    if(!this.enabled)this.contact(true);
    return true;
  }
  contact(value){
    if(this.closed===value)return;
    this.closed=value;this.edges.push(value?'close':'open');
  }
  cancelPress(){
    this.held=false;this.pulseRemaining=0;this.closed=false;this.edges.length=0;
    this.plunger.setTransform(Vec2(0,0),0);this.plunger.setLinearVelocity(Vec2(0,0));
  }
  advance(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    // No hidden catch-up after a suspended tab. The caller pauses on hiding.
    this.accumulator+=Math.min(dt,.05);
    const h=this.stepSeconds;
    while(this.accumulator>=h-1e-10){this.step(h);this.accumulator=Math.max(0,this.accumulator-h);}
  }
  step(h=H){
    const pressed=this.held||this.pulseRemaining>0;
    if(!this.enabled){
      if(this.pulseRemaining>0){this.pulseRemaining=Math.max(0,this.pulseRemaining-h);if(!this.held&&this.pulseRemaining===0)this.contact(false);}
      return;
    }
    const angle=this.rotor.getAngle(),omega=this.rotor.getAngularVelocity();
    let hand=0;
    if(this.driving){
      let wanted=-limit+this.target*K.travel_rad;
      // End commands load the actual stop; friction must not make Home/End
      // permanently unreachable. Interior positions keep finite hand compliance.
      if(this.target===0)wanted-=.03;if(this.target===1)wanted+=.03;
      hand=clamp(K.handStiffness_Nm_rad*(wanted-angle)-K.handDamping_Nm_s*omega,-K.maxHandTorque_Nm,K.maxHandTorque_Nm);
    }
    this.hinge.setMaxMotorTorque(this.frictionScale*(Math.abs(omega)<.002?K.staticTorque_Nm:K.slidingTorque_Nm));
    this.rotor.applyTorque(hand-K.viscous_Nm_s*omega,true);
    const x=this.plunger.getPosition().y,v=this.plunger.getLinearVelocity().y;
    this.guide.setMaxMotorForce(Math.abs(v)<.0001?B.staticFriction_N:B.slidingFriction_N);
    this.plunger.applyForceToCenter(Vec2(0,(pressed?B.handForce_N:0)-B.preload_N-this.springScale*B.stiffness_N_m*x-B.damping_N_s_m*v),true);
    this.world.step(h,8,4);
    // The bounded play operator relates the knob to the wiper. Endpoint seating
    // calibrates full scale while reverse motion takes up the chosen coupling play.
    const theta=clamp(this.rotor.getAngle(),-limit,limit),half=K.backlash_rad/2;
    this.wiper=clamp(this.wiper,theta-half,theta+half);
    if(theta<=-limit+1e-5)this.wiper=-limit;
    if(theta>=limit-1e-5)this.wiper=limit;
    const depth=this.depth;
    if(!this.closed&&depth>=B.close_m)this.contact(true);
    else if(this.closed&&depth<=B.open_m)this.contact(false);
    if(this.pulseRemaining>0)this.pulseRemaining=Math.max(0,this.pulseRemaining-h);
  }
  get control(){return clamp((this.wiper+limit)/K.travel_rad,0,1);}
  get angle(){return this.rotor.getAngle();}
  get depth(){return this.enabled?clamp(this.plunger.getPosition().y,0,B.travel_m):(this.closed?B.travel_m:0);}
  drainEdges(){return this.edges.splice(0);}
  get state(){return {enabled:this.enabled,control:this.control,target:this.target,
    angle_rad:this.angle,angularVelocity_rad_s:this.rotor.getAngularVelocity(),
    buttonTravel_m:this.depth,contactClosed:this.closed};}
}
