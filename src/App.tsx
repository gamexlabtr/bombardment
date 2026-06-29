import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

/* ============================================================
   GameXLabTR – BOMBARDIMAN LABORATUVARI
   Retro Bomberman – Vite + React 19 + TypeScript + Tailwind 4
   Hibrit: Offline Bot + Firebase Realtime Database
   WebAudio – 0 dosya
   Blogger Fullscreen – z-index:10000
   ============================================================ */

const BLOGGER_BOMBER_CSS = `
#navbar-iframe,.navbar,#Attribution1,.attribution,
#sidebar-wrapper,.sidebar,#sidebar,.sidebar-container,
#header-wrapper,.header,#footer-wrapper,footer,.footer,
.post-footer,.blog-pager,.post-feeds,.feed-links,
#blog-pager,.widget,.PopularPosts,.FollowByEmail,
#comments,.comments,.bg-ads,.ads,iframe[src*="blogger"],
header,nav,aside,.tabs,.tab-wrapper,.cap-top,.cap-bottom,
#main-wrapper,.main,.main-wrapper,.column-left-outer,.column-right-outer,
.post,.post-outer,.date-outer,.blog-posts,.widget-content,
#outer-wrapper,#content-wrapper,.tabs-outer,.fauxcolumn-outer{
  display:none !important; visibility:hidden !important; height:0 !important; overflow:hidden !important;
}
html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#07141c!important;height:100%!important;width:100%!important;font-family:Inter,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace,system-ui,sans-serif!important;color-scheme:dark;image-rendering:pixelated;-webkit-font-smoothing:none;}
#root,.bomber-root{position:fixed!important;inset:0!important;z-index:10000!important;width:100vw!important;height:100dvh!important;background:#07141c!important;overflow:hidden!important;}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;image-rendering:pixelated;}
button,input{font-family:inherit}
@media(min-width:1920px){html{font-size:17.5px}}
@media(pointer:coarse){button{min-height:46px}}
::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#214653;border-radius:5px}
@keyframes crt-flicker{0%,100%{opacity:1}94%{opacity:.985}96%{opacity:.93}98%{opacity:.995}}
.crt{animation:crt-flicker 2.6s infinite}
@keyframes bombPulse{0%{transform:scale(1)}50%{transform:scale(1.07)}100%{transform:scale(1)}}
@keyframes flameFlicker{0%{opacity:1;transform:scale(1)}40%{opacity:.92;transform:scale(1.035)}100%{opacity:1;transform:scale(1)}}
@keyframes pistiPop{0%{transform:scale(.55);opacity:0}18%{transform:scale(1.18);opacity:1}55%{transform:scale(1)}100%{opacity:0}}
@keyframes cardFly{0%{transform:translateY(24px) scale(.9) rotate(-5deg);opacity:.45}100%{transform:translateY(0) scale(1) rotate(0);opacity:1}}
`;

/* Firebase */
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, onDisconnect, get, remove, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDoi750NzXB5KWXU8oDWr4scJZ0mf_2mWU",
  authDomain: "gmxlabtr.firebaseapp.com",
  databaseURL: "https://gmxlabtr-default-rtdb.firebaseio.com",
  projectId: "gmxlabtr",
  storageBucket: "gmxlabtr.firebasestorage.app",
  messagingSenderId: "779740910958",
  appId: "1:779740910958:web:45afeef855ec008a025d7f",
  measurementId: "G-SM7PRHBWQL"
};
let _db: Database | null = null;
function getDbSafe(): Database | null {
  if(_db) return _db;
  try{ const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig); _db = getDatabase(app); return _db; }
  catch(e){ console.warn('[BOMBER] Firebase offline',e); return null; }
}
async function fbSafe<T=any>(fn:()=>any, fallback:T|null=null):Promise<T|null>{
  try{ const r=fn(); return r && typeof r.then==='function' ? await r : r; }catch(e){ console.warn('[BOMBER fb]',e); return fallback; }
}

/* Web Audio */
let audioCtx: AudioContext | null = null;
function ac(): AudioContext | null {
  try{ if(!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{}); return audioCtx; }catch{ return null; }
}
let lastStepAt=0;
function playStep(){
  const now=performance.now(); if(now-lastStepAt<110) return; lastStepAt=now;
  const ctx=ac(); if(!ctx) return;
  const t0=ctx.currentTime;
  const o=ctx.createOscillator(); const g=ctx.createGain();
  o.type='square'; o.frequency.setValueAtTime(410+Math.random()*70,t0); o.frequency.exponentialRampToValueAtTime(180,t0+0.048);
  g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.058,t0+0.007); g.gain.exponentialRampToValueAtTime(0.001,t0+0.052);
  o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0+0.06);
}
function playBombPlace(){
  const ctx=ac(); if(!ctx) return;
  const t0=ctx.currentTime;
  [880,1315].forEach((f,i)=>{
    const o=ctx.createOscillator(); const g=ctx.createGain();
    o.type='square'; o.frequency.setValueAtTime(f, t0+i*0.062);
    g.gain.setValueAtTime(0.0001, t0+i*0.062); g.gain.linearRampToValueAtTime(0.13, t0+i*0.062+0.009); g.gain.exponentialRampToValueAtTime(0.001, t0+i*0.062+0.072);
    o.connect(g); g.connect(ctx.destination); o.start(t0+i*0.062); o.stop(t0+i*0.062+0.082);
  });
}
function playBombTick(fast=false){
  const ctx=ac(); if(!ctx) return;
  const t0=ctx.currentTime;
  const o=ctx.createOscillator(); const g=ctx.createGain();
  o.type='square'; o.frequency.value= fast?1220:720;
  g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(fast?0.1:0.065,t0+0.006); g.gain.exponentialRampToValueAtTime(0.001,t0+0.05);
  o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0+0.055);
}
function playExplosion(){
  const ctx=ac(); if(!ctx) return;
  const t0=ctx.currentTime;
  const o=ctx.createOscillator(); const g=ctx.createGain();
  o.type='sawtooth'; o.frequency.setValueAtTime(105,t0); o.frequency.exponentialRampToValueAtTime(34,t0+0.34);
  g.gain.setValueAtTime(0.38,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+0.36);
  o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0+0.38);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*0.27,ctx.sampleRate);
  const d=buffer.getChannelData(0);
  for(let i=0;i<d.length;i++){ const tt=i/ctx.sampleRate; d[i]=(Math.random()*2-1)*Math.exp(-tt*7)*0.85; }
  const src=ctx.createBufferSource(); src.buffer=buffer;
  const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=900; bp.Q.value=0.95;
  const gg=ctx.createGain(); gg.gain.value=0.42;
  src.connect(bp); bp.connect(gg); gg.connect(ctx.destination);
  src.start(t0+0.008);
}
function playPowerup(){
  const ctx=ac(); if(!ctx) return;
  const t0=ctx.currentTime;
  [523,659,784,1047].forEach((f,i)=>{
    const o=ctx.createOscillator(); const g=ctx.createGain();
    o.type='square'; o.frequency.setValueAtTime(f, t0+i*0.07);
    g.gain.setValueAtTime(0.0001, t0+i*0.07); g.gain.linearRampToValueAtTime(0.20, t0+i*0.07+0.012); g.gain.exponentialRampToValueAtTime(0.001, t0+i*0.07+0.11);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0+i*0.07); o.stop(t0+i*0.07+0.125);
  });
}
function playWinMelody(){
  const ctx=ac(); if(!ctx) return;
  const t0=ctx.currentTime;
  [523,659,784,1047,1175,1319].forEach((f,i)=>{
    const o=ctx.createOscillator(); const g=ctx.createGain();
    o.type = i%2 ? 'square' : 'triangle';
    o.frequency.setValueAtTime(f, t0+i*0.13);
    g.gain.setValueAtTime(0.0001, t0+i*0.13); g.gain.linearRampToValueAtTime(0.24, t0+i*0.13+0.015); g.gain.exponentialRampToValueAtTime(0.001, t0+i*0.13+0.13);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0+i*0.13); o.stop(t0+i*0.13+0.145);
  });
}
function playLose(){
  const ctx=ac(); if(!ctx) return;
  const t0=ctx.currentTime;
  [440,370,311,220].forEach((f,i)=>{
    const o=ctx.createOscillator(); const g=ctx.createGain();
    o.type='sawtooth'; o.frequency.setValueAtTime(f, t0+i*0.19);
    g.gain.setValueAtTime(0.18, t0+i*0.19); g.gain.exponentialRampToValueAtTime(0.001, t0+i*0.19+0.21);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0+i*0.19); o.stop(t0+i*0.19+0.23);
  });
}

