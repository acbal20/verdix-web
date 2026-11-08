/* ============================================================
   BEN 10 · OMNITRIX BATTLE 3D
   Combate, poderes, enemigos, proyectiles, botines y VFX
   ============================================================ */

function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}

function nearestEnemy(x, z, maxDist) {
  let best = null, bd = maxDist == null ? Infinity : maxDist;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.pos.x - x, e.pos.z - z);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

/* ------------------------------------------------------------
   ataque básico
   ------------------------------------------------------------ */
function playerAttack() {
  if (!P || P.dead) return;
  const f = FORMS[P.form];
  if (P.attackCd > 0) return;

  P.attackCd = f.cd * (P.rapidT > 0 ? 0.48 : 1);
  P.attackAnim = 0.3;

  const reach = f.type === 'melee' ? f.range + 2.2 : 32;
  const target = nearestEnemy(P.pos.x, P.pos.z, reach);
  let ang = P.facing;
  if (target) ang = Math.atan2(target.pos.x - P.pos.x, target.pos.z - P.pos.z);
  P.facing = ang;

  if (f.type === 'melee') {
    AudioEngine.sfx(f.heavy ? 'heavy' : 'punch');
    meleeArc(f, ang);
    const ox = Math.sin(ang) * (P.radius + 0.8);
    const oz = Math.cos(ang) * (P.radius + 0.8);
    Engine.burst(P.pos.x + ox, 1.1, P.pos.z + oz, f.heavy ? 0xff9b6b : 0xd8ffe9, 7, 4, 0.3, 0.35, 7);
  } else {
    const cfg = {
      fire: { sfx: 'fire', color: 0xff7a16, shape: 'fire', size: 0.26, trail: true },
      shard: { sfx: 'ice', color: 0x4dffe0, shape: 'shard', size: 0.24, trail: true },
      laser: { sfx: 'laser', color: 0x4dff9a, shape: 'laser', size: 0.18, trail: true }
    }[f.type] || { sfx: 'laser', color: 0xffffff, shape: 'laser', size: 0.2 };
    AudioEngine.sfx(cfg.sfx);
    spawnProjectile({
      x: P.pos.x + Math.sin(ang) * (P.radius + 0.4),
      y: 1.25,
      z: P.pos.z + Math.cos(ang) * (P.radius + 0.4),
      dx: Math.sin(ang), dz: Math.cos(ang),
      speed: f.projSpeed, dmg: f.dmg * damageMul(),
      radius: 0.3, color: cfg.color, shape: cfg.shape, size: cfg.size,
      from: 'player', trail: cfg.trail
    });
  }
}

function meleeArc(f, ang) {
  const arc = f.arc || 1.9;
  const dmg = f.dmg * damageMul();
  let hits = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = distXZ(e.pos, P.pos);
    if (d > f.range + e.radius + 0.45) continue;
    const a = Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
    if (angleDiff(a, ang) > arc * 0.5) continue;
    const nx = (e.pos.x - P.pos.x) / Math.max(0.001, d);
    const nz = (e.pos.z - P.pos.z) / Math.max(0.001, d);
    damageEnemy(e, dmg, nx * (f.heavy ? 9 : 4.5), nz * (f.heavy ? 9 : 4.5), { color: '#ffd166' });
    hits++;
  }
  if (hits > 0 && f.heavy) Engine.addShake(0.3);
  if (hits >= 2) {
    Engine.explode(P.pos.x, P.pos.z, f.color, false);
    AudioEngine.sfx('power');
  }
}

/* ------------------------------------------------------------
   poderes especiales
   ------------------------------------------------------------ */
