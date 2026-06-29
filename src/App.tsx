// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ========== Firebase – SENİN ORİJİNAL KODUN ========== */
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, push, get, onValue, remove, onDisconnect } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

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

let fbApp:any=null, db:any=null;
try{
  fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getDatabase(fbApp);
  try{ getAnalytics(fbApp); }catch{}
}catch(e){ db=null; }

/* ========== WebAudio ========== */
let AC:any=null;
const ac=()=>{ try{ if(!AC) AC=new (window.AudioContext||(window as any).webkitAudioContext)(); if(AC.state==='suspended') AC.resume(); return AC;}catch{return null}};
const beep=(f:number,t:number,v=0.2,ty:OscillatorType='square',d=0)=>{ const c=ac(); if(!c) return; const o=c.createOscillator(),g=c.createGain(); o.type=ty; o.frequency.setValueAtTime(f, c.currentTime+d); g.gain.setValueAtTime(0.0001,c.currentTime+d); g.gain.linearRampToValueAtTime(v,c.currentTime+d+0.014); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d+t); o.connect(g); g.connect(c.destination); o.start(c.currentTime+d); o.stop(c.currentTime+d+t+0.02); };
const sfxStep=()=>beep(410+Math.random()*80,0.05,0.055);
const sfxBomb=()=>{ beep(880,0.075,0.16); beep(1320,0.075,0.13,'square',0.062); };
const sfxBoom=()=>{ const c=ac(); if(!c) return; const t=c.currentTime; const o=c.createOscillator(), g=c.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(108,t); o.frequency.exponentialRampToValueAtTime(30,t+0.33); g.gain.setValueAtTime(0.36,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.35); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+0.37); };
const sfxPower=()=> [523,659,784,1047].forEach((f,i)=>beep(f,0.11,0.2,'triangle',i*0.069));
const sfxWin =()=> [523,659,784,988,1047,1319].forEach((f,i)=>beep(f,0.13,0.23, i%2?'square':'triangle', i*0.13));
const sfxLose=()=> [440,370,311,220].forEach((f,i)=>beep(f,0.20,0.16,'sawtooth', i*0.19));

/* ========== OYUN ========== */
const COLS=13, ROWS=11;
type Tile = 0|1|2;
const LEVELS = [
  {enemies:2, speed:760, crates:0.52, name:'Orman Kenarı'},
  {enemies:3, speed:620, crates:0.60, name:'Tuğla Fabrikası'},
  {enemies:4, speed:520, crates:0.66, name:'Liman Deposu'},
  {enemies:5, speed:440, crates:0.70, name:'Volkan Tüneli'},
  {enemies:6, speed:370, crates:0.74, name:'Nükleer Çekirdek'},
];

function makeMap(level:number){
  const lv = LEVELS[Math.min(level-1,4)];
  const m:number[][] = Array.from({length:ROWS},()=> Array(COLS).fill(0));
  for(let y=0;y<ROWS;y++){ for(let x=0;x<COLS;x++){
    if(x===0||y===0||x===COLS-1||y===ROWS-1) m[y][x]=1;
    else if(x%2===0 && y%2===0) m[y][x]=1;
  }}
  const safe = new Set(['1,1','2,1','1,2',`${COLS-2},${ROWS-2}`,`${COLS-3},${ROWS-2}`,`${COLS-2},${ROWS-3}`]);
  for(let y=1;y<ROWS-1;y++){ for(let x=1;x<COLS-1;x++){
    if(m[y][x]!==0) continue;
    if(safe.has(`${x},${y}`)) continue;
    if(Math.random()<lv.crates) m[y][x]=2;
  }}
  const crates:{x:number;y:number}[]=[];
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) if(m[y][x]===2) crates.push({x,y});
  const door = crates.length ? crates[Math.floor(Math.random()*crates.length)] : {x:6,y:5};
  return {map:m, door, lv};
}