/* ===== Game core ===== */
const COLS = 13;
const ROWS = 11;
type Tile = 0|1|2;
type PowerType = 'bomb'|'fire'|'speed';
type PlayerState = { id:0|1; x:number; y:number; alive:boolean; bombsMax:number; bombPower:number; speed:number; lastMoveAt:number };
type Bomb = { id:string; x:number; y:number; owner:0|1; power:number; plantedAt:number; explodeAt:number };
type ExplosionCell = { x:number; y:number; t:number };
type PowerUpItem = { x:number; y:number; type:PowerType; id:string };
type BomberState = {
  map: Tile[][];
  players: [PlayerState, PlayerState];
  bombs: Bomb[];
  explosions: ExplosionCell[];
  powerups: PowerUpItem[];
  tick: number;
  winner: null|0|1|2;
  startedAt: number;
  version: number;
};

function buildMap(): Tile[][] {
  const m: Tile[][] = Array.from({length:ROWS}, ()=> Array(COLS).fill(0 as Tile));
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      if(x===0||y===0||x===COLS-1||y===ROWS-1) m[y][x]=1;
      else if(x%2===0 && y%2===0) m[y][x]=1;
      else {
        const safe = (x<=2 && y<=2) || (x>=COLS-3 && y>=ROWS-3) || (x<=2 && y>=ROWS-3) || (x>=COLS-3 && y<=2);
        if(!safe && Math.random() < 0.63) m[y][x]=2;
      }
    }
  }
  [[1,1],[2,1],[1,2],[COLS-2,ROWS-2],[COLS-3,ROWS-2],[COLS-2,ROWS-3],[1,ROWS-2],[2,ROWS-2],[1,ROWS-3],[COLS-2,1],[COLS-3,1],[COLS-2,2]].forEach(([x,y])=>{ if(m[y] && m[y][x]!==undefined) m[y][x]=0; });
  return m;
}
function newBomberState(): BomberState {
  return {
    map: buildMap(),
    players: [
      { id:0, x:1, y:1, alive:true, bombsMax:1, bombPower:1, speed:1, lastMoveAt:0 },
      { id:1, x:COLS-2, y:ROWS-2, alive:true, bombsMax:1, bombPower:1, speed:1, lastMoveAt:0 }
    ],
    bombs: [],
    explosions: [],
    powerups: [],
    tick: 0,
    winner: null,
    startedAt: Date.now(),
    version: 1
  };
}
function cloneBomber(s: BomberState): BomberState {
  return {
    map: s.map.map(r=>[...r]) as Tile[][],
    players: s.players.map(p=>({...p})) as [PlayerState, PlayerState],
    bombs: s.bombs.map(b=>({...b})),
    explosions: s.explosions.map(e=>({...e})),
    powerups: s.powerups.map(p=>({...p})),
    tick: s.tick+1,
    winner: s.winner,
    startedAt: s.startedAt,
    version: s.version+1
  };
}
function isWalkable(state: BomberState, x:number, y:number): boolean {
  if(x<0||y<0||x>=COLS||y>=ROWS) return false;
  const t = state.map[y][x];
  if(t===1 || t===2) return false;
  if(state.bombs.some(b=> b.x===x && b.y===y)) return false;
  return true;
}
function tryMove(state: BomberState, pid:0|1, dx:number, dy:number, now:number): BomberState {
  const p = state.players[pid];
  if(!p.alive || state.winner!==null) return state;
  const cd = Math.max(88, 175 - p.speed*28);
  if(now - p.lastMoveAt < cd) return state;
  const nx = p.x + dx; const ny = p.y + dy;
  if(!isWalkable(state, nx, ny)) return state;
  const ns = cloneBomber(state);
  const np = ns.players[pid];
  np.x = nx; np.y = ny; np.lastMoveAt = now;
  // powerup pickup
  const puIdx = ns.powerups.findIndex(pu=> pu.x===nx && pu.y===ny);
  if(puIdx>=0){
    const pu = ns.powerups.splice(puIdx,1)[0];
    if(pu.type==='bomb') np.bombsMax = Math.min(6, np.bombsMax+1);
    if(pu.type==='fire') np.bombPower = Math.min(6, np.bombPower+1);
    if(pu.type==='speed') np.speed = Math.min(5.2, np.speed+0.8);
    // @ts-ignore
    ns._fxPower = true;
  }
  // @ts-ignore
  ns._fxStep = true;
  return ns;
}
function placeBomb(state: BomberState, pid:0|1, now:number): BomberState {
  const p = state.players[pid];
  if(!p.alive || state.winner!==null) return state;
  const active = state.bombs.filter(b=> b.owner===pid).length;
  if(active >= p.bombsMax) return state;
  if(state.bombs.some(b=> b.x===p.x && b.y===p.y)) return state;
  const ns = cloneBomber(state);
  ns.bombs.push({
    id: 'b_'+now+'_'+Math.random().toString(36).slice(2,6),
    x: p.x, y: p.y,
    owner: pid,
    power: p.bombPower,
    plantedAt: now,
    explodeAt: now + 2500
  });
  // @ts-ignore
  ns._fxBomb = true;
  return ns;
}
function explodeBomb(state: BomberState, bomb: Bomb, now:number): BomberState {
  let ns = cloneBomber(state);
  ns.bombs = ns.bombs.filter(b=> b.id !== bomb.id);
  const cells:{x:number;y:number}[] = [{x:bomb.x, y:bomb.y}];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of dirs){
    for(let s=1; s<=bomb.power; s++){
      const cx = bomb.x + dx*s;
      const cy = bomb.y + dy*s;
      if(cx<0||cy<0||cx>=COLS||cy>=ROWS) break;
      const tile = ns.map[cy][cx];
      if(tile===1) break;
      cells.push({x:cx, y:cy});
      if(tile===2){
        ns.map[cy][cx] = 0;
        if(Math.random() < 0.32){
          const pool:PowerType[] = ['bomb','fire','fire','speed'];
          ns.powerups.push({ x:cx, y:cy, type: pool[Math.floor(Math.random()*pool.length)], id:`pu_${cx}_${cy}_${now}` });
        }
        break;
      }
    }
  }
  cells.forEach(c=> ns.explosions.push({ x:c.x, y:c.y, t: now }));
  ns.players.forEach(pl=>{
    if(!pl.alive) return;
    if(cells.some(c=> c.x===pl.x && c.y===pl.y)){
      pl.alive = false;
    }
  });
  // chain
  ns.bombs.forEach(b=>{
    if(cells.some(c=> c.x===b.x && c.y===b.y)){
      b.explodeAt = Math.min(b.explodeAt, now + 65);
    }
  });
  // @ts-ignore
  ns._fxExplode = true;
  return ns;
}
function gameTick(state: BomberState, now:number): BomberState {
  if(state.winner !== null) return state;
  let ns = cloneBomber(state);
  ns.explosions = ns.explosions.filter(e=> now - e.t < 520);
  const due = ns.bombs.filter(b=> now >= b.explodeAt);
  for(const b of [...due]){
    if(!ns.bombs.find(x=> x.id===b.id)) continue;
    ns = explodeBomb(ns, b, now);
  }
  const alive = ns.players.map((p,i)=> p.alive ? i as 0|1 : -1).filter(i=> i>=0) as (0|1)[];
  if(alive.length===1){
    ns.winner = alive[0];
  } else if(alive.length===0){
    ns.winner = 2;
  }
  return ns;
}