function useSpecial() {
  if (!P || P.dead) return;
  const f = FORMS[P.form];
  if (!f.special) {
    AudioEngine.sfx('error');
    UI.toast('Ben no tiene poder. ¡Transformate con 1–7!');
    return;
  }
  if (P.specialCd > 0) {
    AudioEngine.sfx('error');
    return;
  }
  if (G.omni < f.special.energy) {
    AudioEngine.sfx('error');
    UI.toast('Sin energía para ' + f.special.name);
    return;
  }

  G.omni -= f.special.energy;
  P.specialCd = f.special.cd;
  const t = f.special.type;
  const m = damageMul();

  if (t === 'nova') {
    shockwave(P.pos.x, P.pos.z, 0xff7a16, 7.2, 0.55);
    Engine.burst(P.pos.x, 1.0, P.pos.z, 0xff7a16, 60, 11, 0.6, 0.8, 8);
    Engine.addShake(0.7);
    AudioEngine.sfx('fire');
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = distXZ(e.pos, P.pos);
      if (d > 7.2 + e.radius) continue;
      const nx = (e.pos.x - P.pos.x) / Math.max(0.001, d);
      const nz = (e.pos.z - P.pos.z) / Math.max(0.001, d);
      damageEnemy(e, 52 * m, nx * 10, nz * 10, { color: '#ff9f43', stun: 0.35 });
    }
  } else if (t === 'slam') {
    shockwave(P.pos.x, P.pos.z, 0xffd166, 6.8, 0.6);
    Engine.burst(P.pos.x, 0.4, P.pos.z, 0xffd166, 54, 10, 0.55, 0.8, 10);
    Engine.addShake(1.15);
    AudioEngine.sfx('heavy');
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = distXZ(e.pos, P.pos);
      if (d > 6.8 + e.radius) continue;
      const nx = (e.pos.x - P.pos.x) / Math.max(0.001, d);
      const nz = (e.pos.z - P.pos.z) / Math.max(0.001, d);
      damageEnemy(e, 72 * m, nx * 12, nz * 12, { color: '#ffd166', stun: 1.0 });
    }
  } else if (t === 'tornado') {
    startSpin('tornado', 0.68, 0.8);
    AudioEngine.sfx('dash');
    Engine.burst(P.pos.x, 1.0, P.pos.z, 0x5aa9ff, 30, 7, 0.4, 0.6, 5);
  } else if (t === 'spikes') {
    AudioEngine.sfx('ice');
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + P.facing;
      spawnProjectile({
        x: P.pos.x + Math.sin(a) * 0.8, y: 1.2, z: P.pos.z + Math.cos(a) * 0.8,
        dx: Math.sin(a), dz: Math.cos(a),
        speed: 24, dmg: 22 * m, radius: 0.32,
        color: 0x4dffe0, shape: 'shard', size: 0.28, from: 'player', trail: true
      });
    }
  } else if (t === 'roll') {
    startSpin('roll', 0.85, 0.85);
    AudioEngine.sfx('heavy');
    Engine.burst(P.pos.x, 0.7, P.pos.z, 0xffd166, 26, 6, 0.45, 0.6, 6);
  } else if (t === 'chain') {
    AudioEngine.sfx('laser');
    Engine.addShake(0.35);
    const list = G.enemies.filter(e => !e.dead).map(e => ({ e, d: distXZ(e.pos, P.pos) }))
      .filter(o => o.d < 13).sort((a, b) => a.d - b.d).slice(0, 6);
    for (const o of list) {
      spawnBeam(P.pos.x, 1.35, P.pos.z, o.e.pos.x, 1.2, o.e.pos.z, 0x4dff9a);
      damageEnemy(o.e, 46 * m, 0, 0, { color: '#4dff9a', stun: 0.5 });
      Engine.burst(o.e.pos.x, 1.2, o.e.pos.z, 0x4dff9a, 12, 5, 0.4, 0.45, 6);
    }
  } else if (t === 'stomp') {
    shockwave(P.pos.x, P.pos.z, 0x9be8ff, 11, 0.75);
    Engine.burst(P.pos.x, 0.4, P.pos.z, 0x9be8ff, 80, 13, 0.7, 0.9, 12);
    Engine.addShake(1.8);
    AudioEngine.sfx('heavy');
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = distXZ(e.pos, P.pos);
      if (d > 11 + e.radius) continue;
      const nx = (e.pos.x - P.pos.x) / Math.max(0.001, d);
      const nz = (e.pos.z - P.pos.z) / Math.max(0.001, d);
      damageEnemy(e, 95 * m, nx * 14, nz * 14, { color: '#9be8ff', stun: 1.4 });
    }
  } else if (t === 'stomp') {
    /* reservado */
  }

  UI.refresh();
}

