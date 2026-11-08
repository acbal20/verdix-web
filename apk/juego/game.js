/* ============================================================
   BEN 10 · OMNITRIX BATTLE 3D
   Núcleo: estado, jugador, transformaciones, oleadas,
   modos de juego, modo dios, autenticación y amigos
   ============================================================ */

const $id = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const TAU = Math.PI * 2;

function angLerp(a, b, t) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}
function distXZ(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/* ==================== Modo Dios (secreto) ==================== */
let godKeyCount = 0;
const GOD_KEY = 'd';
const GOD_KEY_TRIGGER = 5;
let godModeActive = false;

/* ==================== Firebase / Ranking ==================== */
function firebaseIsReady() {
  return window.firebaseReady === true && window.firebaseDb !== null;
}
function firebaseError() {
  return window.firebaseError || null;
}

/* ==================== Estado global ==================== */
const G = {
  state: 'boot',
  mode: null,
  time: 0, wave: 0, score: 0, combo: 0, comboT: 0, kills: 0,
  runCoins: 0, runGems: 0, omni: 100,
  enemies: [], projectiles: [], pickups: [], vfx: [],
  spawnQueue: [], spawnT: 0, between: false, breakT: 0,
  boss: null, bossPending: null, usedRevive: false, doubleCoins: false,
  moving: new THREE.Vector3(), lastStep: 0, lastHitSfx: 0, lastShotSfx: -1,
  storyLevel: 1,
  storyGoal: null,
  storyCompleted: false,
  freeWave: 0
};

let P = null;

/* ==================== Niveles de Historia ==================== */
const STORY_LEVELS = [
  {
    id: 1,
    name: 'Nivel 1 · Iniciación',
    goal: { type: 'collect', label: 'Recoge 5 objetos', target: 5 },
    banner: 'Misión 1: Iniciación',
    sub: 'Recoge 5 objetos del escenario',
    unlockReward: { coins: 200, gems: 1 }
  },
  {
    id: 2,
    name: 'Nivel 2 · Combate',
    goal: { type: 'kills', label: 'Derrota 3 enemigos', target: 3 },
    banner: 'Misión 2: Combate',
    sub: 'Derrota a 3 enemigos',
    unlockReward: { coins: 350, gems: 2 }
  },
  {
    id: 3,
    name: 'Nivel 3 · La Meta',
    goal: { type: 'wave', label: 'Llega a la oleada 5', target: 5 },
    banner: 'Misión 3: La Meta',
    sub: 'Sobrevive hasta la oleada 5',
    unlockReward: { coins: 500, gems: 3 }
  }
];

function getStoryProgress() {
  return SAVE.storyProgress | 0;
}
function isStoryLevelUnlocked(lvl) {
  return lvl <= (getStoryProgress() + 1);
}
function completeStoryLevel(lvl) {
  if (lvl > getStoryProgress()) {
    SAVE.storyProgress = lvl;
    saveUserData();
  }
  const lvlDef = STORY_LEVELS.find(l => l.id === lvl);
  if (lvlDef) {
    earnCoins(lvlDef.unlockReward.coins);
    earnGems(lvlDef.unlockReward.gems);
    UI.toast('✅ Nivel completado: ' + lvlDef.name);
  }
}

/* ==================== Estadísticas derivadas ==================== */
function maxHpOf(form) {
  return FORMS[form].hp + (SAVE.up.hp | 0) * 20;
}
function omniMaxOf() {
  return 100 + (SAVE.up.omni | 0) * 15;
}
function omniRegenOf() {
  let r = 9 + (SAVE.up.omni | 0) * 1.4;
  if (SAVE.modules.mega) r *= 1.25;
  return r;
}
function damageMul() {
  let m = 1 + (SAVE.up.dmg | 0) * 0.1;
  if (P && P.rageT > 0) m *= 1.5;
  if (godModeActive || SAVE.infiniteLife) m = 999999; // Daño infinito: mata de un golpe
  return m;
}
function speedMul() {
  let m = 1 + (SAVE.up.spd | 0) * 0.07;
  if (godModeActive || SAVE.infiniteLife) m *= 2;
  return m;
}
function isUnlocked(id) {
  if (id === 'ben' || BASE_ALIENS.indexOf(id) >= 0) return true;
  return !!SAVE.aliens[id];
}
function magnetRadius() {
  let r = 1.55 + (SAVE.up.magnet | 0) * 0.45;
  if (P && P.magnetT > 0) r *= 3;
  return r;
}
function isAdmin() {
  return !!SAVE.admin;
}
function isGodUser() {
  return godModeActive || SAVE.infiniteLife || isAdmin();
}

/* ==================== Jugador ==================== */
function spawnPlayer() {
  P = {
    form: 'ben',
    pos: new THREE.Vector3(0, 0, 0),
    facing: 0,
    hp: 0, maxHp: 0,
    model: null, shadow: null, shieldGroup: null,
    radius: 0.9, height: 2.4,
    attackCd: 0, specialCd: 0, invuln: 0,
    dashT: 0, dashCd: 0, dashDir: new THREE.Vector3(0, 0, -1),
    spinT: 0, spinTick: 0, spinType: '',
    shieldT: 0, rapidT: 0, magnetT: 0, x2T: 0, rageT: 0,
    walk: 0, attackAnim: 0, hitAnim: 0, moving: false, dead: false
  };

  // Admin / vida infinita
  if (isAdmin() || SAVE.infiniteLife) {
    P.hp = 999999;
    P.maxHp = 999999;
    G.omni = 999999;
    godModeActive = true;
    SAVE.godMode = true;
    SAVE.infiniteLife = true;
    UI.showGodIndicator(true);
  } else {
    P.maxHp = maxHpOf('ben');
    P.hp = P.maxHp;
    G.omni = omniMaxOf();
    godModeActive = false;
    SAVE.godMode = false;
    SAVE.infiniteLife = false;
    UI.showGodIndicator(false);
  }

  if (!isAdmin() && !SAVE.infiniteLife) {
    if (SAVE.modules.shield) P.shieldT = 15;
  }

  setFormModel('ben');
  P.shadow = Engine.addShadow(Engine.scene, P.radius);

  const sg = new THREE.Group();
  const s1 = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x66e8ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const s2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.72, 12, 9),
    new THREE.MeshBasicMaterial({ color: 0x9df6ff, wireframe: true, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sg.add(s1, s2);
  sg.visible = false;
  Engine.scene.add(sg);
  P.shieldGroup = sg;
}

function setFormModel(id) {
  if (!P) return;
  if (P.model) Engine.scene.remove(P.model.group);
  const m = Models.buildPlayer(id);
  m.group.position.set(P.pos.x, 0, P.pos.z);
  m.group.rotation.y = P.facing;
  Engine.scene.add(m.group);
  P.model = m;
  P.radius = m.radius;
  P.height = m.height;
  if (P.shadow) P.shadow.scale.set(m.radius * 2.4, m.radius * 2.4, 1);
  if (P.shieldGroup) {
    const s = m.radius / 0.9;
    P.shieldGroup.scale.set(s, s, s);
  }
}

function transformTo(id) {
  if (!P || G.state !== 'playing' || P.dead) return;
  if (id === P.form) return;
  if (!isUnlocked(id)) {
    AudioEngine.sfx('error');
    UI.toast('Desbloqueá este alien en la tienda 🛒');
    return;
  }
  if (id !== 'ben' && G.omni < 5 && !isGodUser()) {
    AudioEngine.sfx('error');
    UI.toast('El Omnitrix no tiene energía');
    return;
  }
  const ratio = P.hp / Math.max(1, P.maxHp);
  P.form = id;
  P.maxHp = maxHpOf(id);
  P.hp = isGodUser() ? 999999 : clamp(ratio * P.maxHp, 1, P.maxHp);
  P.attackCd = Math.max(P.attackCd, 0.18);
  P.specialCd = 0;
  if (id !== 'ben' && !isGodUser()) G.omni = Math.max(0, G.omni - 4);
  setFormModel(id);
  Engine.burst(P.pos.x, 1.2, P.pos.z, FORMS[id].color, 26, 7, 0.55, 0.7, 8);
  AudioEngine.sfx('transform');
  if (P.shieldGroup) P.shieldGroup.visible = P.shieldT > 0;
  UI.refresh();
  UI.alienCards();
}

function revertToBen(auto) {
  if (!P || P.form === 'ben') return;
  const ratio = P.hp / Math.max(1, P.maxHp);
  P.form = 'ben';
  P.maxHp = isGodUser() ? 999999 : maxHpOf('ben');
  P.hp = isGodUser() ? 999999 : clamp(ratio * P.maxHp, 1, P.maxHp);
  setFormModel('ben');
  Engine.burst(P.pos.x, 1.1, P.pos.z, 0x63ff96, 18, 5, 0.4, 0.55, 7);
  AudioEngine.sfx('revert');
  if (auto) UI.toast('El Omnitrix se apagó: volviste a Ben');
  UI.refresh();
  UI.alienCards();
}

/* ==================== Inicio y fin de partida ==================== */
function startRun() {
  cleanupWorld();
  G.state = 'playing';
  G.time = 0;
  G.wave = (G.mode === 'free') ? 0 : (G.storyLevel || 1);
  G.score = 0;
  G.combo = 0;
  G.comboT = 0;
  G.kills = 0;
  G.runCoins = 0;
  G.runGems = 0;
  G.usedRevive = false;
  G.between = false;
  G.breakT = 0;
  G.doubleCoins = !!SAVE.modules.double;
  G.spawnQueue = [];
  G.spawnT = 0;
  G.boss = null;
  G.bossPending = null;

  if (G.mode === 'story') {
    const lvlDef = STORY_LEVELS.find(l => l.id === G.storyLevel);
    if (lvlDef) {
      G.storyGoal = { type: lvlDef.goal.type, target: lvlDef.goal.target, current: 0 };
      UI.banner(lvlDef.banner, lvlDef.sub, 3);
    }
  }

  spawnPlayer();
  SAVE.plays = (SAVE.plays | 0) + 1;
  saveUserData();
  AudioEngine.startMusic();
  AudioEngine.sfx('wave');
  if (G.mode === 'story') {
    startStoryWave(G.storyLevel);
  } else if (G.mode === 'free') {
    startWave(1);
  } else {
    startWave(1);
  }
  UI.setPlaying(true);
  UI.refresh();
  UI.wallet();
  UI.alienCards();
  UI.updateStoryHUD();
}

function startStoryWave(waveNum) {
  G.wave = waveNum;
  G.between = false;
  G.breakT = 0;
  G.spawnQueue = [];
  G.spawnT = 0.4;

  const boss = waveNum % 5 === 0;
  let budget = Math.min(30, 4 + waveNum * 1.75);
  if (boss) budget *= 0.62;

  let guard = 0;
  while (budget > 0.8 && guard++ < 90) {
    const t = chooseEnemyType(waveNum);
    const c = SPAWN_COST[t] || 1;
    if (c > budget + 0.6 && G.spawnQueue.length) break;
    G.spawnQueue.push(t);
    budget -= c;
  }
  for (let i = G.spawnQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = G.spawnQueue[i];
    G.spawnQueue[i] = G.spawnQueue[j];
    G.spawnQueue[j] = tmp;
  }
  if (boss) {
    G.spawnQueue = ['boss'].concat(G.spawnQueue.filter(t => t !== 'boss'));
    G.bossPending = true;
  }
  UI.refresh();
}

function startFreeRun() {
  G.mode = 'free';
  G.state = 'playing';
  G.time = 0;
  G.wave = 1;
  G.score = 0;
  G.combo = 0;
  G.kills = 0;
  G.runCoins = 0;
  G.runGems = 0;
  G.usedRevive = false;
  G.between = false;
  G.breakT = 0;
  G.doubleCoins = !!SAVE.modules.double;
  G.spawnQueue = [];
  G.spawnT = 0;
  G.boss = null;
  G.bossPending = null;
  G.storyGoal = null;
  spawnPlayer();
  SAVE.plays = (SAVE.plays | 0) + 1;
  saveUserData();
  AudioEngine.startMusic();
  AudioEngine.sfx('wave');
  startWave(1);
  UI.setPlaying(true);
  UI.refresh();
  UI.wallet();
  UI.alienCards();
  UI.updateStoryHUD();
}

function startQuickRun() {
  G.mode = 'quick';
  startRun();
}

function quitToMenu() {
  cleanupWorld();
  G.state = 'menu';
  G.mode = null;
  G.storyGoal = null;
  AudioEngine.stopMusic();
  UI.setPlaying(false);
  UI.show('menu');
  UI.hide('pause');
  UI.hide('over');
  UI.hide('shop');
  UI.boss(false);
  UI.menuStats();
  UI.wallet();
  UI.showGodIndicator(false);
  godModeActive = false;
}

function gameOver() {
  if (!P) return;
  if (isGodUser()) return; // admin/vida infinita no pierde
  G.state = 'over';
  P.dead = true;
  AudioEngine.stopMusic();
  AudioEngine.sfx('over');
  SAVE.best = Math.max(SAVE.best | 0, G.score);
  if (G.mode === 'free') SAVE.freeBestWave = Math.max(SAVE.freeBestWave | 0, G.wave);
  saveUserData();
  if (SAVE.playerName && firebaseIsReady()) {
    sendScoreToFirebase(SAVE.playerName, G.score);
  }
  UI.boss(false);
  UI.gameOver();
  UI.wallet();
  UI.menuStats();
}

function playerDown() {
  if (isGodUser()) return;
  if (SAVE.modules.revive && !G.usedRevive) {
    G.usedRevive = true;
    P.dead = false;
    P.hp = P.maxHp * 0.6;
    P.invuln = 3.2;
    P.shieldT = Math.max(P.shieldT, 3);
    for (const e of G.enemies) {
      if (!e.dead && distXZ(e.pos, P.pos) < 8.5) {
        e.dead = true;
        Engine.burst(e.pos.x, 1.1, e.pos.z, 0xffe08a, 16, 5, 0.45, 0.6, 8);
      }
    }
    Engine.addShake(1.6);
    AudioEngine.sfx('revive');
    UI.banner('SEGUNDA OPORTUNIDAD', 'El Omnitrix te trajo de vuelta', 2.4);
    UI.refresh();
    return;
  }
  P.hp = 0;
  P.dead = true;
  gameOver();
}

/* ==================== Monedas, puntos y combo ==================== */
function earnCoins(n) {
  if (isAdmin() || SAVE.allMaxed) n = n * 100;
  let amount = Math.round(n) * (G.doubleCoins ? 2 : 1);
  addCoins(amount);
  G.runCoins += amount;
  UI.wallet();
  return amount;
}
function earnGems(n) {
  if (isAdmin() || SAVE.allMaxed) n = n * 100;
  addGems(n);
  G.runGems += n;
  UI.wallet();
  return n;
}
function addScore(base) {
  if (godModeActive || isAdmin()) base = Math.round(base * 0.1);
  G.combo++;
  G.comboT = 3;
  const mult = 1 + Math.min(1.6, G.combo * 0.045);
  G.score += Math.round(base * mult);
  UI.combo(G.combo);
  if (G.mode === 'story' && G.storyGoal && G.storyGoal.type === 'kills') {
    G.storyGoal.current = G.kills;
    UI.updateStoryHUD();
    checkStoryGoal();
  }
}
function updateCombo(dt) {
  if (G.comboT > 0) {
    G.comboT -= dt;
    if (G.comboT <= 0) {
      G.combo = 0;
      UI.combo(0);
    }
  }
}

function checkStoryGoal() {
  if (G.mode !== 'story' || !G.storyGoal) return;
  let done = false;
  if (G.storyGoal.type === 'collect' && G.storyGoal.current >= G.storyGoal.target) done = true;
  if (G.storyGoal.type === 'kills' && G.storyGoal.current >= G.storyGoal.target) done = true;
  if (G.storyGoal.type === 'wave' && G.wave >= G.storyGoal.target) done = true;
  if (done) {
    G.storyCompleted = true;
    completeStoryLevel(G.storyLevel);
    UI.banner('MISIÓN COMPLETADA', 'Nivel desbloqueado', 3);
    setTimeout(() => quitToMenu(), 2500);
  }
}

function pickupCollected() {
  if (G.mode === 'story' && G.storyGoal && G.storyGoal.type === 'collect') {
    G.storyGoal.current++;
    UI.updateStoryHUD();
    checkStoryGoal();
  }
}

/* ==================== Oleadas ==================== */
function chooseEnemyType(n) {
  const r = Math.random();
  if (n >= 4 && r < 0.18) return 'brute';
  if (n >= 2 && r < 0.44) return 'drone';
  if (n >= 3 && r < 0.66) return 'speeder';
  return 'dna';
}

function startWave(n) {
  G.wave = n;
  G.between = false;
  G.breakT = 0;
  G.spawnQueue = [];
  G.spawnT = 0.4;

  const boss = n % 5 === 0;
  let budget = Math.min(30, 4 + n * 1.75);
  if (boss) budget *= 0.62;

  let guard = 0;
  while (budget > 0.8 && guard++ < 90) {
    const t = chooseEnemyType(n);
    const c = SPAWN_COST[t] || 1;
    if (c > budget + 0.6 && G.spawnQueue.length) break;
    G.spawnQueue.push(t);
    budget -= c;
  }
  for (let i = G.spawnQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = G.spawnQueue[i];
    G.spawnQueue[i] = G.spawnQueue[j];
    G.spawnQueue[j] = tmp;
  }
  if (boss) {
    G.spawnQueue = ['boss'].concat(G.spawnQueue.filter(t => t !== 'boss'));
    G.bossPending = true;
  }
  UI.banner('OLEADA ' + n, boss ? '¡VILGAX HA LLEGADO!' : 'Sobreviví a la horda', 2.3);
  if (boss) { AudioEngine.sfx('boss'); Engine.addShake(1.2); }
  else AudioEngine.sfx('wave');
  UI.refresh();
}

function updateSpawns(dt) {
  if (G.between || !G.spawnQueue.length) return;
  G.spawnT -= dt;
  if (G.spawnT > 0) return;

  const alive = G.enemies.filter(e => !e.dead).length;
  const cap = 12 + Math.min(8, Math.floor(G.wave / 2));
  if (alive >= cap) return;

  const type = G.spawnQueue.shift();
  spawnEnemy(type);
  const base = Math.max(0.26, 0.92 - G.wave * 0.024);
  G.spawnT = type === 'boss' ? 1.4 : base * rand(0.8, 1.25);
}

function waveCleared() {
  if (G.between) return;
  G.between = true;
  G.breakT = 3.2;

  const bonus = earnCoins(35 + G.wave * 18);
  let extra = '';
  if (G.wave % 5 === 0) {
    earnGems(1);
    extra = ' · +1 cristal 💎';
  }
  if (P && !isGodUser()) {
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.15);
    G.omni = omniMaxOf();
  } else if (P && isGodUser()) {
    P.hp = 999999;
    G.omni = 999999;
  }
  UI.banner('OLEADA ' + G.wave + ' COMPLETADA', '+' + bonus + ' monedas' + extra, 2.3);
  AudioEngine.sfx('win');
  UI.refresh();
  UI.wallet();

  if (G.mode === 'story' && G.storyGoal && G.storyGoal.type === 'wave') {
    checkStoryGoal();
  }
}

/* ==================== Enemigos ==================== */
function spawnEnemy(type) {
  const def = ENEMY_TYPES[type];
  if (!def) return;
  const w = Math.max(1, G.wave);
  const hp = def.hp + (w - 1) * def.hpG;
  const dmg = def.dmg + (w - 1) * def.dmgG;
  const speed = def.speed * (1 + Math.min(0.32, (w - 1) * 0.018));

  let a = Math.random() * TAU;
  for (let i = 0; i < 8; i++) {
    const px = Math.cos(a) * 21, pz = Math.sin(a) * 21;
    if (!P || Math.hypot(px - P.pos.x, pz - P.pos.z) > 9) break;
    a = Math.random() * TAU;
  }
  const pos = new THREE.Vector3(Math.cos(a) * 21, 0, Math.sin(a) * 21);

  const model = Models.buildEnemy(type);
  model.group.position.copy(pos);
  Engine.scene.add(model.group);

  const shadow = Engine.addShadow(Engine.scene, model.radius);
  shadow.position.set(pos.x, 0.05, pos.z);

  const e = {
    type, pos, hp, maxHp: hp, dmg, speed,
    radius: model.radius, height: model.height,
    model, shadow, bar: makeEnemyBar(type === 'boss' ? 0xff4d6d : 0x63ff96),
    attackCd: rand(0.4, 1.1), attackAnim: 0, walk: Math.random() * 5,
    kx: 0, kz: 0, stun: 0, dead: false, hoverPhase: Math.random() * TAU,
    typeDef: def
  };
  G.enemies.push(e);

  Engine.burst(pos.x, 0.9, pos.z, type === 'boss' ? 0xff3b5c : 0x63ff96, type === 'boss' ? 40 : 18, 6, 0.5, 0.7, 8);
  shockwave(pos.x, pos.z, type === 'boss' ? 0xff3b5c : 0x63ff96, type === 'boss' ? 5 : 2.6, 0.55);

  if (type === 'boss') {
    G.boss = e;
    UI.boss(true);
  }
  return e;
}

let enemyBarBgGeo = null, enemyBarFillGeo = null, enemyBarBgMat = null;
const enemyBarFillMats = {};

function makeEnemyBar(color) {
  if (!enemyBarBgGeo) {
    enemyBarBgGeo = new THREE.PlaneGeometry(1, 0.14);
    enemyBarFillGeo = new THREE.PlaneGeometry(1, 0.09);
    enemyBarBgMat = new THREE.MeshBasicMaterial({ color: 0x02100a, transparent: true, opacity: 0.78, depthTest: false, depthWrite: false });
  }
  if (!enemyBarFillMats[color]) {
    enemyBarFillMats[color] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
  }
  const g = new THREE.Group();
  const bg = new THREE.Mesh(enemyBarBgGeo, enemyBarBgMat);
  const fill = new THREE.Mesh(enemyBarFillGeo, enemyBarFillMats[color]);
  fill.position.z = 0.001;
  bg.renderOrder = 98;
  fill.renderOrder = 99;
  g.add(bg, fill);
  g.visible = false;
  Engine.scene.add(g);
  return { group: g, fill };
}

/* ==================== Actualización jugador ==================== */
const keys = Object.create(null);
const input = { attack: false, joy: { x: 0, y: 0 } };

function updatePlayer(dt) {
  if (!P || P.dead) return;

  P.attackCd = Math.max(0, P.attackCd - dt);
  P.specialCd = Math.max(0, P.specialCd - dt);
  P.dashCd = Math.max(0, P.dashCd - dt);
  P.invuln = Math.max(0, P.invuln - dt);
  P.dashT = Math.max(0, P.dashT - dt);
  P.attackAnim = Math.max(0, P.attackAnim - dt);
  P.hitAnim = Math.max(0, P.hitAnim - dt);
  P.spinT = Math.max(0, P.spinT - dt);
  P.shieldT = Math.max(0, P.shieldT - dt);
  P.rapidT = Math.max(0, P.rapidT - dt);
  P.magnetT = Math.max(0, P.magnetT - dt);
  P.x2T = Math.max(0, P.x2T - dt);
  P.rageT = Math.max(0, P.rageT - dt);

  const f = FORMS[P.form];
  const god = isGodUser();
  if (P.form === 'ben' && !god) {
    G.omni = Math.min(omniMaxOf(), G.omni + omniRegenOf() * dt);
  } else if (!god) {
    G.omni -= f.drain * dt;
    if (G.omni <= 0) { G.omni = 0; revertToBen(true); }
  } else {
    G.omni = 999999;
  }

  let mx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + input.joy.x;
  let mz = (keys.s ? 1 : 0) - (keys.w ? 1 : 0) + input.joy.y;
  const ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; }
  P.moving = ml > 0.06;

  const speed = f.speed * speedMul();
  if (P.dashT > 0) {
    P.pos.x += P.dashDir.x * 34 * dt;
    P.pos.z += P.dashDir.z * 34 * dt;
  } else if (P.spinT > 0) {
    P.pos.x += P.dashDir.x * (P.spinType === 'roll' ? 19 : 15) * dt;
    P.pos.z += P.dashDir.z * (P.spinType === 'roll' ? 19 : 15) * dt;
  } else {
    P.pos.x += mx * speed * dt;
    P.pos.z += mz * speed * dt;
  }

  const rr = Math.hypot(P.pos.x, P.pos.z);
  if (rr > ARENA_RADIUS) {
    P.pos.x = (P.pos.x / rr) * ARENA_RADIUS;
    P.pos.z = (P.pos.z / rr) * ARENA_RADIUS;
  }

  if (P.moving) {
    const target = Math.atan2(mx, mz);
    P.facing = angLerp(P.facing, target, 1 - Math.pow(0.00001, dt));
    G.moving.set(mx, 0, mz);
  } else {
    G.moving.set(0, 0, 0);
  }

  if (P.spinT > 0) P.facing += dt * 24;

  const bob = animateModel(P.model, P.walk, P.moving, P.attackAnim, P.hitAnim);
  P.model.group.position.set(P.pos.x, bob, P.pos.z);
  P.model.group.rotation.y = P.facing;
  if (P.moving) P.walk += dt * (6 + speed * 0.6);
  P.shadow.position.set(P.pos.x, 0.055, P.pos.z);
  P.shadow.scale.set(P.radius * 2.4, P.radius * 2.4, 1);

  if (P.shieldGroup) {
    P.shieldGroup.visible = P.shieldT > 0;
    if (P.shieldGroup.visible) {
      P.shieldGroup.position.set(P.pos.x, 1.15, P.pos.z);
      P.shieldGroup.rotation.y += dt * 0.7;
      P.shieldGroup.rotation.x = Math.sin(G.time * 1.4) * 0.12;
    }
  }
  if (P.attackCd > 0 && input.attack && P.attackCd < 0.02) P.attackCd = 0;

  if (input.attack && P.attackCd <= 0) playerAttack();

  if (P.moving && G.time > G.lastStep + 0.34) {
    G.lastStep = G.time;
    AudioEngine.sfx('step');
  }

  if (P.spinT > 0) {
    P.spinTick -= dt;
    if (P.spinTick <= 0) {
      P.spinTick = 0.11;
      spinDamage();
    }
  }
}

