/* Dependency-free smoke test for the game loop and input; run with Node.js. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor() { this.style = {}; this.dataset = {}; this.events = {}; this.hidden = false; this.textContent = ''; }
  addEventListener(k, f) { (this.events[k] ??= []).push(f); }
  event(k, props = {}) { for (const f of this.events[k] ?? []) f({ preventDefault() {}, target: this, ...props }); }
  blur() {}
  append() {}
  setAttribute(k, v) { this[k] = v; }
  setPointerCapture() {}
  querySelector() { return new Element(); }
}
function launch(reduced = false) {
  const nodes = new Map(), get = id => {
    if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id);
  };
  const left = new Element(), right = new Element(), touchJump = new Element(), touchBike = new Element();
  left.dataset.hold = 'left'; right.dataset.hold = 'right';
  touchJump.dataset.action = 'jump'; touchBike.dataset.action = 'mount';
  let draws = 0, ms = 0, callback;
  get('#world').getContext = () => new Proxy({
    createLinearGradient: () => ({ addColorStop() {} }),
    fillRect: () => { draws++; },
    lineTo: (...v) => assert(v.every(Number.isFinite)),
    ellipse: (...v) => assert(v.every(Number.isFinite))
  }, { get: (o, k) => o[k] ?? (() => {}) });
  const win = new Element(), doc = {
    querySelector: get, createElement: () => new Element(),
    querySelectorAll: s => s==='[data-hold]' ? [left,right] : [touchJump,touchBike]
  };
  let game;
  const root = path.join(__dirname, '..');
  const src = fs.readFileSync(path.join(root,'ride.js'),'utf8');
  const instrumented = src.replace(/\}\)\(\);\s*$/, 'expose({ state:()=>p, ground, zone, views, blocks, mud, END }); })();');
  assert.notEqual(instrumented,src);
  vm.runInNewContext(instrumented,{
    window:win, document:doc, requestAnimationFrame:f => callback=f, HTMLButtonElement:class {},
    matchMedia:()=>({matches:reduced}), expose:g => game=g
  });
  const tick=n=>{for(let i=0;i<n;i++)callback(ms+=1000/60);};
  const down=key=>win.event('keydown',{key}), up=key=>win.event('keyup',{key});
  const press=key=>{down(key);up(key);};
  const state=()=>game.state();
  return {get,game,state,down,up,press,tick,left,right,touchJump,touchBike,draws:()=>draws};
}
const {get,game,state,down,up,press,tick,draws} = launch();
const walkTo=(x)=>{const dir=x>state().x?'d':'a';down(dir);let frames=0;while(Math.abs(state().x-x)>10&&frames++<700)tick(1);up(dir);tick(12);assert(Math.abs(state().x-x)<40,'arrive at '+x+', got '+state().x);};
const moveForwardUntil=max=>{down('d');tick(max);up('d');tick(12);};
tick(2);assert.equal(state().x,120);
get('#start').event('click');
const x0=state().x;moveForwardUntil(45);const dist=state().x-x0;assert(dist>105);
press('e');assert(state().bike);const x1=state().x;moveForwardUntil(45);assert(state().x-x1>dist*1.6);
press('e');assert(!state().bike);
walkTo(game.views[0].x);press('f');press('f');assert.equal(state().photos.length,1);
walkTo(1200);
down('d');tick(10);const foot=state().vx;up('d');tick(20);
press('e');down('d');tick(10);assert(state().vx<foot);up('d');tick(20);press('e');
for(const block of game.blocks){
 moveForwardUntil(520);
 assert(state().x<block.x && state().x>block.x-50,'collision before obstacle '+block.x);
 assert.equal(state().vx,0);
 down('d');press(' ');tick(62);up('d');tick(12);
 assert(state().x>block.x+45,'crossed obstacle '+block.x);
 if(block.x===2820 || block.x===5570){
  const view=game.views[block.x===2820?1:2];walkTo(view.x);press('f');
 }
}
moveForwardUntil(520);assert(state().finished);assert.equal(state().photos.length,3);
assert.equal(get('#district').textContent,'Đèo đá');
get('#reset').event('click');assert.equal(state().x,120);assert.equal(state().photos.length,0);assert(draws()>500);
const touch=launch(true);
touch.right.event('pointerdown',{pointerId:1});touch.tick(25);
touch.right.event('pointercancel',{pointerId:1});touch.tick(40);
assert(touch.state().x>155 && touch.state().x<260);
touch.touchBike.event('click');assert(touch.state().bike);
touch.touchJump.event('click');touch.tick(4);assert(touch.state().air);
touch.left.event('pointerdown',{pointerId:2});touch.tick(16);touch.left.event('pointerup',{pointerId:2});
assert.equal(touch.state().face,-1);
console.log('OK: scrolling renderer, three areas, walk, bicycle, mud, collision, five jumps, three postcards, finish, restart, touch controls.');