function startSpin(kind, dur, invuln) {
  P.spinType = kind;
  P.spinT = dur;
  P.spinTick = 0;
  P.invuln = Math.max(P.invuln, invuln);
  const f = FORMS[P.form];
  const t = nearestEnemy(P.pos.x, P.pos.z, 40);
  let ang = P.facing;
  if (t) ang = Math.atan2(t.pos.x - P.pos.x, t.pos.z - P.pos.z);
  P.facing = ang;
  P.dashDir.set(Math.sin(ang), 0, Math.cos(ang));
}

function spinDamage() {
  if (!P) return;
  const R = P.spinType === 'roll' ? 3.3 : 2.7;
  const dmg = (P.spinType === 'roll' ? 28 : 16) * damageMul();
  let hit = false;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (distXZ(e.pos, P.pos) > R + e.radius) continue;
    const ang = Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
    damageEnemy(e, dmg, Math.sin(ang) * 6, Math.cos(ang) * 6, {
      color: P.spinType === 'roll' ? '#ffd166' : '#5aa9ff', stun: 0.2
    });
    hit = true;
  }
  if (hit) Engine.addShake(0.16);
  Engine.burst(
    P.pos.x + rand(-0.4, 0.4), 0.8, P.pos.z + rand(-0.4, 0.4),
    P.spinType === 'roll' ? 0xffd166 : 0x5aa9ff, 3, 3, 0.28, 0.28, 5
  );
}

function dash() {
  if (!P || P.dead) return;
  if (P.dashCd > 0) { AudioEngine.sfx('error'); return; }
  P.dashCd = 2.1;
  P.dashT = 0.18;
  P.invuln = Math.max(P.invuln, 0.3);
  let mx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + input.joy.x;
  let mz = (keys.s ? 1 : 0) - (keys.w ? 1 : 0) + input.joy.y;
  if (Math.hypot(mx, mz) < 0.1) {
    mx = Math.sin(P.facing); mz = Math.cos(P.facing);
  }
  const l = Math.max(0.001, Math.hypot(mx, mz));
  P.dashDir.set(mx / l, 0, mz / l);
  AudioEngine.sfx('dash');
  Engine.burst(P.pos.x, 0.6, P.pos.z, 0x9be8ff, 12, 5, 0.35, 0.4, 7);
}

/* ------------------------------------------------------------
   proyectiles
   ------------------------------------------------------------ */
function projectileGeo(shape, size) {
  if (shape === 'shard') return Gfx.octa(size);
  return Gfx.sphere(size, 12);
}

function spawnProjectile(o) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: o.color, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const mesh = new THREE.Mesh(projectileGeo(o.shape, o.size || 0.24), mat);
  group.add(mesh);
  const glow = Models.glowSprite(group, o.color, (o.size || 0.24) * 6, 0, 0, 0, 0.7);
  group.position.set(o.x, o.y, o.z);
  Engine.scene.add(group);

  G.projectiles.push({
    group, pos: new THREE.Vector3(o.x, o.y, o.z),
    vx: o.dx * o.speed, vz: o.dz * o.speed,
    dmg: o.dmg, radius: o.radius || 0.3,
    from: o.from, life: o.life || 2.4, color: o.color,
    trail: !!o.trail, trailT: 0, dead: false, size: o.size || 0.24
  });
}

function spawnEnemyProjectile(e, spread) {
  const dx = P.pos.x - e.pos.x;
  const dz = P.pos.z - e.pos.z;
  const l = Math.max(0.001, Math.hypot(dx, dz));
  let ax = dx / l, az = dz / l;
  if (spread) {
    const c = Math.cos(spread), s = Math.sin(spread);
    const nx = ax * c - az * s;
    const nz = ax * s + az * c;
    ax = nx; az = nz;
  }
  const isBoss = e.type === 'boss';
  const color = isBoss ? 0xff2e5a : 0xff4d6d;
  spawnProjectile({
    x: e.pos.x + ax * (e.radius + 0.4),
    y: isBoss ? 2.4 : 1.7,
    z: e.pos.z + az * (e.radius + 0.4),
    dx: ax, dz: az,
    speed: isBoss ? 15 : 13,
    dmg: e.dmg, radius: isBoss ? 0.38 : 0.28,
    color, shape: 'orb', size: isBoss ? 0.34 : 0.22,
    from: 'enemy', life: 3.2
  });
}

