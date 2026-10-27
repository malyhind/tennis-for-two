// Browser input only. The caller keeps the existing mechanical and circuit models.
const clamp=value=>Math.max(0,Math.min(100,value));
function inside(element,event){
  const r=element.getBoundingClientRect();
  return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;
}
function point(element,event){
  const r=element.getBoundingClientRect(),x=event.clientX-r.left-r.width/2,y=event.clientY-r.top-r.height/2;
  return {angle:Math.atan2(x,-y)*180/Math.PI,radius:Math.hypot(x,y)/(r.width/2),width:r.width};
}

export function bindControllerInput({hit,dial,canPress,canTurn,getValue,setValue,hold,pulse,cancelPress,releaseKnob,now=()=>performance.now()}){
  let drag=null,press=null,suppressClickUntil=0;
  const releaseCapture=(element,id)=>{if(element.hasPointerCapture(id))element.releasePointerCapture(id);};
  const finishDrag=event=>{
    if(!drag||(event&&event.pointerId!==drag.id))return;
    const id=drag.id;drag=null;releaseCapture(dial,id);releaseKnob();
  };
  const finishPress=(event,cancel=false)=>{
    if(press===null||(event&&event.pointerId!==press))return;
    const id=press;press=null;suppressClickUntil=now()+500;
    releaseCapture(hit,id);
    if(cancel)cancelPress();else hold(`pointer:${id}`,false);
  };
  hit.onpointerdown=event=>{
    // A panel, label or captured pointer outside the key cannot start a stroke.
    if(event.button!==0||press!==null||!canPress()||!inside(hit,event))return;
    event.preventDefault();event.stopPropagation();hit.focus();
    press=event.pointerId;hit.setPointerCapture(press);suppressClickUntil=now()+500;
    hold(`pointer:${press}`,true);
  };
  hit.onpointerup=event=>finishPress(event);
  hit.onpointercancel=hit.onlostpointercapture=event=>finishPress(event,true);
  hit.onkeydown=event=>{
    if(![' ','Enter'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    if(!event.repeat&&canPress()){suppressClickUntil=now()+500;hold(`button:${event.key}`,true);}
  };
  hit.onkeyup=event=>{
    if(![' ','Enter'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();suppressClickUntil=now()+500;hold(`button:${event.key}`,false);
  };
  hit.onclick=event=>{
    event.stopPropagation();
    // Keyboard and assistive-technology activation has no pointer coordinates.
    // Native pointer clicks were already handled by the press/release pair.
    if(event.detail===0&&now()>=suppressClickUntil&&canPress())pulse();
  };
  dial.onpointerdown=event=>{
    if(event.button!==0||drag||!canTurn()||!inside(dial,event))return;
    event.preventDefault();event.stopPropagation();dial.focus();
    const p=point(dial,event);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,angle:p.angle,value:getValue(),linear:p.radius<.55};
    dial.setPointerCapture(event.pointerId);
  };
  dial.onpointermove=event=>{
    if(!drag||event.pointerId!==drag.id)return;
    if(!canTurn()||(event.buttons!==undefined&&(event.buttons&1)===0)){finishDrag(event);return;}
    event.preventDefault();
    const p=point(dial,event);
    if(drag.linear||p.radius<.25){
      drag.value=clamp(drag.value+(event.clientX-drag.x-event.clientY+drag.y)*100/(2*p.width));
    }else{
      let diff=p.angle-drag.angle;if(diff>180)diff-=360;if(diff<-180)diff+=360;
      drag.value=clamp(drag.value+diff/2.7);
    }
    drag.x=event.clientX;drag.y=event.clientY;drag.angle=p.angle;
    setValue(drag.value);
  };
  dial.onpointerup=dial.onpointercancel=dial.onlostpointercapture=finishDrag;
  dial.onkeydown=event=>{
    if(!canTurn())return;
    let value=getValue();const delta={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,PageUp:10,PageDown:-10}[event.key];
    if(delta!==undefined)value+=delta;else if(event.key==='Home')value=0;else if(event.key==='End')value=100;else return;
    event.preventDefault();event.stopPropagation();setValue(clamp(value));
  };
  return {cancel(){finishDrag();finishPress(null,true);cancelPress();}};
}
