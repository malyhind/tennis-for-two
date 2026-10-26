import {readFile,writeFile} from 'node:fs/promises';
import {SpiceSession,runDisplay} from '../app/display-circuit.js';
const root=new URL('../',import.meta.url),start=performance.now(),s=new SpiceSession();
await s.start(await readFile(new URL('app/vendor/spice.wasm',root)));
const boot_s=(performance.now()-start)/1000,sub=await readFile(new URL('app/display-switch.cir',root),'utf8'),runs=[];
for(let k=0;k<3;k++)for(const accuracy of ['reference','bounded']){
  const r=await runDisplay(s,sub,{accuracy,duration:.24});
  if(r.metrics.overlap_fraction>.001||r.metrics.repeat_Hz<30||r.metrics.repeat_Hz>50)throw Error('Invalid benchmark trace');
  runs.push({accuracy,wall_s:r.wall_s,simulated_s:r.options.duration,repeat_Hz:r.metrics.repeat_Hz});
}
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
const reference=median(runs.filter(x=>x.accuracy==='reference').map(x=>x.wall_s));
const bounded=median(runs.filter(x=>x.accuracy==='bounded').map(x=>x.wall_s));
const short=await runDisplay(s,sub,{accuracy:'bounded'});
const report={date:new Date().toISOString(),environment:'Node.js '+process.version+'; this executor; not a cross-device guarantee',
  boot_s,scope:'Warm WASM; load circuit, transient analysis, linearization and trace parsing. Excludes browser download and initial compilation.',runs,
  median_reference_s:reference,median_bounded_s:bounded,same_window_speedup:reference/bounded,
  bounded_default_window_s:short.options.duration,bounded_default_wall_s:short.wall_s};
await writeFile(new URL('app/docs/display-performance.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exit(0);