export default function App(){
  // blogger css inject + key blocker
  useEffect(()=>{
    const css = `
#navbar-iframe,.navbar,#Attribution1,.attribution,
#sidebar-wrapper,.sidebar,#header-wrapper,.header,#footer-wrapper,footer,
.post-footer,.blog-pager,#comments,.comments,header,nav,aside,
#main-wrapper,.main,#outer-wrapper,#content-wrapper,.post,.blog-posts,.widget
{display:none !important; visibility:hidden !important; height:0 !important; overflow:hidden !important; margin:0!important; padding:0!important}
html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#07141c!important;height:100%!important;width:100%!important;font-family:Inter,ui-monospace,system-ui,sans-serif!important;color:#e6f4ff}
#root{position:fixed!important;inset:0!important;z-index:10000!important;width:100vw!important;height:100dvh!important;background:#07141c!important;overflow:hidden!important}
* { box-sizing:border-box; -webkit-tap-highlight-color:transparent }
button{font-family:inherit;cursor:pointer}
@keyframes bombPulse{0%{transform:scale(1)}50%{transform:scale(1.07)}100%{transform:scale(1)}}
@keyframes flameFlicker{0%{opacity:1}100%{opacity:.9}}
@keyframes pistiPop{0%{transform:scale(.55);opacity:0}18%{transform:scale(1.18);opacity:1}55%{transform:scale(1)}100%{opacity:0}}
@keyframes floatIn{0%{transform:translateY(16px);opacity:0}100%{transform:translateY(0);opacity:1}}
.pixelated{image-rendering:pixelated;image-rendering:crisp-edges}
`;
    const s=document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    const blocker = (e:KeyboardEvent)=>{
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Spacebar','Space','PageUp','PageDown'].includes(e.key)){
        e.preventDefault();
        e.stopPropagation();
        // @ts-ignore
        e.stopImmediatePropagation?.();
        return false;
      }
    };
    window.addEventListener('keydown', blocker, {capture:true});
    document.body.style.overscrollBehavior='none';
    document.documentElement.style.overscrollBehavior='none';
    const unlock=()=>{ try{ ac()?.resume(); }catch{}; window.removeEventListener('pointerdown',unlock); window.removeEventListener('touchstart',unlock); window.removeEventListener('keydown',unlock); };
    window.addEventListener('pointerdown',unlock,{once:true});
    window.addEventListener('touchstart',unlock,{once:true});
    window.addEventListener('keydown',unlock,{once:true});
    return ()=>{ window.removeEventListener('keydown',blocker,{capture:true} as any); s.remove(); };
  },[]);

  // app state
  const [screen, setScreen] = useState<'login'|'lobby'|'game'|'howto'|'leader'>('login');
  const [playerName, setPlayerName] = useState(()=> localStorage.getItem('gx_bomber_name') || '');
  const [nameInput, setNameInput] = useState(playerName);
  const playerId = useMemo(()=>{ let p=localStorage.getItem('gx_bomber_pid'); if(!p){ p='u_'+Math.random().toString(36).slice(2,9); localStorage.setItem('gx_bomber_pid',p);} return p; },[]);
  const [mode, setMode] = useState<'offline'|'online'|null>(null);
  const [roomId, setRoomId] = useState<string|null>(null);
  const [roomInput, setRoomCodeInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string|null>(null);
  const toast = useCallback((m:string)=>{ setToastMsg(m); setTimeout(()=>setToastMsg(null),1700); },[]);

  // game state
  const [level, setLevel] = useState(1);
  const [gs, setGs] = useState<any>(null);
  const gsRef = useRef<any>(gs);
  useEffect(()=>{ gsRef.current = gs; }, [gs]);

  // boot
  useEffect(()=>{
    const saved = localStorage.getItem('gx_bomber_name');
    const urlRoom = new URLSearchParams(location.search).get('room') || '';
    if(saved){ setPlayerName(saved); setScreen('lobby'); if(urlRoom) setRoomCodeInput(urlRoom.toUpperCase()); }
  },[]);

  // start game
  const startGame = useCallback((m:'offline'|'online', rid:string|null, lvl=1, carry:any=null)=>{
    // GARANTİ GEÇİŞ
    setMode(m);
    setRoomId(rid);
    const { map, door } = makeMap(lvl);
    const lvCfg = LEVELS[Math.min(lvl-1,4)];
    // enemies
    const spawns = [
      {x:COLS-2,y:1},{x:1,y:ROWS-2},{x:COLS-2,y:ROWS-2},
      {x:Math.floor(COLS/2),y:1},{x:1,y:Math.floor(ROWS/2)},{x:COLS-2,y:Math.floor(ROWS/2)}
    ];
    const enemies = [];
    for(let i=0;i<lvCfg.enemies;i++){
      const sp = spawns[i % spawns.length];
      if(map[sp.y]) map[sp.y][sp.x]=0;
      enemies.push({ id:'e'+i, x:sp.x, y:sp.y, alive:true, next:0, speed: lvCfg.speed });
    }
    const newState = {
      level: lvl,
      map,
      door: {...door, revealed:false},
      player: {
        x:1, y:1, alive:true,
        lives: carry?.lives ?? 3,
        bombs: carry?.bombs ?? 1,
        fire: carry?.fire ?? 1,
        speed: carry?.speed ?? 1,
        score: carry?.score ?? 0,
        lastMove:0
      },
      enemies,
      bombs: [],
      explosions: [],
      powerups: [],
      over: false,
      won: false,
      message: `Bölüm ${lvl} – ${lvCfg.name}`
    };
    setGame(newState);
    setScreen('game');
    toast(m==='offline' ? `Bot maçı • Bölüm ${lvl}` : `Oda ${rid} • Bölüm ${lvl}`);
    try{ sfxBombPlace(); }catch{}
  }, [toast]);

  const startOffline = useCallback(()=> startGame('offline', null, 1, null), [startGame]);

  // online create
  const createRoom = useCallback(async ()=>{
    const code = 'B' + Math.floor(1000 + Math.random()*8999);
    // GARANTİ: önce ekrana geç
    startGame('online', code);
    const d = getDbSafe();
    if(d){
      try{
        const st = gameRef.current;
        await set(ref(d, `bomberRooms/${code}/state`), st);
        await set(ref(d, `bomberRooms/${code}/players/${playerId}`), { name: playerName||'Oyuncu', side:0, ts:Date.now() });
        try{ onDisconnect(ref(d, `bomberRooms/${code}/players/${playerId}`)).remove(); }catch{}
        history.replaceState(null,'',`?room=${code}`);
        toast('Oda hazır: '+code);
        return;
      }catch{}
    }
    toast('Firebase bağlanamadı – offline devam');
  }, [playerId, playerName, startGame, toast]);

  // join
  const joinRoom = useCallback(async (codeRaw:string)=>{
    const code = codeRaw.trim().toUpperCase();
    if(!code){ toast('Kod gir'); return; }
    // GARANTİ GEÇİŞ
    setMode('online');
    setRoomId(code);
    setScreen('game');
    const db = getDbSafe();
    let st:any = null;
    if(db){
      try{
        const snap:any = await get(ref(db, `bomberRooms/${code}/state`));
        if(snap.exists()) st = snap.val();
      }catch{}
    }
    if(!st) st = (()=>{ const g:any = {}; const mm = makeMap(1); g.level=1; g.map=mm.map; g.door={...mm.door, revealed:false}; g.player={x:COLS-2,y:ROWS-2,alive:true,lives:3,bombs:1,fire:1,speed:1,score:0,lastMove:0}; g.enemies=[]; g.bombs=[]; g.explosion

s=[]; g.powerups=[]; g.over=false; g.won=false; g.message=''; return g; })();
    setGame(st);
    toast('Katıldın: '+code);
    if(db){
      try{
        await set(ref(db, `bomberRooms/${code}/players/${playerId}`), { name: playerName||'Misafir', side:1, joinedAt: Date.now() });
        try{ onDisconnect(ref(db, `bomberRooms/${code}/players/${playerId}`)).remove(); }catch{}
        // listen state
        onValue(ref(db, `bomberRooms/${code}/state`), s=>{ const v=s.val(); if(v) setGame(v); });
      }catch{}
    }
  }, [playerId, playerName, toast]);

  // game loop
  useEffect(()=>{
    if(screen!=='game' || !game) return;
    let raf=0;
    let last=performance.now();
    const loop=(now:number)=>{
      raf=requestAnimationFrame(loop);
      if(now-last < 46) return;
      last=now;
      setGame((st:any)=>{
        if(!st || st.gameOver) return st;
        const tnow=Date.now();
        // expire explosions
        let explosions = st.explosions.filter((e:any)=> tnow - e.t < 520);
        let bombs=[...st.bombs];
        let map = st.map.map((r:any)=>[...r]);
        let player = {...st.player};
        let enemies = st.enemies.map((en:any)=>({...en}));
        let powerups=[...st.powerups];
        let door = {...st.door};
        let exploded=false;

        const due = bombs.filter((b:any)=> tnow >= b.explodeAt);
        for(const bomb of due){
          bombs = bombs.filter((x:any)=> x.id !== bomb.id);
          exploded=true;
          const cells:{x:number;y:number}[]=[{x:bomb.x,y:bomb.y}];
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
            for(let s=1;s<=bomb.fire;s++){
              const cx=bomb.x+dx*s, cy=bomb.y+dy*s;
              if(cx<0||cy<0||cx>=COLS||cy>=ROWS) break;
              const tile = map[cy][cx];
              if(tile===1) break;
              cells.push({x:cx,y:cy});
              if(tile===2){
                map[cy][cx]=0;
                if(door.x===cx && door.y===cy) door.revealed=true;
                if(Math.random()<0.32){
                  const tps=['bomb','fire','fire','speed'];
                  powerups.push({x:cx,y:cy,type:tps[Math.floor(Math.random()*tps.length)], id:'pu'+cx+'_'+cy});
                }
                break;
              }
            }
          });
          cells.forEach(c=> explosions.push({x:c.x,y:c.y,t:tnow}));
          // damage
          if(player.alive && cells.some(c=> c.x===player.x && c.y===player.y)){
            player.alive=false;
          }
          enemies.forEach((en:any)=>{
            if(en.alive && cells.some(c=> c.x===en.x && c.y===en.y)){
              en.alive=false;
              player.score = (player.score||0)+150;
            }
          });
          // chain
          bombs.forEach((b:any)=>{
            if(cells.some(c=> c.x===b.x && c.y===b.y) && b.explodeAt > tnow+60){
              b.explodeAt = tnow+55;
            }
          });
        }
        if(exploded){ try{ sfxBoom(); }catch{} }

        // win check
        let gameOver = st.gameOver;
        let won = st.won;
        const enemiesAlive = enemies.filter((e:any)=> e.alive).length;
        // level clear is handled in move handler (door step)
        return {
          ...st,
          map,
          player,
          enemies,
          bombs,
          explosions,
          powerups,
          door,
          gameOver,
          won,
          tick:(st.tick||0)+1
        };
      });
    };
    raf = requestAnimationFrame(loop);
    return ()=> cancelAnimationFrame(raf);
  }, [screen, game?.gameOver]);

  // bot – GARANTİLİ
  const botLock = useRef(false);
  useEffect(()=>{
    if(mode!=='offline') return;
    if(!game || game.gameOver) return;
    const id = window.setInterval(()=>{
      const g = gameRef.current;
      if(!g || g.gameOver) return;
      if(botLock.current) return;
      botLock.current = true;
      try{
        const now = Date.now();
        let changed = false;
        const ng = {
          ...g,
          enemies: g.enemies.map((e:any)=> ({...e})),
          bombs: [...g.bombs],
          powerups: [...g.powerups],
          map: g.map.map((r:any)=> [...r]),
          player: {...g.player}
        };
        for(const en of ng.enemies){
          if(!en.alive) continue;
          if(now < (en.nextMove||0)) continue;
          // danger
          const danger = new Set<string>();
          ng.explosions.forEach((ex:any)=> danger.add(ex.x+','+ex.y));
          ng.bombs.forEach((b:any)=>{
            danger.add(b.x+','+b.y);
            [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
              for(let s=1;s<=b.fire;s++){
                const cx=b.x+dx*s, cy=b.y+dy*s;
                if(cx<0||cy<0||cx>=COLS||cy>=ROWS) break;
                if(ng.map[cy][cx]===1) break;
                danger.add(cx+','+cy);
                if(ng.map[cy][cx]===2) break;
              }
            });
          });
          const moves:any[]=[];
          [[0,-1,'up'],[0,1,'down'],[-1,0,'left'],[1,0,'right']].forEach(([dx,dy,dir])=>{
            const nx=en.x+dx, ny=en.y+dy;
            if(nx<0||ny<0||nx>=COLS||ny>=ROWS) return;
            const tile = ng.map[ny][nx];
            if(tile===1||tile===2) return;
            if(ng.bombs.some((b:any)=> b.x===nx && b.y===ny)) return;
            const safe = !danger.has(nx+','+ny);
            let score = Math.random()*0.2;
            if(safe) score += danger.has(en.x+','+en.y) ? 4.5 : 0.3;
            else score -= 3;
            const pl = ng.player;
            if(pl.alive){
              const dist = Math.abs(nx-pl.x)+Math.abs(ny-pl.y);
              score += (20-dist)*0.055;
            }
            if(ng.powerups.some((p:any)=> p.x===nx && p.y===ny)) score += 1.9;
            moves.push({dx,dy,nx,ny,score,safe});
          });
          if(moves.length){
            moves.sort((a,b)=> b.score-a.score);
            en.x = moves[0].nx;
            en.y = moves[0].ny;
            changed = true;
          }
          en.nextMove = now + en.speedMs + Math.floor(Math.random()*80);
          // bomb?
          const pl = ng.player;
          let wantBomb = false;
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
            const cx=en.x+dx, cy=en.y+dy;
            if(ng.map[cy]?.[cx]===2 && Math.random()<0.66) wantBomb=true;
          });
          if(pl.alive){
            if(pl.x===en.x && Math.abs(pl.y-en.y) <= 2) wantBomb = true;
            if(pl.y===en.y && Math.abs(pl.x-en.x) <= 2) wantBomb = true;
          }
          if(wantBomb && !ng.bombs.some((b:any)=> b.x===en.x && b.y===en.y)){
            ng.bombs.push({
              id:'eb'+Date.now()+Math.random().toString(36).slice(2,4),
              x: en.x, y: en.y,
              owner: 1,
              fire: 1,
              explodeAt: Date.now()+2500,
              plantedAt: Date.now()
            });
            changed = true;
            try{ sfxBombPlace(); }catch{}
          }
        }
        if(changed) setGame((prev:any)=> prev ? {...ng, tick:(prev.tick||0)+1} : prev);
      } finally {
        setTimeout(()=> botLock.current=false, 75);
      }
    }, 420);
    return ()=> clearInterval(id);
  }, [mode, game?.gameOver]);

  // move / bomb
  const doMove = useCallback((dx:number, dy:number)=>{
    if(!game || game.gameOver) return;
    const p = game.player;
    if(!p.alive) return;
    const now = Date.now();
    // @ts-ignore
    if((doMove as any)._last && now - (doMove as any)._last < Math.max(85, 165 - p.speed*26)) return;
    // @ts-ignore
    (doMove as any)._last = now;
    setGame((g:any)=>{
      if(!g) return g;
      const nx = g.player.x + dx;
      const ny = g.player.y + dy;
      if(nx<0||ny<0||nx>=COLS||ny>=ROWS) return g;
      const t = g.map[ny][nx];
      if(t===1 || t===2) return g;
      if(g.bombs.some((b:any)=> b.x===nx && b.y===ny)) return g;
      const ng = {...g, player:{...g.player, x:nx, y:ny}};
      // powerup
      const pi = ng.powerups.findIndex((pu:any)=> pu.x===nx && pu.y===ny);
      if(pi>=0){
        const pu = ng.powerups.splice(pi,1)[0];
        if(pu.type==='bomb') ng.player.bombs = Math.min(6, ng.player.bombs+1);
        if(pu.type==='fire') ng.player.fire = Math.min(6, ng.player.fire+1);
        if(pu.type==='speed') ng.player.speed = Math.min(5.2, ng.player.speed+0.78);
        try{ sfxPower(); }catch{}
      }
      // door
      if(ng.door.revealed && nx===ng.door.x && ny===ng.door.y){
        const enemiesAlive = ng.enemies.filter((e:any)=> e.alive).length;
        if(enemiesAlive===0){
          // next level
          const lvl = (ng.level||1) + 1;
          if(lvl > 5){
            // win game
            const finalScore = (ng.player.score||0) + 1500 + ng.player.lives*250;
            try{
              saveScore(playerName||'Anon', finalScore, 5);
              playWin();
            }catch{}
            return {...ng, gameOver:true, won:true};
          }
          const carry = {
            lives: ng.player.lives,
            bombs: ng.player.bombs,
            fire: ng.player.fire,
            speed: ng.player.speed,
            score: (ng.player.score||0)+500
          };
          // @ts-ignore
          const next = newGameState(lvl, carry);
          // @ts-ignore
          next.level = lvl;
          try{ sfxPower(); }catch{}
          setTimeout(()=> toast(`Bölüm ${lvl} – ${LEVELS[lvl-1]?.name || ''}`), 40);
          return next;
        }
      }
      try{ sfxStep(); }catch{}
      return ng;
    });
  }, [game]);

  const doBomb = useCallback(()=>{
    if(!game || game.gameOver) return;
    const p = game.player;
    if(!p.alive) return;
    setGame((g:any)=>{
      if(!g) return g;
      const active = g.bombs.filter((b:any)=> b.owner===0).length;
      if(active >= p.bombs) return g;
      if(g.bombs.some((b:any)=> b.x===p.x && b.y===p.y)) return g;
      const now = Date.now();
      try{ sfxBombPlace(); }catch{}
      return {
        ...g,
        bombs: [...g.bombs, { id:'b'+now, x:p.x, y:p.y, owner:0, fire:p.fire, explodeAt: now+2500, plantedAt: now }]
      };
    });
  }, [game]);

  // keyboard – with preventDefault
  useEffect(()=>{
    if(screen!=='game') return;
    const h = (e:KeyboardEvent)=>{
      const block = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Spacebar','Space','w','a','s','d','W','A','S','D'];
      if(block.includes(e.key) || block.includes(e.code)){
        e.preventDefault();
        e.stopPropagation();
      }
      if(e.repeat) return;
      if(e.key===' ' || e.code==='Space'){ doBomb(); return; }
      const map:any = {ArrowUp:[0,-1], w:[0,-1], W:[0,-1], ArrowDown:[0,1], s:[0,1], S:[0,1], ArrowLeft:[-1,0], a:[-1,0], A:[-1,0], ArrowRight:[1,0], d:[1,0], D:[1,0]};
      const mv = map[e.key];
      if(mv) doMove(mv[0], mv[1]);
    };
    window.addEventListener('keydown', h, {capture:true});
    return ()=> window.removeEventListener('keydown', h, {capture:true} as any);
  }, [screen, doMove, doBomb]);

  // player death respawn / game over
  useEffect(()=>{
    if(!game) return;
    const p = game.player;
    if(!p.alive && !game.gameOver){
      const t = setTimeout(()=>{
        setGame((g:any)=>{
          if(!g) return g;
          if(g.player.lives > 1){
            return {...g, player:{...g.player, alive:true, x:1, y:1, lives: g.player.lives-1 }, bombs: g.bombs.filter((b:any)=> Math.abs(b.x-1)+Math.abs(b.y-1) > 1) };
          } else {
            try{ sfxLose(); }catch{}
            saveScore(playerName||'Anon', g.player.score||0, g.level||1);
            return {...g, gameOver:true, won:false};
          }
        });
      }, 800);
      return ()=> clearTimeout(t);
    }
  }, [game?.player?.alive, game?.gameOver, playerName]);

  /* ===== RENDER ===== */

  const [showHowTo, setShowHowTo] = useState(false);
  const [showLeader, setShowLeader] = useState(false);

  if(screen==='howto' || showHowTo){
    return (
      <div className="min-h-screen bg-[#07141b] text-zinc-100 flex items-center justify-center p-4" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
        <div className="w-full max-w-[760px] rounded-[24px] bg-[#0f2230]/95 border border-white/[0.1] shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between" style={{fontFamily:'ui-monospace,monospace'}}>
            <div><div className="text-[11px] tracking-widest text-amber-300 uppercase">GameXLabTR</div>
            <div className="text-[20px] font-[750]">Bombardıman – Nasıl Oynanır?</div></div>
            <button onClick={()=>{ setShowHowTo(false); setScreen('lobby'); }} className="px-3 py-[7px] rounded-lg bg-white/[0.06]">Kapat ✕</button>
          </div>
          <div className="p-5 text-[14px] leading-relaxed text-zinc-300 space-y-4">
            <p><b>Yön tuşları / WASD</b> – hareket • <b>Boşluk (Space)</b> – bomba bırak</p>
            <p>• Bomba 2.5 sn sonra <b>+</b> şeklinde patlar.<br/>
               • Taş duvar patlamaz, ahşap kutu patlar.<br/>
               • Kutulardan: 💣 Bomba+, 🔥 Menzil+, 👟 Hız+ çıkar.<br/>
               • 5 bölüm – her bölüm düşman hızı ve sayısı artar.<br/>
               • Tüm düşmanları temizle → gizli kapı açılır → kapıya gir → sonraki bölüm.</p>
            <p className="text-[12.5px] text-emerald-300 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2">
              Blogger uyumlu: Yön tuşları ve Space tuşu <code>e.preventDefault()</code> ile sayfa kaydırmasını engeller.
            </p>
            <div className="text-right">
              <button onClick={()=>{ setShowHowTo(false); setScreen('lobby'); }} className="px-5 py-[10px] rounded-xl bg-amber-400 text-[#1b1202] font-[700]">Anladım</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if(screen==='login' || screen==='lobby'){
    const isLogin = screen==='login';
    return (
      <div className="min-h-[100dvh] w-screen bg-[#07141b] text-zinc-100 relative overflow-hidden flex items-center justify-center px-4"
           style={{fontFamily:'Inter, system-ui, ui-monospace, monospace'}}>
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
             style={{backgroundImage:'linear-gradient(#7feaff 1px,transparent 1px),linear-gradient(90deg,#7feaff 1px,transparent 1px)',backgroundSize:'22px 22px'}}/>
        <div className="relative z-10 w-full max-w-[980px] grid lg:grid-cols-[1.15fr_.85fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-amber-300/95 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-[7px] mb-4"
                 style={{fontFamily:'ui-monospace,monospace'}}>
              <span className="w-[7px] h-[7px] bg-amber-400 rounded-full animate-pulse" />
              GameXLabTR • Three.js • Cannon-es • Firebase
            </div>
            <h1 className="text-[40px] sm:text-[54px] font-[800] tracking-[-0.028em] leading-[0.92] text-zinc-50" style={{fontFamily:'ui-monospace,monospace'}}>
              GameXLabTR<br/>
              <span className="text-[#ffcc6e]">Bombardıman</span><br/>
              <span className="text-[26px] sm:text-[32px] text-zinc-300">Laboratuvarı</span>
            </h1>
            <p className="mt-4 text-[14.5px] leading-relaxed text-zinc-400 max-w-[500px]">
              Retro piksel <b className="text-zinc-200">Bomberman</b> – 5 bölüm, Firebase Realtime çok oyunculu + offline bot,
              Web Audio API ses efektleri, Blogger tam ekran <b>z-index:10000</b>.
            </p>
            <div className="mt-5 text-[12px] text-zinc-400 flex flex-wrap gap-2">
              <span className="px-3 py-[5px] rounded-full bg-white/[0.04] border border-white/[0.08]">13×11</span>
              <span className="px-3 py-[5px] rounded-full bg-white/[0.04] border border-white/[0.08]">5 Bölüm</span>
              <span className="px-3 py-[5px] rounded-full bg-white/[0.04] border border-white/[0.08]">WebAudio</span>
              <span className="px-3 py-[5px] rounded-full bg-white/[0.04] border border-white/[0.08]">600×400</span>
            </div>
          </div>

          <div className="rounded-[26px] bg-[#0f2230]/[0.965] backdrop-blur-xl border border-white/[0.1] shadow-[0_20px_70px_rgba(0,0,0,0.55)] p-[22px] sm:p-[26px]">
            <div className="text-[11px] tracking-[0.18em] uppercase text-zinc-500">{isLogin ? 'Oyuncu Girişi' : 'Oyun Modu'}</div>
            <div className="text-[20px] font-[720] mt-1 text-zinc-100">{isLogin ? 'Bombardıman’a katıl' : `Hoş geldin, ${playerName}`}</div>
            <div className="mt-4 space-y-3">
              {isLogin ? (
                <>
                  <input
                    value={nameInput}
                    onChange={e=>setNameInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'){ const nn=nameInput.trim()||'Komutan'; localStorage.setItem('gx_bomber_name', nn); setPlayerName(nn); setScreen('lobby'); }}}
                    placeholder="Takma adın…"
                    className="w-full bg-[#0b1620] border border-white/[0.13] rounded-xl px-4 py-[13px] text-[15px] outline-none focus:border-amber-400/70 text-zinc-100"
                    autoFocus
                  />
                  <button
                    onClick={()=>{ const nn=nameInput.trim()||'Komutan'; localStorage.setItem('gx_bomber_name', nn); setPlayerName(nn); setScreen('lobby'); }}
                    className="w-full py-[13px] rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 text-[#1b1202] font-[720] text-[15px]"
                  >Devam Et →</button>
                </>
              ) : (
                <>
                  <button
                    onClick={()=>{
                      // GARANTİ GEÇİŞ – BOTA KARŞI
                      const g = newGameState(1);
                      setGame(g);
                      setMode('offline');
                      setRoomId(null);
                      setScreen('game');
                      setTimeout(()=>{ try{ sfxBombPlace(); }catch{} }, 80);
                    }}
                    className="w-full py-[13px] rounded-xl bg-emerald-400 text-emerald-950 font-[750] text-[15px] hover:brightness-105 active:scale-[0.985]"
                  >🤖 Bota Karşı Oyna (Çevrimdışı)</button>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={async ()=>{
                        // Multiplayer – Oda Kodu ile
                        const code = 'B' + Math.floor(1000+Math.random()*8999);
                        // GARANTİ: önce ekrana geç
                        setMode('online');
                        setRoomId(code);
                        const g = newGameState(1);
                        setGame(g);
                        setScreen('game');
                        const db = getDb();
                        if(db){
                          try{
                            await set(ref(db, `bomberRooms/${code}/state`), g);
                            await set(ref(db, `bomberRooms/${code}/players/${playerId}`), {name: playerName, side:0, ts:Date.now()});
                          }catch{}
                        }
                      }}
                      className="py-[11px] rounded-xl bg-sky-500 text-white font-[650] text-[13.5px] hover:bg-sky-400"
                    >Multiplayer (Oda Kodu ile)</button>
                    <button onClick={()=>setShowHowTo(true)}
                      className="py-[11px] rounded-xl bg-white/[0.065] border border-white/[0.12] font-[600] text-[13.5px] text-zinc-100">Nasıl Oynanır?</button>
                  </div>
                  <button onClick={()=>setScreen('leader' as any)}
                    className="w-full py-[11px] rounded-xl bg-white/[0.045] border border-white/[0.1] text-[13px]">🏆 Liderlik Tablosu</button>

                  <div className="flex gap-2">
                    <input
                      value={roomInput}
                      onChange={e=>setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="Oda: B4821"
                      className="flex-1 bg-[#0b1620] border border-white/[0.12] rounded-xl px-3 py-[10px] text-[14px] tracking-wider uppercase outline-none focus:border-sky-400/60"
                    />
                    <button
                      onClick={async ()=>{
                        const code = roomInput.trim().toUpperCase();
                        if(!code){ setToastMsg('Kod gir'); setTimeout(()=>setToastMsg(null),1200); return; }
                        // GARANTİ GEÇİŞ
                        setMode('online');
                        setRoomId(code);
                        setScreen('game');
                        const db = getDb();
                        let st = newGameState(1);
                        if(db){
                          try{
                            const snap:any = await get(ref(db, `bomberRooms/${code}/state`));
                            if(snap.exists()) st = snap.val();
                            await set(ref(db, `bomberRooms/${code}/players/${playerId}`), {name: playerName, side:1, ts:Date.now()});
                          }catch{}
                        }
                        setGame(st);
                      }}
                      className="px-4 py-[10px] rounded-xl bg-white/[0.07] border border-white/[0.12] text-[13px] font-[600]"
                    >Katıl</button>
                  </div>
                  <p className="text-[11px] text-zinc-500">Firebase: gmxlabtr • Boş kalırsa offline çalışır.</p>
                </>
              )}
            </div>
          </div>
        </div>
        {showHowTo && (
          <div className="fixed inset-0 z-[10060] bg-black/75 backdrop-blur-[3px] flex items-center justify-center p-3" onClick={()=>setShowHowTo(false)}>
            <div onClick={e=>e.stopPropagation()} className="bg-[#0f1e2b]/95 border border-white/[0.12] rounded-[22px] max-w-[760px] w-full max-h-[88dvh] overflow-auto p-5 sm:p-6 text-[14px] text-zinc-300 leading-relaxed">
              <div className="flex items-center justify-between mb-3">
                <b className="text-zinc-100 text-[18px]">Nasıl Oynanır?</b>
                <button onClick={()=>setShowHowTo(false)} className="text-[12px] px-3 py-[6px] rounded bg-white/[0.06]">Kapat</button>
              </div>
              <b>Yön tuşları / WASD</b> – hareket<br/>
              <b>Boşluk (Space)</b> – bomba bırak<br/>
              Bomba 2.5 sn sonra <b>+</b> şeklinde patlar.<br/>
              Taş duvar kırılmaz, ahşap kutu kırılır.<br/>
              Kutulardan: <b>💣</b> bomba + • <b>🔥</b> menzil + • <b>👟</b> hız +<br/>
              5 bölüm – düşman hızı ve sayısı artar.<br/>
              Tüm düşmanları temizle → <b>gizli kapı</b> açılır → kapıya gir → sonraki bölüm.<br/>
              <div className="mt-3 text-[12px] text-emerald-300 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
                Blogger uyumlu: Yön tuşları ve Space <code>e.preventDefault()</code> ile sayfa kaydırmasını engeller.
              </div>
            </div>
          </div>
        )}
        {screen==='leader' && (
          <LeaderboardModal onClose={()=>setScreen('lobby')} playerName={playerName} />
        )}
        {toastMsg && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#132636] border border-cyan-400/20 px-4 py-[10px] rounded-xl text-[13px] z-[10070] shadow-2xl">{toastMsg}</div>}
      </div>
    );
  }

  // ===== GAME =====
  if(!game) return null;
  const p = game.player;
  const enemiesAlive = game.enemies.filter((e:any)=> e.alive).length;

  return (
    <div className="w-screen h-[100dvh] bg-[#06141b] text-zinc-100 flex flex-col overflow-hidden crt" style={{fontFamily:'Inter, ui-monospace, system-ui, sans-serif'}}>
      <header className="h-[54px] border-b border-cyan-900/35 bg-[#0b202b]/92 backdrop-blur flex items-center px-3 sm:px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-amber-300 to-orange-500 text-[#1a1202] font-black flex items-center justify-center" style={{fontFamily:'ui-monospace,monospace'}}>B!</div>
          <div className="hidden sm:block">
            <div className="font-[700] text-[13.5px] leading-tight">GameXLabTR Bombardıman</div>
            <div className="text-[10.5px] text-cyan-200/70 -mt-0.5">Bölüm {game.level}/5 • {mode==='offline' ? 'Bot' : roomId}</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11.5px] text-cyan-100/75">
          <span>•</span><span>Skor <b className="text-amber-200">{p.score||0}</b></span>
          <span>•</span><span>Can {'❤'.repeat(p.lives)}</span>
          <span>•</span><span>💣{p.bombs} 🔥{p.fire} 👟{p.speed.toFixed(1)}</span>
        </div>
        <div className="flex-1" />
        <button onClick={()=>{
          setGame(null); setScreen('lobby'); setMode(null); setRoomId(null);
        }} className="text-[11.5px] px-3 py-[7px] rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1]">Çık</button>
      </header>

      <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] lg:grid-rows-1 lg:grid-cols-[1fr_350px]">
        <div className="relative bg-[#06141b] flex items-center justify-center p-2 sm:p-4">
          <div>
            <div className="grid gap-[2px] sm:gap-[3px] p-[8px] sm:p-[10px] rounded-[16px] bg-[#0a2230] border-[3px] border-[#143a4d] shadow-2xl"
                 style={{gridTemplateColumns:`repeat(${COLS}, minmax(0,1fr))`, width:'min(92vw,600px)', aspectRatio:`${COLS}/${ROWS}`}}>
              {Array.from({length:ROWS}).map((_,y)=> Array.from({length:COLS}).map((__,x)=>{
                const tile = game.map[y][x];
                const bomb = game.bombs.find((b:any)=> b.x===x && b.y===y);
                const expl = game.explosions.find((e:any)=> e.x===x && e.y===y);
                const pu = game.powerups.find((p:any)=> p.x===x && p.y===y);
                const plHere = p.alive && p.x===x && p.y===y;
                const enHere = game.enemies.find((en:any)=> en.alive && en.x===x && en.y===y);
                const doorHere = game.door.x===x && game.door.y===y && game.door.revealed;
                return (
                  <div key={x+'-'+y} className={`aspect-square rounded-[4px] relative
                    ${tile===1 ? 'bg-[#2a3d50]' : tile===2 ? 'bg-[#b56b34]' : 'bg-[#0e5a34]'}
                    border border-black/15`}>
                    {doorHere && <div className="absolute inset-[5px] bg-[#1a0f38] border border-violet-400/40 rounded-[3px] flex items-center justify-center text-[10px] text-violet-300">⬇</div>}
                    {pu && !expl && <div className="absolute inset-0 flex items-center justify-center text-[14px] animate-pulse">{pu.type==='bomb'?'💣':pu.type==='fire'?'🔥':'👟'}</div>}
                    {bomb && <div className="absolute inset-[18%] rounded-full bg-[#131a24] border-2 border-zinc-200" style={{animation:'bombPulse 520ms infinite'}}></div>}
                    {expl && <div className="absolute -inset-[2px] rounded-[4px] animate-[flameFlicker_100ms_infinite_alternate]" style={{background:'radial-gradient(circle,#fff2b8 0%,#ff9b2a 35%,#ff3a18 70%,transparent 100%)'}}></div>}
                    {playerHere && <div className="absolute inset-[14%] rounded-[6px] bg-[#f4f7ff] border-2 border-[#1b2238] flex items-center justify-center text-[9px] font-[800] text-[#1b2338]">P1</div>}
                    {enemyHere && !playerHere && <div className="absolute inset-[14%] rounded-[6px] bg-[#232938] border-2 border-[#8fb6ff] flex items-center justify-center text-[9px] font-[800] text-[#dfe8ff]">BT</div>}
                  </div>
                );
              })).flat()}
            </div>
            <div className="text-center text-[11px] text-cyan-100/70 mt-2" style={{fontFamily:'ui-monospace,monospace'}}>WASD / Ok • Space bomba • 13×11 • 600×400 max</div>
          </div>
          {game.gameOver && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center">
              <div className="bg-[#0f2330] border border-amber-300/25 rounded-2xl px-6 py-5 text-center">
                <div className="text-[28px]">{game.won ? '🏆' : '💥'}</div>
                <div className="text-[18px] font-[760] text-amber-200">{game.won ? 'Kazandın!' : 'Elendin!'}</div>
                <div className="text-zinc-300 mt-1 text-[13px]">Skor {p.score}</div>
                <button onClick={()=>{
                  const ng = initialGameState(1);
                  setGame(ng);
                }} className="mt-3 px-4 py-[10px] rounded-xl bg-amber-400 text-[#1b1202] font-[700]">Yeniden</button>
              </div>
            </div>
          )}
        </div>

        <aside className="border-t lg:border-t-0 lg:border-l border-cyan-900/35 bg-[#0b1d27] text-[13px] flex flex-col">
          <div className="p-3 border-b border-white/[0.07]">
            <div className="text-[11px] uppercase tracking-widest text-cyan-300/80" style={{fontFamily:'ui-monospace,monospace'}}>Durum</div>
            <div className="mt-2 text-zinc-300">Skor <b className="text-amber-200">{p.score}</b><br/>Bölüm {game.level}/5<br/>Can {'❤ '.repeat(p.lives)}<br/>Düşman {enemiesAlive}<br/>💣{p.bombs} 🔥{p.fire} 👟{p.speed.toFixed(1)}</div>
          </div>
          <div className="flex-1 p-3 text-zinc-300 text-[12.5px] leading-relaxed overflow-auto">
            <b>Kontroller</b><br/>WASD / Ok – hareket<br/>Space – bomba<br/><br/>
            Kutuları kır → güç topla<br/>Düşmanları temizle → <b className="text-emerald-300">kapı</b> açılır<br/>Kapıya gir → sonraki bölüm
            <div className="mt-3 text-[11.5px] text-emerald-300 bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2">
              e.preventDefault() aktif – Blogger sayfası kaymaz.
            </div>
          </div>
          <div className="px-3 py-[9px] border-t border-white/[0.07] text-[10.5px] text-zinc-500">
            GameXLabTR • {mode} • {roomId || 'yerel'}
          </div>
        </aside>
      </div>

      {/* mobile pad */}
      <div className="lg:hidden border-t border-cyan-900/30 bg-[#081a24]/95 px-3 py-[10px] flex items-center justify-between gap-3" style={{touchAction:'none'}}>
        <div className="grid grid-cols-3 gap-[6px]">
          {[
            [null,'up','↑'],
            ['left',null,'right'],
            [null,'down','↓'],
          ].flat().map((k,i)=> k ? (
            <button key={i}
              onTouchStart={e=>{e.preventDefault(); const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[k as any]; if(m){ const ev=new KeyboardEvent('keydown',{key: m[0]===1?'ArrowRight':m[0]===-1?'ArrowLeft':m[1]===1?'ArrowDown':'ArrowUp', bubbles:true}); window.dispatchEvent(ev); }}}
              className="w-11 h-11 rounded-xl bg-white/[0.065] border border-white/[0.12] active:bg-white/[0.16]"
            >{k==='up'?'↑':k==='down'?'↓':k==='left'?'←':'→'}</button>
          ) : <div key={i} className="w-11 h-11" />)}
        </div>
        <button
          onTouchStart={e=>{e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true}));}}
          className="w-[74px] h-[74px] rounded-[18px] bg-gradient-to-br from-amber-300 to-orange-500 text-[#1b1202] font-[800] shadow-lg active:scale-[0.95]"
          style={{touchAction:'none'}}
        >💣<br/><span style={{fontSize:'10.5px'}}>BOMBA</span></button>
      </div>

      {toastMsg && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#132636]/95 border border-cyan-400/20 px-4 py-[10px] rounded-xl text-[13px] z-[10070] shadow-xl">{toastMsg}</div>}
    </div>
  );

  // ---- helpers used above (defined inline to avoid hoisting issues) ----
  function initialGameState(l:number, carry?:any){
    return makeLevelState(l, carry);
  }
  function makeLevelState(level:number, carry?:any){
    const { map, door } = buildMap(level);
    const lv = LEVELS[Math.min(level-1,4)];
    const spawns = [
      {x:COLS-2,y:1},{x:1,y:ROWS-2},{x:COLS-2,y:ROWS-2},
      {x:Math.floor(COLS/2),y:1},{x:1,y:Math.floor(ROWS/2)},{x:COLS-2,y:Math.floor(ROWS/2)}
    ];
    const enemies:any[]=[];
    for(let i=0;i<lv.enemies;i++){
      const sp = spawns[i % spawns.length];
      if(map[sp.y]) map[sp.y][sp.x]=0;
      enemies.push({ id:'e'+i, x:sp.x, y:sp.y, alive:true, nextMove:0, speedMs: lv.speed });
    }
    return {
      level,
      map,
      door: {...door, revealed:false},
      player: {
        x:1, y:1, alive:true,
        lives: carry?.lives ?? 3,
        bombs: carry?.bombs ?? 1,
        fire: carry?.fire ?? 1,
        speed: carry?.speed ?? 1,
        score: carry?.score ?? 0,
        lastMove:0
      },
      enemies,
      bombs:[],
      explosions:[],
      powerups:[],
      gameOver:false,
      won:false,
      message:''
    };
  }
  function saveScore(name:string, score:number, level:number){
    const entry={name:(name||'Anon').slice(0,20),score,level,ts:Date.now()};
    try{
      const arr=JSON.parse(localStorage.getItem('gx_bomber_lb_v2')||'[]');
      arr.push(entry); arr.sort((a:any,b:any)=> b.score-a.score);
      localStorage.setItem('gx_bomber_lb_v2', JSON.stringify(arr.slice(0,80)));
    }catch{}
    const db=getDbSafe();
    if(db){ /* @ts-ignore */ set(ref(db,'bomber_leaderboard/'+Date.now()+'_'+Math.random().toString(36).slice(2,6)), entry).catch(()=>{}); }
  }
  function LeaderboardModal(_p:any){ return null; }
}
