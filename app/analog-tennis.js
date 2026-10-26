import {getLanguage,setLanguage,translateTree,translator,languageButtons,bindLanguageButtons} from './language.js';
import {EN} from './ui-english.js';
import {ControllerMechanics,CONTROLLER_MODEL} from './controller-mechanics.js';
import {GLASS_MODEL} from './glass-optics.js';
import {ScopeRenderer} from './scope-renderer.js';
import {loadEngine,snapshot} from './engine.js';
import {RelayAudio} from './audio.js';
import {CPUPlayer,PLAY_MODES,CPU_PROFILES,operatorView} from './cpu-player.js';
import {DEMO_MODE,loadDemoEngine} from './demo-engine.js';
const INSTRUMENT_MODES=Object.freeze({...PLAY_MODES,demo:DEMO_MODE});

const css=/*css*/`
:host{display:block;--paper:#e9e6da;--ink:#292c25;--muted:#707365;--line:#c3c4b6;--green:#3e6138;--glow:#c7ff8f;color:var(--ink);font:15px/1.5 system-ui,-apple-system,Arial,sans-serif;color-scheme:light}
*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{cursor:default}a{color:inherit;text-underline-offset:4px}button:focus-visible,a:focus-visible,summary:focus-visible,[tabindex]:focus-visible,input:focus-visible{outline:3px solid #858b37;outline-offset:4px}button:disabled{opacity:.45}.tools [data-mechanics]:disabled[aria-pressed="true"]{opacity:1}button{color:var(--ink);background:#f4f2e9;border:1px solid var(--line);border-radius:5px;min-height:42px;padding:8px 14px}button:hover:not(:disabled){background:#fffdf4}p,h1,h2,h3{margin:0}small,.mono{font-family:ui-monospace,'Courier New',monospace}.subtle{color:var(--muted)}
.archive{max-width:1020px;margin:auto}.mast{display:flex;justify-content:space-between;gap:18px;align-items:center;padding-bottom:28px;font:11px/1.4 ui-monospace,monospace;letter-spacing:.12em}.brand{display:flex;gap:11px;align-items:center}.mark{display:grid;place-items:center;width:32px;height:32px;border:0}.mast-right{color:var(--muted);text-align:right}.intro{display:flex;align-items:end;justify-content:space-between;gap:18px;padding:18px 0 27px;border-top:1px solid var(--ink)}.eyebrow{font:11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;color:var(--muted)}h1{font:clamp(32px,6vw,54px)/1.05 Georgia,'Times New Roman',serif;letter-spacing:-.04em}.intro p{margin-top:12px;color:var(--muted);font-size:14px}.edition{font:11px/1.6 ui-monospace,monospace;white-space:nowrap;text-align:right}.edition b{font-weight:400;color:var(--green)}
.machine{background:var(--paper);border:1px solid #a7a99a;border-radius:12px;box-shadow:0 4px 0 #c1c3b3,0 12px 40px #272c2510;padding:21px;container-type:inline-size}.plate{display:flex;align-items:center;justify-content:space-between;gap:12px;font:10px/1.5 ui-monospace,monospace;letter-spacing:.11em;border-bottom:1px solid #b9bdab;padding:0 3px 15px}.power{display:flex;align-items:center;gap:8px;white-space:nowrap}.lamp{display:inline-block;width:7px;height:7px;border-radius:50%;background:#4a693b;box-shadow:0 0 8px #72965388}.tools{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:16px 0}.tools button{font-size:12px;min-height:36px;padding:6px 10px}.tools label{font-size:12px;display:flex;align-items:center;gap:5px;margin-left:auto;cursor:pointer}.language-switch{display:inline-flex;gap:0;margin-left:auto}.language-switch button{border-radius:0;min-width:36px}.language-switch button:first-child{border-radius:4px 0 0 4px}.language-switch button:last-child{border-radius:0 4px 4px 0}.language-switch [aria-pressed="true"]{background:var(--ink);color:var(--paper)}.tools .mode-select{margin:0;gap:8px}.mode-select select{min-height:36px;max-width:100%;padding:5px 8px;border:1px solid var(--line);border-radius:5px;background:#f4f2e9;color:var(--ink);font-size:12px}.mode-note{font-size:10px;color:var(--muted);flex-basis:100%}.controller.cpu .dial{cursor:default}.controller.cpu .hit:disabled{opacity:1}.operator-name{font-weight:600}.tools input{accent-color:var(--green);width:16px;height:16px}
.screen{max-width:520px;justify-self:center;width:100%;position:relative;border-radius:28px;padding:9px;background:linear-gradient(150deg,#697263,#363e32);box-shadow:inset 0 2px 3px #fff5,0 2px 6px #0003}.screen-inner{position:relative;border-radius:21px;overflow:hidden;background:#071a12;box-shadow:inset 0 0 40px #0008}canvas{width:100%;height:auto;aspect-ratio:1;display:block;outline-offset:-7px!important;border-radius:21px}.scope-tag{position:absolute;top:16px;left:20px;font:10px ui-monospace,monospace;letter-spacing:.15em;color:#b7cba066;pointer-events:none}.scope-tag.right{left:auto;right:20px;text-align:right}.readout{display:flex;justify-content:space-between;padding:11px 7px 0;font:10px/1.4 ui-monospace,monospace;color:var(--muted);letter-spacing:.08em}.status{display:flex;align-items:center;justify-content:center;min-height:57px;padding:13px 8px;text-align:center;font-size:13px;font-weight:600}.status:before{content:'';width:6px;height:6px;background:var(--green);border-radius:50%;margin-right:9px;flex-shrink:0}
.controllers{align-content:start;grid-auto-rows:max-content;display:grid;grid-template-columns:1fr 1fr;gap:16px}.controller{background:#f3f0e7;border:1px solid #b7bcab;border-radius:7px;padding:16px;position:relative;transition:border-color .15s}.controller.ready{border-color:#63834e;box-shadow:inset 0 0 0 1px #63834e}.controller-head{display:flex;justify-content:space-between;gap:8px;align-items:center;font:10px/1.4 ui-monospace,monospace;letter-spacing:.08em}.ready-text{color:var(--muted);font-size:10px;letter-spacing:0}.ready .ready-text{color:var(--green)}.controls-row{display:flex;align-items:center;gap:22px;margin-top:13px}.dial-wrap{width:126px;flex-shrink:0;text-align:center}.dial{position:relative;width:120px;height:120px;border-radius:50%;padding:12px;border:1px solid #c1c3b5;touch-action:none;user-select:none;cursor:grab;background:repeating-conic-gradient(from 225deg,#a8ad9b 0deg 1deg,transparent 1deg 10deg)}.dial:active{cursor:grabbing}.face{display:block;width:100%;height:100%;position:relative;border-radius:50%;background:radial-gradient(circle at 37% 28%,#575c50,#22291f 73%);box-shadow:0 4px 5px #0005,inset 0 1px 2px #ffffff55;transform:rotate(var(--rotation,0deg));pointer-events:none}.face:before{content:'';position:absolute;top:9px;left:calc(50% - 2px);width:4px;height:26px;border-radius:2px;background:#f5f0d1}.face:after{content:'';position:absolute;inset:36%;border-radius:50%;border:1px solid #747a6340;background:#30382b}.dial-caption{display:flex;justify-content:space-between;padding:6px 4px 0;font:9px ui-monospace,monospace;color:var(--muted)}.action{flex:1;min-width:0}.setting{font:10px ui-monospace,monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.setting output{font-size:23px;color:var(--ink);display:block;margin-top:4px;letter-spacing:0}.hit{margin:11px 0 7px;width:100%;min-height:48px;transform:translateY(var(--press-depth,0px));box-shadow:0 var(--press-shadow,3px) 0 #a3a896;background:#dadccc;border:1px solid #b1b7a2;font-size:14px;font-weight:600}.ready .hit{background:#42673a;color:#ffffec;border-color:#375b30;box-shadow:0 var(--press-shadow,3px) 0 #284923}.ready .hit:hover{background:#507d44}.hit.is-pressed{filter:brightness(.94)}.keys{font:10px/1.5 ui-monospace,monospace;color:var(--muted)}
.help{border-top:1px solid var(--line);margin-top:18px;padding-top:15px;display:grid;grid-template-columns:1.15fr 1fr;gap:24px;font-size:12px;color:#626857}.help strong{color:var(--ink);font-weight:600}.help p+p{margin-top:6px}.legend{display:flex;gap:10px;align-items:start}.num{font:11px ui-monospace,monospace;border:1px solid var(--line);border-radius:50%;width:21px;height:21px;flex-shrink:0;display:grid;place-items:center}
.engineering{margin-top:26px;border-top:1px solid var(--ink);border-bottom:1px solid var(--line)}summary{cursor:pointer;list-style:none;padding:18px 0;font:11px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;display:flex;justify-content:space-between}summary::-webkit-details-marker{display:none}summary:after{content:'+'}details[open]>summary:after{content:'−'}.engineering-body{padding-bottom:24px}.research-note{font-size:13px;max-width:790px;color:#626857;margin-bottom:20px}.research-note strong{color:var(--ink)}.bench{display:grid;grid-template-columns:1fr 1fr;gap:26px}table{width:100%;border-collapse:collapse;font:12px/1.5 ui-monospace,monospace}th,td{text-align:left;border-bottom:1px solid var(--line);padding:8px 0}th{font-size:10px;color:var(--muted);font-weight:400}td:last-child,th:last-child{text-align:right}td{font-variant-numeric:tabular-nums}.settings{border:1px solid var(--line);border-radius:5px;padding:16px;font-size:12px}.settings label{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:12px}.settings input{width:85px;padding:7px;border:1px solid var(--line);background:#f8f5eb;border-radius:3px}.settings p{margin:12px 0;color:var(--muted);font-size:11px}.settings button{font-size:12px;width:100%}.settings button+button{margin-top:8px}.trace-count{display:block;font:10px ui-monospace,monospace;color:var(--muted);padding-top:8px}.sources{font-size:12px;margin-top:22px;color:#626857}.sources a{margin-right:12px}.sources p+p{margin-top:9px}.footer{display:flex;justify-content:space-between;gap:18px;padding:20px 0 0;font:10px/1.6 ui-monospace,monospace;color:var(--muted)}.error{padding:24px;border:1px solid #a6573f;border-radius:6px}.error p{margin:10px 0;font-size:13px}.error button{font-size:13px}.loading{padding:60px;text-align:center;font:12px ui-monospace,monospace}.compact-link{display:none}
:host([instrument]) .mast,:host([instrument]) .intro,:host([instrument]) .footer{display:none}:host([instrument]) .compact-link{display:none}:host([compact]) .mast,:host([compact]) .intro,:host([compact]) .engineering,:host([compact]) .footer{display:none}:host([compact]) .machine{box-shadow:none}:host([compact]) .compact-link{display:block;text-align:right;font:11px ui-monospace,monospace;margin-top:13px}
@container(max-width:600px){.machine{padding:12px}.plate{font-size:9px;letter-spacing:.04em}.controllers{gap:9px}.controller{padding:11px}.controls-row{gap:10px}.dial-wrap{width:91px}.dial{width:88px;height:88px;padding:9px}.face:before{top:7px;height:20px;width:3px}.setting{font-size:9px}.setting output{font-size:20px}.controller-head{font-size:9px;letter-spacing:0}.ready-text{font-size:9px}.hit{padding:7px 3px;min-height:44px;font-size:12px}.keys{font-size:9px}.readout{font-size:9px}.screen{border-radius:22px;padding:6px}.screen-inner,canvas{border-radius:17px}.scope-tag{top:11px;left:13px;font-size:8px}.scope-tag.right{right:13px}.help{gap:15px;font-size:11px}.status{font-size:12px;min-height:64px}.tools{gap:6px}.tools button{font-size:11px;padding:6px 8px}.tools label{font-size:11px}}
.archive{container-type:inline-size}
@container(min-width:800px){.machine{display:grid;grid-template-columns:minmax(0,1fr) 290px;column-gap:18px}.plate,.tools,.help{grid-column:1/-1}.screen{grid-column:1;grid-row:3;align-self:start}.readout{grid-column:1;grid-row:4}.status{grid-column:1;grid-row:5}.controllers{grid-column:2;grid-row:3/6;grid-template-columns:1fr;gap:13px}.controller{padding:15px}.controls-row{gap:14px}.dial-wrap{width:116px}.dial{width:112px;height:112px}}
@media(max-width:600px){.mast{padding-bottom:19px;font-size:9px}.mast-right{max-width:130px}.intro{display:block;padding-bottom:20px}.edition{display:none}.intro p{font-size:12px}.machine{padding:11px}.bench{grid-template-columns:1fr}.footer{font-size:9px}.help{grid-template-columns:1fr;gap:10px}.controllers{gap:8px}.controls-row{flex-direction:column;gap:10px}.action{width:100%;text-align:center}.setting output{display:inline;margin-left:5px;font-size:17px}.setting{font-size:9px}.dial-wrap{width:100px}.dial{width:96px;height:96px}.controller-head{flex-direction:column;gap:5px}.ready-text{min-height:14px}.controller{padding:12px 8px}.keys{min-height:27px}.tools label{margin-left:0}.screen canvas{aspect-ratio:1}.scope-tag.right{display:none}.readout span:nth-child(2){display:none}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;

function controller(side) {
  return `<section class="controller" data-side="${side}"><div class="controller-head"><span data-player>0${side+1} / ${side?'СПРАВА':'СЛЕВА'}</span><span class="ready-text"></span></div><div class="controls-row"><div class="dial-wrap"><div class="dial" role="slider" tabindex="0" aria-label="Наклон удара игрока ${side?'справа':'слева'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="65"><span class="face"></span></div><div class="dial-caption"><span>НИЗКО</span><span>ВЫСОКО</span></div></div><div class="action"><label class="setting">Наклон <output>65</output></label><button class="hit" type="button" disabled>Подать</button><p class="keys">${side?'← / → — ручка<br>↑ — удар':'A / D — ручка<br>W / пробел — удар'}</p></div></div></section>`;
}