function updateProjectiles(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    pr.life -= dt;
    pr.pos.x += pr.vx * dt;
    pr.pos.z += pr.vz * dt;
    pr.group.position.copy(pr.pos);
    pr.group.rotation.y += dt * 8;

    if (pr.trail) {
      pr.trailT -= dt;
      if (pr.trailT <= 0) {
        pr.trailT = 0.05;
        Engine.burst(pr.pos.x, pr.pos.y, pr.pos.z, pr.color, 1, 1.2, pr.size * 0.7, 0.25, 0);
      }
    }

    let hit = false;
    if (pr.from === 'player') {
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.pos.x - pr.pos.x, e.pos.z - pr.pos.z) < pr.radius + e.radius) {
          const l = Math.max(0.001, Math.hypot(pr.vx, pr.vz));
          damageEnemy(e, pr.dmg, (pr.vx / l) * 4, (pr.vz / l) * 4, { color: '#ffd166' });
          Engine.burst(pr.pos.x, pr.pos.y, pr.pos.z, pr.color, 8, 4, 0.35, 0.35, 5);
          hit = true;
          break;
        }
      }
    } else if (P && !P.dead) {
      if (Math.hypot(P.pos.x - pr.pos.x, P.pos.z - pr.pos.z) < P.radius * 0.85 + pr.radius) {
        hurtPlayer(pr.dmg);
        Engine.burst(pr.pos.x, pr.pos.y, pr.pos.z, pr.color, 10, 4, 0.4, 0.4, 5);
        hit = true;
      }
    }

    const outside = Math.hypot(pr.pos.x, pr.pos.z) > 30;
    if (hit || pr.life <= 0 || outside) {
      Engine.scene.remove(pr.group);
      pr.group.traverse(o => {
        if (o.material && o.material.dispose) o.material.dispose();
      });
      G.projectiles.splice(i, 1);
    }
  }
}

/* ------------------------------------------------------------
   enemigos
   ------------------------------------------------------------ */