/* bot */
function botChooseAction(state: BomberState): {move?: 'up'|'down'|'left'|'right', bomb?:boolean} {
  const me = state.players[1];
  if(!me.alive) return {};
  const opp = state.players[0];

  // danger map
  const danger = new Set<string>();
  state.explosions.forEach(e=> danger.add(`${e.x},${e.y}`));
  state.bombs.forEach(b=>{
    danger.add(`${b.x},${b.y}`);
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    dirs.forEach(([dx,dy])=>{
      for(let s=1;s<=b.power;s++){
        const cx=b.x+dx*s, cy=b.y+dy*s;
        if(cx<0||cy<0||cx>=COLS||cy>=ROWS) break;
        if(state.map[cy][cx]===1) break;
        danger.add(`${cx},${cy}`);
        if(state.map[cy][cx]===2) break;
      }
    });
  });

  const inDanger = danger.has(`${me.x},${me.y}`);

  const moves: {dx:number;dy:number;dir:'up'|'down'|'left'|'right'; nx:number; ny:number; score:number; safe:boolean}[] = [];
  const dirs:[number,number,'up'|'down'|'left'|'right'][] = [[0,-1,'up'],[0,1,'down'],[-1,0,'left'],[1,0,'right']];
  for(const [dx,dy,dir] of dirs){
    const nx = me.x+dx, ny = me.y+dy;
    if(!isWalkable(state, nx, ny)) continue;
    const safe = !danger.has(`${nx},${ny}`);
    let score = Math.random()*0.15;
    if(opp.alive){
      const dist = Math.abs(nx-opp.x)+Math.abs(ny-opp.y);
      score += (18-dist)*0.06;
    }
    if(safe) score += inDanger ? 3.2 : 0.22;
    else score -= 2.4;
    // powerup
    if(state.powerups.some(p=> p.x===nx && p.y===ny)) score += 1.7;
    moves.push({dx,dy,dir,nx,ny,score,safe});
  }
  moves.sort((a,b)=> b.score - a.score);
  const best = moves[0];
  if(!best) return { bomb: Math.random()<0.22 };

  // should bomb?
  let wantBomb = false;
  // adjacent crate?
  const adjCrate = dirs.some(([dx,dy])=>{
    const cx=me.x+dx, cy=me.y+dy;
    return state.map[cy]?.[cx]===2;
  });
  if(adjCrate) wantBomb = Math.random() < 0.68;
  // opponent in line
  if(opp.alive){
    if(opp.x===me.x && Math.abs(opp.y-me.y) <= me.bombPower) wantBomb = true;
    if(opp.y===me.y && Math.abs(opp.x-me.x) <= me.bombPower) wantBomb = true;
  }
  if(wantBomb){
    const escape = moves.find(m=> m.safe && !(m.dx===0 && m.dy===0));
    if(!escape) wantBomb = Math.random() < 0.14;
  }

  return { move: best.dir, bomb: wantBomb };
}