export class AnalogTennis extends HTMLElement {
  constructor() {
    super();this.attachShadow({mode:'open'});this.engine=null;this.audio=new RelayAudio();
    this.paused=false;this.guide=false;this.frame=0;this.lastFrame=0;this.rows=[];this.pending=0;
    this.playMode='opponent';this.operators=[null,null];this.mechanics=[];this.heldSources=[new Set(),new Set()];this.suppressClickUntil=[0,0];
    this.modeLoading=false;this.modeSerial=0;this.modeAbort=null;this.modeFailure=null;
    this.mechanicsEnabled=true;try{this.mechanicsEnabled=localStorage.getItem('tennis-for-two.mechanics')!=='off';}catch{}
    this.opticsEnabled=true;try{this.opticsEnabled=localStorage.getItem('tennis-for-two.glass')!=='off';}catch{}
    this.blurHandler=()=>this.cancelInputs();
    this.trail=[];this.tickHandler=this.tick.bind(this);this.visibilityHandler=()=>{if(document.hidden)this.setPaused(true);};
  }
  connectedCallback() { this.t=translator(EN);this.languageHandler=()=>this.applyLanguage();window.addEventListener('tennis-language',this.languageHandler);this.mount(); }
  get isDemo(){return this.playMode==='demo';}
  disconnectedCallback() { this.modeSerial++;this.modeAbort?.abort();window.removeEventListener('tennis-language',this.languageHandler);cancelAnimationFrame(this.frame);document.removeEventListener('visibilitychange',this.visibilityHandler);window.removeEventListener('blur',this.blurHandler);this.cancelInputs();this.audio.close();this.scope?.dispose();this.engine?.close(); }
  async mount() {
    if(this.isDemo)this.playMode='opponent';
    this.shadowRoot.innerHTML=`<style>${css}</style><div class="loading" role="status">Включаем прибор…</div>`;
    translateTree(this.shadowRoot,EN);translateTree(document.body,EN);
    document.documentElement.lang=getLanguage();
    document.title=this.hasAttribute('instrument')?this.t('Прибор Tennis for Two'):`Tennis for Two · SPICE · ${getLanguage()==='en'?'Imperial School Laboratory':'Лаборатория Школы Империи'}`;
    try {
      const recording=fetch(new URL('./demo/manifest.json',import.meta.url)).then(r=>r.ok?r.json():null).catch(()=>null);
      [this.engine,this.recording]=await Promise.all([loadEngine(),recording]);
      this.demoAvailable=this.recording?.format==='tft-demo-1'&&this.recording.available!==false;
    }
    catch(error) {
      console.error(error);this.shadowRoot.innerHTML=`<style>${css}</style><div class="error"><strong>Не удалось включить прибор</strong><p>Для расчёта нужен WebAssembly. Откройте страницу через HTTP; папка vendor и файл tennis.cir должны находиться рядом с модулями игры.</p><button type="button">Повторить</button></div>`;
      translateTree(this.shadowRoot,EN);this.shadowRoot.querySelector('button').onclick=()=>this.mount();return;
    }
    if(!this.isConnected){this.engine.close();return;}
    this.shadowRoot.innerHTML=`<style>${css}</style><div class="archive"><header class="mast"><span class="brand"><img class="mark" alt="" src="${new URL('./icons/laboratory.svg',import.meta.url)}"><span>ЛАБОРАТОРИЯ ШКОЛЫ ИМПЕРИИ<br>АНАЛОГОВЫЙ АРХИВ</span></span><span class="mast-right">СОХРАНЯЕМ ИГРЫ.<br>И ТО, КАК ОНИ РАБОТАЛИ.</span></header><div class="intro"><div><div class="eyebrow">Прибор 001 / Брукхейвен, 1958</div><h1>Tennis for Two</h1><p>Два игрока. Две ручки. Один светящийся мяч.</p></div><div class="edition">NGSPICE / WASM / f64<br><b>ЕДИНЫЙ ПРИБОР · 0.8.4</b></div></div><section class="machine" aria-label="Прибор Tennis for Two" tabindex="-1"><div class="plate"><span>TENNIS PROGRAMMING / МОДЕЛЬ 01</span><span class="power"><i class="lamp" aria-hidden="true"></i><span>SPICE · 0.8.4</span></span></div><div class="tools"><label class="mode-select">Режим <select data-mode aria-label="Режим игры">${Object.entries(INSTRUMENT_MODES).filter(([value])=>value!=='demo'||this.demoAvailable).map(([value,mode])=>`<option value="${value}">${mode.label}</option>`).join('')}</select></label><button type="button" data-pause aria-pressed="false">Пауза</button><button type="button" data-reset>Сброс</button><button type="button" data-mechanics aria-pressed="true">Механика: вкл</button><button type="button" data-optics aria-pressed="true">Оптика стекла: вкл</button><button type="button" data-sound aria-pressed="true">Звук: вкл</button>${languageButtons()}<span class="mode-note">Смена режима начинает новый розыгрыш.</span></div><div class="screen"><div class="screen-inner"><canvas width="512" height="512" tabindex="0" aria-label="Осциллограф: вид сбоку. Мяч, земля и сетка. Удар выполняется из текущего положения мяча." aria-describedby="how-to-play"></canvas></div></div><div class="readout"><span data-clock>ВРЕМЯ СХЕМЫ</span><span data-tempo></span><span data-phase>ПОДАЧА</span></div><p class="status" role="status" aria-live="polite" aria-atomic="true"></p><div class="controllers">${controller(0)}${controller(1)}</div><div class="help" id="how-to-play"><div class="legend"><span class="num">1</span><p><strong>Где ракетка?</strong> Удар — из текущей точки мяча. Когда кнопка горит, можно отбивать на своей половине: сразу после сетки или после отскока.</p></div><div class="legend"><span class="num">2</span><p><strong>Поверните круглую ручку.</strong> Зажмите её мышью или пальцем и вращайте. Затем нажмите «Удар». Положение указателя на ручке показывает выбранный наклон.</p></div></div></section><details class="engineering"><summary>Внутри прибора <span>схема / измерения / источники</span></summary><div class="engineering-body"><p class="research-note">Оптика стекла рассчитывает преломление, отражение и поглощение между люминофором и наблюдателем. Плоская поверхность соответствует документации 5ADP; толщина и свойства стекла — параметры реконструкции.</p><p class="research-note">У ручек рассчитываются инерция, трение и люфт; у кнопок — ход, пружина и замыкание контакта. Переключатель «Механика» сохраняет текущий розыгрыш.</p><p class="research-note"><strong data-execution-label>Профиль 0.8.4 — единый расчёт в ngspice/WASM.</strong> Зарядные банки, интеграторы, цепи отскока и катушки реле рассчитываются по SPICE-описанию. Усилители, контакты и блокировка ударов представлены макромоделями. Схема вычислительной части 1958 года служит основой; все уточнения и рабочие параметры перечислены в описании модели.</p><div class="bench"><div><table><thead><tr><th>ВЫХОД УСИЛИТЕЛЯ</th><th>НАПРЯЖЕНИЕ</th></tr></thead><tbody><tr><td>U1 · ≈ −dY/dt</td><td data-node="0">—</td></tr><tr><td>U2 · Y − 20 V</td><td data-node="1">—</td></tr><tr><td>U6 · ≈ −dX/dt</td><td data-node="2">—</td></tr><tr><td>U7 · X</td><td data-node="3">—</td></tr><tr><td>Шаг расчёта</td><td>адаптивный, ≤ 50 µs</td></tr><tr><td>Реле · контакты</td><td data-relay>—</td></tr><tr><td>Катушка · земля</td><td data-coil="0">—</td></tr><tr><td>Катушка · сетка</td><td data-coil="1">—</td></tr><tr><td>Катушка · пуск</td><td data-coil="2">—</td></tr></tbody></table><small class="trace-count" data-trace>Трасса: 0 отсчётов</small></div><div class="settings"><label>Напряжение −G, V <input type="number" min="5" max="100" step="1" value="60" data-gravity aria-label="Модуль напряжения гравитации в вольтах"></label><p>60 V — выбранная рабочая настройка реконструкции. Номиналы вычислительных цепей: 1 MΩ, 1 µF; обратная связь по скорости: 10 MΩ. Ручки заряжают накопительные конденсаторы через 50 kΩ.</p><button type="button" data-csv>Скачать измерения · CSV</button><button type="button" data-profile>Скачать описание модели · JSON</button><p><a data-display target="_blank" rel="noopener">Отдельный стенд переключателя ↗</a></p><p>В игре переключатель уже работает вместе с вычислителем. Отдельный стенд сохраняет возможность изучить один зафиксированный кадр.</p><p><a data-netlist download="gremlin-tennis.cir">Скачать единую схему · SPICE</a></p></div></div><div class="sources"><p>В записи CSV: время, выходы U1/U2/U6/U7, токи четырёх зарядных банков и трёх катушек, зарядные напряжения и состояние контактов. Выборки состояния — каждые 5 ms времени схемы; буфер CSV — последние 6000 выборок. Пауза завершает текущий интервал расчёта. Экран получает трассу X/Y и тока луча из общего сеанса SPICE. Свечение рассчитывается по времени схемы.</p><p><a href="https://www.bnl.gov/about/docs/Higinbotham_Notes.pdf" target="_blank" rel="noopener">Записки Хигинботама</a><a href="https://www.bnl.gov/about/docs/videogameschematic1.jpg" target="_blank" rel="noopener">Схема Брукхейвена</a><a href="https://web.mit.edu/6.101/www/s2016/projects/angeld19_Project_Final_Report.pdf" target="_blank" rel="noopener">Исследование MIT</a></p><p><a data-fidelity>Границы точности и допущения</a><a data-sources>Все источники</a><a data-vendor>Вычислитель: исходники и лицензии</a><a href="${new URL('./docs/Gremlin_Tennis_Research_0.8.4.pdf',import.meta.url)}" download>Исследование · PDF</a></p></div></div></details><footer class="footer"><span>ЦЕПИ → НАПРЯЖЕНИЯ → ЭКРАН<br>Электрическая схема, луч и механические пульты.</span><span>СХЕМНАЯ РЕКОНСТРУКЦИЯ<br>Численная проверка ≠ историческая верификация.</span></footer></div>`;
    const q=s=>this.shadowRoot.querySelector(s);this.q=q;
    this.canvas=q('canvas');this.createScope();
    this.panels=[...this.shadowRoot.querySelectorAll('.controller')];
    q('[data-fidelity]').href=new URL('./docs/research.html',import.meta.url);
    q('[data-sources]').href=new URL('./docs/reuse-audit.html',import.meta.url);
    q('[data-vendor]').href=new URL('./vendor/SOURCES.md',import.meta.url);
    q('[data-pause]').onclick=()=>this.setPaused(!this.paused);
    q('[data-reset]').onclick=()=>this.resetMatch(true);
    q('[data-mechanics]').onclick=()=>this.setMechanics(!this.mechanicsEnabled);
    q('[data-optics]').onclick=()=>this.setOptics(!this.opticsEnabled);
    q('[data-mode]').value=this.playMode;
    q('[data-mode]').onchange=event=>{this.audio.unlock().catch(()=>{});this.setPlayMode(event.target.value);};
    q('[data-sound]').onclick=()=>{this.audio.enabled=!this.audio.enabled;q('[data-sound]').textContent=this.t(this.audio.enabled?'Звук: вкл':'Звук: выкл');q('[data-sound]').setAttribute('aria-pressed',String(this.audio.enabled));this.audio.unlock().catch(()=>{});};
    q('[data-gravity]').onchange=e=>{this.engine.setGravity(Number(e.target.value));e.target.value=this.engine.getGravity();};
    q('[data-csv]').onclick=()=>this.downloadTrace();
    q('[data-netlist]').href=new URL('./joint.cir',import.meta.url);
    q('[data-profile]').onclick=()=>this.downloadProfile();
    q('[data-display]').href=new URL('./display-bench.html',import.meta.url);
    q('[data-display]').onclick=event=>{
      const state=snapshot(this.engine),url=new URL('./display-bench.html',import.meta.url);
      url.search=new URLSearchParams({lang:getLanguage(),x:state.nodes[3].toPrecision(15),y:state.nodes[1].toPrecision(15),t:state.time.toPrecision(15)});
      event.currentTarget.href=url.href;this.setPaused(true);
    };
    this.mechanics=this.panels.map((_,side)=>new ControllerMechanics({control:this.engine.getControl(side),enabled:this.mechanicsEnabled}));
    this.panels.forEach((p,side)=>{
      const hit=p.querySelector('.hit'),dial=p.querySelector('.dial');let drag=null;
      const angle=event=>{const r=dial.getBoundingClientRect();return Math.atan2(event.clientX-r.left-r.width/2,-(event.clientY-r.top-r.height/2))*180/Math.PI;};
      hit.onpointerdown=event=>{if(!event.isPrimary||event.button!==0||!this.canOperate(side))return;event.preventDefault();hit.focus();hit.setPointerCapture(event.pointerId);this.suppressClickUntil[side]=performance.now()+500;this.holdButton(side,`pointer:${event.pointerId}`,true);};
      hit.onpointerup=event=>{this.holdButton(side,`pointer:${event.pointerId}`,false);};
      hit.onpointercancel=()=>this.cancelButton(side);
      hit.onlostpointercapture=event=>{if(this.heldSources[side].has(`pointer:${event.pointerId}`))this.cancelButton(side);};
      hit.onkeydown=event=>{if(![' ','Enter'].includes(event.key))return;event.preventDefault();event.stopPropagation();if(!event.repeat){this.suppressClickUntil[side]=performance.now()+500;this.holdButton(side,`button:${event.key}`,true);}};
      hit.onkeyup=event=>{if(![' ','Enter'].includes(event.key))return;event.preventDefault();event.stopPropagation();this.holdButton(side,`button:${event.key}`,false);};
      hit.onclick=event=>{if(event.detail===0&&performance.now()>=this.suppressClickUntil[side])this.strike(side);};
      dial.onpointerdown=event=>{if(!event.isPrimary||event.button!==0||this.isDemo||this.modeLoading||this.operators[side])return;event.preventDefault();dial.focus();dial.setPointerCapture(event.pointerId);drag={angle:angle(event),value:this.mechanics[side].target*100};};
      dial.onpointermove=event=>{if(!drag||this.isDemo||this.modeLoading||this.operators[side])return;const a=angle(event);let diff=a-drag.angle;if(diff>180)diff-=360;if(diff<-180)diff+=360;drag.value=Math.max(0,Math.min(100,drag.value+diff/2.7));drag.angle=a;this.changeControl(side,drag.value);};
      dial.onpointerup=dial.onpointercancel=dial.onlostpointercapture=()=>{drag=null;this.mechanics[side].releaseKnob();};
      dial.onkeydown=event=>{if(this.isDemo||this.modeLoading||this.operators[side])return;let value=this.mechanics[side].target*100;const delta={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,PageUp:10,PageDown:-10}[event.key];if(delta!==undefined)value+=delta;else if(event.key==='Home')value=0;else if(event.key==='End')value=100;else return;event.preventDefault();event.stopPropagation();this.changeControl(side,value);};
    });
    if(this.keyHandler)this.shadowRoot.removeEventListener('keydown',this.keyHandler);
    this.keyHandler=event=>{
      if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing||event.target.matches('input,select,a') || (event.target.matches('button')&&event.key===' '))return;
      // Slider-specific arrows stop propagation above; A/D and game commands
      // also work after the dial takes focus. Physical codes support any layout.
      const key=({KeyA:'a',KeyD:'d',KeyW:'w',KeyP:'p',Space:' '})[event.code]||event.key.toLowerCase();const controls={a:[0,-1],d:[0,1],arrowleft:[1,-1],arrowright:[1,1]};
      if(controls[key]){const [s,d]=controls[key];this.changeControl(s,this.mechanics[s].target*100+d);}
      else if(key==='w'||key===' '){if(!event.repeat)this.holdButton(0,`key:${event.code||key}`,true);}
      else if(key==='arrowup'){if(!event.repeat)this.holdButton(1,`key:${event.code||key}`,true);}
      else if(key==='p'){if(!event.repeat)this.setPaused(!this.paused);}
      else return;event.preventDefault();
    };
    this.shadowRoot.addEventListener('keydown',this.keyHandler);
    if(this.keyUpHandler)this.shadowRoot.removeEventListener('keyup',this.keyUpHandler);
    this.keyUpHandler=event=>{for(let side=0;side<2;side++)this.holdButton(side,`key:${event.code||event.key.toLowerCase()}`,false);};
    this.shadowRoot.addEventListener('keyup',this.keyUpHandler);
    window.addEventListener('blur',this.blurHandler);
    this.configureOperators();
    document.addEventListener('visibilitychange',this.visibilityHandler);
    this.lastFrame=0;this.applyLanguage();this.frame=requestAnimationFrame(this.tickHandler);
  }
  createScope(){
    this.scope?.dispose();
    const old=this.q('canvas'),fresh=old.cloneNode(false);old.replaceWith(fresh);fresh.width=fresh.height=512;this.canvas=fresh;
    const preference=this.getAttribute('renderer')||new URLSearchParams(location.search).get('scopeRenderer')||'auto';
    const connectCanvas=canvas=>{this.canvas=canvas;canvas.addEventListener('pointerdown',()=>canvas.focus());};
    this.scope=new ScopeRenderer(fresh,{preferred:preference,opticsEnabled:this.opticsEnabled,cpuSize:this.isDemo?128:384,onCanvas:connectCanvas});
    if(this.scope.backend==='WebGL2')connectCanvas(this.scope.canvas);
  }
  updateModeControls(){
    this.q('[data-mode]').disabled=this.modeLoading;
    this.q('[data-pause]').disabled=this.modeLoading||!!this.engine.error;
    this.q('[data-reset]').disabled=this.modeLoading;
    this.q('[data-mechanics]').disabled=this.modeLoading||this.isDemo;
    this.q('[data-gravity]').disabled=this.modeLoading||this.isDemo;this.q('[data-gravity]').value=String(this.engine.getGravity());
    this.q('.mode-note').textContent=this.t(this.isDemo?'Запись расчёта с механикой. Движения пультов записаны; экран рассчитывается.':'Смена режима начинает новый розыгрыш.');
    this.q('[data-execution-label]').textContent=this.t(this.isDemo?'Профиль 0.8.4 — запись расчёта ngspice/WASM.':'Профиль 0.8.4 — единый расчёт в ngspice/WASM.');
    this.q('.help').style.display=this.isDemo?'none':'';
    this.canvas.setAttribute('aria-label',this.t(this.isDemo?'Осциллограф: демозапись электрического луча.':'Осциллограф: вид сбоку. Мяч, земля и сетка. Удар выполняется из текущего положения мяча.'));
    if(this.isDemo)this.canvas.removeAttribute('aria-describedby');else this.canvas.setAttribute('aria-describedby','how-to-play');
  }
  async setPlayMode(value){
    if(this.modeLoading||value===this.playMode||!INSTRUMENT_MODES[value])return;
    this.modeFailure=null;
    if(value!=='demo'&&!this.isDemo){this.playMode=value;this.resetMatch(false);return;}
    const previous=this.engine,previousMode=this.playMode,paused=this.paused,serial=++this.modeSerial;
    this.cancelInputs();this.setPaused(true);this.modeLoading=true;this.pendingPlayMode=value;
    this.modeAbort=new AbortController();this.updateModeControls();this.renderState();
    let candidate=null;
    try{
      candidate=value==='demo'?await loadDemoEngine({signal:this.modeAbort.signal,presentationHz:this.scope.backend==='CPU'?20:60}):await loadEngine();
      if(!this.isConnected||serial!==this.modeSerial){candidate.close();return;}
      this.engine=candidate;this.playMode=value;previous.close();this.modeLoading=false;
      this.mechanics=this.panels.map((_,side)=>new ControllerMechanics({control:candidate.getControl(side),enabled:this.mechanicsEnabled}));
      this.rows=[];this.createScope();this.configureOperators();this.applyLanguage();this.setPaused(paused);this.writeControls();
      if(!this.frame)this.frame=requestAnimationFrame(this.tickHandler);
    }catch(error){
      if(serial!==this.modeSerial||!this.isConnected){candidate?.close();return;}
      this.modeLoading=false;this.modeFailure=error;
      if(this.engine===candidate){candidate.fail(error);}
      else{candidate?.close();this.engine=previous;this.playMode=previousMode;this.q('[data-mode]').value=previousMode;this.setPaused(paused);}
      this.updateModeControls();this.renderState();
    }finally{if(serial===this.modeSerial){this.modeLoading=false;this.modeAbort=null;}}
  }
  changeControl(side,value,automatic=false) {
    if(this.isDemo||this.modeLoading||this.operators[side]&&!automatic)return;
    this.mechanics[side].setTarget(Math.max(0,Math.min(100,value))/100);
    this.writeControls();
  }
  writeControls(){
    this.mechanics.forEach((m,side)=>{
      if(this.isDemo)m=this.engine.mechanicsStates[side];
      this.engine.setControl(side,m.control);const p=this.panels[side],dial=p.querySelector('.dial');
      const value=Math.round(m.control*1000)/10;
      dial.style.setProperty('--rotation',`${m.angle*180/Math.PI}deg`);
      dial.setAttribute('aria-valuenow',value);dial.setAttribute('aria-valuetext',getLanguage()==='en'?`${value} percent angle`:`${value} процентов наклона`);
      p.querySelector('output').textContent=Math.round(value);
      const b=p.querySelector('.hit'),press=m.depth/CONTROLLER_MODEL.button.travel_m;
      b.style.setProperty('--press-depth',`${(press*3).toFixed(2)}px`);
      b.style.setProperty('--press-shadow',`${Math.max(.4,3-press*3).toFixed(2)}px`);
      b.classList.toggle('is-pressed',m.closed);
    });
  }
  canOperate(side,automatic=false){return !this.isDemo&&!this.modeLoading&&!this.paused&&!this.engine.error&&(!!this.operators[side]===automatic);}
  holdButton(side,source,pressed){
    if(pressed&&!this.canOperate(side))return;
    const sources=this.heldSources[side];if(pressed)sources.add(source);else sources.delete(source);
    this.mechanics[side]?.setHeld(sources.size>0);this.flushContacts();this.writeControls();
    if(pressed)this.audio.unlock().catch(()=>{});
  }
  cancelButton(side){this.heldSources[side].clear();this.mechanics[side]?.cancelPress();}
  cancelInputs(){for(let side=0;side<2;side++){this.cancelButton(side);this.mechanics[side]?.releaseKnob();}}
  flushContacts(){
    this.mechanics.forEach((m,side)=>{for(const edge of m.drainEdges()){
      if(edge==='close'&&this.canOperate(side,!!this.operators[side]))this.engine.hit(side);
      this.audio.button(edge==='close');
    }});
  }
  setMechanics(value){
    if(this.isDemo||this.modeLoading)return;
    this.cancelInputs();this.mechanicsEnabled=!!value;
    this.mechanics.forEach(m=>m.setEnabled(this.mechanicsEnabled));
    try{localStorage.setItem('tennis-for-two.mechanics',this.mechanicsEnabled?'on':'off');}catch{}
    this.updateMechanicsLabel();this.writeControls();this.renderState();
  }
  setOptics(value){
    this.opticsEnabled=!!value;this.scope.setOpticsEnabled(this.opticsEnabled);
    try{localStorage.setItem('tennis-for-two.glass',this.opticsEnabled?'on':'off');}catch{}
    this.updateOpticsLabel();
  }
  updateOpticsLabel(){
    this.q('[data-optics]').textContent=this.t(this.opticsEnabled?'Оптика стекла: вкл':'Оптика стекла: выкл');
    this.q('[data-optics]').setAttribute('aria-pressed',String(this.opticsEnabled));
  }
  updateMechanicsLabel(){
    this.q('[data-mechanics]').textContent=this.t(this.isDemo?'Механика: вкл · запись':this.mechanicsEnabled?'Механика: вкл':'Механика: выкл');
    this.q('[data-mechanics]').setAttribute('aria-pressed',String(this.isDemo||this.mechanicsEnabled));
  }
  setPaused(value) {
    if(value)this.cancelInputs();this.paused=value;this.lastFrame=0;this.pending=0;this.engine?.setPaused(value);if(!this.q)return;
    this.q('[data-pause]').textContent=this.t(value?'Продолжить':'Пауза');this.q('[data-pause]').setAttribute('aria-pressed',String(value));
    this.renderState();
  }
  configureOperators() {
    const mode=INSTRUMENT_MODES[this.playMode];
    this.operators=mode.cpu.map((persona,side)=>!this.isDemo&&persona?new CPUPlayer(side,persona,{control:this.engine.getControl(side),time:this.engine.getTime()}):null);
    this.renderOperatorLabels();
  }
  renderOperatorLabels(){
    const mode=INSTRUMENT_MODES[this.playMode];
    this.panels.forEach((panel,side)=>{
      const automatic=this.isDemo||!!this.operators[side],dial=panel.querySelector('.dial');
      panel.classList.toggle('cpu',automatic);panel.dataset.operator=automatic?'cpu':'human';
      panel.querySelector('[data-player]').textContent=`0${side+1} / ${this.t(mode.names[side]).toUpperCase()}`;
      dial.setAttribute('aria-disabled',String(automatic));dial.tabIndex=automatic?-1:0;
      panel.querySelector('.keys').innerHTML=automatic?this.t(this.isDemo?'Движения пульта записаны':'Пульт управляется автоматически'):side?this.t('← / → — ручка')+'<br>'+this.t('↑ — удар'):this.t('A / D — ручка')+'<br>'+this.t('W / пробел — удар');
    });
  }
  resetMatch(resume) {
    this.modeFailure=null;
    if(this.isDemo){this.engine.reset();this.scope.clear();this.rows=[];this.setPaused(resume?false:this.paused);this.writeControls();return;}
    this.cancelInputs();this.engine.reset();this.rows=[];this.trail=[];this.pending=0;
    this.configureOperators();this.setPaused(resume?false:this.paused);
  }
  strike(side,automatic=false) {
    if(!this.canOperate(side,automatic))return;
    if(!automatic)this.audio.unlock().catch(()=>{});
    this.mechanics[side].pulse();this.flushContacts();this.writeControls();
  }
  tick(now) {
    if(!this.isConnected)return;
    const dt=this.lastFrame?Math.min(.05,(now-this.lastFrame)/1000):0;this.lastFrame=now;
    if(this.engine.error){
      cancelAnimationFrame(this.frame);this.frame=0;this.audio.close();
      this.q('.status').textContent=this.t('Расчёт остановлен. Перезагрузите прибор.');
      this.q('[data-pause]').disabled=true;
      this.panels.forEach(p=>p.querySelector('.hit').disabled=true);
      this.q('[data-reset]').textContent=this.t('Перезагрузить');
      this.q('[data-reset]').onclick=()=>{this.engine.close();this.paused=false;this.rows=[];this.mount();};
      console.error(this.engine.error);return;
    }
    if(!this.isDemo&&!this.paused){
      for(let side=0;side<2;side++)if(this.operators[side]){
        const action=this.operators[side].update(operatorView(snapshot(this.engine),side));
        this.changeControl(side,action.control*100,true);if(action.hit)this.strike(side,true);
      }
    }
    if(this.isDemo){
      if(!this.paused)this.engine.advanceTo(now);
      for(const closed of this.engine.drainButtonEdges())this.audio.button(closed);
    }else{
      this.mechanics.forEach(m=>m.advance(dt));this.flushContacts();this.writeControls();
      if(!this.paused)this.engine.advance(dt);
    }
    if(this.isDemo)this.writeControls();
    const events=this.engine.popEvents();if(events)this.audio.click(events);
    for(const sample of this.engine.drainSamples()){
      this.rows.push([sample.time,...sample.nodes,...sample.currents,...sample.precharge,
        ...sample.coilCurrents,sample.relay,sample.gravity,...sample.controls,sample.checkpoints]);
      if(this.rows.length>6000)this.rows.shift();
    }
    try{for(const trace of this.engine.drainBeams()){if(trace===null)this.scope.breakBeamPath();else this.scope.append(trace);}}
    catch(error){this.engine.fail(error);}
    this.renderState();this.frame=requestAnimationFrame(this.tickHandler);
  }
  renderState() {
    const e=this.engine,s=snapshot(e);
    this.panels.forEach((p,side)=>{
      const automatic=this.isDemo||!!this.operators[side],ready=!this.paused&&!e.error&&!!(this.isDemo?s.can[side]:e.canHit(side)),b=p.querySelector('.hit');
      p.classList.toggle('ready',ready);b.disabled=this.paused||!!e.error||automatic;b.textContent=this.t(s.mode?'Удар':'Подать');
      p.querySelector('.ready-text').textContent=this.t(ready?(automatic?'ГОТОВИТ УДАР':s.mode?'МОЖНО ОТБИТЬ':'МОЖНО ПОДАВАТЬ'):'ОЖИДАНИЕ');
    });
    const side=s.eligible===1?'справа':'слева',names=INSTRUMENT_MODES[this.playMode].names;
    let status;
    if(getLanguage()==='en'){
      const n=names.map(name=>this.t(name));
      status=this.paused?this.t('Прибор на паузе. Нажмите «Продолжить».'):!s.mode?
        `${s.reason?'Rally ended. ':''}${names[s.server]==='Вы'?'Your serve.':`${n[s.server]} to serve.`} ${this.operators[s.server]?'The automatic player is preparing to serve.':'Turn the knob and press Serve.'}`:
        s.eligible>=0?(this.operators[s.eligible]?`${n[s.eligible]} is preparing a return.`:`Ball on the ${s.eligible===1?'right':'left'} — ready to hit. Press the lit button.`):this.t('Мяч в полёте. После сетки станет доступен удар соперника.');
    }else status=this.paused?'Прибор на паузе. Нажмите «Продолжить».':!s.mode?
      `${s.reason?'Розыгрыш завершён. ':''}${names[s.server]==='Вы'?'Ваша подача.':`Подаёт ${names[s.server]}.`} ${this.operators[s.server]?'Автоматический игрок готовит подачу.':'Поверните ручку и нажмите «Подать».'}`:
      s.eligible>=0?(this.operators[s.eligible]?`${names[s.eligible]} готовит ответный удар.`:`Мяч ${side} — можно отбить. Нажмите подсвеченную кнопку.`):
      'Мяч в полёте. После сетки станет доступен удар соперника.';
    if(this.isDemo)status=this.paused?this.t('Демо на паузе. Нажмите «Продолжить».'):`${this.t('Демо — запись расчёта')} · ${this.engine.duration.toFixed(0)} s · 1.00× · ${this.t('Цикл')} ${this.engine.loop+1}`;
    if(this.modeLoading)status=this.t(this.pendingPlayMode==='demo'?'Загружаем демозапись…':'Включаем прибор…');
    else if(this.modeFailure)status=this.t('Не удалось переключить режим:')+' '+this.modeFailure.message;
    if(this.q('.status').textContent!==status)this.q('.status').textContent=status;
    this.q('[data-phase]').textContent=this.t(this.paused?'ПАУЗА':this.isDemo?'ДЕМО':s.mode?'РОЗЫГРЫШ':'ПОДАЧА');
    this.q('[data-clock]').textContent=`${this.t(this.isDemo?'ВРЕМЯ ДЕМО':'ВРЕМЯ СХЕМЫ')} ${(this.isDemo?e.elapsed:s.time).toFixed(2)} s`;
    this.q('[data-tempo]').textContent=this.isDemo?`${this.t('ТЕМП')} 1.00×`:s.scope?.steps?`${this.t('ТЕМП')} ${(s.scope.steps*.005*1000/(s.scope.activeWallMs||s.scope.totalWallMs)).toFixed(2)}×`:'';
    if(this.q('.engineering').open){s.nodes.forEach((n,i)=>this.q(`[data-node="${i}"]`).textContent=`${n.toFixed(3)} V`);this.q('[data-relay]').textContent=`0x${s.relay.toString(16).padStart(2,'0')}`;s.coilCurrents.forEach((n,i)=>this.q(`[data-coil="${i}"]`).textContent=`${(n*1e6).toFixed(1)} µA`);this.q('[data-trace]').textContent=`${this.t('Трасса')}: ${this.rows.length} ${this.t('отсчётов')} / t = ${s.time.toFixed(2)} s`;}
  }
  applyLanguage(){
    if(!this.q||!this.q('[data-mode]'))return;
    const lang=getLanguage(),suffix=lang==='en'?'.en':'';
    this.setAttribute('lang',lang);document.documentElement.lang=lang;
    translateTree(this.shadowRoot,EN,lang);translateTree(document.body,EN,lang);
    bindLanguageButtons(this.shadowRoot);this.updateMechanicsLabel();this.updateOpticsLabel();
    for(const [value,mode] of Object.entries(INSTRUMENT_MODES)){const option=this.q(`[data-mode] option[value="${value}"]`);if(option)option.textContent=this.t(mode.label);}
    this.q('[data-pause]').textContent=this.t(this.paused?'Продолжить':'Пауза');
    this.q('[data-reset]').textContent=this.t(this.engine.error?'Перезагрузить':this.isDemo?'Сначала':'Сброс');this.updateModeControls();
    this.q('[data-sound]').textContent=this.t(this.audio.enabled?'Звук: вкл':'Звук: выкл');
    this.q('[data-fidelity]').href=new URL(`./docs/research${suffix}.html`,import.meta.url);
    this.q('[data-sources]').href=new URL(`./docs/reuse-audit${suffix}.html`,import.meta.url);
    for(const a of this.shadowRoot.querySelectorAll('a[download]'))if(a.href.includes('Research_'))a.href=new URL(`./docs/Gremlin_Tennis_Research_0.8.4${suffix}.pdf`,import.meta.url);
    const bench=new URL('./display-bench.html',import.meta.url);bench.searchParams.set('lang',lang);this.q('[data-display]').href=bench;
    this.renderOperatorLabels();
    this.panels.forEach(p=>{const dial=p.querySelector('.dial'),v=dial.getAttribute('aria-valuenow');dial.setAttribute('aria-valuetext',lang==='en'?`${v} percent angle`:`${v} процентов наклона`);});
    for(const a of document.querySelectorAll('a[href]')){const url=new URL(a.href,location.href);if(url.origin===location.origin&&(/\/project\.html$/.test(url.pathname)||/\/display-bench(?:\.en)?\.html$/.test(url.pathname))){url.searchParams.set('lang',lang);a.href=url;}}
    document.title=this.hasAttribute('instrument')?this.t('Прибор Tennis for Two'):`Tennis for Two · SPICE · ${lang==='en'?'Imperial School Laboratory':'Лаборатория Школы Империи'}`;
    this.renderState();
    if(this.engine.error)this.q('.status').textContent=this.t('Расчёт остановлен. Перезагрузите прибор.');
  }
  save(name,type,content) {
    // Own the download in the visible document when this same-origin instrument
    // is embedded. Cross-origin embeds keep the ordinary local-document path.
    let owner=window;
    try{if(window.top.location.origin===location.origin)owner=window.top;}catch{}
    const url=owner.URL.createObjectURL(new owner.Blob([content],{type}));
    const a=owner.document.createElement('a');a.href=url;a.download=name;a.hidden=true;
    owner.document.body.append(a);a.click();a.remove();owner.setTimeout(()=>owner.URL.revokeObjectURL(url),10000);
  }
  downloadTrace() {
    const header='time_s,U1_V,U2_Y_V,U6_V,U7_X_V,I_bank_LX_A,I_bank_LY_A,I_bank_RX_A,I_bank_RY_A,left_X_V,left_Y_V,right_X_V,right_Y_V,I_ground_A,I_net_A,I_run_A,relay_mask,G_V,control_left,control_right,checkpoints';
    const meta=`# gremlin-tennis profile 0.8.4; ngspice-45.2; Gear2-adaptive; max_step_s=${this.engine.getTimeStep()}; sample_period_s=.005; U2_raw_V=height_V-20; model=published-schematic-macromodel; play_mode=${this.playMode}; execution=${this.isDemo?'recorded':'live'}\n`;
    this.save('analog-tennis-trace.csv','text/csv;charset=utf-8',meta+header+'\n'+this.rows.map(r=>r.join(',')).join('\n')+'\n');
  }
  async downloadProfile() {
    try{const r=await fetch(new URL('./docs/model.json',import.meta.url));if(!r.ok)throw Error('profile');const profile=await r.json();profile.session={...profile.session,play_mode:this.playMode,operators:INSTRUMENT_MODES[this.playMode].cpu.map(persona=>persona?{persona,...CPU_PROFILES[persona],name:this.t(CPU_PROFILES[persona].name)}:{human:true}),gravity_V:this.engine.getGravity(),max_step_s:this.engine.getTimeStep(),checkpoints:this.engine.state.checkpoints,controls:[this.engine.getControl(0),this.engine.getControl(1)],glass_optics:{model:GLASS_MODEL,enabled:this.opticsEnabled},execution:this.isDemo?{kind:'precomputed-demo',playbackRate:1,recording:this.engine.manifest}:{kind:'live-SPICE'},controller_mechanics:{model:CONTROLLER_MODEL,enabled:this.isDemo||this.mechanicsEnabled,states:this.isDemo?this.engine.mechanicsStates.map(m=>({enabled:true,control:m.control,angle_rad:m.angle,buttonTravel_m:m.depth,contactClosed:m.closed,source:'recorded'})):this.mechanics.map(m=>m.state)}};if(this.isDemo)profile.solver={...profile.solver,runtime:'Precomputed electrical replay; no live circuit Worker',recordedRuntime:'ngspice 45.2 / WASM / f64'};this.save('analog-tennis-model.json','application/json',JSON.stringify(profile,null,2)+'\n');}
    catch{this.q('.status').textContent=this.t('Не удалось загрузить описание модели. Проверьте папку docs рядом с игрой.');}
  }
}
customElements.define('analog-tennis',AnalogTennis);
