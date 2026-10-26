// Keep project navigation in the selected language; source links also work
// when ready files are published directly from a GitHub branch.
const updateLaboratoryLinks=()=>{
 const prefix=document.documentElement.lang==='en'?'en/':'';
 for(const link of document.querySelectorAll('[data-laboratory]'))
  link.href=`https://games.oopssre.ru/${prefix}lab/`;
};
updateLaboratoryLinks();
window.addEventListener('tennis-language',updateLaboratoryLinks);

// Retain optional publication metadata for exports with no explicit source URL.
if(document.querySelector('[data-repository]:not([href])'))try{
 const response=await fetch(new URL('../publication.json',import.meta.url));
 if(response.ok){
  const info=await response.json();
  if(info.repository){
   const url=new URL(info.repository);
   if(url.protocol==='https:')for(const link of document.querySelectorAll('[data-repository]')){link.href=url.href;link.hidden=false;}
  }
 }
}catch{/* Local source runs without generated publication metadata. */}
