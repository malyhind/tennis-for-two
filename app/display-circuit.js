import {SpiceSession} from './spice-session.js';

export const DISPLAY_COLUMNS=['v(a)','v(b)','v(c)','v(sx)','v(sy)'];
export const DISPLAY_DEFAULTS=Object.freeze({mode:'markers',beta:75,temperature:25,accuracy:'reference',duration:.24,maxStep:20e-6,sample:20e-6});
export const DISPLAY_BOUNDED=Object.freeze({accuracy:'bounded',duration:.12,maxStep:50e-6,sample:20e-6});
export function displayOptions(options={}){
  return {...DISPLAY_DEFAULTS,...(options.accuracy==='bounded'?DISPLAY_BOUNDED:{}),...options};
}
const valid=(value,min,max,name)=>{if(!Number.isFinite(value)||value<min||value>max)throw Error('Invalid '+name);return value;};

export function displayDeck(subcircuit, options={}){
  const o=displayOptions(options);
  if(!['reference','bounded'].includes(o.accuracy))throw Error('Invalid accuracy profile');
  valid(o.beta,20,150,'beta');valid(o.temperature,0,60,'temperature');
  valid(o.duration,.08,o.accuracy==='bounded'?.24:.5,'duration');
  valid(o.maxStep,.1e-6,o.accuracy==='bounded'?50e-6:20e-6,'maximum step');
  if(o.accuracy==='bounded'){valid(o.beta,50,100,'bounded beta');valid(o.temperature,10,40,'bounded temperature');}
  valid(o.sample,1e-6,50e-6,'observation period');
  if(!['markers','sweeps','snapshot'].includes(o.mode))throw Error('Invalid input mode');
  // These six independent sources are BENCH INPUTS. The net/court waveforms
  // are test excitations, not a recovered transcription of their generators.
  if(o.mode==='snapshot'){valid(o.ballX,-150,150,'snapshot X');valid(o.ballY,-150,150,'snapshot Y');}
  const inputs=o.mode==='markers'?[
    'Vav av 0 20','Vah ah 0 -60','Vbv bv 0 -30','Vbh bh 0 0','Vcv cv 0 -20','Vch ch 0 60'
  ]:[
    `Vav av 0 ${o.mode==='snapshot'?o.ballY:20}`,`Vah ah 0 ${o.mode==='snapshot'?o.ballX:-40}`,'Vbv bv 0 SIN(-10 10 60)',
    'Vbh bh 0 0','Vcv cv 0 -20','Vch ch 0 SIN(0 75 60)'
  ];
  return `Display-switch bench - BNL 1959-11-18, preliminary Ge models
* Fixed nominal DC rail ports, not a transformer/rectifier simulation.
Vp12 pp12 0 12
Vp6 pp6 0 6
Vm6 mm6 0 -6
Vm22 mm22 0 -22
${inputs.join('\n')}
Xdisplay av ah bv bh cv ch sy sx a b c pp12 pp6 mm6 mm22 TFT_DISPLAY BETA=${o.beta}
* Scope input impedance/capacitance are declared bench loads.
RscopeY sy 0 1meg
RscopeX sx 0 1meg
CscopeY sy 0 30p
CscopeX sx 0 30p
* A reproducible small initial asymmetry chooses startup phase; no clock source.
.ic v(xdisplay.base_l)=5.9 v(xdisplay.base_r)=6.1 v(xdisplay.ff_bl)=5.7 v(xdisplay.ff_br)=6.2
.temp ${o.temperature}
.options method=gear maxord=2 ${o.accuracy==='bounded'?'reltol=1e-4 abstol=1e-9 vntol=1e-5':'reltol=1e-6 abstol=1e-11 vntol=1e-7'}
* Adaptive points retained; output is linearized AFTER the transient.
.save ${DISPLAY_COLUMNS.join(' ')}
${subcircuit}
.end
`;
}

export function parseDisplay(text){
  const rows=text.trim().split('\n');const data=new Float64Array(rows.length*6);
  for(let k=0;k<rows.length;k++){
    const row=rows[k].trim().split(/\s+/).map(Number);
    if(row.length!==6||row.some(x=>!Number.isFinite(x)))throw Error('Invalid display trace at row '+k);
    data.set(row,k*6);
  }
  return data;
}

export function displayMetrics(data, settle=.04){
  const edges=[[],[],[]],counts=[0,0,0];let total=0,blank=0,overlap=0;
  for(let k=6;k<data.length;k+=6){
    const time=data[k];if(time<settle)continue;
    let selected=0;
    for(let j=0;j<3;j++){
      const prev=data[k-6+j+1],value=data[k+j+1];
      if(value<0){counts[j]++;selected++;}
      if(prev<0&&value>=0)edges[j].push(data[k-6]+(time-data[k-6])*(-prev)/(value-prev));
    }
    total++;if(selected===0)blank++;if(selected>1)overlap++;
  }
  if(!total)throw Error('Trace shorter than warmup');
  const frequencies=edges.map(times=>times.length>1?(times.length-1)/(times.at(-1)-times[0]):null);
  const valid=frequencies.slice(1).filter(x=>Number.isFinite(x));
  const repeatHz=valid.length?valid.reduce((a,b)=>a+b)/valid.length:null;
  return {samples:data.length/6,settle_s:settle,frequency_Hz:frequencies,repeat_Hz:repeatHz,
    historical_reference_Hz:36,relative_frequency_difference:repeatHz===null?null:repeatHz/36-1,
    selected_fraction:counts.map(x=>x/total),blank_fraction:blank/total,overlap_fraction:overlap/total,
    edge_times_s:edges};
}

export async function runDisplay(spice,subcircuit,options={}){
  const o=displayOptions(options),deck=displayDeck(subcircuit,o);
  const started=performance.now();
  // Use a dedicated session for this subsystem. In ngspice 45.2 outitf.c the
  // static `interpolated` flag is set by `interp` and never reset by `unset`.
  // Both profiles therefore avoid enabling it and linearize after simulation.
  await spice.commands(['unset interp']);await spice.load(deck);
  await spice.commands([`tran ${o.sample} ${o.duration} 0 ${o.maxStep} uic`,
    'linearize '+DISPLAY_COLUMNS.join(' '),
    'set wr_singlescale','set numdgt=15',`wrdata /display.dat ${DISPLAY_COLUMNS.join(' ')}`]);
  let data=parseDisplay(spice.read('/display.dat'));
  if(data[0]===0)data=data.slice(6);
  return {data,metrics:displayMetrics(data),deck,standaloneDeck:standaloneDisplayDeck(deck,o),options:o,wall_s:(performance.now()-started)/1000};
}

export function standaloneDisplayDeck(deck,o){
  const control=`\n.control\nset numdgt=15\ntran ${o.sample} ${o.duration} 0 ${o.maxStep} uic\nlinearize ${DISPLAY_COLUMNS.join(' ')}\nset wr_singlescale\nset wr_vecnames\nwrdata display-trace.dat ${DISPLAY_COLUMNS.join(' ')}\nquit\n.endc\n.end\n`;
  return deck.replace(/\n\.end\s*$/i,control);
}

export {SpiceSession};
