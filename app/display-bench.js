import {getLanguage,setLanguage,translateTree,translator,languageButtons,bindLanguageButtons} from './language.js';
import {BENCH_EN} from './bench-english.js';
const tr=translator(BENCH_EN);
const q=selector=>document.querySelector(selector);
const colors=['#c8ff91','#87daed','#f5cb72'];
const xy=q('#xy'),phases=q('#phases');let worker=null,result=null,timer=null,generation=0;
function updateBack(){for(const a of document.querySelectorAll('[data-back]'))a.href=location.pathname.startsWith('/assets/lab/games/')?(getLanguage()==='en'?'/en':'')+'/lab/tennis-for-two.html#display-bench':'../project.html?lang='+getLanguage();}

const captureParams=new URLSearchParams(location.search);
const captureX=Number(captureParams.get('x')),captureY=Number(captureParams.get('y'));
const captured=captureParams.has('x')&&captureParams.has('y')&&Number.isFinite(captureX)&&Number.isFinite(captureY)&&Math.abs(captureX)<=150&&Math.abs(captureY)<=150;
if(captured){q('option[value="snapshot"]').hidden=false;q('#input-mode').value='snapshot';}
function frameNote(){if(!captured)return;
  const note=q('#frame-note');note.hidden=false;const time=Number(captureParams.get('t'));
  const values=`U7 = ${captureX.toFixed(3)} V, U2 = ${captureY.toFixed(3)} V${captureParams.has('t')&&Number.isFinite(time)?`, t = ${time.toFixed(2)} s`:''}`;
  note.textContent=getLanguage()==='en'?`Frozen game frame: ${values}. Ball position is fixed; the keys keep switching.`:`Кадр из игры: ${values}. Положение мяча зафиксировано; ключи продолжают переключаться.`;
}

