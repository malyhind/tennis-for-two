import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PLAY_MODES} from '../app/play-modes.js';
import {CPU_PROFILES} from '../app/cpu-player.js';
import {EN} from '../app/ui-english.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>readFile(resolve(root,name),'utf8');
const instrument=await read('app/analog-tennis.js');

const version=JSON.parse(await read('package.json')).version;
const page=await read('index.html');
const mapMatch=page.match(/<script type="importmap">([^<]+)<\/script>/);
assert.ok(mapMatch,'Standalone publication must version changed UI modules.');
const imports=JSON.parse(mapMatch[1]).imports;
for(const name of ['ui-english.js','controller-input.js','play-modes.js']){
  assert.equal(imports[`./app/${name}`],`./app/${name}?v=${version}`);
}
assert.ok(page.includes(`src="app/analog-tennis.js?v=${version}"`));
assert.ok(page.indexOf('<script type="importmap">')<page.indexOf('src="app/analog-tennis.js?'));

assert.ok(instrument.includes("import {PLAY_MODES} from './play-modes.js';"));
assert.ok(!/import[^\n]*PLAY_MODES[^\n]*from ['\"]\.\/cpu-player\.js/.test(instrument));
assert.deepEqual(Object.keys(PLAY_MODES),['opponent','together','watch']);
assert.deepEqual(PLAY_MODES.opponent.cpu,[null,null]);
assert.deepEqual(PLAY_MODES.together.cpu,[null,'fox']);
assert.deepEqual(PLAY_MODES.watch.cpu,['gremlin','fox']);

for(const lang of ['ru','en']){
  const suffix=lang==='en'?'.en':'',tr=s=>lang==='en'?(EN[s]??s):s;
  const model=JSON.parse(await read(`app/docs/cpu-model${suffix}.json`));
  assert.deepEqual(Object.keys(model.modes),Object.keys(PLAY_MODES));
  for(const [id,mode] of Object.entries(PLAY_MODES)){
    assert.deepEqual(model.modes[id].cpu,mode.cpu,`${lang} model: ${id}`);
    assert.equal(model.modes[id].label,tr(mode.label));
  }
  for(const file of [`app/docs/cpu-research${suffix}.md`,`app/docs/research${suffix}.html`]){
    const text=(await read(file)).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
    assert.ok(!/«Я и Лиса»:\s*два человека|Me and Fox:\s*two people/.test(text),file);
    const fox=lang==='ru'?'«Я и Лиса»: человек слева, компьютерная Лиса справа.':'Me and Fox: a person on the left, the Fox CPU on the right.';
    const human=lang==='ru'?'«Я и Противник»: два человека':'Me and Opponent: two people';
    assert.ok(text.includes(fox),file+' Fox role');assert.ok(text.includes(human),file+' human role');
  }
  if(process.argv[2]){
    const path=resolve(process.argv[2],lang==='en'?'game.en.json':'game.json');
    const game=JSON.parse(await readFile(path,'utf8'));
    const expected=Object.values(PLAY_MODES).map(mode=>[tr(mode.label),...mode.cpu.map(persona=>persona?'CPU · '+tr(CPU_PROFILES[persona].name):(lang==='en'?'Human':'Человек'))]);
    assert.deepEqual(game.sections.find(s=>s.id==='cpu').table.rows,expected,path+' mode table');
    const controls=game.sections.find(s=>s.id==='controls').paragraphs.join(' ');
    assert.ok(!/«Я и Лиса»\s*—\s*два человека|Me and Fox\s*—\s*two humans/.test(controls),path+' stale instructions');
    assert.ok(lang==='ru'?controls.includes('«Я и Противник» — два человека'):controls.includes('Me and Opponent — two people'));
    assert.ok(lang==='ru'?controls.includes('компьютерная Лиса справа'):controls.includes('Fox CPU on the right'));
  }
}
console.log('PASS: one live registry; all three roles agree with Russian/English JSON, Markdown, HTML and supplied Laboratory manifests.');