function updateEnemies(dt) {
  if (!P) return;

  for (const e of G.enemies) {
    if (e.dead) continue;
    const def = e.typeDef;
    e.attackCd = Math.max(0, e.attackCd - dt);
    e.attackAnim = Math.max(0, e.attackAnim - dt);
    e.stun = Math.max(0, e.stun - dt);

    const dx = P.pos.x - e.pos.x;
    const dz = P.pos.z - e.pos.z;
    const d = Math.max(0.001, Math.hypot(dx, dz));
    const nx = dx / d, nz = dz / d;

    if (e.stun <= 0 && !P.dead) {
      let mvx = 0, mvz = 0;
      if (e.type === 'drone') {
        if (d > 9.5) { mvx = nx; mvz = nz; }
        else if (d < 6) { mvx = -nx; mvz = -nz; }
        else { mvx = -nz * 0.6; mvz = nx * 0.6; }
      } else if (e.type === 'boss') {
        if (d > 4) { mvx = nx; mvz = nz; }
      } else {
        mvx = nx; mvz = nz;
      }
      e.pos.x += (mvx * e.speed + e.kx) * dt;
      e.pos.z += (mvz * e.speed + e.kz) * dt;

      // ataques
      if (e.attackCd <= 0) {
        if (def.ranged) {
          if (d < 14) {
            enemyShoot(e, 0);
            if (e.type === 'boss') enemyShoot(e, 0.16);
            if (e.type === 'boss') enemyShoot(e, -0.16);
            e.attackCd = def.attackCd * rand(0.85, 1.25);
          }
        } else if (d < def.range + e.radius + P.radius + 0.35) {
          enemyMelee(e);
        }
      }
    } else {
      e.pos.x += e.kx * dt;
      e.pos.z += e.kz * dt;
    }

    e.kx *= Math.exp(-6 * dt);
    e.kz *= Math.exp(-6 * dt);

    const rr = Math.hypot(e.pos.x, e.pos.z);
    if (rr > ARENA_RADIUS) {
      e.pos.x = (e.pos.x / rr) * ARENA_RADIUS;
      e.pos.z = (e.pos.z / rr) * ARENA_RADIUS;
    }

    const ang = Math.atan2(dx, dz);
    e.model.group.position.set(e.pos.x, 0, e.pos.z);
    e.model.group.rotation.y = ang;
    if (e.type === 'drone') {
      e.hoverPhase += dt * 3;
      const hover = e.model.parts.hover;
      if (hover) hover.position.y = 1.75 + Math.sin(e.hoverPhase) * 0.18;
    }
    e.walk += dt * (4 + e.speed * 0.75);
    animateModel(e.model, e.walk, d > def.range + e.radius + 0.6, e.attackAnim, 0);

    e.shadow.position.set(e.pos.x, 0.05, e.pos.z);
    e.shadow.scale.set(e.radius * 2.4, e.radius * 2.4, 1);

    if (e.bar) {
      const ratio = clamp(e.hp / e.maxHp, 0, 1);
      e.bar.group.visible = ratio < 0.999 && e.type !== 'boss';
      if (e.bar.group.visible) {
        e.bar.group.position.set(e.pos.x, e.height + 0.45, e.pos.z);
        e.bar.group.quaternion.copy(Engine.camera.quaternion);
        e.bar.fill.scale.x = Math.max(0.02, ratio);
        e.bar.fill.position.x = -(1 - ratio) * 0.5;
      }
    }
  }

  // separación simple entre enemigos
  const list = G.enemies;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead) continue;
      let ddx = b.pos.x - a.pos.x;
      let ddz = b.pos.z - a.pos.z;
      let dd = Math.hypot(ddx, ddz);
      const min = (a.radius + b.radius) * 0.82;
      if (dd < min && dd > 0.0001) {
        const push = (min - dd) * 0.5;
        ddx /= dd; ddz /= dd;
        a.pos.x -= ddx * push; a.pos.z -= ddz * push;
        b.pos.x += ddx * push; b.pos.z += ddz * push;
      }
    }
  }
}

function enemyMelee(e) {
  e.attackCd = e.typeDef.attackCd * rand(0.9, 1.3);
  e.attackAnim = 0.3;
  if (!P || P.dead) return;
  const d = distXZ(e.pos, P.pos);
  if (d < e.typeDef.range + e.radius + P.radius + 0.5) {
    hurtPlayer(e.dmg);
    Engine.burst(P.pos.x, 1.2, P.pos.z, 0xff5d6d, 8, 4, 0.35, 0.4, 5);
  }
  AudioEngine.sfx(e.type === 'brute' ? 'heavy' : 'punch');
}

function enemyShoot(e, spread) {
  spawnEnemyProjectile(e, spread);
  if (G.time > G.lastShotSfx + 0.09) {
    G.lastShotSfx = G.time;
    AudioEngine.sfx('laser');
  }
}

/* ------------------------------------------------------------
   daño al jugador
   ------------------------------------------------------------ */
function hurtPlayer(amount) {
  if (!P || P.dead || G.state !== 'playing') return;
  if (P.invuln > 0) return;

  let dmg = Math.max(1, amount);
  if (P.shieldT > 0) {
    dmg *= 0.22;
    AudioEngine.sfx('shield');
    Engine.burst(P.pos.x, 1.2, P.pos.z, 0x66e8ff, 9, 4, 0.42, 0.45, 5);
  }
  P.invuln = 0.28;
  P.hp = Math.max(0, P.hp - dmg);
  P.hitAnim = 0.3;

  Engine.popText(P.pos.x, 2.55, P.pos.z, '-' + Math.round(dmg), '#ff6b7a');
  Engine.burst(P.pos.x, 1.15, P.pos.z, 0xff5d6d, 7, 3.5, 0.34, 0.4, 6);
  Engine.addShake(Math.min(1.6, 0.45 + dmg * 0.015));
  UI.hurtFlash();
  UI.screenFlash('#ff3b3b');
  AudioEngine.sfx('hurt');

  if (P.hp <= 0) playerDown();
  UI.refresh();
}