function panel(canvas,title){
  const ctx=canvas.getContext('2d');ctx.fillStyle='#101e15';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#2e4432';ctx.lineWidth=1;
  for(let x=60;x<canvas.width;x+=105){ctx.beginPath();ctx.moveTo(x,55);ctx.lineTo(x,canvas.height-50);ctx.stroke();}
  for(let y=70;y<canvas.height;y+=100){ctx.beginPath();ctx.moveTo(60,y);ctx.lineTo(canvas.width-30,y);ctx.stroke();}
  ctx.fillStyle='#a1b89c';ctx.font='22px monospace';ctx.fillText(title,30,34);return ctx;
}
function draw(){
  const xctx=panel(xy,'SCOPE INPUT / X–Y / VOLTS'),pctx=panel(phases,'SELECTOR VOLTAGES / A · B · C');
  if(!result){for(const [ctx,c] of [[xctx,xy],[pctx,phases]]){ctx.fillStyle='#82977d';ctx.font='25px monospace';ctx.fillText(tr('Ожидаем расчёт схемы'),70,c.height/2);}return;}
  const d=result.data;
  let xmin=-2.2,xmax=1.8,ymin=-1.6,ymax=1;
  for(let k=0;k<d.length;k+=6)if(d[k]>=.04){xmin=Math.min(xmin,d[k+4]-.1);xmax=Math.max(xmax,d[k+4]+.1);ymin=Math.min(ymin,d[k+5]-.1);ymax=Math.max(ymax,d[k+5]+.1);}
  const X=v=>65+(v-xmin)/(xmax-xmin)*(xy.width-105),Y=v=>xy.height-65-(v-ymin)/(ymax-ymin)*(xy.height-130);
  xctx.save();xctx.beginPath();xctx.rect(60,55,xy.width-90,xy.height-105);xctx.clip();xctx.globalAlpha=.65;
  for(let k=0;k<d.length;k+=6){
    if(d[k]<.04)continue;const chosen=[d[k+1],d[k+2],d[k+3]].findIndex(x=>x<0);
    xctx.fillStyle=colors[chosen]||'#b5b9ac';xctx.fillRect(X(d[k+4])-1.5,Y(d[k+5])-1.5,3,3);
  }
  xctx.restore();xctx.fillStyle='#a1b89c';xctx.font='21px monospace';
  xctx.fillText(xmin.toFixed(1)+' V',65,xy.height-22);xctx.fillText('X → '+xmax.toFixed(1)+' V',xy.width-210,xy.height-22);
  xctx.fillText(ymax.toFixed(1)+' V',65,80);xctx.fillText(ymin.toFixed(1)+' V',65,xy.height-75);
  const end=d[d.length-6],begin=end-.08;
  for(let j=0;j<3;j++){
    const middle=145+j*175;pctx.strokeStyle=colors[j];pctx.lineWidth=2.5;pctx.beginPath();let first=true;
    for(let k=0;k<d.length;k+=6){
      if(d[k]<begin)continue;const x=65+(d[k]-begin)/.08*(phases.width-100),y=middle-d[k+j+1]*8;
      if(first){pctx.moveTo(x,y);first=false;}else pctx.lineTo(x,y);
    }
    pctx.stroke();pctx.fillStyle=colors[j];pctx.font='24px monospace';pctx.fillText('ABC'[j]+' / ±6 V',70,middle-65);
  }
  pctx.fillStyle='#a1b89c';pctx.font='21px monospace';pctx.fillText((begin*1000).toFixed(0)+' ms',65,phases.height-22);pctx.fillText((end*1000).toFixed(0)+' ms',phases.width-160,phases.height-22);
}
function busy(value){
  q('#run').disabled=value;q('#cancel').hidden=!value;
  for(const select of document.querySelectorAll('select'))select.disabled=value;
}
let statusText=Object.entries(BENCH_EN).find(([,v])=>v===q('#status').textContent)?.[0]||q('#status').textContent;
function showStatus(message){statusText=message;let text=tr(message);if(getLanguage()==='en')for(const prefix of ['Ошибка расчёта: ','Ошибка Worker: '])if(message.startsWith(prefix))text=tr(prefix)+message.slice(prefix.length);q('#status').textContent=text;}
function finish(message){clearTimeout(timer);timer=null;busy(false);showStatus(message);}
function abort(message){generation++;if(worker)worker.terminate();worker=null;finish(message);}
q('#run').onclick=()=>{
  const token=++generation;result=null;draw();busy(true);q('#csv').disabled=true;q('#deck').disabled=true;
  q('[data-repeat]').textContent='—';q('[data-duty]').textContent='—';q('[data-wall]').textContent='—';
  showStatus('Подготавливаем стенд…');
  worker??=new Worker(new URL('./display-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
    if(token!==generation)return;
    if(data.status){showStatus(data.status);return;}
    if(data.error){abort('Ошибка расчёта: '+data.error);return;}
    if(!data.result)return;result=data.result;
    presentResult();
    q('#csv').disabled=false;q('#deck').disabled=false;draw();finish('Расчёт готов. На экранах — выходные напряжения SPICE-модели.');
  };
  worker.onerror=event=>abort('Ошибка Worker: '+event.message);
  timer=setTimeout(()=>abort('Время ожидания истекло. Можно запустить расчёт снова.'),60000);
  worker.postMessage({options:{mode:q('#input-mode').value,beta:Number(q('#beta').value),temperature:Number(q('#temperature').value),accuracy:q('#accuracy').value,...(q('#input-mode').value==='snapshot'&&captured?{ballX:captureX,ballY:captureY}:{})}});
};
q('#cancel').onclick=()=>abort('Расчёт остановлен.');
window.addEventListener('pagehide',()=>{if(worker)worker.terminate();clearTimeout(timer);worker=null;});

function save(content,name,type){
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
  a.href=url;a.download=name;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
q('#csv').onclick=()=>{
  if(!result)return;const lines=['# Display-switch circuit bench; nominal DC rails; preliminary Ge models',
    '# options='+JSON.stringify(result.options),'time_s,phase_A_V,phase_B_V,phase_C_V,scope_X_V,scope_Y_V'];
  for(let k=0;k<result.data.length;k+=6)lines.push(Array.from(result.data.subarray(k,k+6)).join(','));
  save(lines.join('\n')+'\n','gremlin-display-trace.csv','text/csv;charset=utf-8');
};
q('#deck').onclick=()=>{
  if(!result)return;
  save(result.standaloneDeck,'gremlin-display-bench.cir','text/plain;charset=utf-8');
};
draw();

function presentResult(){if(!result)return;
    const m=result.metrics;
    q('[data-repeat]').textContent=m.repeat_Hz===null?tr('Нет цикла'):m.repeat_Hz.toFixed(2)+' Hz';
    q('[data-duty]').textContent=m.selected_fraction.map(x=>(100*x).toFixed(1)).join(' / ')+' %';
    q('[data-wall]').textContent=result.wall_s.toFixed(2)+' s';
    const difference=m.relative_frequency_difference;
    q('#comparison').textContent=getLanguage()==='en'?
      `Model: BF=${result.options.beta}, ${result.options.temperature} °C. Difference from 36 Hz: ${difference===null?'cycle undefined':(100*difference).toFixed(2)+' %'}. Channel overlap: ${(m.overlap_fraction*100).toFixed(3)} %. Mode: ${result.options.accuracy}, maximum step ${(result.options.maxStep*1e6).toFixed(0)} µs; ${m.samples} samples in ${result.options.duration} s.`:
      `Модель: BF=${result.options.beta}, ${result.options.temperature} °C. Расхождение с ориентиром 36 Hz: ${difference===null?'цикл не определён':(100*difference).toFixed(2)+' %'}. Одновременный выбор каналов: ${(m.overlap_fraction*100).toFixed(3)} %. Режим: ${result.options.accuracy==='bounded'?'ограниченный':'опорный'}, шаг до ${(result.options.maxStep*1e6).toFixed(0)} µs; ${m.samples} выборок за ${result.options.duration} s.`;
}
document.querySelector('header').insertAdjacentHTML('beforeend',languageButtons());
function applyLanguage(){translateTree(document,BENCH_EN);bindLanguageButtons(document);document.documentElement.lang=getLanguage();showStatus(statusText);presentResult();frameNote();updateBack();for(const a of document.querySelectorAll('a[href*="display-fidelity"]'))a.href='./docs/display-fidelity'+(getLanguage()==='en'?'.en':'')+'.md';draw();}
window.addEventListener('imperial-language',applyLanguage);applyLanguage();