function animateModel(model, walk, moving, attackAnim, hitAnim) {
  if (!model) return 0;
  const p = model.parts || {};
  const sw = moving ? Math.sin(walk) * 0.6 : Math.sin(performance.now() * 0.0018) * 0.035;
  if (p.legL) p.legL.rotation.x = sw;
  if (p.legR) p.legR.rotation.x = -sw;
  if (p.armL) p.armL.rotation.x = -sw * 0.8;
  if (p.armR) p.armR.rotation.x = sw * 0.8;
  if (p.armL2) p.armL2.rotation.x = -sw * 0.7;
  if (p.armR2) p.armR2.rotation.x = sw * 0.7;
  if (attackAnim > 0 && p.armR) {
    const pr = 1 - attackAnim / 0.3;
    p.armR.rotation.x = -Math.sin(clamp(pr, 0, 1) * Math.PI) * 2.5;
  }
  if (hitAnim > 0) {
    if (p.head) p.head.rotation.z = Math.sin(hitAnim * 40) * 0.18;
  } else if (p.head) {
    p.head.rotation.z *= 0.85;
  }
  return moving ? Math.abs(Math.sin(walk)) * 0.06 : Math.sin(performance.now() * 0.0015) * 0.025;
}

/* ==================== Bucle lógico ==================== */
function update(dt) {
  if (G.state !== 'playing') return;
  G.time += dt;

  updatePlayer(dt);

  if (G.between) {
    G.breakT -= dt;
    if (G.breakT <= 0) {
      if (G.mode === 'story') startStoryWave(G.wave + 1);
      else startWave(G.wave + 1);
    }
  } else {
    updateSpawns(dt);
  }

  updateEnemies(dt);
  updateProjectiles(dt);
  updatePickups(dt);
  updateVFX(dt);
  updateCombo(dt);
  cleanupDead();

  if (!G.between && G.wave > 0 && G.spawnQueue.length === 0 && G.enemies.length === 0) {
    waveCleared();
  }
}

