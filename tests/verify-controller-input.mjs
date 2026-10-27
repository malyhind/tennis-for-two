import {PLAY_MODES} from '../app/play-modes.js';
import assert from 'node:assert/strict';
import {bindControllerInput} from '../app/controller-input.js';
import {ControllerMechanics} from '../app/controller-mechanics.js';
import {EN} from '../app/ui-english.js';

// Event-level regression tests; these do not claim to replace browser layout QA.
class Element {
  constructor(rect){this.rect=rect;this.captured=new Set();}
  getBoundingClientRect(){return this.rect;}
  focus(){}
  setPointerCapture(id){this.captured.add(id);}
  hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);this.onlostpointercapture?.({pointerId:id});}
}
function fixture(){
  const dial=new Element({left:0,top:0,right:100,bottom:100,width:100,height:100});
  const hit=new Element({left:120,top:30,right:200,bottom:80,width:80,height:50});
  const f={dial,hit,value:50,enabled:true,held:new Set(),holds:[],pulses:0,releases:0,cancels:0,time:0};
  f.input=bindControllerInput({hit,dial,canTurn:()=>f.enabled,canPress:()=>f.enabled,getValue:()=>f.value,
    setValue:v=>{f.value=v;},hold:(source,pressed)=>{f.holds.push([source,pressed]);if(pressed)f.held.add(source);else f.held.delete(source);},
    pulse:()=>f.pulses++,cancelPress:()=>{f.held.clear();f.cancels++;},releaseKnob:()=>f.releases++,now:()=>f.time});
  return f;
}
const pointer=(x,y,id=1,extra={})=>({clientX:x,clientY:y,pointerId:id,button:0,buttons:1,isPrimary:true,
  preventDefault(){},stopPropagation(){},...extra});
const key=(name,extra={})=>({key:name,repeat:false,preventDefault(){},stopPropagation(){},...extra});
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}

