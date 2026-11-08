/* ============================================================
   BEN 10 · OMNITRIX BATTLE 3D
   Motor de render, arena, cámara, partículas y textos flotantes
   ============================================================ */

/* ---------- caché de materiales, geometrías y texturas ---------- */
const Gfx = (function () {
  const mats = new Map();
  const geos = new Map();
  const tex = {};

  function mat(color, opts) {
    const key = color + '|' + JSON.stringify(opts || {});
    if (!mats.has(key)) {
      mats.set(key, new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {})));
    }
    return mats.get(key);
  }

  function glow(color, opacity) {
    const op = opacity == null ? 1 : opacity;
    const key = 'g' + color + '|' + op;
    if (!mats.has(key)) {
      mats.set(key, new THREE.MeshBasicMaterial({
        color, transparent: op < 1, opacity: op,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
    }
    return mats.get(key);
  }

  function solid(color) {
    const key = 's' + color;
    if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color }));
    return mats.get(key);
  }

  function box(w, h, d) {
    const k = 'b' + w + ',' + h + ',' + d;
    if (!geos.has(k)) geos.set(k, new THREE.BoxGeometry(w, h, d));
    return geos.get(k);
  }
  function sphere(r, seg) {
    const s = seg || 10;
    const k = 'sp' + r + ',' + s;
    if (!geos.has(k)) geos.set(k, new THREE.SphereGeometry(r, s, Math.max(6, Math.floor(s * 0.7))));
    return geos.get(k);
  }
  function cyl(rt, rb, h, seg) {
    const s = seg || 8;
    const k = 'c' + rt + ',' + rb + ',' + h + ',' + s;
    if (!geos.has(k)) geos.set(k, new THREE.CylinderGeometry(rt, rb, h, s));
    return geos.get(k);
  }
  function cone(r, h, seg) {
    const s = seg || 8;
    const k = 'co' + r + ',' + h + ',' + s;
    if (!geos.has(k)) geos.set(k, new THREE.ConeGeometry(r, h, s));
    return geos.get(k);
  }
  function plane(w, h) {
    const k = 'p' + w + ',' + h;
    if (!geos.has(k)) geos.set(k, new THREE.PlaneGeometry(w, h));
    return geos.get(k);
  }
  function octa(r) {
    const k = 'oct' + r;
    if (!geos.has(k)) geos.set(k, new THREE.OctahedronGeometry(r, 0));
    return geos.get(k);
  }
  function torus(r, tube, seg) {
    const k = 't' + r + ',' + tube + ',' + seg;
    if (!geos.has(k)) geos.set(k, new THREE.TorusGeometry(r, tube, 8, seg || 16));
    return geos.get(k);
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function radialTexture(inner, outer) {
    const key = 'rad' + inner + outer;
    if (tex[key]) return tex[key];
    const c = makeCanvas(128, 128);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    grd.addColorStop(0, inner || 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, outer || 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    tex[key] = t;
    return t;
  }

  function shadowTexture() {
    if (tex.shadow) return tex.shadow;
    const c = makeCanvas(128, 128);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(0.55, 'rgba(0,0,0,0.28)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    tex.shadow = new THREE.CanvasTexture(c);
    return tex.shadow;
  }

  function groundTexture() {
    if (tex.ground) return tex.ground;
    const c = makeCanvas(512, 512);
    const g = c.getContext('2d');
    g.fillStyle = '#07120c';
    g.fillRect(0, 0, 512, 512);
    // paneles
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const v = 8 + ((x * 7 + y * 13) % 9);
        g.fillStyle = `rgb(${v + 4},${v + 18},${v + 10})`;
        g.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
      }
    }
    // rejilla
    g.strokeStyle = 'rgba(70,255,160,0.10)';
    g.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke();
    }
    // líneas brillantes
    g.strokeStyle = 'rgba(90,255,180,0.16)';
    g.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = 40 + i * 104;
      g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
    }
    // circuito decorativo
    g.strokeStyle = 'rgba(80,255,170,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const x = (i * 97) % 512, y = (i * 173) % 512;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 40, y);
      g.lineTo(x + 60, y + 20);
      g.lineTo(x + 60, y + 60);
      g.stroke();
      g.fillStyle = 'rgba(120,255,200,0.5)';
      g.fillRect(x + 58, y + 58, 5, 5);
    }
    // ruido
    for (let i = 0; i < 2400; i++) {
      const a = Math.random() * 0.05;
      g.fillStyle = Math.random() > 0.5 ? `rgba(120,255,190,${a})` : `rgba(0,0,0,${a})`;
      g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(9, 9);
    t.anisotropy = 4;
    t.colorSpace = THREE.SRGBColorSpace;
    tex.ground = t;
    return t;
  }

  function wallTexture() {
    if (tex.wall) return tex.wall;
    const c = makeCanvas(256, 256);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, 'rgba(40,255,150,0.02)');
    grd.addColorStop(0.65, 'rgba(50,255,160,0.16)');
    grd.addColorStop(0.92, 'rgba(90,255,190,0.55)');
    grd.addColorStop(1, 'rgba(160,255,215,0.85)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(120,255,200,0.35)';
    g.lineWidth = 2;
    for (let x = 0; x < 256; x += 32) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke();
    }
    for (let y = 64; y < 256; y += 48) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 1);
    t.colorSpace = THREE.SRGBColorSpace;
    tex.wall = t;
    return t;
  }

  function emblemTexture() {
    if (tex.emblem) return tex.emblem;
    const c = makeCanvas(512, 512);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 512);
    g.translate(256, 256);
    g.strokeStyle = '#63ffa8';
    g.shadowColor = '#3dff8b';
    g.shadowBlur = 26;
    g.lineWidth = 10;
    g.beginPath(); g.arc(0, 0, 200, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 176, 0, Math.PI * 2); g.stroke();
    // reloj de arena
    g.beginPath();
    g.moveTo(-110, -110); g.lineTo(110, -110);
    g.lineTo(22, 0); g.lineTo(110, 110);
    g.lineTo(-110, 110); g.lineTo(-22, 0);
    g.closePath(); g.stroke();
    g.fillStyle = 'rgba(90,255,170,0.12)';
    g.fill();
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(-84, -84); g.lineTo(84, -84); g.lineTo(-84, 84); g.lineTo(84, 84); g.stroke();
    // diez
    g.shadowBlur = 12;
    g.fillStyle = '#9cffcb';
    g.font = 'bold 86px Trebuchet MS, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('10', 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    tex.emblem = t;
    return t;
  }

  function starTexture() {
    if (tex.star) return tex.star;
    const c = makeCanvas(32, 32);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(180,255,220,0.7)');
    grd.addColorStop(1, 'rgba(120,255,200,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
    tex.star = new THREE.CanvasTexture(c);
    return tex.star;
  }

  return {
    mat, glow, solid, box, sphere, cyl, cone, plane, octa, torus,
    radialTexture, shadowTexture, groundTexture, wallTexture, emblemTexture, starTexture,
    makeCanvas
  };
})();