/* ==================== Limpieza ==================== */
function cleanupDead() {
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (!e.dead) continue;
    Engine.scene.remove(e.model.group);
    Engine.scene.remove(e.shadow);
    if (e.bar) Engine.scene.remove(e.bar.group);
    if (G.boss === e) {
      G.boss = null;
      UI.boss(false);
    }
    G.enemies.splice(i, 1);
  }
}

function cleanupWorld() {
  if (P) {
    if (P.model) Engine.scene.remove(P.model.group);
    if (P.shadow) Engine.scene.remove(P.shadow);
    if (P.shieldGroup) {
      P.shieldGroup.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      Engine.scene.remove(P.shieldGroup);
    }
    P = null;
  }
  for (const e of G.enemies) {
    Engine.scene.remove(e.model.group);
    Engine.scene.remove(e.shadow);
    if (e.bar) Engine.scene.remove(e.bar.group);
  }
  G.enemies.length = 0;
  for (const pr of G.projectiles) {
    Engine.scene.remove(pr.group);
    pr.group.traverse(o => { if (o.material && o.material.dispose) o.material.dispose(); });
  }
  G.projectiles.length = 0;
  for (const pk of G.pickups) Engine.scene.remove(pk.group);
  G.pickups.length = 0;
  for (const v of G.vfx) {
    Engine.scene.remove(v.mesh);
    if (v.mesh.geometry) v.mesh.geometry.dispose();
    if (v.mesh.material) v.mesh.material.dispose();
  }
  G.vfx.length = 0;
  G.boss = null;
  G.bossPending = null;
  UI.boss(false);
}

