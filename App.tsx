import { useCallback, useEffect, useRef, useState } from "react";

const STAGE_WIDTH = 960;
const STAGE_HEIGHT = 540;
const ROUND_TIME = 45;
const MAX_HEALTH = 100;
const MAX_ENERGY = 100;
const TOTAL_ROUNDS = 2;
const STORAGE_KEY = "gamexlabtr-strike-fighter-last";

type Side = "player" | "rival";
type GamePhase = "menu" | "intro" | "playing" | "round-break" | "paused" | "result";
type FighterAction = "idle" | "walk" | "jump" | "light" | "heavy" | "special" | "hit" | "ko";
type AttackType = "light" | "heavy" | "special";
type HairStyle = "short" | "long" | "mohawk" | "bun" | "bald";
type Accessory = "none" | "visor" | "mask" | "scar" | "band";

type ControlState = {
  left: boolean;
  right: boolean;
  jump: boolean;
  guard: boolean;
  light: boolean;
  heavy: boolean;
  special: boolean;
};

type FighterProfile = {
  id: string;
  name: string;
  alias: string;
  origin: string;
  style: string;
  bio: string;
  build: "light" | "medium" | "heavy";
  hair: HairStyle;
  accessory: Accessory;
  reach: number;
  stats: {
    power: number;
    speed: number;
    defense: number;
    special: number;
  };
  palette: {
    skin: string;
    hair: string;
    suit: string;
    accent: string;
    glow: string;
  };
};

type FighterEntity = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  energy: number;
  guardMeter: number;
  facing: 1 | -1;
  action: FighterAction;
  actionTimer: number;
  cooldown: number;
  hitFlash: number;
  guarding: boolean;
  thinkTimer: number;
};

type Impact = {
  id: number;
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
};

type ScoreBoard = {
  playerRounds: number;
  rivalRounds: number;
  playerHealthCarry: number;
  rivalHealthCarry: number;
};

type GameState = {
  phase: GamePhase;
  selectedPlayerId: string;
  rivalId: string;
  player: FighterEntity;
  rival: FighterEntity;
  round: number;
  roundTimer: number;
  overlayTimer: number;
  ambienceTime: number;
  announcement: string;
  winner: Side | "draw" | null;
  score: ScoreBoard;
  impacts: Impact[];
  nextId: number;
  savedLabel: string;
};

type AttackConfig = {
  range: number;
  damage: number;
  cooldown: number;
  actionTime: number;
  energyGain: number;
  energyCost: number;
  push: number;
  lunge: number;
  guardBreak: number;
};

type ArenaTheme = {
  name: string;
  tag: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  sun: string;
  sunGlow: string;
  far: string;
  near: string;
  floorTop: string;
  floorBottom: string;
  grid: string;
  accent: string;
  haze: string;
};

const emptyControls: ControlState = {
  left: false,
  right: false,
  jump: false,
  guard: false,
  light: false,
  heavy: false,
  special: false,
};

const attackConfigs: Record<AttackType, AttackConfig> = {
  light: {
    range: 104,
    damage: 8,
    cooldown: 0.42,
    actionTime: 0.2,
    energyGain: 8,
    energyCost: 0,
    push: 20,
    lunge: 24,
    guardBreak: 14,
  },
  heavy: {
    range: 126,
    damage: 13,
    cooldown: 0.78,
    actionTime: 0.34,
    energyGain: 12,
    energyCost: 0,
    push: 30,
    lunge: 32,
    guardBreak: 22,
  },
  special: {
    range: 152,
    damage: 19,
    cooldown: 1.16,
    actionTime: 0.5,
    energyGain: 0,
    energyCost: 68,
    push: 42,
    lunge: 44,
    guardBreak: 32,
  },
};

const arenaThemes: ArenaTheme[] = [
  {
    name: "Neo Tokyo Roof",
    tag: "Neon Sky",
    skyTop: "#09090b",
    skyMid: "#312e81",
    skyBottom: "#2563eb",
    sun: "#e879f9",
    sunGlow: "rgba(232,121,249,0.25)",
    far: "rgba(49,46,129,0.45)",
    near: "rgba(15,23,42,0.78)",
    floorTop: "#1e293b",
    floorBottom: "#020617",
    grid: "rgba(147,197,253,0.18)",
    accent: "#60a5fa",
    haze: "rgba(96,165,250,0.14)",
  },
  {
    name: "Storm Harbor",
    tag: "Sea Wind",
    skyTop: "#082f49",
    skyMid: "#155e75",
    skyBottom: "#38bdf8",
    sun: "#fef08a",
    sunGlow: "rgba(250,204,21,0.22)",
    far: "rgba(12,74,110,0.44)",
    near: "rgba(8,47,73,0.78)",
    floorTop: "#164e63",
    floorBottom: "#082f49",
    grid: "rgba(165,243,252,0.2)",
    accent: "#22d3ee",
    haze: "rgba(34,211,238,0.12)",
  },
  {
    name: "Desert Dome",
    tag: "Sand Heat",
    skyTop: "#431407",
    skyMid: "#b45309",
    skyBottom: "#f59e0b",
    sun: "#fde68a",
    sunGlow: "rgba(251,191,36,0.28)",
    far: "rgba(120,53,15,0.38)",
    near: "rgba(146,64,14,0.7)",
    floorTop: "#7c2d12",
    floorBottom: "#431407",
    grid: "rgba(254,240,138,0.16)",
    accent: "#f97316",
    haze: "rgba(251,146,60,0.12)",
  },
  {
    name: "Arctic Core",
    tag: "Cold Pulse",
    skyTop: "#0f172a",
    skyMid: "#1d4ed8",
    skyBottom: "#93c5fd",
    sun: "#e0f2fe",
    sunGlow: "rgba(224,242,254,0.24)",
    far: "rgba(148,163,184,0.34)",
    near: "rgba(59,130,246,0.3)",
    floorTop: "#cbd5e1",
    floorBottom: "#334155",
    grid: "rgba(255,255,255,0.26)",
    accent: "#93c5fd",
    haze: "rgba(224,242,254,0.16)",
  },
  {
    name: "Volcanic Ring",
    tag: "Ash Fire",
    skyTop: "#111827",
    skyMid: "#3f3f46",
    skyBottom: "#7c2d12",
    sun: "#fb7185",
    sunGlow: "rgba(249,115,22,0.2)",
    far: "rgba(63,63,70,0.44)",
    near: "rgba(24,24,27,0.8)",
    floorTop: "#3f3f46",
    floorBottom: "#09090b",
    grid: "rgba(249,115,22,0.16)",
    accent: "#fb923c",
    haze: "rgba(249,115,22,0.12)",
  },
  {
    name: "Sky Temple",
    tag: "Cloud Edge",
    skyTop: "#172554",
    skyMid: "#7c3aed",
    skyBottom: "#f472b6",
    sun: "#fbcfe8",
    sunGlow: "rgba(244,114,182,0.2)",
    far: "rgba(124,58,237,0.34)",
    near: "rgba(49,46,129,0.7)",
    floorTop: "#312e81",
    floorBottom: "#1e1b4b",
    grid: "rgba(216,180,254,0.18)",
    accent: "#c084fc",
    haze: "rgba(251,113,133,0.1)",
  },
];