/* ===== UI components ===== */
function HowToModal({onClose}:{onClose:()=>void}){
  return (
    <div className="fixed inset-0 z-[10060] bg-black/74 backdrop-blur-[3px] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-[820px] max-h-[90dvh] overflow-auto rounded-[22px] sm:rounded-[28px] bg-[#0d222d]/[0.99] border border-white/[0.12] shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0d222d]/95 backdrop-blur border-b border-white/[0.07] px-5 sm:px-7 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-widest uppercase text-amber-300">GameXLabTR</div>
            <div className="text-[18px] sm:text-[22px] font-[750] tracking-tight text-zinc-100">Bombardıman – Nasıl Oynanır?</div>
          </div>
          <button onClick={onClose} className="px-3 py-[7px] rounded-lg bg-white/[0.06] hover:bg-white/[0.13] text-[13px]">Kapat ✕</button>
        </div>
        <div className="px-5 sm:px-7 py-5 sm:py-6 text-[13.5px] sm:text-[14.5px] leading-relaxed text-zinc-300 space-y-5">
          <p className="text-zinc-200">Retro piksel <b>Bomberman</b> – 13×11 labirent, 2 oyuncu.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white/[0.032] border border-white/[0.07] rounded-2xl p-4">
              <div className="font-[700] text-zinc-100 mb-1">Kontroller</div>
              <ul className="list-disc pl-[18px] space-y-1">
                <li><b>WASD</b> / <b>Yön tuşları</b> – hareket</li>
                <li><b>Space</b> – bomba bırak</li>
                <li>Mobil: altta D-Pad + 💣</li>
                <li>TV: kumanda yön + OK</li>
              </ul>
            </div>
            <div className="bg-white/[0.032] border border-white/[0.07] rounded-2xl p-4">
              <div className="font-[700] text-zinc-100 mb-1">Bomba</div>
              <ul className="list-disc pl-[18px] space-y-1">
                <li>Bomba <b>2.5 sn</b> sonra patlar</li>
                <li>Patlama <b>+</b> şeklinde yayılır</li>
                <li>Taş duvarlar kırılmaz</li>
                <li>Ahşap kutular patlar</li>
              </ul>
            </div>
            <div className="bg-amber-400/[0.07] border border-amber-400/[0.22] rounded-2xl p-4">
              <div className="font-[700] text-amber-200 mb-1">Güçlendiriciler</div>
              <ul className="list-disc pl-[18px] space-y-1">
                <li>💣 <b>Bomba+</b> – aynı anda daha çok bomba</li>
                <li>🔥 <b>Alev+</b> – patlama menzili +1</li>
                <li>👟 <b>Hız+</b> – yürüme hızı artar</li>
              </ul>
            </div>
            <div className="bg-sky-500/[0.06] border border-sky-400/[0.2] rounded-2xl p-4">
              <div className="font-[700] text-sky-200 mb-1">Kazanma</div>
              <ul className="list-disc pl-[18px] space-y-1">
                <li>Ateşe değen ölür</li>
                <li>Son hayatta kalan kazanır</li>
                <li>İkiniz aynı anda → berabere</li>
              </ul>
            </div>
          </div>
          <div className="bg-rose-500/[0.06] border border-rose-400/[0.2] rounded-2xl p-[14px] text-[12.5px] sm:text-[13px] text-rose-100">
            İpucu: Kendi bombandan 2.5 sn içinde kaç! Kutuları kır, güç topla. Bot patlama alanını hesaplar.
          </div>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-5 py-[11px] rounded-xl bg-amber-400 text-[#1b1202] font-[720]">Anladım, bombala!</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Game View ===== */
function BomberGameView(props:{
  mode: GameMode;
  playerName: string;
  playerId: string;
  roomId: string|null;
  onExit: ()=>void;
  toast: (m:string)=>void;
}){
  const { mode, playerName, playerId, roomId, onExit, toast } = props;
  const isOffline = mode==='offline';

  const [state, setState] = useState<BomberState>(()=> newBomberState());
  const stateRef = useRef(state);
  useEffect(()=>{ stateRef.current = state; }, [state]);

  const [onlinePlayers, setOnlinePlayers] = useState<{id:string; name:string; side:0|1}[]>([]);
  const [chat, setChat] = useState<{id:string; name:string; text:string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [winnerFlash, setWinnerFlash] = useState<string|null>(null);

  const mySide:0|1 = useMemo(()=>{
    if(isOffline) return 0;
    const me = onlinePlayers.find(p=>p.id===playerId);
    return (me?.side ?? 0) as 0|1;
  }, [isOffline, onlinePlayers, playerId]);

  const isHost = useMemo(()=>{
    if(isOffline) return true;
    if(onlinePlayers.length===0) return true;
    // simple: side 0 is host
    return mySide===0;
  }, [isOffline, onlinePlayers, mySide]);

  // online sync in
  useEffect(()=>{
    if(isOffline || !roomId) return;
    const db = getDbSafe(); if(!db) return;
    const unsub = onValue(ref(db, `bomberRooms/${roomId}/state`), snap=>{
      const v = snap.val();
      if(v && v.map){ setState(v as BomberState); }
    });
    const unsubP = onValue(ref(db, `bomberRooms/${roomId}/players`), snap=>{
      const v = snap.val() || {};
      const list = Object.entries(v).map(([id,x]:any)=> ({ id, ...x }));
      setOnlinePlayers(list);
    });
    const unsubC = onValue(ref(db, `bomberRooms/${roomId}/chat`), snap=>{
      const v = snap.val()||{};
      const list = Object.entries(v).map(([id,x]:any)=>({ id, ...x })).sort((a:any,b:any)=>(a.ts||0)-(b.ts||0));
      setChat(list.slice(-45));
    });
    return ()=>{ unsub(); unsubP(); unsubC(); };
  }, [isOffline, roomId]);

  const syncOnline = useCallback((ns:BomberState)=>{
    if(isOffline || !roomId || !isHost) return;
    const db = getDbSafe(); if(!db) return;
    fbSafe(()=> set(ref(db, `bomberRooms/${roomId}/state`), ns));
  }, [isOffline, roomId, isHost]);

  // input sender (non-host online)
  const sendInput = useCallback((action:'up'|'down'|'left'|'right'|'bomb')=>{
    if(isOffline || isHost || !roomId) return;
    const db = getDbSafe(); if(!db) return;
    fbSafe(()=> set(ref(db, `bomberRooms/${roomId}/input/${playerId}`), { action, ts: Date.now() }));
  }, [isOffline, isHost, roomId, playerId]);

  // host processes remote inputs
  useEffect(()=>{
    if(!isHost || isOffline || !roomId) return;
    const db = getDbSafe(); if(!db) return;
    const unsub = onValue(ref(db, `bomberRooms/${roomId}/input`), snap=>{
      const v = snap.val() || {};
      let ns = stateRef.current;
      let changed = false;
      Object.entries<any>(v).forEach(([pid, inp])=>{
        if(!inp?.action) return;
        const pinfo = onlinePlayers.find(p=>p.id===pid);
        if(!pinfo) return;
        const side = pinfo.side as 0|1;
        if(side===mySide) return; // host already local
        const now = Date.now();
        if(inp.action==='bomb'){
          const before = ns.bombs.length;
          ns = placeBomb(ns, side, now);
          // @ts-ignore
          if(ns._fxBomb){ playBombPlace(); }
          // @ts-ignore
          delete ns._fxBomb;
          if(ns.bombs.length !== before) changed = true;
        } else {
          const map:any = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
          const d = map[inp.action];
          if(d){
            const nn = tryMove(ns, side, d[0], d[1], now);
            if(nn !== ns) { ns = nn; changed = true; }
          }
        }
        // clear
        fbSafe(()=> remove(ref(db, `bomberRooms/${roomId}/input/${pid}`)));
      });
      if(changed){
        setState(ns);
        syncOnline(ns);
      }
    });
    return ()=> unsub();
  }, [isHost, isOffline, roomId, onlinePlayers, mySide, syncOnline]);

  // game tick – host / offline
  useEffect(()=>{
    if(!isOffline && !isHost) return;
    let raf=0; let last=performance.now();
    const loop = (now:number)=>{
      raf = requestAnimationFrame(loop);
      if(now - last < 48) return;
      last = now;
      setState(prev=>{
        const next = gameTick(prev, now);
        // @ts-ignore
        if((next as any)._fxExplode){ playExplosion(); }
        // @ts-ignore
        delete (next as any)._fxExplode;
        if(next.winner !== null && prev.winner === null){
          if(next.winner === mySide) playWinMelody();
          else if(next.winner !== 2) playLose();
          setWinnerFlash(
            next.winner===2 ? 'BERABERE!' :
            next.winner===mySide ? 'KAZANDIN!' : 'KAYBETTİN!'
          );
          setTimeout(()=> setWinnerFlash(null), 1500);
        }
        if(isHost && !isOffline && next.tick !== prev.tick && next.tick % 3 === 0){
          syncOnline(next);
        }
        return next;
      });
    };
    raf = requestAnimationFrame(loop);
    return ()=> cancelAnimationFrame(raf);
  }, [isOffline, isHost, mySide, syncOnline]);

  // local input -> move / bomb
  const doMove = useCallback((dx:number, dy:number)=>{
    const now = Date.now();
    if(isOffline || isHost){
      setState(s=>{
        const pid = isOffline ? 0 : mySide;
        const ns = tryMove(s, pid, dx, dy, now);
        // @ts-ignore
        if(ns !== s && ns._fxStep){ playStep(); }
        // @ts-ignore
        if(ns._fxPower){ playPowerup(); }
        // @ts-ignore
        delete ns._fxStep; delete ns._fxPower;
        if(ns !== s && isHost && !isOffline) syncOnline(ns);
        return ns;
      });
    } else {
      const dir = dx===1?'right':dx===-1?'left':dy===1?'down':'up';
      sendInput(dir as any);
    }
  }, [isOffline, isHost, mySide, syncOnline, sendInput]);

  const doBomb = useCallback(()=>{
    const now = Date.now();
    if(isOffline || isHost){
      setState(s=>{
        const pid = isOffline ? 0 : mySide;
        const ns = placeBomb(s, pid, now);
        // @ts-ignore
        if(ns._fxBomb){ playBombPlace(); }
        // @ts-ignore
        delete ns._fxBomb;
        if(ns !== s && isHost && !isOffline) syncOnline(ns);
        return ns;
      });
    } else {
      sendInput('bomb');
    }
  }, [isOffline, isHost, mySide, syncOnline, sendInput]);

  // keyboard
  useEffect(()=>{
    const onKeyDown = (e:KeyboardEvent)=>{
      const k = e.key.toLowerCase();
      if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(e.key) || ['w','a','s','d'].includes(k)){
        e.preventDefault();
      }
      if(e.key===' ' || e.code==='Space'){ doBomb(); return; }
      const map:any = {
        ArrowUp:[0,-1], w:[0,-1],
        ArrowDown:[0,1], s:[0,1],
        ArrowLeft:[-1,0], a:[-1,0],
        ArrowRight:[1,0], d:[1,0]
      };
      const mv = map[e.key] || map[k];
      if(mv) doMove(mv[0], mv[1]);
    };
    window.addEventListener('keydown', onKeyDown);
    return ()=> window.removeEventListener('keydown', onKeyDown);
  }, [doMove, doBomb]);

  // ===== BOT – GARANTİLİ =====
  const botLock = useRef(false);
  useEffect(()=>{
    if(!isOffline) return;
    if(state.winner !== null) return;
    const id = setInterval(()=>{
      const s = stateRef.current;
      if(s.winner !== null) return;
      const bot = s.players[1];
      if(!bot.alive) return;
      if(botLock.current) return;
      botLock.current = true;
      try{
        const act = botChooseAction(s);
        if(act.move){
          const map:any = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
          const d = map[act.move];
          if(d){
            setState(cur => {
              const ns = tryMove(cur, 1, d[0], d[1], Date.now());
              // @ts-ignore
              delete ns._fxStep; delete ns._fxPower;
              return ns;
            });
          }
        }
        if(act.bomb){
          setTimeout(()=>{
            setState(cur=>{
              const ns = placeBomb(cur, 1, Date.now());
              // @ts-ignore
              if(ns._fxBomb) playBombPlace();
              // @ts-ignore
              delete ns._fxBomb;
              return ns;
            });
          }, 95);
        }
      } finally {
        setTimeout(()=> { botLock.current = false; }, 110);
      }
    }, 420);
    return ()=> clearInterval(id);
  }, [isOffline, state.winner]);

  // bomb tick sound
  useEffect(()=>{
    if(!isOffline && !isHost) return;
    const id = setInterval(()=>{
      const now = Date.now();
      stateRef.current.bombs.forEach(b=>{
        const left = b.explodeAt - now;
        if(left>0 && left < 1100 && Math.floor(left/ (left<520?160:260)) %2===0){
          playBombTick(left < 520);
        }
      });
    }, 200);
    return ()=> clearInterval(id);
  }, [isOffline, isHost]);

  const p0 = state.players[0];
  const p1 = state.players[1];
  const myP = state.players[mySide];

  return (
    <div className="h-[100dvh] bg-[#06141b] text-zinc-100 flex flex-col overflow-hidden crt">
      <header className="h-[54px] sm:h-[60px] border-b border-cyan-900/40 bg-[#0b202b]/92 backdrop-blur flex items-center px-3 sm:px-5 gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] rounded-[9px] bg-gradient-to-br from-amber-300 to-orange-500 text-[#1b1202] font-black flex items-center justify-center text-[13px] sm:text-[15px]" style={{fontFamily:'ui-monospace,monospace'}}>B!</div>
          <div className="hidden sm:block">
            <div className="font-[760] text-[14px] sm:text-[15px] leading-tight tracking-tight">GameXLabTR Bombardıman</div>
            <div className="text-[10.5px] text-cyan-200/70 -mt-0.5">{isOffline ? 'Offline Bot • WebAudio' : 'Firebase MP • Realtime'}</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11.5px] text-cyan-100/70">
          <span>•</span>
          <span>Harita {COLS}×{ROWS}</span>
          <span>•</span>
          <span>💣{myP.bombsMax} 🔥{myP.bombPower} 👟{myP.speed.toFixed(1)}</span>
        </div>
        <div className="flex-1" />
        <button onClick={onExit} className="text-[11px] sm:text-[12px] px-3 py-[7px] rounded-lg bg-white/[0.055] hover:bg-white/[0.11] border border-white/[0.1]">Çık</button>
      </header>

      <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] lg:grid-rows-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px]">
        {/* board */}
        <div className="relative bg-[#06141b] flex items-center justify-center p-2 sm:p-4 overflow-hidden min-h-0">
          <div className="relative w-full max-w-[760px]">
            <div className="absolute -inset-[10px] sm:-inset-[14px] rounded-[22px] bg-[#061018] border border-cyan-900/35 shadow-[inset_0_0_50px_rgba(0,255,210,0.032)] pointer-events-none" />
            <div
              className="relative grid gap-[2px] sm:gap-[3px] p-[7px] sm:p-[10px] rounded-[18px] bg-[#0a1f29] border-[3px] border-[#143446] shadow-[0_16px_60px_rgba(0,0,0,0.55)]"
              style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))` }}
            >
              {Array.from({length: ROWS}).map((_, y)=>
                Array.from({length: COLS}).map((__, x)=>{
                  const tile = state.map[y]?.[x] ?? 0;
                  const isWall = tile===1;
                  const isCrate = tile===2;
                  const bombHere = state.bombs.find(b=> b.x===x && b.y===y);
                  const explHere = state.explosions.find(e=> e.x===x && e.y===y);
                  const pu = state.powerups.find(p=> p.x===x && p.y===y);
                  const pl0 = p0.alive && p0.x===x && p0.y===y;
                  const pl1 = p1.alive && p1.x===x && p1.y===y;

                  return (
                    <div key={`${x}-${y}`} className={`
                      aspect-square rounded-[4px] sm:rounded-[5px] relative overflow-hidden transition-all duration-70
                      ${isWall ? 'bg-[#2a3e4f] shadow-[inset_0_0_0_1px_#3e5a6f,inset_0_2px_8px_rgba(0,0,0,0.45)]'
                        : isCrate ? 'bg-[#b56a34] shadow-[inset_0_0_0_1px_#7a3a18]'
                        : 'bg-[#0e5a34] shadow-[inset_0_0_0_1px_#0a3b24]'}
                    `}
                    style={{
                      backgroundImage: isWall
                        ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 4px), repeating-linear-gradient(90deg, rgba(0,0,0,0.09) 0 2px, transparent 2px 4px)'
                        : isCrate
                          ? 'repeating-linear-gradient(45deg, rgba(255,210,140,0.10) 0 3px, transparent 3px 6px)'
                          : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.045), transparent 62%)'
                    }}>
                      {isCrate && (
                        <>
                          <div className="absolute inset-[5px] border-[1.5px] border-[#70301a]/80 rounded-[3px]" />
                          <div className="absolute left-[4px] right-[4px] top-1/2 h-[1.5px] bg-[#7a3a1f]/85 -translate-y-1/2 rotate-[14deg]" />
                          <div className="absolute left-[4px] right-[4px] top-1/2 h-[1.5px] bg-[#7a3a1f]/85 -translate-y-1/2 -rotate-[14deg]" />
                        </>
                      )}
                      {pu && !explHere && (
                        <div className="absolute inset-0 flex items-center justify-center text-[15px] sm:text-[17px] animate-pulse">
                          {pu.type==='bomb' ? '💣' : pu.type==='fire' ? '🔥' : '👟'}
                        </div>
                      )}
                      {bombHere && (
                        <div className="absolute inset-[18%] sm:inset-[16%] rounded-full bg-[#141921] border-[2px] border-zinc-200/90 shadow-[0_0_12px_rgba(255,200,60,0.22)]"
                             style={{ animation: 'bombPulse 520ms infinite' }}>
                          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-[2px] h-[7px] sm:h-[9px] bg-amber-300 rounded-sm" />
                          <div className="absolute inset-[30%] rounded-full bg-zinc-700" />
                        </div>
                      )}
                      {explHere && (
                        <div className="absolute inset-[-2px] rounded-[5px]"
                          style={{
                            background:'radial-gradient(circle, #fff2b8 0%, #ff9b2a 30%, #ff4a18 58%, #ff1800 80%, transparent 100%)',
                            animation:'flameFlicker 105ms infinite alternate',
                            boxShadow:'0 0 18px rgba(255,100,20,0.72), inset 0 0 12px rgba(255,240,180,0.52)'
                          }}/>
                      )}
                      {pl0 && (
                        <div className="absolute inset-[14%] rounded-[7px] bg-[#f4f7fb] border-[2px] border-[#1b2238] shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center text-[10px] sm:text-[11px] font-[800] text-[#1a2238]">P1
                          <div className="absolute top-[4px] left-[5px] w-[3px] h-[3px] bg-[#1a2238] rounded-full" />
                          <div className="absolute top-[4px] right-[5px] w-[3px] h-[3px] bg-[#1a2238] rounded-full" />
                        </div>
                      )}
                      {pl1 && (
                        <div className="absolute inset-[14%] rounded-[7px] bg-[#232938] border-[2px] border-[#8fb6ff] shadow-[0_2px_10px_rgba(0,0,0,0.55)] flex items-center justify-center text-[10px] sm:text-[11px] font-[800] text-[#dfe8ff]">
                          {isOffline ? 'BT' : 'P2'}
                          <div className="absolute top-[4px] left-[5px] w-[3px] h-[3px] bg-[#ff5a6a] rounded-full" />
                          <div className="absolute top-[4px] right-[5px] w-[3px] h-[3px] bg-[#ff5a6a] rounded-full" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-[8px] sm:mt-[10px] flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10.5px] sm:text-[11.5px] text-cyan-100/75" style={{fontFamily:'ui-monospace,monospace'}}>
              <span>■ taş</span><span>▢ kutu</span><span>● bomba</span><span>🔥 alev</span><span>💣 🔥 👟 güç</span>
            </div>
          </div>

          {winnerFlash && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="text-center" style={{animation:'pistiPop 1300ms ease-out'}}>
                <div className="text-[30px] sm:text-[50px] font-[900] tracking-tight text-amber-300 drop-shadow-[0_6px_34px_rgba(255,170,40,0.42)]" style={{fontFamily:'ui-monospace,monospace'}}>
                  {winnerFlash}
                </div>
                <div className="text-[13px] sm:text-[15px] text-amber-100/90 mt-1">GameXLabTR</div>
              </div>
            </div>
          )}
          {state.winner !== null && (
            <div className="absolute inset-0 z-40 bg-[#051018]/82 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-[#0f2330]/97 border border-amber-300/28 rounded-[22px] px-6 sm:px-9 py-6 sm:py-7 text-center shadow-2xl max-w-[400px] w-full">
                <div className="text-[30px]">💥</div>
                <div className="text-[19px] sm:text-[22px] font-[800] mt-1 text-amber-200">
                  {state.winner===2 ? 'Berabere!' : state.winner===mySide ? 'KAZANDIN!' : 'KAYBETTİN!'}
                </div>
                <div className="text-zinc-300 mt-2 text-[13.5px]">
                  {state.winner===2 ? 'İkiniz de patladınız.' : state.winner===mySide ? 'Rakibi patlattın!' : 'Bir dahaki sefere!'}
                </div>
                <button
                  onClick={()=>{
                    const ns = newBomberState();
                    setState(ns);
                    if(!isOffline && roomId){
                      const db=getDbSafe(); if(db) fbSafe(()=> set(ref(db, `bomberRooms/${roomId}/state`), ns));
                    }
                    toast('Yeni maç!');
                  }}
                  className="mt-5 w-full py-[12px] rounded-xl bg-amber-400 text-[#1b1202] font-[730] text-[14.5px]"
                >Yeniden Oyna</button>
                <button onClick={onExit} className="mt-[10px] w-full py-[10px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-[13px]">Lobiye dön</button>
              </div>
            </div>
          )}
        </div>

        {/* right panel */}
        <aside className="border-t lg:border-t-0 lg:border-l border-cyan-900/40 bg-[#0b1d27] flex flex-col min-h-[300px] lg:min-h-0 max-h-[48vh] lg:max-h-none">
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3 border-b border-white/[0.07]">
            <div className="text-[10.5px] sm:text-[11px] uppercase tracking-widest text-cyan-300/80">Oyuncular</div>
            {[0,1].map((side:number)=>{
              const pl = state.players[side as 0|1];
              const isMe = side===mySide;
              const name = isOffline
                ? (side===0 ? (playerName||'Sen') : 'JokerBot TR')
                : (onlinePlayers.find(p=>p.side===side)?.name || (side===0?'P1':'P2'));
              return (
                <div key={side} className={`mt-[10px] flex items-center gap-3 px-3 py-[10px] rounded-xl border ${pl.alive ? 'bg-white/[0.032] border-white/[0.07]' : 'bg-rose-500/8 border-rose-400/25'}`}>
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-[11px] font-[800] ${side===0 ? 'bg-[#eef3fb] text-[#18223a]' : 'bg-[#232b3d] text-[#cfe4ff] border border-sky-300/20'}`}>
                    {side===0 ? 'P1' : 'BT'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-[650] truncate text-zinc-100">{name} {isMe && <span className="text-[10px] text-amber-300 ml-1">SEN</span>}</div>
                    <div className="text-[11px] text-zinc-400">
                      {pl.alive ? '● Hayatta' : '✖ Elendi'} • 💣{pl.bombsMax} • 🔥{pl.bombPower} • 👟{pl.speed.toFixed(1)}
                    </div>
                  </div>
                  <div className={`text-[10px] px-[8px] py-[4px] rounded-full border ${pl.alive ? 'bg-emerald-400/14 text-emerald-200 border-emerald-400/25' : 'bg-zinc-700/30 text-zinc-300 border-white/[0.1]'}`}>
                    {state.winner===side ? 'KAZANDI' : pl.alive ? 'AKTİF' : '—'}
                  </div>
                </div>
              );
            })}
            <div className="mt-3 flex gap-2">
              <button onClick={()=>{
                const ns = newBomberState();
                setState(ns);
                if(!isOffline && roomId){
                  const db=getDbSafe(); if(db) fbSafe(()=> set(ref(db, `bomberRooms/${roomId}/state`), ns));
                }
                toast('Yeni harita');
              }}
                className="flex-1 py-[10px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[12.5px]">Sıfırla</button>
              <button onClick={()=> toast('WASD / Yön • Space = bomba')}
                className="px-3 py-[10px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[12.5px]">Yardım</button>
            </div>
          </div>

          <div className="flex-1 min-h-[150px] flex flex-col">
            {isOffline ? (
              <div className="px-3 sm:px-4 py-3 flex-1">
                <div className="text-[10.5px] sm:text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Bot – GameXLabTR AI</div>
                <div className="text-[12.5px] sm:text-[13px] text-zinc-300 leading-relaxed bg-white/[0.028] border border-white/[0.06] rounded-xl p-3">
                  • Kutu kırarak yol açar<br/>
                  • Bomba alev haritası ile kaçar (BFS)<br/>
                  • 420ms karar döngüsü – garantili<br/>
                  • Oyuncuya yaklaşınca tuzak kurar<br/>
                  • Sesler: WebAudio – dosya yok
                </div>
                <div className="mt-3 text-[11.5px] text-zinc-500">Telefon • Tablet • PC • Smart TV uyumlu.<br/>Kontroller: WASD / ok tuşları • Space bomba</div>
              </div>
            ) : (
              <>
                <div className="px-3 sm:px-4 py-2 text-[10.5px] sm:text-[11px] uppercase tracking-widest text-zinc-500 border-b border-white/[0.06]">
                  Sohbet • {roomId}
                </div>
                <div className="flex-1 overflow-auto px-3 sm:px-4 py-2 space-y-[5px] text-[12.5px] sm:text-[13px]">
                  {chat.map(c=> <div key={c.id}><b className="text-amber-200 mr-1">{c.name}:</b><span className="text-zinc-300">{c.text}</span></div>)}
                  {chat.length===0 && <div className="text-zinc-500">İlk mesajı sen yaz.</div>}
                </div>
                <div className="p-2.5 sm:p-3 border-t border-white/[0.07] flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'){
                      if(!chatInput.trim()||!roomId) return;
                      const db=getDbSafe(); if(!db) return;
                      const id='m_'+Math.random().toString(36).slice(2,8);
                      fbSafe(()=> set(ref(db, `bomberRooms/${roomId}/chat/${id}`), { name: playerName, text: chatInput.trim().slice(0,160), ts: Date.now(), pid: playerId }));
                      setChatInput('');
                    }}}
                    placeholder="Mesaj yaz…"
                    className="flex-1 bg-[#0a1620] border border-white/[0.12] rounded-lg px-3 py-[9px] text-[13px] outline-none focus:border-sky-400/60"
                  />
                  <button
                    onClick={()=>{
                      if(!chatInput.trim()||!roomId) return;
                      const db=getDbSafe(); if(!db) return;
                      const id='m_'+Math.random().toString(36).slice(2,8);
                      fbSafe(()=> set(ref(db, `bomberRooms/${roomId}/chat/${id}`), { name: playerName, text: chatInput.trim().slice(0,160), ts: Date.now(), pid: playerId }));
                      setChatInput('');
                    }}
                    className="px-3 rounded-lg bg-sky-500 text-white text-[12.5px] font-[620]"
                  >Gönder</button>
                </div>
              </>
            )}
          </div>

          <div className="px-3 sm:px-4 py-[9px] border-t border-white/[0.07] text-[10px] sm:text-[10.5px] text-zinc-500 leading-relaxed">
            GameXLabTR Bombardıman Laboratuvarı • 13×11 • WebAudio • Firebase RTDB • v1.0
          </div>
        </aside>
      </div>

      {/* mobile controls */}
      <div className="lg:hidden border-t border-cyan-900/35 bg-[#081a24]/96 backdrop-blur px-3 py-[10px] flex items-center justify-between gap-3 select-none touch-manipulation">
        <div className="grid grid-cols-3 gap-[6px] text-[11px] font-[700]">
          <div></div>
          <button
            onTouchStart={e=>{ e.preventDefault(); (window as any).__bu = setInterval(()=> window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'})),130); window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'})); }}
            onTouchEnd={()=> clearInterval((window as any).__bu)}
            className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.12] active:bg-white/[0.16]">↑</button>
          <div></div>
          <button
            onTouchStart={e=>{ e.preventDefault(); (window as any).__bl = setInterval(()=> window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft'})),130); window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft'})); }}
            onTouchEnd={()=> clearInterval((window as any).__bl)}
            className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.12] active:bg-white/[0.16]">←</button>
          <div className="w-11 h-11 rounded-xl bg-white/[0.025] border border-white/[0.06] flex items-center justify-center text-zinc-500">•</div>
          <button
            onTouchStart={e=>{ e.preventDefault(); (window as any).__br = setInterval(()=> window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'})),130); window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'})); }}
            onTouchEnd={()=> clearInterval((window as any).__br)}
            className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.12] active:bg-white/[0.16]">→</button>
          <div></div>
          <button
            onTouchStart={e=>{ e.preventDefault(); (window as any).__bd = setInterval(()=> window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown'})),130); window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown'})); }}
            onTouchEnd={()=> clearInterval((window as any).__bd)}
            className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.12] active:bg-white/[0.16]">↓</button>
          <div></div>
        </div>
        <div className="text-[10.5px] text-cyan-100/70 text-center leading-tight">D-Pad<br/>WASD</div>
        <button
          onTouchStart={e=>{ e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown',{key:' '})); }}
          onMouseDown={()=> window.dispatchEvent(new KeyboardEvent('keydown',{key:' '}))}
          className="w-[74px] h-[74px] rounded-[20px] bg-gradient-to-br from-amber-300 to-orange-500 text-[#1b1202] font-[850] text-[13px] shadow-lg shadow-orange-900/30 active:scale-[0.96] border border-amber-200/40"
        >💣<br/><span className="text-[10.5px]">BOMBA</span></button>
      </div>
    </div>
  );
}