/* ==================== Modo Dios: secuencia de teclas ==================== */
function checkGodKey(key) {
  const k = (key || '').toLowerCase();
  if (k === GOD_KEY) {
    godKeyCount++;
    if (godKeyCount >= GOD_KEY_TRIGGER) {
      toggleGodMode();
      godKeyCount = 0;
      UI.toast('👁️ MODO DIOS ' + (godModeActive ? 'ACTIVADO' : 'DESACTIVADO'));
    }
  } else {
    godKeyCount = 0;
  }
}

function toggleGodMode() {
  const name = SAVE.playerName || getCurrentUser() || '';
  if (!isAdmin() && name !== 'acbal20' && !USERS[name]?.admin) {
    UI.toast('🔒 Solo el creador o admin pueden usar el Modo Dios');
    godModeActive = false;
    return;
  }
  godModeActive = !godModeActive;
  SAVE.godMode = godModeActive;
  SAVE.infiniteLife = godModeActive;
  saveUserData();
  if (P) {
    if (godModeActive) {
      P.hp = 999999;
      P.maxHp = 999999;
      G.omni = 999999;
      UI.showGodIndicator(true);
    } else {
      P.hp = Math.min(P.hp, P.maxHp);
      UI.showGodIndicator(false);
    }
    UI.refresh();
  }
}