const fighters: FighterProfile[] = [
  {
    id: "atlas-kane",
    name: "Atlas Kane",
    alias: "Steel Rush",
    origin: "USA",
    style: "Kickboxing",
    bio: "Patlayıcı açılışları ve baskın ileri adımıyla bilinen ağır ön hat dövüşçüsü.",
    build: "heavy",
    hair: "short",
    accessory: "scar",
    reach: 96,
    stats: { power: 95, speed: 70, defense: 85, special: 82 },
    palette: { skin: "#8a5a3d", hair: "#111827", suit: "#2563eb", accent: "#60a5fa", glow: "#38bdf8" },
  },
  {
    id: "selin-viper",
    name: "Selin Viper",
    alias: "Night Coil",
    origin: "TR",
    style: "Muay Thai",
    bio: "Ayak oyunları, diz komboları ve zehir gibi bitirici özel hareketleriyle öne çıkar.",
    build: "light",
    hair: "long",
    accessory: "visor",
    reach: 88,
    stats: { power: 82, speed: 94, defense: 70, special: 90 },
    palette: { skin: "#d39b7f", hair: "#1f2937", suit: "#0f766e", accent: "#2dd4bf", glow: "#14b8a6" },
  },
  {
    id: "kenji-raiden",
    name: "Kenji Raiden",
    alias: "Pulse Fang",
    origin: "JP",
    style: "Karate",
    bio: "Kısa menzilde yıldırım gibi seri yumruk kombinasyonları kurar.",
    build: "medium",
    hair: "short",
    accessory: "band",
    reach: 90,
    stats: { power: 84, speed: 88, defense: 74, special: 92 },
    palette: { skin: "#c58a6a", hair: "#0f172a", suit: "#7c3aed", accent: "#c084fc", glow: "#a78bfa" },
  },
  {
    id: "mila-frost",
    name: "Mila Frost",
    alias: "Zero Gale",
    origin: "FI",
    style: "Taekwondo",
    bio: "Havadan vuruşları ve geri çekilme sonrası ani tekmeleriyle rakibi çözer.",
    build: "light",
    hair: "bun",
    accessory: "none",
    reach: 94,
    stats: { power: 76, speed: 96, defense: 68, special: 88 },
    palette: { skin: "#e8c3a9", hair: "#a5b4fc", suit: "#0f172a", accent: "#93c5fd", glow: "#bfdbfe" },
  },
  {
    id: "dante-toro",
    name: "Dante Toro",
    alias: "Red Rampage",
    origin: "ES",
    style: "Boxing",
    bio: "Çizgi üstü düz kroşeleriyle yakın dövüşte tempoyu tamamen ele geçirir.",
    build: "heavy",
    hair: "mohawk",
    accessory: "none",
    reach: 92,
    stats: { power: 92, speed: 74, defense: 80, special: 78 },
    palette: { skin: "#a96a49", hair: "#450a0a", suit: "#b91c1c", accent: "#fb7185", glow: "#f43f5e" },
  },
  {
    id: "aylin-nova",
    name: "Aylin Nova",
    alias: "Photon Step",
    origin: "TR",
    style: "Capoeira",
    bio: "Dairesel hareketi ve ritmik saldırılarıyla sahnede sürekli akış yaratır.",
    build: "light",
    hair: "long",
    accessory: "band",
    reach: 89,
    stats: { power: 78, speed: 95, defense: 69, special: 93 },
    palette: { skin: "#d89b72", hair: "#6d28d9", suit: "#312e81", accent: "#f472b6", glow: "#f9a8d4" },
  },
  {
    id: "serge-volkov",
    name: "Serge Volkov",
    alias: "Cold Hammer",
    origin: "RU",
    style: "Sambo",
    bio: "Savunması yüksek, yere sabit basan ve ağır darbeleri iyi soğuran duvar tipi dövüşçü.",
    build: "heavy",
    hair: "bald",
    accessory: "scar",
    reach: 98,
    stats: { power: 90, speed: 66, defense: 92, special: 74 },
    palette: { skin: "#d0a17f", hair: "#111827", suit: "#475569", accent: "#93c5fd", glow: "#94a3b8" },
  },
  {
    id: "zara-pulse",
    name: "Zara Pulse",
    alias: "Circuit Queen",
    origin: "UK",
    style: "Jeet Kune Do",
    bio: "Menzil okuması ve tempo kıran özel vuruşlarıyla çok yönlü bir tehdit oluşturur.",
    build: "medium",
    hair: "short",
    accessory: "visor",
    reach: 93,
    stats: { power: 81, speed: 87, defense: 76, special: 95 },
    palette: { skin: "#e3b690", hair: "#111827", suit: "#0f766e", accent: "#67e8f9", glow: "#22d3ee" },
  },
  {
    id: "malik-onyx",
    name: "Malik Onyx",
    alias: "Black Tide",
    origin: "MA",
    style: "Kickboxing",
    bio: "Adım adım kapanıp her temasta yüksek hasar çıkaran güvenli bir bitirici.",
    build: "heavy",
    hair: "short",
    accessory: "mask",
    reach: 95,
    stats: { power: 93, speed: 72, defense: 84, special: 80 },
    palette: { skin: "#7a553a", hair: "#020617", suit: "#111827", accent: "#f59e0b", glow: "#fbbf24" },
  },
  {
    id: "yuna-blaze",
    name: "Yuna Blaze",
    alias: "Solar Arc",
    origin: "KR",
    style: "Taekkyeon",
    bio: "Esnek vücut dengesiyle bir anda yükselir, art arda yaylı tekmeler kurar.",
    build: "light",
    hair: "bun",
    accessory: "none",
    reach: 91,
    stats: { power: 77, speed: 93, defense: 71, special: 91 },
    palette: { skin: "#d1a082", hair: "#7c2d12", suit: "#ea580c", accent: "#fdba74", glow: "#fb923c" },
  },
  {
    id: "leon-raptor",
    name: "Leon Raptor",
    alias: "Sky Breaker",
    origin: "BR",
    style: "MMA",
    bio: "Orta menzilde baskı kurup sıçrama sonrası iniş darbeleriyle fark yaratır.",
    build: "medium",
    hair: "mohawk",
    accessory: "band",
    reach: 94,
    stats: { power: 88, speed: 85, defense: 77, special: 84 },
    palette: { skin: "#9d6842", hair: "#14532d", suit: "#166534", accent: "#86efac", glow: "#4ade80" },
  },
  {
    id: "aria-quartz",
    name: "Aria Quartz",
    alias: "Crystal Beat",
    origin: "CA",
    style: "Savate",
    bio: "Kontrollü menzil oyunu ve ritim bazlı vuruş geçişleriyle sahne yönetir.",
    build: "light",
    hair: "long",
    accessory: "visor",
    reach: 97,
    stats: { power: 75, speed: 92, defense: 73, special: 94 },
    palette: { skin: "#ebc2a5", hair: "#4338ca", suit: "#1d4ed8", accent: "#c4b5fd", glow: "#a5b4fc" },
  },
  {
    id: "tekin-wolf",
    name: "Tekin Wolf",
    alias: "Grey Claw",
    origin: "TR",
    style: "Karate",
    bio: "Disiplinli savunma, keskin karşılık ve güçlü ağır vuruşlarla rakibi kilitler.",
    build: "medium",
    hair: "short",
    accessory: "scar",
    reach: 92,
    stats: { power: 89, speed: 79, defense: 86, special: 79 },
    palette: { skin: "#b88361", hair: "#334155", suit: "#1f2937", accent: "#f8fafc", glow: "#94a3b8" },
  },
  {
    id: "nia-mirage",
    name: "Nia Mirage",
    alias: "Velvet Shift",
    origin: "AE",
    style: "Wushu",
    bio: "Açılar değiştikçe formu da değişen, sürpriz özel vuruşlara sahip çevik karakter.",
    build: "light",
    hair: "long",
    accessory: "mask",
    reach: 90,
    stats: { power: 74, speed: 97, defense: 67, special: 96 },
    palette: { skin: "#d5a789", hair: "#0f172a", suit: "#701a75", accent: "#f0abfc", glow: "#e879f9" },
  },
  {
    id: "bora-titan",
    name: "Bora Titan",
    alias: "Ground Zero",
    origin: "DE",
    style: "Combat Wrestling",
    bio: "Dayanıklılığıyla rakibi yıpratır, boşluk bulunca tek patlayıcı darbeyle bitirir.",
    build: "heavy",
    hair: "bald",
    accessory: "band",
    reach: 99,
    stats: { power: 96, speed: 64, defense: 93, special: 76 },
    palette: { skin: "#c79470", hair: "#111827", suit: "#374151", accent: "#f97316", glow: "#fb923c" },
  },
  {
    id: "kira-drift",
    name: "Kira Drift",
    alias: "Blue Comet",
    origin: "AU",
    style: "Freestyle Combat",
    bio: "Rakibin ritmini bozup seri hafif vuruşlarla enerji biriktiren teknik uzman.",
    build: "medium",
    hair: "short",
    accessory: "none",
    reach: 91,
    stats: { power: 80, speed: 90, defense: 72, special: 89 },
    palette: { skin: "#d7a880", hair: "#082f49", suit: "#0369a1", accent: "#7dd3fc", glow: "#38bdf8" },
  },
];

