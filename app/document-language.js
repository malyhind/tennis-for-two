import {setLanguage} from './language.js';
// Static sibling pages remain usable without JS; clicks also remember preference.
for(const link of document.querySelectorAll('[data-document-language]')){
  link.addEventListener('click',event=>{
    if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    setLanguage(link.dataset.documentLanguage);
  });
}
