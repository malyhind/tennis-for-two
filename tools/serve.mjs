// Local development server using Node built-ins; the game runs in the browser.
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=await realpath(fileURLToPath(new URL('../',import.meta.url)));
const port=Number(process.env.PORT||8080);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer from 1 to 65535');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8','.cir':'text/plain; charset=utf-8','.gz':'application/gzip','.tgz':'application/gzip','.f64':'application/octet-stream'};
const server=createServer(async(req,res)=>{
 const fail=(code,message)=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8'});res.end(message+'\n');};
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');fail(405,'Method not allowed');return;}
 let name;
 try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{fail(400,'Invalid URL');return;}
 if(name.includes('\0')||name.includes('\\')||name.split('/').some(part=>part.startsWith('.'))){fail(403,'Forbidden');return;}
 try{
  let path=resolve(root,'.'+name);
  if(path!==root&&!path.startsWith(root+sep)){fail(403,'Forbidden');return;}
  if((await stat(path)).isDirectory())path=resolve(path,'index.html');
  path=await realpath(path);
  if(!path.startsWith(root+sep)){fail(403,'Forbidden');return;}
  const info=await stat(path);if(!info.isFile()){fail(404,'Not found');return;}
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD'){res.end();return;}
  const stream=createReadStream(path);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }catch(error){fail(error.code==='ENOENT'||error.code==='ENOTDIR'?404:500,error.code==='ENOENT'||error.code==='ENOTDIR'?'Not found':'Unable to read file');}
});
server.on('error',error=>{console.error(`Local server: ${error.message}`);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Tennis for Two: http://127.0.0.1:${port}/\nStop: Ctrl+C`));
