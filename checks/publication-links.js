// Link the Pages copy back to its repository without hard-coding an owner.
try{
 const response=await fetch(new URL('../publication.json',import.meta.url));
 if(response.ok){
  const info=await response.json();
  if(info.repository){
   const url=new URL(info.repository);
   if(url.protocol==='https:')for(const link of document.querySelectorAll('[data-repository]')){link.href=url.href;link.hidden=false;}
  }
 }
}catch{/* Local source runs without generated publication metadata. */}