const fighterMap = new Map(fighters.map((fighter) => [fighter.id, fighter]));

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function getFighter(id: string) {
  return fighterMap.get(id) ?? fighters[0];
}

function createEntity(id: string, side: Side): FighterEntity {
  return {
    id,
    x: side === "player" ? 280 : 680,
    y: 0,
    vx: 0,
    vy: 0,
    health: MAX_HEALTH,
    energy: 30,
    guardMeter: 100,
    facing: side === "player" ? 1 : -1,
    action: "idle",
    actionTimer: 0,
    cooldown: 0,
    hitFlash: 0,
    guarding: false,
    thinkTimer: randomRange(0.18, 0.38),
  };
}

function pickDifferentRival(playerId: string, excludeId?: string) {
  const pool = fighters.filter((fighter) => fighter.id !== playerId && fighter.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? fighters[1].id;
}

function createInitialState(savedLabel = "") : GameState {
  const selectedPlayerId = fighters[0].id;
  const rivalId = fighters[1].id;

  return {
    phase: "menu",
    selectedPlayerId,
    rivalId,
    player: createEntity(selectedPlayerId, "player"),
    rival: createEntity(rivalId, "rival"),
    round: 1,
    roundTimer: ROUND_TIME,
    overlayTimer: 0,
    ambienceTime: 0,
    announcement: "Fighter seç ve 2 roundluk maçı başlat.",
    winner: null,
    score: {
      playerRounds: 0,
      rivalRounds: 0,
      playerHealthCarry: 0,
      rivalHealthCarry: 0,
    },
    impacts: [],
    nextId: 1,
    savedLabel,
  };
}

function createBattleState(previous: GameState): GameState {
  return {
    ...previous,
    phase: "intro",
    player: createEntity(previous.selectedPlayerId, "player"),
    rival: createEntity(previous.rivalId, "rival"),
    round: 1,
    roundTimer: ROUND_TIME,
    overlayTimer: 1.4,
    announcement: "Round 1 / 2",
    winner: null,
    impacts: [],
    score: {
      playerRounds: 0,
      rivalRounds: 0,
      playerHealthCarry: 0,
      rivalHealthCarry: 0,
    },
  };
}

function startNextRound(state: GameState): GameState {
  const nextRound = state.round + 1;
  return {
    ...state,
    phase: "intro",
    player: createEntity(state.selectedPlayerId, "player"),
    rival: createEntity(state.rivalId, "rival"),
    round: nextRound,
    roundTimer: ROUND_TIME,
    overlayTimer: 1.35,
    announcement: `Round ${nextRound} / ${TOTAL_ROUNDS}`,
    impacts: [],
    winner: null,
  };
}

function beginPreview(state: GameState, selectedPlayerId: string, rivalId: string): GameState {
  return {
    ...state,
    selectedPlayerId,
    rivalId,
    player: createEntity(selectedPlayerId, "player"),
    rival: createEntity(rivalId, "rival"),
    announcement: "Fighter seç ve 2 roundluk maçı başlat.",
    winner: null,
  };
}

function resolveRound(state: GameState, player: FighterEntity, rival: FighterEntity): GameState {
  let winner: Side | "draw" = "draw";

  if (player.health > rival.health) {
    winner = "player";
  } else if (rival.health > player.health) {
    winner = "rival";
  }

  const nextScore: ScoreBoard = {
    playerRounds: state.score.playerRounds + (winner === "player" ? 1 : 0),
    rivalRounds: state.score.rivalRounds + (winner === "rival" ? 1 : 0),
    playerHealthCarry: state.score.playerHealthCarry + Math.max(0, Math.round(player.health)),
    rivalHealthCarry: state.score.rivalHealthCarry + Math.max(0, Math.round(rival.health)),
  };

  const playerProfile = getFighter(state.selectedPlayerId);
  const rivalProfile = getFighter(state.rivalId);

  if (state.round >= TOTAL_ROUNDS) {
    let finalWinner: Side | "draw" = "draw";

    if (nextScore.playerRounds > nextScore.rivalRounds) {
      finalWinner = "player";
    } else if (nextScore.rivalRounds > nextScore.playerRounds) {
      finalWinner = "rival";
    } else if (nextScore.playerHealthCarry > nextScore.rivalHealthCarry) {
      finalWinner = "player";
    } else if (nextScore.rivalHealthCarry > nextScore.playerHealthCarry) {
      finalWinner = "rival";
    }

    const announcement =
      finalWinner === "player"
        ? `${playerProfile.name} şampiyon oldu!`
        : finalWinner === "rival"
          ? `${rivalProfile.name} maçı aldı!`
          : "Maç beraberlikle bitti.";

    return {
      ...state,
      phase: "result",
      player,
      rival,
      score: nextScore,
      winner: finalWinner,
      announcement,
      overlayTimer: 0,
    };
  }

  const announcement =
    winner === "player"
      ? `${playerProfile.name} Round ${state.round} kazandı`
      : winner === "rival"
        ? `${rivalProfile.name} Round ${state.round} kazandı`
        : `Round ${state.round} berabere bitti`;

  return {
    ...state,
    phase: "round-break",
    player,
    rival,
    score: nextScore,
    winner,
    overlayTimer: 2.35,
    announcement,
  };
}

function updateEntityBase(entity: FighterEntity, dt: number) {
  entity.cooldown = Math.max(0, entity.cooldown - dt);
  entity.actionTimer = Math.max(0, entity.actionTimer - dt);
  entity.hitFlash = Math.max(0, entity.hitFlash - dt);
  entity.thinkTimer = Math.max(0, entity.thinkTimer - dt);

  if (!entity.guarding) {
    entity.guardMeter = Math.min(100, entity.guardMeter + dt * 16);
  }

  entity.vx *= entity.y > 0 ? 0.992 : entity.guarding ? 0.78 : 0.84;
  entity.vy -= 1180 * dt;
  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;

  if (entity.y < 0) {
    entity.y = 0;
    if (entity.vy < 0) {
      entity.vy = 0;
    }
  }

  if (entity.health <= 0) {
    entity.health = 0;
    entity.guarding = false;
    entity.action = "ko";
    entity.actionTimer = Math.max(entity.actionTimer, 0.4);
  } else if (entity.actionTimer === 0) {
    if (entity.y > 0) {
      entity.action = "jump";
    } else if (Math.abs(entity.vx) > 18) {
      entity.action = "walk";
    } else {
      entity.action = "idle";
    }
  }
}

function moveEntity(entity: FighterEntity, profile: FighterProfile, controls: ControlState, dt: number) {
  if (entity.health <= 0) {
    return;
  }

  const lockedByAction = entity.action === "hit" || entity.action === "special" || entity.action === "heavy";
  entity.guarding = controls.guard && entity.y === 0 && entity.action !== "ko" && !lockedByAction;

  if (!entity.guarding && !lockedByAction) {
    const movePower = 178 + profile.stats.speed * 1.72;
    if (controls.left) {
      entity.vx -= movePower * dt * 6.6;
    }
    if (controls.right) {
      entity.vx += movePower * dt * 6.6;
    }
  }

  if (controls.jump && entity.y === 0 && entity.action !== "hit" && entity.action !== "ko") {
    entity.vy = 540 + profile.stats.speed * 1.4;
    entity.action = "jump";
    entity.actionTimer = 0.18;
    entity.guarding = false;
  }
}

function spawnImpact(impacts: Impact[], takeId: () => number, x: number, y: number, size: number, color: string) {
  impacts.push({
    id: takeId(),
    x,
    y,
    size,
    color,
    life: 0.36,
    maxLife: 0.36,
  });
}

function performAttack(
  attacker: FighterEntity,
  defender: FighterEntity,
  type: AttackType,
  impacts: Impact[],
  takeId: () => number,
) {
  const attackerProfile = getFighter(attacker.id);
  const defenderProfile = getFighter(defender.id);
  const config = attackConfigs[type];

  if (attacker.health <= 0 || attacker.cooldown > 0 || attacker.action === "hit" || attacker.action === "ko") {
    return;
  }

  if (type === "special" && attacker.energy < config.energyCost) {
    return;
  }

  attacker.action = type;
  attacker.actionTimer = config.actionTime;
  attacker.cooldown = config.cooldown;
  attacker.vx += attacker.facing * config.lunge;
  attacker.energy = clamp(attacker.energy + config.energyGain - config.energyCost, 0, MAX_ENERGY);

  const distanceX = Math.abs(defender.x - attacker.x);
  const distanceY = Math.abs(defender.y - attacker.y);
  const effectiveRange = config.range + attackerProfile.reach * 0.24;

  if (distanceX > effectiveRange || distanceY > 120) {
    return;
  }

  let damage = Math.round(config.damage * (0.7 + attackerProfile.stats.power / 120));
  damage += type === "special" ? Math.round(attackerProfile.stats.special * 0.05) : 0;
  damage -= Math.round(defenderProfile.stats.defense * 0.03);
  damage = Math.max(type === "light" ? 5 : type === "heavy" ? 8 : 11, damage);

  const blocked = defender.guarding && defender.y === 0;
  if (blocked) {
    damage = Math.max(2, Math.round(damage * 0.36));
    defender.guardMeter = Math.max(0, defender.guardMeter - config.guardBreak);
  }

  if (blocked && defender.guardMeter <= 0) {
    damage += 8;
    defender.guarding = false;
    defender.guardMeter = 20;
  }

  defender.health = clamp(defender.health - damage, 0, MAX_HEALTH);
  defender.energy = clamp(defender.energy + (blocked ? 5 : 11), 0, MAX_ENERGY);
  defender.action = defender.health <= 0 ? "ko" : "hit";
  defender.actionTimer = blocked ? 0.16 : type === "special" ? 0.44 : 0.24;
  defender.hitFlash = blocked ? 0.08 : 0.16;
  defender.vx += attacker.facing * config.push;

  if (!blocked && type === "special" && defender.y === 0) {
    defender.vy = 190;
  }

  spawnImpact(
    impacts,
    takeId,
    (attacker.x + defender.x) * 0.5,
    110 + Math.max(attacker.y, defender.y) * 0.3,
    blocked ? 24 : type === "special" ? 40 : 30,
    blocked ? "#f8fafc" : attackerProfile.palette.glow,
  );
}

function updateCpu(rival: FighterEntity, player: FighterEntity, impacts: Impact[], takeId: () => number) {
  const profile = getFighter(rival.id);
  const distance = rival.x - player.x;

  const aiControls: ControlState = { ...emptyControls };

  if (distance > 164) {
    aiControls.left = true;
  } else if (distance < 110) {
    aiControls.right = true;
  }

  if (player.action === "special" && Math.random() < 0.28) {
    aiControls.guard = true;
  }

  if (rival.thinkTimer <= 0) {
    rival.thinkTimer = randomRange(0.14, 0.33);

    if (distance <= 150) {
      const dice = Math.random();
      if (rival.energy >= attackConfigs.special.energyCost && dice < 0.24) {
        aiControls.special = true;
      } else if (dice < 0.55) {
        aiControls.heavy = true;
      } else {
        aiControls.light = true;
      }
    } else if (distance < 220 && Math.random() < 0.18) {
      aiControls.jump = true;
    }
  }

  moveEntity(rival, profile, aiControls, 1 / 60);

  if (aiControls.special) {
    performAttack(rival, player, "special", impacts, takeId);
  } else if (aiControls.heavy) {
    performAttack(rival, player, "heavy", impacts, takeId);
  } else if (aiControls.light) {
    performAttack(rival, player, "light", impacts, takeId);
  }
}

function advanceGame(state: GameState, dt: number, controls: ControlState): GameState {
  let nextId = state.nextId;
  const takeId = () => nextId++;

  const impacts = state.impacts
    .map((impact) => ({ ...impact, life: impact.life - dt, size: impact.size + 70 * dt }))
    .filter((impact) => impact.life > 0);

  const baseState = {
    ...state,
    ambienceTime: state.ambienceTime + dt,
    impacts,
    nextId,
  };

  if (state.phase === "menu" || state.phase === "result") {
    return baseState;
  }

  if (state.phase === "paused") {
    return baseState;
  }

  if (state.phase === "intro") {
    const overlayTimer = state.overlayTimer - dt;
    if (overlayTimer <= 0) {
      return {
        ...baseState,
        phase: "playing",
        overlayTimer: 0,
      };
    }
    return {
      ...baseState,
      overlayTimer,
    };
  }

  if (state.phase === "round-break") {
    const overlayTimer = state.overlayTimer - dt;
    if (overlayTimer <= 0) {
      return startNextRound({ ...baseState, overlayTimer: 0 });
    }
    return {
      ...baseState,
      overlayTimer,
    };
  }

  let player = { ...state.player };
  let rival = { ...state.rival };

  updateEntityBase(player, dt);
  updateEntityBase(rival, dt);

  const playerProfile = getFighter(player.id);
  moveEntity(player, playerProfile, controls, dt);

  if (controls.light) {
    performAttack(player, rival, "light", impacts, takeId);
  }
  if (controls.heavy) {
    performAttack(player, rival, "heavy", impacts, takeId);
  }
  if (controls.special) {
    performAttack(player, rival, "special", impacts, takeId);
  }

  updateCpu(rival, player, impacts, takeId);

  player.x = clamp(player.x, 110, 450);
  rival.x = clamp(rival.x, 510, 850);

  const gap = rival.x - player.x;
  if (gap < 86) {
    const adjust = (86 - gap) * 0.5;
    player.x -= adjust;
    rival.x += adjust;
  }

  player.facing = 1;
  rival.facing = -1;

  const roundTimer = state.roundTimer - dt;

  if (player.health <= 0 || rival.health <= 0 || roundTimer <= 0) {
    return resolveRound(
      {
        ...baseState,
        player,
        rival,
        impacts,
        roundTimer: Math.max(0, roundTimer),
        nextId,
      },
      player,
      rival,
    );
  }

  return {
    ...baseState,
    player,
    rival,
    impacts,
    roundTimer,
    nextId,
  };
}

function StatBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: accent }} />
      </div>
    </div>
  );
}