/* ============================================================
   ENGINE
   ============================================================ */
const Engine = (function () {
  let renderer = null, scene = null, camera = null, canvas = null;
  let stars = null, spores = null, emblem = null, centerLight = null;
  let camBase = new THREE.Vector3(0, 26, 18);
  let camLook = new THREE.Vector3(0, 1, 0);
  let shake = 0, shakeVec = new THREE.Vector3();
  let menuAngle = 0;
  let time = 0;
  let shadowGeo = null, shadowMat = null;

  const particles = [];
  const texts = [];
  let particleBudget = 0;

  function makeParticle() {
    const m = new THREE.SpriteMaterial({
      map: Gfx.radialTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const s = new THREE.Sprite(m);
    s.visible = false;
    s.scale.set(0.6, 0.6, 1);
    scene.add(s);
    return {
      sprite: s, life: 0, max: 1, vx: 0, vy: 0, vz: 0,
      grav: 0, size: 0.6, active: false
    };
  }

  function makeTextSprite() {
    const c = Gfx.makeCanvas(256, 128);
    const ctx = c.getContext('2d');
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.SpriteMaterial({
      map: texture, transparent: true, depthTest: false, depthWrite: false
    });
    const s = new THREE.Sprite(m);
    s.visible = false;
    s.scale.set(3, 1.5, 1);
    s.renderOrder = 999;
    scene.add(s);
    return { sprite: s, canvas: c, ctx, tex: texture, life: 0, max: 1, active: false };
  }

  function init(cv) {
    canvas = cv;
    renderer = new THREE.WebGLRenderer({
      canvas: cv, antialias: true, alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x03080a, 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03080a);
    scene.fog = new THREE.FogExp2(0x04100a, 0.0125);

    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 220);
    camera.position.set(0, 26, 18);

    buildLights();
    buildArena();
    buildSky();

    for (let i = 0; i < 170; i++) particles.push(makeParticle());
    for (let i = 0; i < 18; i++) texts.push(makeTextSprite());

    window.addEventListener('resize', resize);
    resize();
    return { scene, camera, renderer };
  }

  function buildLights() {
    scene.add(new THREE.AmbientLight(0x4c7a63, 0.65));
    const hemi = new THREE.HemisphereLight(0xa8ffd6, 0x08140d, 0.95);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xd6ffe8, 1.55);
    dir.position.set(14, 26, 10);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x27ff9a, 0.55);
    rim.position.set(-18, 10, -14);
    scene.add(rim);
    centerLight = new THREE.PointLight(0x3dff96, 2.4, 46, 2);
    centerLight.position.set(0, 6, 0);
    scene.add(centerLight);
  }

  function buildArena() {
    const groundMat = new THREE.MeshLambertMaterial({ map: Gfx.groundTexture(), color: 0xbfe8d2 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(72, 72), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // anillo límite
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(24.3, 25.5, 96),
      new THREE.MeshBasicMaterial({
        color: 0x49ffa4, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    scene.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(11.85, 12.15, 80),
      new THREE.MeshBasicMaterial({
        color: 0x2fe08a, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.032;
    scene.add(ring2);

    // emblema central
    emblem = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 13),
      new THREE.MeshBasicMaterial({
        map: Gfx.emblemTexture(), transparent: true, opacity: 0.62,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    emblem.rotation.x = -Math.PI / 2;
    emblem.position.y = 0.045;
    scene.add(emblem);

    // muro de energía
    const wallMat = new THREE.MeshBasicMaterial({
      map: Gfx.wallTexture(), color: 0x7dffbd, transparent: true, opacity: 0.4,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(25.7, 25.7, 4.2, 80, 1, true), wallMat);
    wall.position.y = 2.1;
    scene.add(wall);

    // pilares
    const pillarMat = Gfx.mat(0x0d2418, { emissive: 0x0a3a22, emissiveIntensity: 0.7 });
    const orbGeo = Gfx.sphere(0.16, 8);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x8dffc6 });
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = 26.3;
      const p = new THREE.Mesh(Gfx.cyl(0.34, 0.5, 3.8, 6), pillarMat);
      p.position.set(Math.cos(a) * r, 1.9, Math.sin(a) * r);
      p.rotation.y = -a;
      scene.add(p);
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(Math.cos(a) * r, 3.95, Math.sin(a) * r);
      scene.add(orb);
    }

    // anillos decorativos exteriores
    for (let i = 0; i < 3; i++) {
      const rr = new THREE.Mesh(
        new THREE.RingGeometry(28 + i * 2.2, 28.15 + i * 2.2, 80),
        new THREE.MeshBasicMaterial({
          color: 0x1ea765, transparent: true, opacity: 0.14,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        })
      );
      rr.rotation.x = -Math.PI / 2;
      rr.position.y = 0.02;
      scene.add(rr);
    }
  }

  function buildSky() {
    const n = 520;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 70 + Math.random() * 55;
      const y = 8 + Math.random() * 70;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      size: 0.85, map: Gfx.starTexture(), transparent: true, opacity: 0.8,
      color: 0xa9ffd2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    });
    stars = new THREE.Points(geo, m);
    scene.add(stars);

    // esporas flotantes
    const n2 = 150;
    const pos2 = new Float32Array(n2 * 3);
    for (let i = 0; i < n2; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 24;
      pos2[i * 3] = Math.cos(a) * r;
      pos2[i * 3 + 1] = 0.4 + Math.random() * 5;
      pos2[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo2 = new THREE.BufferGeometry();
    geo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    const m2 = new THREE.PointsMaterial({
      size: 0.16, map: Gfx.radialTexture(), transparent: true, opacity: 0.5,
      color: 0x7dffb8, blending: THREE.AdditiveBlending, depthWrite: false
    });
    spores = new THREE.Points(geo2, m2);
    scene.add(spores);
  }

  function resize() {
    if (!renderer || !canvas) return;
    const parent = canvas.parentElement || canvas;
    const w = Math.max(1, parent.clientWidth || window.innerWidth);
    const h = Math.max(1, parent.clientHeight || window.innerHeight);
    renderer.setSize(w, h, false);
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function addShadow(parent, radius) {
    if (!shadowGeo) shadowGeo = new THREE.PlaneGeometry(1, 1);
    if (!shadowMat) {
      shadowMat = new THREE.MeshBasicMaterial({
        map: Gfx.shadowTexture(), transparent: true, opacity: 0.9,
        depthWrite: false, color: 0x000000
      });
    }
    const m = new THREE.Mesh(shadowGeo, shadowMat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.055;
    m.scale.set(radius * 2.4, radius * 2.4, 1);
    parent.add(m);
    return m;
  }

  function burst(x, y, z, color, count, power, size, life, grav) {
    let spawned = 0;
    for (let i = 0; i < particles.length && spawned < count; i++) {
      const p = particles[i];
      if (p.active) continue;
      p.active = true;
      p.life = p.max = (life || 0.6) * (0.7 + Math.random() * 0.6);
      p.size = (size || 0.5) * (0.6 + Math.random() * 0.8);
      p.grav = grav == null ? 9 : grav;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9;
      const sp = (power || 5) * (0.35 + Math.random() * 0.9);
      p.vx = Math.cos(a) * sp;
      p.vz = Math.sin(a) * sp;
      p.vy = up * (power || 5) * 0.9;
      p.sprite.position.set(x, y, z);
      p.sprite.visible = true;
      p.sprite.material.color.setHex(color);
      p.sprite.material.opacity = 1;
      p.sprite.scale.set(p.size, p.size, 1);
      spawned++;
    }
  }

  function popText(x, y, z, str, color, big) {
    let t = null;
    for (let i = 0; i < texts.length; i++) if (!texts[i].active) { t = texts[i]; break; }
    if (!t) return;
    t.active = true;
    t.life = t.max = big ? 1.2 : 0.9;
    const g = t.ctx;
    g.clearRect(0, 0, 256, 128);
    g.font = '900 ' + (big ? 80 : 58) + 'px Trebuchet MS, Segoe UI, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = big ? 12 : 9;
    g.strokeStyle = 'rgba(0,0,0,0.9)';
    g.strokeText(str, 128, 68);
    g.fillStyle = color || '#ffffff';
    g.shadowColor = color || '#ffffff';
    g.shadowBlur = big ? 30 : 18;
    g.fillText(str, 128, 68);
    t.tex.needsUpdate = true;
    t.sprite.position.set(x, y, z);
    t.sprite.visible = true;
    t.sprite.material.opacity = 1;
    t.vy = big ? 3.4 : 2.6;
    t.big = !!big;
  }

  /* Explosión espectacular: onda + partículas de diferentes colores */
  function explode(x, z, color, big) {
    const count = big ? 70 : 24;
    const power = big ? 14 : 7;
    const size = big ? 0.9 : 0.5;
    const life = big ? 1.1 : 0.7;
    shockwave(x, z, color, big ? 9 : 5, big ? 0.9 : 0.55);
    Engine.burst(x, 1.2, z, color, count, power, size, life, 8);
    // destello central blanco
    Engine.burst(x, 1.2, z, 0xffffff, big ? 14 : 6, big ? 5 : 2, big ? 0.7 : 0.35, 0.3, 0);
    if (big) Engine.addShake(1.6);
    else Engine.addShake(0.5);
  }

  function updateFX(dt) {
    time += dt;
    // partículas
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.vy -= p.grav * dt;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      if (p.sprite.position.y < 0.1) {
        p.sprite.position.y = 0.1;
        p.vy *= -0.35;
        p.vx *= 0.7; p.vz *= 0.7;
      }
      const f = p.life / p.max;
      p.sprite.material.opacity = Math.min(1, f * 1.6);
      const s = p.size * (0.4 + f * 0.8);
      p.sprite.scale.set(s, s, 1);
    }
    // textos
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if (!t.active) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.active = false;
        t.sprite.visible = false;
        continue;
      }
      t.sprite.position.y += t.vy * dt;
      t.vy *= 0.94;
      const f = t.life / t.max;
      t.sprite.material.opacity = Math.min(1, f * 1.8);
      const sc = t.big ? 4.2 : 3;
      const s = sc * (0.5 + f * 0.6);
      t.sprite.scale.set(s, s * 0.5, 1);
    }
    // ambiente
    if (emblem) {
      const pulse = 0.55 + Math.sin(time * 1.7) * 0.14;
      emblem.material.opacity = pulse;
    }
    if (centerLight) centerLight.intensity = 2.1 + Math.sin(time * 2.1) * 0.55;
    if (stars) stars.rotation.y += dt * 0.006;
    if (spores) {
      spores.rotation.y += dt * 0.04;
      spores.position.y = Math.sin(time * 0.5) * 0.25;
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 22);
  }

  function addShake(amount) {
    shake = Math.min(2.2, shake + amount);
  }

  /* Flash de impacto: enroquece el color del material brevemente */
  function hitFlash(group, colorHex) {
    group.traverse(o => {
      if (o.isMesh && o.material && o.material.emissive) {
        o.material.emissive.setHex(colorHex || 0xffd166);
        o.material.emissiveIntensity = 2.2;
        o.userData.flashT = 0.25;
      }
    });
  }

  function updateFlash(dt) {
    Engine.scene.traverse(o => {
      if (o.isMesh && o.material && o.material.emissive && o.userData.flashT > 0) {
        o.userData.flashT = Math.max(0, o.userData.flashT - dt);
        const f = o.userData.flashT / 0.25;
        o.material.emissiveIntensity = f * 2.2;
        if (o.userData.flashT <= 0) {
          o.material.emissive.setHex(0x000000);
          o.material.emissiveIntensity = 0;
        }
      }
    });
  }

  function updateCamera(dt, mode, target, ahead) {
    if (mode === 'menu') {
      menuAngle += dt * 0.085;
      const r = 20.5;
      const desired = new THREE.Vector3(
        Math.sin(menuAngle) * r,
        23 + Math.sin(menuAngle * 0.7) * 2,
        Math.cos(menuAngle) * r
      );
      camBase.lerp(desired, 1 - Math.pow(0.02, dt));
      camLook.set(0, 1.2, 0);
    } else if (mode === 'play' && target) {
      // Cámara tipo GTA: vista desde arriba, inclinada, siguiendo al jugador
      const ax = ahead ? ahead.x : 0;
      const az = ahead ? ahead.z : 0;
      const height = 26;          // altura de la cámara
      const distance = 17;        // distancia horizontal desde el jugador
      const lookOffsetY = 1.6;    // punto de mira un poco por delante del jugador
      const desired = new THREE.Vector3(
        target.x + ax * 0.6,
        target.y + height,
        target.z + distance + az * 0.35
      );
      camBase.lerp(desired, 1 - Math.pow(0.0012, dt));
      camLook.lerp(new THREE.Vector3(
        target.x + ax * 1.6,
        target.y + lookOffsetY,
        target.z + az * 1.6 - 2.0
      ), 1 - Math.pow(0.0012, dt));
    }

    shakeVec.set(
      (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake * 0.6,
      (Math.random() - 0.5) * shake
    );
    camera.position.copy(camBase).add(shakeVec);
    camera.lookAt(camLook);
  }

  function render() {
    if (renderer) renderer.render(scene, camera);
  }

  return {
    init, resize, render, addShadow, burst, popText, explode, updateFX, addShake,
    updateCamera, hitFlash, updateFlash,
    get scene() { return scene; },
    get camera() { return camera; },
    get renderer() { return renderer; },
    get shake() { return shake; }
  };
})();