/* ------------------------------------------------------------
   daño y muerte
   ------------------------------------------------------------ */
function damageEnemy(e, dmg, kx, kz, opts) {
  if (e.dead) return;
  opts = opts || {};
  const crit = opts.crit || (Math.random() < 0.08 + (SAVE.up.luck | 0) * 0.012);
  const finalDmg = crit ? Math.round(dmg * 1.75) : Math.round(dmg);
  e.hp -= finalDmg;
  e.kx += kx || 0;
  e.kz += kz || 0;
  if (opts.stun) e.stun = Math.max(e.stun, opts.stun);

  Engine.popText(e.pos.x, e.height + 0.35, e.pos.z, String(finalDmg),
    crit ? '#ffffff' : (opts.color || '#ffd166'), crit);
  Engine.hitFlash(e.model.group, crit ? 0xffffff : 0xffd166);
  Engine.burst(e.pos.x, Math.min(2.2, e.height * 0.6), e.pos.z,
    crit ? 0xffffff : 0xffd166, crit ? 8 : 4, crit ? 6 : 3, crit ? 0.4 : 0.26, 0.3, 6);

  if (G.time > G.lastHitSfx + 0.045) {
    G.lastHitSfx = G.time;
    AudioEngine.sfx(crit ? 'crit' : 'hit');
  }

  if (e.type === 'boss' && G.boss) {
    // la barra se actualiza en UI
  }

  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  const def = e.typeDef;

  addScore(def.score);
  G.kills++;
  SAVE.totalKills = (SAVE.totalKills | 0) + 1;

  const big = e.type === 'boss';
  AudioEngine.sfx(big ? 'win' : 'kill');
  Engine.explode(e.pos.x, e.pos.z, e.type === 'boss' ? 0xff3b5c : 0x63ff96, big);
  if (big) {
    Engine.addShake(1.8);
    shockwave(e.pos.x, e.pos.z, 0xff3b5c, 9, 0.8);
    AudioEngine.sfx('win');
    const bonus = earnCoins(120);
    earnGems(2);
    UI.banner('VILGAX DERROTADO', '+' + bonus + ' monedas · +2 cristales 💎', 2.6);
    G.boss = null;
    UI.boss(false);
  } else if (G.combo >= 5) {
    AudioEngine.sfx('power');
    UI.toast('💥 Racha x' + G.combo + '! +' + def.score + ' pts');
  }

  dropLoot(e);
}

/* ------------------------------------------------------------
   botines
   ------------------------------------------------------------ */
function rollDrop() {
  const table = dropChances();
  let r = Math.random() * 100, acc = 0;
  for (const d of table) {
    acc += d.pct;
    if (r <= acc) return d.id;
  }
  return 'nothing';
}

function dropLoot(e) {
  const x = e.pos.x, z = e.pos.z;

  if (e.type === 'boss') {
    spawnPickup('gem', x + 0.8, z, 1);
    spawnPickup('coin', x - 0.9, z, randi(40, 70));
    spawnPickup('health', x, z + 0.9, 1);
    spawnPickup('power', x, z - 0.9, 1, pickPower());
    return;
  }

  const id = rollDrop();
  if (id === 'nothing') return;

  if (id === 'coins') {
    const base = e.typeDef.coins;
    spawnPickup('coin', x, z, randi(base[0], base[1]) + Math.floor(G.wave * 0.5));
  } else if (id === 'health') {
    spawnPickup('health', x, z, 1);
  } else if (id === 'energy') {
    spawnPickup('energy', x, z, 1);
  } else if (id === 'gem') {
    spawnPickup('gem', x, z, 1);
  } else if (id === 'power') {
    spawnPickup('power', x, z, 1, pickPower());
  }
}

function pickPower() {
  return POWERS[Math.floor(Math.random() * POWERS.length)].id;
}