function FaceGraphic({ fighter }: { fighter: FighterProfile }) {
  const hairShape =
    fighter.hair === "bald"
      ? null
      : fighter.hair === "mohawk"
        ? { width: 18, height: 28, radius: "10px", left: 28 }
        : fighter.hair === "bun"
          ? { width: 56, height: 28, radius: "22px 22px 10px 10px", left: 10 }
          : fighter.hair === "long"
            ? { width: 64, height: 48, radius: "24px 24px 18px 18px", left: 6 }
            : { width: 58, height: 22, radius: "20px 20px 10px 10px", left: 9 };

  return (
    <div className="relative h-40 w-full overflow-hidden rounded-[1.6rem]" style={{ background: `radial-gradient(circle at 30% 20%, ${fighter.palette.glow}30, transparent 48%), linear-gradient(180deg, ${fighter.palette.suit} 0%, #020617 100%)` }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_40%)]" />
      <div className="absolute left-1/2 top-7 h-24 w-20 -translate-x-1/2 rounded-[40px]" style={{ background: `linear-gradient(180deg, ${fighter.palette.skin} 0%, #7c5a45 100%)`, boxShadow: `0 10px 25px ${fighter.palette.glow}22` }} />
      {hairShape && (
        <div
          className="absolute top-5"
          style={{
            left: `calc(50% - 40px + ${hairShape.left}px)`,
            width: hairShape.width,
            height: hairShape.height,
            borderRadius: hairShape.radius,
            background: fighter.palette.hair,
          }}
        />
      )}
      <div className="absolute left-1/2 top-[66px] h-2 w-12 -translate-x-1/2 rounded-full bg-slate-900/80" />
      <div className="absolute left-1/2 top-[84px] h-2 w-7 -translate-x-1/2 rounded-full bg-rose-100/70" />
      {fighter.accessory === "visor" && <div className="absolute left-1/2 top-[58px] h-5 w-16 -translate-x-1/2 rounded-full border border-cyan-200/30 bg-cyan-300/20 backdrop-blur" />}
      {fighter.accessory === "mask" && <div className="absolute left-1/2 top-[79px] h-7 w-16 -translate-x-1/2 rounded-full bg-slate-900/80" />}
      {fighter.accessory === "band" && <div className="absolute left-1/2 top-[49px] h-4 w-[74px] -translate-x-1/2 rounded-full" style={{ background: fighter.palette.accent }} />}
      {fighter.accessory === "scar" && <div className="absolute left-[54%] top-[67px] h-7 w-[2px] rotate-[22deg] bg-rose-400/70" />}
      <div className="absolute left-1/2 top-[116px] h-20 w-28 -translate-x-1/2 rounded-[28px_28px_14px_14px]" style={{ background: `linear-gradient(180deg, ${fighter.palette.accent} 0%, ${fighter.palette.suit} 72%)` }} />
      <div className="absolute left-[23%] top-[132px] h-12 w-7 rounded-full" style={{ background: fighter.palette.suit, transform: "rotate(18deg)" }} />
      <div className="absolute right-[23%] top-[132px] h-12 w-7 rounded-full" style={{ background: fighter.palette.suit, transform: "rotate(-18deg)" }} />
    </div>
  );
}

