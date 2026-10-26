import {SpiceSession,runDisplay} from './display-circuit.js';
let busy=false,spice=null,subcircuit=null;
self.onmessage=async({data})=>{
  if(busy){self.postMessage({error:'Расчёт уже идёт.'});return;}
  busy=true;
  try{
    if(!spice){
      self.postMessage({status:'Загружаем ngspice / WebAssembly…'});
      const response=await fetch(new URL('./display-switch.cir',import.meta.url));
      if(!response.ok)throw Error('Схема: HTTP '+response.status);
      subcircuit=await response.text();spice=new SpiceSession();await spice.start();
    }
    self.postMessage({status:'Считаем переходные процессы 15 транзисторов…'});
    const result=await runDisplay(spice,subcircuit,data.options);
    self.postMessage({result},[result.data.buffer]);
  }catch(error){self.postMessage({error:String(error?.message||error)});}
  finally{busy=false;}
};
