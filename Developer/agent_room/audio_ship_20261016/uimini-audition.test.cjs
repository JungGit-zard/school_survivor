const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../../r3f_prototype/package.json'));
const { JSDOM } = req('jsdom');
const pagePath = path.resolve(__dirname, '../../r3f_prototype/public/sfx-audition-20261016.html');
// Synthetic contract fixture only: never written into the public manifest or claimed as real audio coverage.
const fixture = { generatedAt: 'fixture-only', cases: Array.from({length:93}, (_, i) => ({id:`case${i}`, category:i%2?'음성':'효과음', name:`테스트 ${i}`, description:`설명 ${i}`, original:{src:`/sfx/original${i}.ogg`,label:'기존 원본'}, variants:['A','B','C'].map(id=>({id,label:`대안 ${id}`,description:`${id} 설명`,src:`/sfx/${i}-${id}.wav`}))})) };
function setup(manifest=fixture) {
  assert.ok(fs.existsSync(pagePath), '청음 페이지가 존재해야 함');
  const dom = new JSDOM(fs.readFileSync(pagePath,'utf8'), {url:'http://localhost:5173/sfx-audition-20261016.html', runScripts:'outside-only', pretendToBeVisual:true});
  const w=dom.window, audios=[], downloads=[];
  w.SFX_AUDITION_MANIFEST=manifest;
  w.Audio=class extends w.EventTarget {
    constructor(src){super();this.src=src;this.currentTime=0;this.paused=true;this.volume=1;audios.push(this);}
    play(){this.paused=false;return new Promise((resolve,reject)=>{this.resolve=()=>{this.paused=false;resolve();};this.reject=reject;});}
    pause(){this.paused=true;}
    removeAttribute(){this.src='';}
    load(){this.loads=(this.loads||0)+1;if(this.emitErrorOnLoad && this.loads<4)this.dispatchEvent(new w.Event('error'));}
  };
  w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:fixture';};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
  for(const s of w.document.querySelectorAll('script:not([src])')) w.eval(s.textContent);
  const d=w.document;
  return {dom,w,d,audios,downloads,click:s=>{const el=d.querySelector(s);assert.ok(el,s);el.click();},flush:()=>new Promise(r=>setImmediate(r))};
}
const play=(c,v)=>`[data-case="${c}"][data-play="${v}"]`;
test('누락 manifest는 가짜 93건 없이 대기 상태',()=>{const h=setup(undefined===null?null:null);assert.match(h.d.querySelector('#coverage').textContent,/준비|대기/);assert.equal(h.d.querySelectorAll('.case-card').length,0);assert.equal(h.audios.length,0);h.dom.window.close();});
test('93건 원본+A/B/C, 자동재생 없음 및 검색/분류',()=>{const h=setup();assert.equal(h.d.querySelectorAll('.case-card').length,93);assert.equal(h.d.querySelectorAll('[data-play]').length,372);assert.equal(h.audios.length,0);const q=h.d.querySelector('#search');q.value='테스트 92';q.dispatchEvent(new h.w.Event('input'));assert.equal(h.d.querySelectorAll('.case-card:not([hidden])').length,1);q.value='';q.dispatchEvent(new h.w.Event('input'));const cat=h.d.querySelector('#category');cat.value='음성';cat.dispatchEvent(new h.w.Event('change'));assert.equal(h.d.querySelectorAll('.case-card:not([hidden])').length,46);h.dom.window.close();});
test('원본 A B C 전환과 동일 샘플 다시 재생은 하나만 활성',async()=>{const h=setup();for(const v of ['original','A','B','C','C']){h.click(play('case0',v));h.audios.at(-1).resolve();await h.flush();assert.equal(h.audios.filter(a=>!a.paused).length,1);assert.equal(h.d.querySelectorAll('[data-play][aria-pressed="true"]').length,1);}assert.equal(h.audios.length,5);h.click('#stop-all');assert.ok(h.audios.every(a=>a.paused));assert.equal(h.d.querySelectorAll('[data-play][aria-pressed="true"]').length,0);h.dom.window.close();});
test('늦은 play resolve/reject가 전환 또는 정지 후 소리/상태를 되살리지 않음',async()=>{const h=setup();h.click(play('case0','A'));const old=h.audios[0];h.click(play('case0','B'));h.audios[1].resolve();await h.flush();old.resolve();await h.flush();assert.ok(old.paused);assert.match(h.d.querySelector('#playback-status').textContent,/B/);h.click(play('case0','C'));const stopped=h.audios[2];h.click('#stop-all');stopped.resolve();await h.flush();assert.ok(stopped.paused);assert.match(h.d.querySelector('#playback-status').textContent,/정지/);h.click(play('case1','A'));const rejected=h.audios[3];h.click('#stop-all');rejected.reject(new Error('stale'));await h.flush();assert.ok(!h.d.querySelector('#error').textContent.includes('stale'));h.dom.window.close();});
test('재생 거절/미디어 오류 가시화, 볼륨 및 개별 정지',async()=>{const h=setup();const vol=h.d.querySelector('#volume');vol.value='25';vol.dispatchEvent(new h.w.Event('input'));h.click(play('case0','A'));assert.equal(h.audios[0].volume,.25);h.audios[0].reject(new h.w.DOMException('gesture','NotAllowedError'));await h.flush();assert.match(h.d.querySelector('#error').textContent,/재생/);h.click(play('case0','B'));h.audios[1].error={code:4};h.audios[1].dispatchEvent(new h.w.Event('error'));assert.match(h.d.querySelector('#error').textContent,/파일|형식/);assert.match(h.d.querySelector('#failures').textContent,/1/);h.click(play('case0','C'));h.audios[2].resolve();await h.flush();h.click('[data-stop="case0"]');assert.ok(h.audios[2].paused);h.dom.window.close();});
test('선호 선택은 메모리 전용, 필터 후 유지, JSON만 내보냄',()=>{const h=setup();h.click('[data-prefer="B"][data-case="case0"]');assert.equal(h.d.querySelector('[data-prefer="B"][data-case="case0"]').getAttribute('aria-pressed'),'true');h.click('#export');assert.equal(h.downloads.length,2);assert.match(h.downloads[1],/\.json$/);assert.equal(h.w.localStorage.length,0);h.dom.window.close();const fresh=setup();assert.equal(fresh.d.querySelectorAll('[data-prefer][aria-pressed="true"]').length,0);fresh.dom.window.close();});
test('숨김/pagehide/Escape 시 pending 오디오 취소 및 정리',async()=>{for(const type of ['pagehide','visibilitychange','keydown']){const h=setup();h.click(play('case0','A'));const a=h.audios[0];if(type==='visibilitychange'){Object.defineProperty(h.d,'hidden',{value:true});h.d.dispatchEvent(new h.w.Event(type));}else if(type==='keydown')h.d.dispatchEvent(new h.w.KeyboardEvent(type,{key:'Escape'}));else h.w.dispatchEvent(new h.w.Event(type));a.resolve();await h.flush();assert.ok(a.paused,type);assert.equal(h.d.querySelectorAll('[data-play][aria-pressed="true"]').length,0);h.dom.window.close();}});
test('stale error/load disposal is idempotent while late playback stays muted',async()=>{const h=setup();try{h.click(play('case0','A'));const old=h.audios[0];old.emitErrorOnLoad=true;h.click(play('case0','B'));assert.equal(old.loads,1,'load-triggered error must not recursively reload');old.dispatchEvent(new h.w.Event('error'));old.paused=false;old.dispatchEvent(new h.w.Event('playing'));old.resolve();await h.flush();assert.equal(old.loads,1,'late events must not reload disposed audio');assert.ok(old.paused);assert.equal(old.muted,true);assert.equal(h.d.querySelector('#error').textContent,'');h.audios[1].resolve();await h.flush();assert.equal(h.d.querySelector(play('case0','B')).getAttribute('aria-pressed'),'true');}finally{h.dom.window.close();}});
test('외부 의존/저장소/게임 튜닝 쓰기 없음, 올바른 manifest 계약',()=>{assert.ok(fs.existsSync(pagePath),'청음 페이지가 존재해야 함');const html=fs.readFileSync(pagePath,'utf8');assert.match(html,/\.\/sfx\/audition-20261016\/manifest\.js/);assert.doesNotMatch(html,/localStorage|sessionStorage|indexedDB|firebase|https?:\/\/|autoplay/i);});