test('Centre drags work vertically and horizontally without angular dead spots',()=>{
  const f=fixture();f.dial.onpointerdown(pointer(50,50));f.dial.onpointermove(pointer(50,10));assert.equal(f.value,70);
  f.dial.onpointermove(pointer(80,10));assert.equal(f.value,85);f.dial.onpointerup(pointer(80,10));assert.equal(f.releases,1);
});
test('Rim rotation wraps across -180/180 degrees without jumping',()=>{
  const f=fixture();f.dial.onpointerdown(pointer(51,99));f.dial.onpointermove(pointer(49,99));assert.ok(f.value>50&&f.value<52);
});
test('A drag through the centre stays finite and bounded',()=>{
  const f=fixture();f.dial.onpointerdown(pointer(99,50));f.dial.onpointermove(pointer(50,50));assert.ok(Number.isFinite(f.value));
  for(const [x,y] of [[50,-1000],[50,1000],[1000,50],[-1000,50]]){f.dial.onpointermove(pointer(x,y));assert.ok(f.value>=0&&f.value<=100);}
});
test('An unrelated pointer cannot move or release the knob',()=>{
  const f=fixture();f.dial.onpointerdown(pointer(50,50,4));f.dial.onpointermove(pointer(50,0,5));f.dial.onpointerup(pointer(50,0,5));
  assert.equal(f.value,50);assert.equal(f.releases,0);f.dial.onpointermove(pointer(50,0,4));assert.equal(f.value,75);
});
test('Missing mouse-up is recovered when no button is held',()=>{
  const f=fixture();f.dial.onpointerdown(pointer(50,50));f.dial.onpointermove(pointer(50,0,1,{buttons:0}));
  assert.equal(f.releases,1);f.dial.onpointermove(pointer(50,0));assert.equal(f.value,50);
});
test('Cancellation and mode changes discard drag ownership',()=>{
  const f=fixture();f.dial.onpointerdown(pointer(50,50));f.input.cancel();f.dial.onpointermove(pointer(50,0));assert.equal(f.value,50);
  f.dial.onpointerdown(pointer(50,50));f.enabled=false;f.dial.onpointermove(pointer(50,0));f.enabled=true;
  f.dial.onpointermove(pointer(50,0));assert.equal(f.value,50);assert.equal(f.releases,2);
});
test('Two people can use two simultaneous touch pointers',()=>{
  const a=fixture(),b=fixture();a.dial.onpointerdown(pointer(50,50,1));b.dial.onpointerdown(pointer(50,50,2,{isPrimary:false}));
  a.dial.onpointermove(pointer(50,10,1));b.dial.onpointermove(pointer(50,90,2,{isPrimary:false}));assert.equal(a.value,70);assert.equal(b.value,30);
});
test('A press starting anywhere outside the visible key does nothing',()=>{
  const f=fixture();for(const [x,y] of [[50,50],[110,50],[150,20],[150,90],[205,50]])f.hit.onpointerdown(pointer(x,y));
  assert.deepEqual(f.holds,[]);assert.equal(f.pulses,0);
});
test('A key press remains one stroke even when released outside the key',()=>{
  const f=fixture();f.hit.onpointerdown(pointer(150,50));f.hit.onpointerdown(pointer(150,50));f.hit.onpointerup(pointer(500,500));
  f.hit.onclick({detail:1,stopPropagation(){}});assert.deepEqual(f.holds,[['pointer:1',true],['pointer:1',false]]);assert.equal(f.pulses,0);
});
test('An unrelated release cannot cancel a held key',()=>{
  const f=fixture();f.hit.onpointerdown(pointer(150,50,3));f.hit.onpointercancel(pointer(150,50,4));assert.equal(f.held.size,1);
  f.hit.onpointercancel(pointer(150,50,3));assert.equal(f.held.size,0);assert.equal(f.cancels,1);
});
test('Long pointer holds do not become a second accessibility click on release',()=>{
  const f=fixture();f.hit.onpointerdown(pointer(150,50));f.time=3000;f.hit.onpointerup(pointer(150,50));
  f.hit.onclick({detail:0,stopPropagation(){}});assert.equal(f.pulses,0);f.time+=501;
  f.hit.onclick({detail:0,stopPropagation(){}});assert.equal(f.pulses,1);
});
test('Space and Enter hold once, release once and suppress duplicate native clicks',()=>{
  for(const name of [' ','Enter']){
    const f=fixture();f.hit.onkeydown(key(name));f.hit.onkeydown(key(name,{repeat:true}));f.time=2000;f.hit.onkeyup(key(name));
    f.hit.onclick({detail:0,stopPropagation(){}});assert.deepEqual(f.holds,[[`button:${name}`,true],[`button:${name}`,false]]);assert.equal(f.pulses,0);
  }
});
test('Blocked CPU/demo controls cannot be operated with pointer or keyboard',()=>{
  const f=fixture();f.enabled=false;f.dial.onpointerdown(pointer(50,50));f.dial.onpointermove(pointer(50,0));f.dial.onkeydown(key('End'));
  f.hit.onpointerdown(pointer(150,50));f.hit.onkeydown(key('Enter'));f.hit.onclick({detail:0,stopPropagation(){}});assert.equal(f.value,50);assert.equal(f.pulses,0);assert.equal(f.held.size,0);
});
test('Keyboard slider input preserves limits and Page/Home/End controls',()=>{
  const f=fixture();f.dial.onkeydown(key('PageUp'));assert.equal(f.value,60);f.dial.onkeydown(key('Home'));assert.equal(f.value,0);
  f.dial.onkeydown(key('ArrowLeft'));assert.equal(f.value,0);f.dial.onkeydown(key('End'));assert.equal(f.value,100);
});
test('Me and Fox selects a CPU; the explicit local mode has two human controllers',()=>{
  assert.deepEqual(PLAY_MODES.together.cpu,[null,'fox']);assert.deepEqual(PLAY_MODES.local.cpu,[null,null]);
  for(const mode of Object.values(PLAY_MODES)){assert.ok(EN[mode.label]);assert.ok(EN[mode.description]);}
});

// Load the actual component with only its browser globals stubbed. Exercise the
// real animation tick and the real Planck mechanisms, not a copy of that logic.
globalThis.HTMLElement=class {};
globalThis.customElements={define(){}};
globalThis.location={search:'?lang=ru'};
globalThis.document={documentElement:{lang:'ru'}};
globalThis.window={addEventListener(){}};
globalThis.requestAnimationFrame=()=>1;
const {AnalogTennis}=await import('../app/analog-tennis.js');
test('A drag released between two frames reaches the actual mechanical model',()=>{
  const game=Object.create(AnalogTennis.prototype);
  Object.assign(game,{isConnected:true,lastFrame:1000,playMode:'local',paused:false,operators:[null,null],
    mechanics:[new ControllerMechanics({control:.5}),new ControllerMechanics({control:.5})],pendingKnobReleases:new Set([0]),
    engine:{error:null,advance(){},popEvents(){return 0;},drainSamples(){return [];},drainBeams(){return [];}},
    writeControls(){},flushContacts(){},renderState(){},scope:{},audio:{},tickHandler(){}});
  game.mechanics[0].setTarget(.75);const initial=game.mechanics[0].control;
  game.tick(1016);assert.ok(game.mechanics[0].control>initial);assert.equal(game.pendingKnobReleases.size,0);assert.equal(game.mechanics[0].driving,false);
});
console.log(JSON.stringify({passed,failed:0,scope:'Input event and component/Planck regression tests; no browser layout claim'}));
