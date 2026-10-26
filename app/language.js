// UI preference only. Changing language never touches the circuit or its clock.
const KEY='tennis-for-two.language';
const supported=v=>v==='ru'||v==='en';
const query=new URLSearchParams(location.search).get('lang');
let language=supported(query)?query:document.documentElement.lang==='en'?'en':readPreference();
function readPreference(){try{const v=localStorage.getItem(KEY);if(supported(v))return v;}catch{}return 'ru';}
export const getLanguage=()=>language;
export function setLanguage(value,{persist=true}={}){
  if(!supported(value))return;
  language=value;
  if(persist)try{localStorage.setItem(KEY,value);}catch{}
  document.documentElement.lang=value;
  const url=new URL(location.href);url.searchParams.set('lang',value);
  try{history.replaceState(history.state,'',url);}catch{}
  window.dispatchEvent(new CustomEvent('tennis-language',{detail:value}));
}
window.addEventListener('storage',e=>{if(e.key===KEY&&supported(e.newValue))setLanguage(e.newValue,{persist:false});});
export function translator(english){return (text,lang=getLanguage())=>lang==='en'?(english[text]??text):text;}
const originalText=new WeakMap(),originalAttributes=new WeakMap();
export function translateTree(root,english,lang=getLanguage()){
  const tr=translator(english),reverse=Object.fromEntries(Object.entries(english).map(([a,b])=>[b,a])),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){
    if(node.parentElement?.closest('script,style,pre,code'))continue;
    if(!originalText.has(node)){const v=node.nodeValue,core=v.trim();originalText.set(node,reverse[core]?v.replace(core,reverse[core]):v);}
    const source=originalText.get(node),core=source.trim();
    if(core&&Object.hasOwn(english,core))node.nodeValue=source.replace(core,tr(core,lang));
  }
  for(const element of root.querySelectorAll('[aria-label],[title],[alt]')){
    if(!originalAttributes.has(element))originalAttributes.set(element,Object.fromEntries(['aria-label','title','alt'].filter(a=>element.hasAttribute(a)).map(a=>[a,reverse[element.getAttribute(a)]??element.getAttribute(a)])));
    for(const [key,value] of Object.entries(originalAttributes.get(element)))element.setAttribute(key,tr(value,lang));
  }
}
export function languageButtons(){return '<span class="language-switch" role="group" aria-label="Язык / Language"><button type="button" data-language="ru" lang="ru" aria-label="Русский">RU</button><button type="button" data-language="en" lang="en" aria-label="English">EN</button></span>';}
export function bindLanguageButtons(root){for(const b of root.querySelectorAll('[data-language]')){b.onclick=()=>setLanguage(b.dataset.language);b.setAttribute('aria-pressed',String(b.dataset.language===getLanguage()));}}

