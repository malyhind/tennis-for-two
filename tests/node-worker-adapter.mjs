// Node-only transport adapter for the unchanged browser circuit worker.
import {parentPort,workerData} from 'node:worker_threads';
import {readFile,writeFile} from 'node:fs/promises';
const wasm=await readFile(new URL('../app/vendor/spice.wasm',import.meta.url));
globalThis.self={postMessage:(value,transfer)=>parentPort.postMessage(value,transfer)};
globalThis.fetch=async url=>new Response(await readFile(url));
// Preserve an unrecovered continuation failure for numerical reproduction.
// This hook adds no successful-path source, state or solver changes.
const {JointCircuit}=await import('../app/joint-circuit.js');
for(const method of ['checkpoint','restoreSession']){
 const original=JointCircuit.prototype[method];
 JointCircuit.prototype[method]=async function(...args){
  try{return await original.apply(this,args);}catch(error){
   await writeFile(new URL('./results/controller-restart-failure.cir',import.meta.url),this.netlist);
   await writeFile(new URL('./results/controller-restart-failure.json',import.meta.url),JSON.stringify({method,origin:this.origin,epoch:this.epoch,inputs:this.inputValues,controls:this.controls,retries:this.restartRetries,error:String(error)},null,2));
   throw error;
  }
 };
}
await import(workerData.moduleURL);
parentPort.on('message',data=>{
 if(data.type==='init')data.input={...data.input,wasmBinary:wasm};
 self.onmessage({data});
});