/* ==================== Firebase scoring ==================== */
window.sendScoreToFirebase = function(name, score) {
  if (!firebaseIsReady()) return;
  try {
    const db = window.firebaseDb;
    const scoresRef = ref(db, 'scores');
    const newScoreRef = push(scoresRef);
    set(newScoreRef, {
      name: name,
      score: score,
      ts: Date.now(),
      mode: G.mode || 'quick'
    });
  } catch (e) {
    console.error('[Firebase] Error enviando score:', e);
  }
};
window.getFirebaseScores = function(callback) {
  if (!firebaseIsReady()) { callback([]); return; }
  try {
    const db = window.firebaseDb;
    const scoresRef = ref(db, 'scores');
    const q = query(scoresRef, orderByChild('score'), limitToLast(50));
    onValue(q, (snapshot) => {
      const arr = [];
      snapshot.forEach((child) => {
        arr.push(child.val());
      });
      arr.sort((a, b) => b.score - a.score);
      callback(arr.slice(0, 10));
    }, (err) => {
      console.error('[Firebase] Error leyendo scores:', err);
      callback([]);
    });
  } catch (e) {
    console.error('[Firebase] Error:', e);
    callback([]);
  }
};
window.getFirebaseModerators = function(callback) {
  if (!firebaseIsReady()) { callback([]); return; }
  try {
    const db = window.firebaseDb;
    const modsRef = ref(db, 'moderators');
    onValue(modsRef, (snapshot) => {
      const arr = [];
      snapshot.forEach((child) => {
        arr.push(child.val());
      });
      callback(arr);
    }, (err) => {
      console.error('[Firebase] Error leyendo moderators:', err);
      callback([]);
    });
  } catch (e) {
    console.error('[Firebase] Error:', e);
    callback([]);
  }
};
window.addFirebaseModerator = function(name) {
  if (!firebaseIsReady()) return false;
  try {
    const db = window.firebaseDb;
    set(ref(db, 'moderators/' + name.replace(/[.#$\\[\]]/g, '_')), { name: name, role: 'moderator', ts: Date.now() });
    return true;
  } catch (e) { return false; }
};
window.removeFirebaseModerator = function(name) {
  if (!firebaseIsReady()) return false;
  try {
    const db = window.firebaseDb;
    set(ref(db, 'moderators/' + name.replace(/[.#$\\[\]]/g, '_')), null);
    return true;
  } catch (e) { return false; }
};