function ArenaFighter({ fighter, entity, side, ambienceTime }: { fighter: FighterProfile; entity: FighterEntity; side: Side; ambienceTime: number }) {
  const xPercent = (entity.x / STAGE_WIDTH) * 100;
  const lift = 96 + entity.y * 0.45;
  const sideScale = side === "player" ? 1 : -1;
  const buildScale = fighter.build === "heavy" ? 1.08 : fighter.build === "light" ? 0.96 : 1;
  const bob = entity.health > 0 ? Math.sin(ambienceTime * 6 + (side === "player" ? 0 : 1.8)) * 2 : 0;
  const tilt = entity.action === "light" ? 8 : entity.action === "heavy" ? 12 : entity.action === "special" ? 16 : entity.action === "hit" ? -8 : 0;
  const frontArmRotate = entity.action === "light" ? 34 : entity.action === "heavy" ? 54 : entity.action === "special" ? 72 : entity.guarding ? -40 : 8;
  const backArmRotate = entity.action === "special" ? -30 : entity.guarding ? 24 : -10;
  const auraVisible = entity.energy >= 68 || entity.action === "special";

  return (
    <div className="absolute" style={{ left: `${xPercent}%`, bottom: `${lift + bob}px`, transform: `translateX(-50%) scaleX(${sideScale}) scale(${buildScale})` }}>
      <div className="absolute left-1/2 top-[126px] h-5 w-24 -translate-x-1/2 rounded-full bg-slate-950/60 blur-sm" />
      {auraVisible && <div className="absolute left-1/2 top-3 h-36 w-28 -translate-x-1/2 rounded-full blur-xl" style={{ background: `${fighter.palette.glow}38` }} />}
      <div className="relative h-[172px] w-[122px]" style={{ transform: `rotate(${tilt}deg)` }}>
        <div className="absolute left-1/2 top-0 h-[48px] w-[48px] -translate-x-1/2 rounded-full" style={{ background: `linear-gradient(180deg, ${fighter.palette.skin} 0%, #7b5a46 100%)`, boxShadow: entity.hitFlash > 0 ? `0 0 22px ${fighter.palette.glow}` : undefined }} />
        {fighter.hair !== "bald" && (
          <div
            className="absolute left-1/2 top-[-2px] -translate-x-1/2"
            style={{
              width: fighter.hair === "mohawk" ? 18 : fighter.hair === "long" ? 56 : 48,
              height: fighter.hair === "long" ? 50 : fighter.hair === "bun" ? 24 : 18,
              borderRadius: fighter.hair === "mohawk" ? "10px" : "24px 24px 10px 10px",
              background: fighter.palette.hair,
            }}
          />
        )}
        {fighter.accessory === "visor" && <div className="absolute left-1/2 top-[14px] h-[10px] w-[40px] -translate-x-1/2 rounded-full bg-cyan-200/30" />}
        {fighter.accessory === "mask" && <div className="absolute left-1/2 top-[23px] h-[14px] w-[38px] -translate-x-1/2 rounded-full bg-slate-900/80" />}
        {fighter.accessory === "band" && <div className="absolute left-1/2 top-[8px] h-[8px] w-[50px] -translate-x-1/2 rounded-full" style={{ background: fighter.palette.accent }} />}
        {fighter.accessory === "scar" && <div className="absolute left-[61px] top-[18px] h-[18px] w-[2px] rotate-[22deg] bg-rose-400/80" />}

        <div className="absolute left-1/2 top-[42px] h-[68px] w-[58px] -translate-x-1/2 rounded-[22px_22px_16px_16px]" style={{ background: `linear-gradient(180deg, ${fighter.palette.accent} 0%, ${fighter.palette.suit} 76%)` }} />
        <div className="absolute left-[18px] top-[58px] h-[52px] w-[14px] origin-top rounded-full" style={{ background: fighter.palette.suit, transform: `rotate(${backArmRotate}deg)` }} />
        <div className="absolute right-[18px] top-[58px] h-[56px] w-[15px] origin-top rounded-full" style={{ background: fighter.palette.suit, transform: `rotate(${frontArmRotate}deg)` }} />
        <div className="absolute left-[38px] top-[104px] h-[58px] w-[14px] rounded-full" style={{ background: "#111827", transform: `rotate(${entity.action === "jump" ? -10 : 6}deg)` }} />
        <div className="absolute right-[38px] top-[104px] h-[58px] w-[14px] rounded-full" style={{ background: "#111827", transform: `rotate(${entity.action === "jump" ? 12 : -4}deg)` }} />
        <div className="absolute left-[34px] top-[156px] h-[9px] w-[22px] rounded-full bg-slate-950" />
        <div className="absolute right-[34px] top-[156px] h-[9px] w-[22px] rounded-full bg-slate-950" />
      </div>
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => createInitialState(""));
  const controlsRef = useRef<ControlState>({ ...emptyControls });

  const activeTheme = arenaThemes[Math.floor(game.ambienceTime / 8) % arenaThemes.length];
  const selectedPlayer = getFighter(game.selectedPlayerId);
  const selectedRival = getFighter(game.rivalId);

  const persistLabel = useCallback((label: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, label);
    } catch {
      // ignore storage write errors
    }
  }, []);

  const startBattle = useCallback(() => {
    setGame((current) => {
      const next = createBattleState(current);
      persistLabel(`${getFighter(current.selectedPlayerId).name} vs ${getFighter(current.rivalId).name}`);
      return { ...next, savedLabel: `${getFighter(current.selectedPlayerId).name} vs ${getFighter(current.rivalId).name}` };
    });
    controlsRef.current = { ...emptyControls };
  }, [persistLabel]);

  const backToMenu = useCallback(() => {
    controlsRef.current = { ...emptyControls };
    setGame((current) => beginPreview(current, current.selectedPlayerId, current.rivalId));
  }, []);

  const togglePause = useCallback(() => {
    setGame((current) => {
      if (current.phase === "playing") {
        return { ...current, phase: "paused", announcement: "Oyun duraklatıldı" };
      }
      if (current.phase === "paused") {
        return { ...current, phase: "playing", announcement: `Round ${current.round} devam ediyor` };
      }
      return current;
    });
  }, []);

  const setControl = useCallback((key: keyof ControlState, value: boolean) => {
    controlsRef.current = {
      ...controlsRef.current,
      [key]: value,
    };
  }, []);

  const selectPlayer = useCallback((id: string) => {
    setGame((current) => {
      const rivalId = current.rivalId === id ? pickDifferentRival(id) : current.rivalId;
      return beginPreview(current, id, rivalId);
    });
  }, []);

  const selectRival = useCallback((id: string) => {
    setGame((current) => {
      if (id === current.selectedPlayerId) {
        return current;
      }
      return beginPreview(current, current.selectedPlayerId, id);
    });
  }, []);

  const randomizeRival = useCallback(() => {
    setGame((current) => beginPreview(current, current.selectedPlayerId, pickDifferentRival(current.selectedPlayerId, current.rivalId)));
  }, []);

  useEffect(() => {
    try {
      const savedLabel = window.localStorage.getItem(STORAGE_KEY) ?? "";
      if (savedLabel) {
        setGame((current) => ({ ...current, savedLabel }));
      }
    } catch {
      // ignore storage read errors
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        [
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
          "a",
          "d",
          "w",
          "s",
          "j",
          "k",
          "l",
          " ",
          "shift",
          "enter",
          "numpadenter",
          "0",
        ].includes(key)
      ) {
        event.preventDefault();
      }

      if ((key === "p" || key === "escape") && !event.repeat) {
        togglePause();
        return;
      }

      if ((key === "enter" || key === "numpadenter") && !event.repeat) {
        if (game.phase === "menu" || game.phase === "result") {
          startBattle();
          return;
        }
      }

      if (key === "arrowleft" || key === "a") setControl("left", true);
      if (key === "arrowright" || key === "d") setControl("right", true);
      if (key === "arrowup" || key === "w") setControl("jump", true);
      if (key === "arrowdown" || key === "s") setControl("guard", true);
      if (key === "j" || key === "enter" || key === "numpadenter") setControl("light", true);
      if (key === "k" || key === " ") setControl("heavy", true);
      if (key === "l" || key === "shift" || key === "0") setControl("special", true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") setControl("left", false);
      if (key === "arrowright" || key === "d") setControl("right", false);
      if (key === "arrowup" || key === "w") setControl("jump", false);
      if (key === "arrowdown" || key === "s") setControl("guard", false);
      if (key === "j" || key === "enter" || key === "numpadenter") setControl("light", false);
      if (key === "k" || key === " ") setControl("heavy", false);
      if (key === "l" || key === "shift" || key === "0") setControl("special", false);
    };

    const resetControls = () => {
      controlsRef.current = { ...emptyControls };
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", resetControls);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", resetControls);
    };
  }, [game.phase, setControl, startBattle, togglePause]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.033);
      previous = now;
      setGame((current) => advanceGame(current, dt, controlsRef.current));
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const controlHandlers = (key: keyof ControlState) => ({
    onPointerDown: () => setControl(key, true),
    onPointerUp: () => setControl(key, false),
    onPointerLeave: () => setControl(key, false),
    onPointerCancel: () => setControl(key, false),
  });

  const playerHealthPercent = (game.player.health / MAX_HEALTH) * 100;
  const rivalHealthPercent = (game.rival.health / MAX_HEALTH) * 100;
  const playerEnergyPercent = (game.player.energy / MAX_ENERGY) * 100;
  const rivalEnergyPercent = (game.rival.energy / MAX_ENERGY) * 100;
  const roundProgress = (game.roundTimer / ROUND_TIME) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-5 px-4 py-5 lg:px-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
                GamexLabTR · Strike Fighter 3D Arena
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">Strike Fighter: Real Arena</h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300 md:text-base">
                  16 karakterli, 2 round sistemli, arka planı sürekli değişen dövüş oyunu demosu. Telefon, tablet,
                  PC ve akıllı TV için uygun kontrollerle tasarlandı. GamexLabTR vurgusuyla karakter seç, arenaya çık
                  ve round’ları kazan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Karakter</div>
                <div className="mt-1 text-xl font-bold text-white">16</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Round</div>
                <div className="mt-1 text-xl font-bold text-amber-300">2</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Arena</div>
                <div className="mt-1 text-xl font-bold" style={{ color: activeTheme.accent }}>{activeTheme.tag}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Kayıt</div>
                <div className="mt-1 text-sm font-semibold text-cyan-300">{game.savedLabel || "Henüz maç yok"}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_460px]">
          <section className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 [touch-action:none]" style={{ aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}` }}>
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${activeTheme.skyTop} 0%, ${activeTheme.skyMid} 50%, ${activeTheme.skyBottom} 100%)` }} />
                <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 18% 8%, ${activeTheme.haze}, transparent 32%), radial-gradient(circle at 84% 15%, ${activeTheme.haze}, transparent 32%)` }} />
                <div className="absolute left-[76%] top-[9%] h-28 w-28 rounded-full" style={{ background: activeTheme.sun, boxShadow: `0 0 80px ${activeTheme.sunGlow}` }} />

                {Array.from({ length: 5 }).map((_, index) => {
                  const left = index * 24 - ((game.ambienceTime * 5) % 24);
                  return (
                    <div
                      key={`far-${index}`}
                      className="absolute bottom-[26%] h-[34%] w-[32%]"
                      style={{
                        left: `${left}%`,
                        background: activeTheme.far,
                        clipPath: "polygon(0% 100%, 30% 45%, 48% 18%, 76% 54%, 100% 100%)",
                      }}
                    />
                  );
                })}

                {Array.from({ length: 6 }).map((_, index) => {
                  const left = index * 20 - ((game.ambienceTime * 9) % 20);
                  return (
                    <div
                      key={`near-${index}`}
                      className="absolute bottom-[21%] h-[28%] w-[24%]"
                      style={{
                        left: `${left}%`,
                        background: activeTheme.near,
                        clipPath: "polygon(0% 100%, 24% 52%, 50% 26%, 70% 54%, 100% 100%)",
                      }}
                    />
                  );
                })}

                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={`skyline-${index}`}
                    className="absolute bottom-[22%] rounded-t-lg"
                    style={{
                      left: `${index * 10.8 - ((game.ambienceTime * 7) % 10.8)}%`,
                      width: `${5 + (index % 3) * 2}%`,
                      height: `${10 + (index % 4) * 4}%`,
                      background: `${activeTheme.accent}18`,
                    }}
                  />
                ))}

                <div className="absolute inset-x-0 bottom-0 h-[31%]" style={{ background: `linear-gradient(180deg, ${activeTheme.floorTop} 0%, ${activeTheme.floorBottom} 100%)` }} />
                <div className="absolute inset-x-0 bottom-0 h-[31%] opacity-90" style={{ backgroundImage: `linear-gradient(transparent 0%, transparent 68%, ${activeTheme.grid} 69%, transparent 71%), linear-gradient(90deg, transparent 0%, transparent 48%, ${activeTheme.grid} 49%, transparent 51%)`, backgroundSize: "100% 48px, 72px 100%", transform: "perspective(600px) rotateX(74deg)", transformOrigin: "bottom" }} />
                <div className="absolute inset-x-0 bottom-[23.5%] h-[1px]" style={{ background: activeTheme.grid }} />

                <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-white/15 bg-slate-950/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 backdrop-blur">
                  GamexLabTR Arena Feed
                </div>

                <div className="absolute inset-x-4 top-4 flex items-end justify-between gap-3">
                  <div className="w-full max-w-[34%] rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                      <span>{selectedPlayer.name}</span>
                      <span>Round {game.score.playerRounds}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${playerHealthPercent}%` }} />
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${playerEnergyPercent}%`, background: selectedPlayer.palette.glow }} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-5 py-3 text-center shadow-lg backdrop-blur">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Round Timer</div>
                    <div className="mt-1 text-3xl font-black text-white">{Math.ceil(game.roundTimer)}</div>
                    <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${roundProgress}%` }} />
                    </div>
                  </div>

                  <div className="w-full max-w-[34%] rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                      <span>{selectedRival.name}</span>
                      <span>Round {game.score.rivalRounds}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-rose-400" style={{ width: `${rivalHealthPercent}%` }} />
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${rivalEnergyPercent}%`, background: selectedRival.palette.glow }} />
                    </div>
                  </div>
                </div>

                <ArenaFighter fighter={selectedPlayer} entity={game.player} side="player" ambienceTime={game.ambienceTime} />
                <ArenaFighter fighter={selectedRival} entity={game.rival} side="rival" ambienceTime={game.ambienceTime} />

                {game.impacts.map((impact) => {
                  const alpha = impact.life / impact.maxLife;
                  return (
                    <div
                      key={impact.id}
                      className="absolute rounded-full"
                      style={{
                        left: `${(impact.x / STAGE_WIDTH) * 100}%`,
                        bottom: `${impact.y}px`,
                        width: `${impact.size}px`,
                        height: `${impact.size}px`,
                        transform: "translate(-50%, 50%)",
                        background: impact.color,
                        opacity: alpha * 0.35,
                        boxShadow: `0 0 28px ${impact.color}`,
                      }}
                    />
                  );
                })}

                <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-slate-300">
                  <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 backdrop-blur">Arena: {activeTheme.name}</div>
                  <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 backdrop-blur">Round {game.round} / {TOTAL_ROUNDS}</div>
                  <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 backdrop-blur">GamexLabTR Showcase</div>
                </div>

                {(game.phase === "intro" || game.phase === "round-break" || game.phase === "paused" || game.phase === "result") && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/62 px-6 backdrop-blur-sm">
                    <div className="max-w-2xl rounded-[2rem] border border-white/10 bg-slate-900/85 p-8 text-center shadow-2xl shadow-slate-950/50">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">GamexLabTR Battle Overlay</div>
                      <h2 className="text-3xl font-black text-white md:text-4xl">
                        {game.phase === "intro"
                          ? game.announcement
                          : game.phase === "round-break"
                            ? game.announcement
                            : game.phase === "paused"
                              ? "Oyun duraklatıldı"
                              : game.announcement}
                      </h2>
                      <p className="mt-4 text-sm leading-6 text-slate-300 md:text-base">
                        {game.phase === "result"
                          ? `${selectedPlayer.name} ${game.score.playerRounds} - ${game.score.rivalRounds} ${selectedRival.name}. Eşit round’da kalan toplam can kullanılır. Yeni maç için tekrar başlatabilirsin.`
                          : game.phase === "paused"
                            ? "P veya Esc ile devam edebilir ya da aşağıdaki düğmeleri kullanabilirsin."
                            : "Dinamik arka plan dönüşmeye devam ederken sıra dışı 3D arena hissi korunuyor."}
                      </p>
                      {(game.phase === "paused" || game.phase === "result") && (
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={game.phase === "paused" ? togglePause : startBattle}
                            className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                          >
                            {game.phase === "paused" ? "Devam Et" : "Maçı Yeniden Başlat"}
                          </button>
                          <button
                            type="button"
                            onClick={backToMenu}
                            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                          >
                            Menüye Dön
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Nasıl Oynanır</div>
                  <h2 className="mt-1 text-2xl font-bold text-white">Telefon · Tablet · PC · Akıllı TV Uyumlu</h2>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                  Responsive GamexLabTR kontrol seti
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
                  <div className="text-sm font-bold text-white">PC / Laptop</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li>• A / D veya ← / → : hareket</li>
                    <li>• W veya ↑ : zıpla</li>
                    <li>• S veya ↓ : guard</li>
                    <li>• J / Enter : hafif saldırı</li>
                    <li>• K / Space : ağır saldırı</li>
                    <li>• L / Shift : özel hareket</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
                  <div className="text-sm font-bold text-white">Telefon / Tablet</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li>• Ekrandaki yön ve saldırı butonlarını kullan</li>
                    <li>• Guard ile hasarı düşür</li>
                    <li>• Enerji dolunca özel saldırıyı kullan</li>
                    <li>• 2 round sonunda en çok round alan kazanır</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
                  <div className="text-sm font-bold text-white">Akıllı TV</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li>• Kumanda yön tuşlarıyla hareket et</li>
                    <li>• Enter / OK ile hafif saldırı yap</li>
                    <li>• 0 veya Shift destekliyse özel saldırıyı tetikle</li>
                    <li>• P / Esc ile duraklat</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
                  <div className="text-sm font-bold text-white">Maç Kuralları</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li>• Maç 2 round sürer</li>
                    <li>• KO ya da süre sonunda yüksek can round alır</li>
                    <li>• Eşit round’da toplam kalan can sonucu belirler</li>
                    <li>• Arka plan her birkaç saniyede değişir</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-5">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Seçili Dövüşçüler</div>
                  <h2 className="mt-1 text-2xl font-bold text-white">Match Setup</h2>
                </div>
                <button
                  type="button"
                  onClick={randomizeRival}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Rakibi Değiştir
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="rounded-3xl border border-cyan-400/20 bg-slate-900/55 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Oyuncu</div>
                  <div className="mt-2 text-xl font-bold text-white">{selectedPlayer.name}</div>
                  <div className="text-sm text-slate-300">{selectedPlayer.alias} · {selectedPlayer.origin}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{selectedPlayer.bio}</p>
                </div>
                <div className="rounded-3xl border border-rose-400/20 bg-slate-900/55 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-rose-300">Rakip</div>
                  <div className="mt-2 text-xl font-bold text-white">{selectedRival.name}</div>
                  <div className="text-sm text-slate-300">{selectedRival.alias} · {selectedRival.origin}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{selectedRival.bio}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
                <button
                  type="button"
                  onClick={startBattle}
                  className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-300"
                >
                  Maçı Başlat
                </button>
                <button
                  type="button"
                  onClick={togglePause}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {game.phase === "paused" ? "Devam Et" : "Duraklat"}
                </button>
                <button
                  type="button"
                  onClick={backToMenu}
                  className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20"
                >
                  Menüye Dön
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Dokunmatik / TV Kumandası</div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <button type="button" {...controlHandlers("jump")} className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-4 text-lg font-bold text-white transition hover:bg-slate-800">↑</button>
                <button type="button" {...controlHandlers("light")} className="rounded-2xl bg-cyan-400 px-4 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-300">Hit</button>
                <button type="button" {...controlHandlers("special")} className="rounded-2xl border border-fuchsia-400/35 bg-fuchsia-400/10 px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-100 transition hover:bg-fuchsia-400/20">Ultra</button>
                <button type="button" {...controlHandlers("left")} className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-4 text-lg font-bold text-white transition hover:bg-slate-800">←</button>
                <button type="button" {...controlHandlers("guard")} className="rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-400/20">Guard</button>
                <button type="button" {...controlHandlers("right")} className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-4 text-lg font-bold text-white transition hover:bg-slate-800">→</button>
                <button type="button" {...controlHandlers("heavy")} className="col-span-3 rounded-2xl bg-rose-500 px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-rose-400">Combo / Heavy</button>
              </div>
            </div>
          </aside>
        </main>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">16 Karakterlik Roster</div>
              <h2 className="mt-1 text-2xl font-bold text-white">GamexLabTR Fighter Select</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Kartlardan “Oyuncu” ile ana karakterini, “Rakip” ile CPU dövüşçüsünü belirle. Tasarım; telefon,
                tablet, PC ve akıllı TV ekranlarında rahat seçilebilmesi için ölçeklenebilir tutuldu.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-sm text-slate-300">
              Seçili maç: <span className="font-semibold text-white">{selectedPlayer.name}</span> vs <span className="font-semibold text-white">{selectedRival.name}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
            {fighters.map((fighter) => {
              const isPlayerSelected = fighter.id === game.selectedPlayerId;
              const isRivalSelected = fighter.id === game.rivalId;
              return (
                <article
                  key={fighter.id}
                  className={`rounded-[1.7rem] border p-4 transition ${
                    isPlayerSelected
                      ? "border-cyan-400/35 bg-cyan-400/10"
                      : isRivalSelected
                        ? "border-rose-400/35 bg-rose-400/10"
                        : "border-white/10 bg-slate-900/55 hover:bg-slate-900/70"
                  }`}
                >
                  <FaceGraphic fighter={fighter} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{fighter.name}</h3>
                      <p className="text-sm text-slate-300">{fighter.alias}</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {fighter.origin}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{fighter.style} · {fighter.bio}</p>

                  <div className="mt-4 space-y-2">
                    <StatBar label="Power" value={fighter.stats.power} accent={fighter.palette.accent} />
                    <StatBar label="Speed" value={fighter.stats.speed} accent={fighter.palette.glow} />
                    <StatBar label="Defense" value={fighter.stats.defense} accent="#34d399" />
                    <StatBar label="Special" value={fighter.stats.special} accent="#f472b6" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => selectPlayer(fighter.id)}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        isPlayerSelected ? "bg-cyan-400 text-slate-950" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      Oyuncu
                    </button>
                    <button
                      type="button"
                      onClick={() => selectRival(fighter.id)}
                      disabled={fighter.id === game.selectedPlayerId}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        isRivalSelected
                          ? "bg-rose-400 text-white"
                          : fighter.id === game.selectedPlayerId
                            ? "cursor-not-allowed bg-slate-800 text-slate-500"
                            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      Rakip
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
