/* ============================================================
   BEN 10 · OMNITRIX BATTLE 3D — datos del juego
   ============================================================ */

const FORMS = {
  ben: {
    name: 'Ben', icon: '🧒', hp: 100, speed: 8.8, dmg: 10, range: 2.3, arc: 1.9,
    cd: 0.42, drain: 0, type: 'melee', color: 0x63ff96, special: null
  },
  heatblast: {
    name: 'Heatblast', icon: '🔥', hp: 95, speed: 8.3, dmg: 15, range: 10, arc: 0,
    cd: 0.5, drain: 5.5, type: 'fire', projSpeed: 25, projColor: 0xff7a16,
    special: { name: 'Nova de fuego', type: 'nova', cd: 5, energy: 22 }
  },
  fourarms: {
    name: 'Cuatro Brazos', icon: '💪', hp: 145, speed: 7.5, dmg: 30, range: 2.9, arc: 2.3,
    cd: 0.65, drain: 5, type: 'melee', heavy: true, color: 0xff6b6b,
    special: { name: 'Golpe sísmico', type: 'slam', cd: 6, energy: 24 }
  },
  xlr8: {
    name: 'XLR8', icon: '⚡', hp: 80, speed: 12.6, dmg: 11, range: 2.1, arc: 1.7,
    cd: 0.24, drain: 7, type: 'melee', fast: true, color: 0x5aa9ff,
    special: { name: 'Tornado', type: 'tornado', cd: 5, energy: 20 }
  },
  diamondhead: {
    name: 'Diamante', icon: '💎', hp: 115, speed: 8.1, dmg: 17, range: 13, arc: 0,
    cd: 0.55, drain: 5, type: 'shard', projSpeed: 29, projColor: 0x4dffe0,
    special: { name: 'Púas de cristal', type: 'spikes', cd: 5, energy: 22 }
  },
  cannonbolt: {
    name: 'Cannonbolt', icon: '🟡', hp: 135, speed: 8.9, dmg: 22, range: 2.4, arc: 2.1,
    cd: 0.5, drain: 5.5, type: 'melee', heavy: true, color: 0xffd166,
    special: { name: 'Rodado arrollador', type: 'roll', cd: 5, energy: 20 }
  },
  upgrade: {
    name: 'Upgrade', icon: '🟢', hp: 105, speed: 8.6, dmg: 14, range: 14, arc: 0,
    cd: 0.38, drain: 5.2, type: 'laser', projSpeed: 46, projColor: 0x4dff9a,
    special: { name: 'Sobrecarga', type: 'chain', cd: 6, energy: 25 }
  },
  waybig: {
    name: 'Way Big', icon: '🦖', hp: 240, speed: 6.3, dmg: 42, range: 3.7, arc: 2.5,
    cd: 0.8, drain: 8, type: 'melee', heavy: true, color: 0x9be8ff,
    special: { name: 'Pisotón sísmico', type: 'stomp', cd: 8, energy: 30 }
  }
};

/* Orden de las tarjetas y teclas 1-7 */
const ALIEN_ORDER = [
  { id: 'heatblast', key: '1' },
  { id: 'fourarms', key: '2' },
  { id: 'xlr8', key: '3' },
  { id: 'diamondhead', key: '4' },
  { id: 'cannonbolt', key: '5' },
  { id: 'upgrade', key: '6' },
  { id: 'waybig', key: '7' }
];

const BASE_ALIENS = ['heatblast', 'fourarms', 'xlr8', 'diamondhead'];

const ENEMY_TYPES = {
  dna: {
    hp: 32, hpG: 9, dmg: 9, dmgG: 1.1, speed: 3.5, radius: 0.85,
    height: 2.15, coins: [3, 6], score: 12, range: 1.9, attackCd: 1.15
  },
  speeder: {
    hp: 20, hpG: 5, dmg: 7, dmgG: 0.8, speed: 6.2, radius: 0.76,
    height: 2.15, coins: [4, 7], score: 14, range: 1.7, attackCd: 1.0
  },
  drone: {
    hp: 26, hpG: 7, dmg: 8, dmgG: 0.9, speed: 3.1, radius: 0.8,
    height: 2.5, coins: [5, 9], score: 18, range: 13, ranged: true, attackCd: 2.2
  },
  brute: {
    hp: 95, hpG: 20, dmg: 17, dmgG: 1.8, speed: 2.4, radius: 1.18,
    height: 2.65, coins: [10, 18], score: 30, range: 2.6, attackCd: 1.7
  },
  boss: {
    hp: 380, hpG: 80, dmg: 24, dmgG: 2.5, speed: 3.0, radius: 1.65,
    height: 3.9, coins: [90, 150], score: 320, range: 3.4, attackCd: 1.5, boss: true
  }
};