/* ============================
   ROOT
   ============================ */
type GameMode = 'offline'|'online';

export default function App(){
  useEffect(()=>{
    const id='gx-bomber-style';
    if(!document.getElementById(id)){
      const s=document.createElement('style');
      s.id=id; s.textContent = BLOGGER_BOMBER_CSS;
      document.head.appendChild(s);
    }
    const unlock=()=>{ try{ ac()?.resume(); }catch{}; window.removeEventListener('pointerdown', unlock); window.removeEventListener('touchstart', unlock); };
    window.addEventListener('pointerdown', unlock, {once:true});
    window.addEventListener('touchstart', unlock, {once:true});
  },[]);

  const [screen, setScreen] = useState<'login'|'lobby'|'game'>('login');
  const [showHowTo, setShowHowTo] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode|null>(null);
  const [playerName, setPlayerName] = useState<string>(()=> localStorage.getItem('gx_bomber_name') || '');
  const [nameInput, setNameInput] = useState(playerName);
  const [roomId, setRoomId] = useState<string|null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string|null>(null);

  const playerId = useMemo(()=>{
    let p = localStorage.getItem('gx_bomber_pid');
    if(!p){ p='u_'+Math.random().toString(36).slice(2,9); localStorage.setItem('gx_bomber_pid', p); }
    return p;
  },[]);

  const toast = useCallback((m:string)=>{ setToastMsg(m); setTimeout(()=> setToastMsg(null), 1700); },[]);

  useEffect(()=>{
    const saved = localStorage.getItem('gx_bomber_name');
    const urlRoom = new URLSearchParams(location.search).get('room')?.toUpperCase() || '';
    if(saved){ setPlayerName(saved); setScreen('lobby'); if(urlRoom) setRoomCodeInput(urlRoom); }
  },[]);

  // garanti geçiş
  const enterOffline = useCallback(()=>{
    try{ ac()?.resume(); }catch{}
    setGameMode('offline');
    setRoomId(null);
    setScreen('game');
    toast('Çevrimdışı Bombardıman başlatıldı');
    playBombPlace();
  },[toast]);

  const enterOnlineCreate = useCallback(async ()=>{
    const code = 'B' + Math.floor(1000 + Math.random()*8999);
    setGameMode('online');
    setRoomId(code);
    setScreen('game');
    toast('Oda açılıyor… '+code);
    try{
      const db = getDbSafe(); if(!db) throw new Error('no db');
      const init = newBomberState();
      await fbSafe(()=> set(ref(db, `bomberRooms/${code}/state`), init));
      await fbSafe(()=> set(ref(db, `bomberRooms/${code}/players/${playerId}`), { name: playerName||'Oyuncu', side:0, joinedAt: Date.now() }));
      try{ onDisconnect(ref(db, `bomberRooms/${code}/players/${playerId}`)).remove(); }catch{}
      history.replaceState(null,'',`?room=${code}`);
      toast('Oda hazır: '+code);
    }catch{
      toast('Firebase bağlanamadı → offline');
      setTimeout(()=> enterOffline(), 1050);
    }
  }, [playerId, playerName, toast, enterOffline]);

  const enterOnlineJoin = useCallback(async (codeRaw:string)=>{
    const code = codeRaw.trim().toUpperCase();
    if(!code){ toast('Oda kodu gir'); return; }
    setGameMode('online');
    setRoomId(code);
    setScreen('game');
    toast('Odaya bağlanılıyor…');
    try{
      const db = getDbSafe(); if(!db) throw new Error('no db');
      const snap:any = await fbSafe(()=> get(ref(db, `bomberRooms/${code}/state`)));
      const exists = !!(snap && snap.exists && snap.exists());
      if(!exists){
        await fbSafe(()=> set(ref(db, `bomberRooms/${code}/state`), newBomberState()));
      }
      const pSnap:any = await fbSafe(()=> get(ref(db, `bomberRooms/${code}/players`)));
      const playersObj = pSnap?.val?.() || {};
      const usedSides:number[] = Object.values(playersObj).map((x:any)=> x.side ?? 0);
      const side:0|1 = usedSides.includes(0) ? 1 : 0;
      await fbSafe(()=> set(ref(db, `bomberRooms/${code}/players/${playerId}`), { name: playerName||'Misafir', side, joinedAt: Date.now() }));
      try{ onDisconnect(ref(db, `bomberRooms/${code}/players/${playerId}`)).remove(); }catch{}
      history.replaceState(null,'',`?room=${code}`);
      toast('Katıldın: '+code+' • '+(side===0?'P1':'P2'));
    }catch{
      toast('Katılım hatası → offline');
      setTimeout(()=> enterOffline(), 1000);
    }
  }, [playerId, playerName, toast, enterOffline]);

  const exitToLobby = useCallback(()=>{
    if(gameMode==='online' && roomId){
      const db=getDbSafe();
      if(db) fbSafe(()=> remove(ref(db, `bomberRooms/${roomId}/players/${playerId}`)));
    }
    setGameMode(null);
    setRoomId(null);
    setScreen('lobby');
    history.replaceState(null,'',location.pathname);
  }, [gameMode, roomId, playerId]);

  if(screen !== 'game'){
    const isLogin = screen==='login';
    return (
      <div className="bomber-root min-h-[100dvh] bg-[#07141c] text-zinc-100 relative overflow-hidden flex items-center justify-center px-4 sm:px-6">
        <style>{BLOGGER_BOMBER_CSS}</style>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 right-[-60px] w-[380px] sm:w-[560px] h-[380px] sm:h-[560px] rounded-full blur-[120px] sm:blur-[140px] opacity-[0.16]" style={{background:'radial-gradient(circle,#ffd37a 0%, #ff5a8e 46%, transparent 70%)'}} />
          <div className="absolute -bottom-28 left-[-60px] w-[340px] sm:w-[520px] h-[340px] sm:h-[520px] rounded-full blur-[110px] sm:blur-[130px] opacity-[0.12]" style={{background:'radial-gradient(circle,#34d39b 0%, #2aa8ff 46%, transparent 70%)'}} />
          <div className="absolute inset-0 opacity-[0.035]" style={{backgroundImage:'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize:'22px 22px'}} />
        </div>
        <div className="relative z-10 w-full max-w-[1020px] grid lg:grid-cols-[1.13fr_.87fr] gap-7 sm:gap-10 items-center">
          <div className="px-1">
            <div className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] tracking-widest uppercase text-amber-300/95 bg-amber-400/10 border border-amber-400/22 rounded-full px-3 py-[7px] mb-4 sm:mb-5">
              <span className="w-[7px] h-[7px] rounded-full bg-amber-400 animate-pulse" />
              GameXLabTR • Retro • WebAudio • Firebase
            </div>
            <h1 className="text-[36px] sm:text-[50px] md:text-[58px] font-[820] tracking-[-0.028em] leading-[0.92] text-zinc-50" style={{fontFamily:'ui-monospace,monospace'}}>
              GameXLabTR<br/><span className="text-[#ffcf6e]">Bombardıman</span><br/><span className="text-[24px] sm:text-[34px] md:text-[40px] text-zinc-300">Laboratuvarı</span>
            </h1>
            <p className="mt-4 sm:mt-5 text-[14px] sm:text-[15.5px] leading-relaxed text-zinc-400 max-w-[520px]">
              Profesyonel retro <b className="text-zinc-200">Bomberman</b> klonu. 13×11 piksel labirent, patlayan kutular, güçlendiriciler.
              <b className="text-zinc-200"> Çevrimdışı Bot + Firebase Realtime Multiplayer</b> hibrit.
              Telefon • Tablet • PC • Smart TV tam uyumlu.
            </p>
            <div className="mt-6 sm:mt-7 grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-[10px] sm:gap-3 max-w-[560px] text-[11.5px] sm:text-[12.5px] text-zinc-300">
              {[
                ['13×11 Labirent','Piksel retro'],
                ['WebAudio','0 .mp3'],
                ['TV Uyumlu','Full HD+']
              ].map(([a,b])=>(
                <div key={a} className="rounded-2xl bg-white/[0.032] border border-white/[0.075] px-3 py-3 sm:py-[14px]">
                  <div className="font-[650] text-zinc-100">{a}</div>
                  <div className="text-zinc-500 text-[11px] sm:text-[12px]">{b}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] sm:rounded-[28px] bg-[#0d222d]/[0.97] backdrop-blur-xl border border-white/[0.1] shadow-[0_22px_80px_rgba(0,0,0,0.55)] p-5 sm:p-[26px]">
            <div className="text-[11px] tracking-[0.18em] uppercase text-zinc-500">{isLogin ? 'Oyuncu Girişi' : 'Oyun Modu'}</div>
            <div className="text-[20px] sm:text-[22px] font-[730] mt-1 tracking-tight text-zinc-100">
              {isLogin ? 'Bombardıman Masasına katıl' : `Hoş geldin, ${playerName || 'Komutan'}`}
            </div>
            <div className="mt-4 sm:mt-5 space-y-[14px]">
              {isLogin ? (
                <>
                  <div>
                    <label className="text-[12px] text-zinc-400">Takma adın</label>
                    <input
                      value={nameInput}
                      onChange={e=>setNameInput(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter'){ const nn=nameInput.trim()||'Komutan'; localStorage.setItem('gx_bomber_name', nn); setPlayerName(nn); setScreen('lobby'); }}}
                      placeholder="ör. GMX / Bomber"
                      maxLength={18}
                      autoFocus
                      className="mt-[7px] w-full bg-[#0b1620] border border-white/[0.13] rounded-xl px-4 py-[13px] sm:py-[14px] text-[15px] sm:text-[16px] outline-none focus:border-amber-400/70"
                    />
                  </div>
                  <button
                    onClick={()=>{
                      const nn = nameInput.trim() || 'Komutan';
                      localStorage.setItem('gx_bomber_name', nn);
                      setPlayerName(nn);
                      setScreen('lobby');
                    }}
                    className="w-full py-[13px] sm:py-[14px] rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 text-[#1b1202] font-[740] text-[15px] sm:text-[16px] shadow-lg shadow-orange-900/25 active:scale-[0.985]"
                  >
                    Devam Et →
                  </button>
                  <p className="text-[11px] sm:text-[11.5px] text-zinc-500 leading-relaxed">Offline mod internet gerektirmez. TV kumandası / dokunmatik / klavye hepsi destekli.</p>
                </>
              ) : (
                <>
                  <button onClick={enterOffline}
                    className="w-full py-[13px] sm:py-[14px] rounded-xl bg-emerald-400 text-emerald-950 font-[750] text-[15px] sm:text-[16px] shadow-lg shadow-emerald-900/20 hover:brightness-[1.04] active:scale-[0.985]">
                    🤖 Bota Karşı Oyna (Çevrimdışı)
                  </button>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <button onClick={enterOnlineCreate}
                      className="py-[11px] sm:py-[12px] rounded-xl bg-sky-500 text-white font-[670] text-[13.5px] sm:text-[14px] hover:bg-sky-400 active:scale-[0.985]">
                      Multiplayer (Oda Kodu ile)
                    </button>
                    <button onClick={()=>setShowHowTo(true)}
                      className="py-[11px] sm:py-[12px] rounded-xl bg-white/[0.065] hover:bg-white/[0.12] border border-white/[0.12] font-[600] text-[13.5px] sm:text-[14px] active:scale-[0.985]">
                      Nasıl Oynanır?
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={roomCodeInput}
                      onChange={e=>setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="Oda kodu: B4821"
                      maxLength={8}
                      className="flex-1 bg-[#0b1620] border border-white/[0.13] rounded-xl px-3 py-[11px] text-[14px] tracking-wider outline-none focus:border-sky-400/65 uppercase"
                    />
                    <button onClick={()=>enterOnlineJoin(roomCodeInput)}
                      className="px-[15px] py-[11px] rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.12] text-[13px] font-[620] active:scale-95">
                      Katıl
                    </button>
                  </div>
                  <p className="text-[11px] sm:text-[11.5px] text-zinc-500 leading-relaxed">
                    Firebase Realtime DB • Oda linki: <code className="text-zinc-300">?room=KOD</code> • Bağlantı koparsa otomatik offline bota düşer.
                  </p>
                  <button onClick={()=>{ localStorage.removeItem('gx_bomber_name'); setPlayerName(''); setNameInput(''); setScreen('login'); }}
                    className="text-[11px] text-zinc-400 underline underline-offset-2 hover:text-zinc-200">
                    İsim değiştir
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {showHowTo && <HowToModal onClose={()=>setShowHowTo(false)} />}
        {toastMsg && <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 bg-[#142030] border border-white/[0.14] shadow-2xl px-4 py-[11px] rounded-xl text-[13px] text-zinc-100 z-[10070] max-w-[92vw] text-center">{toastMsg}</div>}
      </div>
    );
  }

  return (
    <div className="bomber-root">
      <style>{BLOGGER_BOMBER_CSS}</style>
      <BomberGameView
        key={(gameMode||'x')+'-'+(roomId||'local')}
        mode={(gameMode as GameMode) || 'offline'}
        playerName={playerName || 'Komutan'}
        playerId={playerId}
        roomId={roomId}
        onExit={exitToLobby}
        toast={toast}
      />
      {toastMsg && <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 bg-[#142030] border border-white/[0.14] shadow-2xl px-4 py-[11px] rounded-xl text-[13px] text-zinc-100 z-[10070] max-w-[92vw] text-center">{toastMsg}</div>}
    </div>
  );
}