function spawnPickup(type, x, z, value, power) {
  const group = new THREE.Group();
  let color = 0xffd166;

  if (type === 'coin') {
    color = 0xffd166;
    const coin = new THREE.Mesh(Gfx.cyl(0.27, 0.27, 0.09, 14),
      Gfx.mat(0xffd166, { emissive: 0x8a5a00, emissiveIntensity: 1.2 }));
    coin.rotation.x = Math.PI / 2;
    group.add(coin);
    const rim = new THREE.Mesh(Gfx.torus(0.27, 0.035, 16), Gfx.glow(0xfff0a0, 0.8));
    rim.rotation.x = Math.PI / 2;
    group.add(rim);
  } else if (type === 'gem') {
    color = 0xc77dff;
    const gem = new THREE.Mesh(Gfx.octa(0.32), Gfx.mat(0xc77dff, { emissive: 0xa020ff, emissiveIntensity: 1.5 }));
    group.add(gem);
  } else if (type === 'health') {
    color = 0x5dff9a;
    const orb = new THREE.Mesh(Gfx.sphere(0.27, 12), Gfx.mat(0x5dff9a, { emissive: 0x1f9f4e, emissiveIntensity: 1.1 }));
    group.add(orb);
    const crossMat = Gfx.glow(0xeafff2, 0.95);
    group.add(new THREE.Mesh(Gfx.box(0.34, 0.09, 0.09), crossMat));
    group.add(new THREE.Mesh(Gfx.box(0.09, 0.34, 0.09), crossMat));
  } else if (type === 'energy') {
    color = 0x5ce1ff;
    const orb = new THREE.Mesh(Gfx.sphere(0.25, 12), Gfx.mat(0x5ce1ff, { emissive: 0x0b8fb5, emissiveIntensity: 1.3 }));
    group.add(orb);
    const ring = new THREE.Mesh(Gfx.torus(0.34, 0.03, 16), Gfx.glow(0xbdf6ff, 0.8));
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  } else {
    color = 0xff9f43;
    const star = new THREE.Mesh(Gfx.octa(0.3), Gfx.mat(0xff9f43, { emissive: 0xc25700, emissiveIntensity: 1.4 }));
    group.add(star);
  }

  Models.glowSprite(group, color, 1.5, 0, 0, 0, 0.55);
  group.position.set(x, 0.85, z);
  Engine.scene.add(group);

  G.pickups.push({
    type, group, value: value || 1, power: power || null,
    pos: new THREE.Vector3(x, 0.85, z),
    life: 30, phase: Math.random() * TAU, dead: false
  });
}

function updatePickups(dt) {
  if (!P) return;
  const mag = magnetRadius();

  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const pk = G.pickups[i];
    pk.life -= dt;
    pk.phase += dt;

    if (pk.life <= 0) {
      Engine.scene.remove(pk.group);
      G.pickups.splice(i, 1);
      continue;
    }

    const d = distXZ(pk.pos, P.pos);
    if (d < mag) {
      const nx = (P.pos.x - pk.pos.x) / Math.max(0.001, d);
      const nz = (P.pos.z - pk.pos.z) / Math.max(0.001, d);
      const pull = 7.5 + (mag - d) * 2.2;
      pk.pos.x += nx * pull * dt;
      pk.pos.z += nz * pull * dt;
    }

    if (d < (P.radius * 0.75 + 0.6)) {
      collectPickup(pk);
      Engine.scene.remove(pk.group);
      G.pickups.splice(i, 1);
      continue;
    }

    pk.group.position.set(pk.pos.x, 0.85 + Math.sin(pk.phase * 3) * 0.16, pk.pos.z);
    pk.group.rotation.y += dt * 2.2;
    pk.group.visible = pk.life > 5 || Math.sin(pk.phase * 22) > -0.15;
  }
}