const SPAWN_COST = { dna: 1, speeder: 1.15, drone: 1.4, brute: 2.4 };

/* ==================== Personajes comprables con diamantes ==================== */
const CHARACTERS = [
  { id: 'ben',        name: 'Ben Tennyson',   icon: '🧒',  price: 0,   cur: 'coins',  owned: true },
  { id: 'heatblast',  name: 'Heatblast',      icon: '🔥',  price: 0,   cur: 'coins',  owned: true },
  { id: 'fourarms',   name: 'Cuatro Brazos',  icon: '💪',  price: 0,   cur: 'coins',  owned: true },
  { id: 'xlr8',       name: 'XLR8',           icon: '⚡',  price: 0,   cur: 'coins',  owned: true },
  { id: 'diamondhead',name: 'Diamante',       icon: '💎',  price: 0,   cur: 'coins',  owned: true },
  { id: 'cannonbolt', name: 'Cannonbolt',     icon: '🟡',  price: 1200,cur: 'coins',  owned: false },
  { id: 'upgrade',    name: 'Upgrade',        icon: '🟢',  price: 10,  cur: 'gems',   owned: false },
  { id: 'waybig',     name: 'Way Big',        icon: '🦖',  price: 30,  cur: 'gems',   owned: false },
  { id: 'vertigo',    name: 'Verdix',         icon: '👑',  price: 500, cur: 'gems',   owned: false },
  { id: 'neonix',     name: 'Neonix',         icon: '🌟',  price: 800, cur: 'gems',   owned: false },
  { id: 'voidwalker', name: 'Void Walker',    icon: '🕳️',  price: 1200,cur: 'gems',   owned: false }
];

/* ==================== NPCs del Modo Historia ==================== */
const NPCS = [
  { id: 'max', name: 'Max Tennyson', icon: '👴', dialog: [
    '¡Ben! Necesitamos que recojas 5 omnicristales en esta zona.',
    'Ten cuidado con los DNAliens, son peligrosos.',
    'Bien hecho. El Omnitrix está respondiendo bien.'
  ]},
  { id: 'gwen', name: 'Gwen Tennyson', icon: '👧', dialog: [
    'He detectado energía alienígena cerca.',
    'Derrota a 3 enemigos para limpiar el área.',
    '¡Increíble! Tus habilidades mejoran.'
  ]},
  { id: 'azmuth', name: 'Azmuth', icon: '🧠', dialog: [
    'El Omnitrix es mi creación más grande.',
    'Sobrevive hasta la oleada 5 para demostrar tu valía.',
    'Has dominado el Omnitrix. Eres digno.'
  ]}
];

function getCharacter(id) {
  return CHARACTERS.find(c => c.id === id);
}
function isCharacterOwned(id) {
  const c = getCharacter(id);
  if (!c) return false;
  return c.owned || !!SAVE.aliens[id];
}
function unlockCharacter(id) {
  const c = getCharacter(id);
  if (!c) return { ok: false, msg: 'Personaje no encontrado' };
  if (isCharacterOwned(id)) return { ok: false, msg: 'Ya lo tienes' };
  const wallet = c.cur === 'gems' ? SAVE.gems : SAVE.coins;
  if (wallet < c.price) return { ok: false, msg: c.cur === 'gems' ? 'Te faltan diamantes 💎' : 'Te faltan monedas 🪙' };
  if (c.cur === 'gems') SAVE.gems -= c.price; else SAVE.coins -= c.price;
  SAVE.aliens[id] = true;
  saveUserData();
  return { ok: true, msg: '¡Personaje desbloqueado: ' + c.name + '!' };
}

function getNPCDialog(npcId, index) {
  const npc = NPCS.find(n => n.id === npcId);
  if (!npc || index >= npc.dialog.length) return null;
  return { name: npc.name, icon: npc.icon, text: npc.dialog[index] };
}

const POWERS = [
  { id: 'shield', icon: '🛡️', name: 'Escudo', dur: 7 },
  { id: 'rapid', icon: '⚡', name: 'Furia', dur: 8 },
  { id: 'magnet', icon: '🧲', name: 'Imán', dur: 10 },
  { id: 'x2', icon: '💰', name: 'Monedas x2', dur: 12 },
  { id: 'rage', icon: '🔥', name: 'Rabia', dur: 10 }
];

const ARENA_RADIUS = 23.4;
