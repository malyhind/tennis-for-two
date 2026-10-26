// Lossless byte-plane shuffle of four interleaved IEEE-754 binary64 columns.
// Independent project code. Gzip is supplied by the runtime, not a dependency.
const MAGIC='TFTDEM01';
export function encodeBeam(trace){
  if(!(trace instanceof Float64Array)||trace.length%4)throw Error('Invalid demo beam');
  const count=trace.length,bytes=new Uint8Array(32+count*8),view=new DataView(bytes.buffer);
  for(let i=0;i<8;i++)bytes[i]=MAGIC.charCodeAt(i);
  view.setUint32(8,count/4,true);view.setUint32(12,4,true);
  view.setFloat64(16,trace[0]??0,true);view.setFloat64(24,trace.at(-4)??0,true);
  const source=new Uint8Array(trace.buffer,trace.byteOffset,trace.byteLength);
  const little=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
  for(let b=0;b<8;b++)for(let i=0;i<count;i++)bytes[32+b*count+i]=source[i*8+(little?b:7-b)];
  return bytes;
}
export function decodeBeam(bytes,{maxRows=8000000}={}){
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<32)throw Error('Invalid demo beam header');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(String.fromCharCode(...bytes.subarray(0,8))!==MAGIC||v.getUint32(12,true)!==4)throw Error('Unknown demo beam format');
  const rows=v.getUint32(8,true),count=rows*4;
  if(rows<2||rows>maxRows||bytes.byteLength!==32+count*8)throw Error('Invalid demo beam size');
  const trace=new Float64Array(count),target=new Uint8Array(trace.buffer);
  const little=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
  for(let b=0;b<8;b++)for(let i=0;i<count;i++)target[i*8+(little?b:7-b)]=bytes[32+b*count+i];
  let previous=-Infinity;
  for(let i=0;i<count;i+=4){
    if(!Number.isFinite(trace[i])||trace[i]<previous||!Number.isFinite(trace[i+1])||!Number.isFinite(trace[i+2])||!Number.isFinite(trace[i+3])||trace[i+3]<0)throw Error('Invalid demo beam sample');
    previous=trace[i];
  }
  if(trace[0]!==v.getFloat64(16,true)||trace.at(-4)!==v.getFloat64(24,true))throw Error('Demo beam bounds mismatch');
  return trace;
}
