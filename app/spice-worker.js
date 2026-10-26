import {JointCircuit} from './joint-circuit.js';
let circuit=null,failed=false,busy=false,recycleHeapBytes=240*1024*1024,skipRecycleOnce=false,nextRecycleTime=0;
self.onmessage=async({data})=>{
  if(failed)return;
  if(busy){self.postMessage({id:data.id,error:'Overlapping circuit requests'});return;}
  busy=true;
  try{
    if(data.type==='init'){
      if(data.input?.recycleHeapBytes!==undefined){
        const limit=data.input.recycleHeapBytes;
        if(!Number.isFinite(limit)||limit<16*1024*1024||limit>512*1024*1024)throw Error('Invalid worker heap bound');
        recycleHeapBytes=limit;
      }
      const names=['tennis.cir','display-switch.cir','scope.cir'];
      const sources=await Promise.all(names.map(async name=>{
        const response=await fetch(new URL('./'+name,import.meta.url));
        if(!response.ok)throw Error(`${name}: HTTP ${response.status}`);return response.text();
      }));
      circuit=new JointCircuit(...sources,{automaticCheckpoints:false});
      skipRecycleOnce=Boolean(data.input?.restore);
      const state=data.input?.restore?await circuit.restoreSession(data.input.restore,data.input.wasmBinary):await circuit.start(data.input?.wasmBinary);
      self.postMessage({id:data.id,state,version:circuit.version},[state.beam.buffer]);
    }else if((data.type==='step'||data.type==='continue')&&circuit){
      // Releasing the entire old Worker also releases the WASM heap. The new
      // instance starts from the same electrical checkpoint, without warm-up.
      if(data.type==='step'&&!skipRecycleOnce&&circuit.localTime>=nextRecycleTime&&circuit.localTime>0
          &&(circuit.localTime>=circuit.rebaseSeconds||circuit.spice.module.HEAPU8.length>recycleHeapBytes)&&circuit.canCheckpoint()){
        self.postMessage({id:data.id,recycle:await circuit.exportSession({preserve:true})});
      }else{
        if(data.type==='continue')nextRecycleTime=circuit.localTime+.05;
        skipRecycleOnce=false;
        const state=await circuit.step(data.input||{});
        self.postMessage({id:data.id,state},[state.beam.buffer]);
      }
    }else throw Error('Unknown circuit request');
  }catch(error){
    failed=true;self.postMessage({id:data.id,error:String(error?.stack||error)});
  }finally{busy=false;}
};