function collectPickup(pk) {
  if (!P) return;
  if (pk.type === 'coin') {
    const mult = P.x2T > 0 ? 2 : 1;
    const got = earnCoins(pk.value * mult);
    Engine.popText(pk.pos.x, 1.35, pk.pos.z + 0.4, '+' + got, '#ffd166');
    AudioEngine.sfx('coin');
    Engine.burst(pk.pos.x, 1.0, pk.pos.z, 0xffd166, 6, 3, 0.25, 0.4, 4);
  } else if (pk.type === 'gem') {
    earnGems(pk.value);
    Engine.popText(pk.pos.x, 1.35, pk.pos.z + 0.4, '+' + pk.value + ' 💎', '#c77dff');
    AudioEngine.sfx('gem');
    Engine.burst(pk.pos.x, 1.0, pk.pos.z, 0xc77dff, 10, 4, 0.3, 0.5, 4);
  } else if (pk.type === 'health') {
    const heal = Math.min(P.maxHp - P.hp, P.maxHp * 0.22);
    P.hp = Math.min(P.maxHp, P.hp + heal);
    Engine.popText(pk.pos.x, 1.35, pk.pos.z + 0.4, '+' + Math.round(heal), '#5dff9a');
    AudioEngine.sfx('heal');
    Engine.burst(pk.pos.x, 1.0, pk.pos.z, 0x5dff9a, 8, 4, 0.3, 0.5, 4);
  } else if (pk.type === 'energy') {
    G.omni = Math.min(omniMaxOf(), G.omni + 30);
    Engine.popText(pk.pos.x, 1.35, pk.pos.z + 0.4, '+30', '#5ce1ff');
    AudioEngine.sfx('pickup');
    Engine.burst(pk.pos.x, 1.0, pk.pos.z, 0x5ce1ff, 8, 4, 0.3, 0.5, 4);
  } else if (pk.type === 'power') {
    applyPower(pk.power);
    AudioEngine.sfx('power');
    Engine.burst(pk.pos.x, 1.0, pk.pos.z, 0xff9f43, 12, 5, 0.35, 0.55, 4);
  }
  UI.refresh();
}

function applyPower(id) {
  if (!P) return;
  const p = POWERS.find(x => x.id === id) || POWERS[0];
  if (id === 'shield') P.shieldT = Math.max(P.shieldT, p.dur);
  else if (id === 'rapid') P.rapidT = Math.max(P.rapidT, p.dur);
  else if (id === 'magnet') P.magnetT = Math.max(P.magnetT, p.dur);
  else if (id === 'x2') P.x2T = Math.max(P.x2T, p.dur);
  else if (id === 'rage') P.rageT = Math.max(P.rageT, p.dur);
  Engine.popText(P.pos.x, 2.4, P.pos.z, p.icon + ' ' + p.name, '#ff9f43');
  UI.toast(p.icon + ' ' + p.name + ' activado');
  UI.refresh();
}

/* ------------------------------------------------------------
   VFX
   ------------------------------------------------------------ */
function shockwave(x, z, color, radius, life) {
  const geo = new THREE.RingGeometry(0.86, 1.02, 56);
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.13, z);
  m.scale.setScalar(0.6);
  Engine.scene.add(m);
  G.vfx.push({ mesh: m, kind: 'ring', life: life || 0.55, max: life || 0.55, grow: radius || 5 });
}

function spawnBeam(x1, y1, z1, x2, y2, z2, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x1, y1, z1),
    new THREE.Vector3(x2, y2, z2)
  ]);
  const mat = new THREE.LineBasicMaterial({
    color, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const line = new THREE.Line(geo, mat);
  Engine.scene.add(line);
  G.vfx.push({ mesh: line, kind: 'beam', life: 0.22, max: 0.22, grow: 0 });
}

function updateVFX(dt) {
  for (let i = G.vfx.length - 1; i >= 0; i--) {
    const v = G.vfx[i];
    v.life -= dt;
    if (v.life <= 0) {
      Engine.scene.remove(v.mesh);
      if (v.mesh.geometry) v.mesh.geometry.dispose();
      if (v.mesh.material) v.mesh.material.dispose();
      G.vfx.splice(i, 1);
      continue;
    }
    const f = v.life / v.max;
    if (v.kind === 'ring') {
      v.mesh.scale.setScalar(0.6 + (1 - f) * v.grow);
      v.mesh.material.opacity = f * 0.85;
    } else {
      v.mesh.material.opacity = f;
    }
  }
}
