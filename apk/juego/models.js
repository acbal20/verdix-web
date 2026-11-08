/* ============================================================
   BEN 10 · OMNITRIX BATTLE 3D
   Modelos 3D procedurales (sin archivos externos)
   ============================================================ */

const Models = (function () {

  function add(parent, geo, material, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    parent.add(m);
    return m;
  }

  function grp(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x || 0, y || 0, z || 0);
    parent.add(g);
    return g;
  }

  const glowMats = new Map();

  function glowSprite(parent, color, size, x, y, z, opacity) {
    const op = opacity == null ? 0.85 : opacity;
    const key = color + '|' + op;
    let m = glowMats.get(key);
    if (!m) {
      m = new THREE.SpriteMaterial({
        map: Gfx.radialTexture(),
        color: color,
        transparent: true,
        opacity: op,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      glowMats.set(key, m);
    }
    const s = new THREE.Sprite(m);
    s.position.set(x || 0, y || 0, z || 0);
    s.scale.set(size, size, 1);
    parent.add(s);
    return s;
  }

  function limb(parent, x, y, z, w, h, d, mat, footMat, footW) {
    const g = grp(parent, x, y, z);
    add(g, Gfx.box(w, h, d), mat, 0, -h / 2, 0);
    if (footMat) add(g, Gfx.box(footW || w * 1.08, 0.18, d * 1.25), footMat, 0, -h - 0.02, 0.07);
    return g;
  }

  /* ------------------------------------------------------------
     ALIENS
     ------------------------------------------------------------ */

  function ben(gold) {
    const g = new THREE.Group();
    const parts = {};
    const skin = Gfx.mat(0xf0b98a);
    const shirt = Gfx.mat(0xf1f4ec);
    const black = Gfx.mat(0x14181a);
    const jeans = Gfx.mat(0x2b5f9e);
    const jacket = Gfx.mat(0x1f8a4d);
    const hair = Gfx.mat(0x5a3a22);

    parts.legL = limb(g, -0.24, 0.95, 0, 0.32, 0.86, 0.36, jeans, black, 0.34);
    parts.legR = limb(g, 0.24, 0.95, 0, 0.32, 0.86, 0.36, jeans, black, 0.34);

    add(g, Gfx.box(0.82, 0.92, 0.46), shirt, 0, 1.4, 0);
    add(g, Gfx.box(0.15, 0.92, 0.03), black, 0, 1.4, 0.24);
    add(g, Gfx.box(0.15, 0.92, 0.03), black, 0, 1.4, -0.24);
    add(g, Gfx.box(0.18, 0.98, 0.5), jacket, -0.48, 1.38, 0);
    add(g, Gfx.box(0.18, 0.98, 0.5), jacket, 0.48, 1.38, 0);
    add(g, Gfx.box(0.9, 0.12, 0.52), jacket, 0, 1.9, 0);

    parts.armL = grp(g, -0.55, 1.72, 0);
    add(parts.armL, Gfx.box(0.24, 0.32, 0.26), jacket, 0, -0.14, 0);
    add(parts.armL, Gfx.box(0.2, 0.5, 0.2), skin, 0, -0.52, 0);
    add(parts.armL, Gfx.sphere(0.13, 8), skin, 0, -0.78, 0);
    const omniColor = gold ? 0xffd34d : 0x39ff88;
    add(parts.armL, Gfx.box(0.28, 0.15, 0.28), Gfx.mat(0x1a1f1c), 0, -0.64, 0);
    parts.omni = add(parts.armL, Gfx.box(0.22, 0.1, 0.22), Gfx.glow(omniColor), 0, -0.63, 0.02);
    glowSprite(parts.armL, omniColor, 0.5, 0, -0.63, 0.05, 0.55);

    parts.armR = grp(g, 0.55, 1.72, 0);
    add(parts.armR, Gfx.box(0.24, 0.32, 0.26), jacket, 0, -0.14, 0);
    add(parts.armR, Gfx.box(0.2, 0.5, 0.2), skin, 0, -0.52, 0);
    add(parts.armR, Gfx.sphere(0.13, 8), skin, 0, -0.78, 0);

    parts.head = grp(g, 0, 1.95, 0);
    add(parts.head, Gfx.sphere(0.29, 12), skin, 0, 0.1, 0);
    add(parts.head, Gfx.sphere(0.3, 12), hair, 0, 0.19, -0.03).scale.set(1.02, 0.72, 0.98);
    add(parts.head, Gfx.box(0.36, 0.1, 0.3), hair, 0, 0.24, 0.14);
    add(parts.head, Gfx.box(0.055, 0.06, 0.03), black, -0.1, 0.1, 0.27);
    add(parts.head, Gfx.box(0.055, 0.06, 0.03), black, 0.1, 0.1, 0.27);
    add(parts.head, Gfx.box(0.13, 0.025, 0.02), Gfx.mat(0x9b5a45), 0, -0.02, 0.275);

    return { group: g, parts, radius: 0.82, height: 2.4 };
  }

  function heatblast() {
    const g = new THREE.Group();
    const parts = {};
    const rock = Gfx.mat(0x6e200c, { emissive: 0x301005, emissiveIntensity: 0.5 });
    const rockDark = Gfx.mat(0x3c1408);
    const magma = Gfx.mat(0xff7a16, { emissive: 0xff5a00, emissiveIntensity: 1.4 });
    const yellow = Gfx.glow(0xffd166, 0.95);

    parts.legL = limb(g, -0.26, 0.9, 0, 0.36, 0.84, 0.4, rock, rockDark, 0.4);
    parts.legR = limb(g, 0.26, 0.9, 0, 0.36, 0.84, 0.4, rock, rockDark, 0.4);

    add(g, Gfx.box(0.9, 0.94, 0.52), rock, 0, 1.4, 0);
    add(g, Gfx.box(0.06, 0.62, 0.03), magma, -0.22, 1.42, 0.27);
    add(g, Gfx.box(0.06, 0.5, 0.03), magma, 0.2, 1.3, 0.27, 0, 0, 0.2);
    add(g, Gfx.box(0.05, 0.42, 0.03), magma, 0.02, 1.5, -0.27);
    add(g, Gfx.sphere(0.2, 10), magma, 0, 1.45, 0.22);
    add(g, Gfx.box(0.94, 0.32, 0.55), rockDark, 0, 1.06, 0);

    parts.armL = grp(g, -0.6, 1.7, 0);
    add(parts.armL, Gfx.box(0.26, 0.7, 0.26), rock, 0, -0.36, 0);
    add(parts.armL, Gfx.sphere(0.2, 10), magma, 0, -0.8, 0.02);
    glowSprite(parts.armL, 0xff7a16, 0.75, 0, -0.82, 0.05, 0.65);

    parts.armR = grp(g, 0.6, 1.7, 0);
    add(parts.armR, Gfx.box(0.26, 0.7, 0.26), rock, 0, -0.36, 0);
    add(parts.armR, Gfx.sphere(0.2, 10), magma, 0, -0.8, 0.02);
    glowSprite(parts.armR, 0xff7a16, 0.75, 0, -0.82, 0.05, 0.65);

    parts.head = grp(g, 0, 1.95, 0);
    add(parts.head, Gfx.sphere(0.3, 12), rockDark, 0, 0.05, 0);
    add(parts.head, Gfx.box(0.34, 0.08, 0.05), Gfx.glow(0xffe08a, 1), 0, 0.12, 0.27);
    add(parts.head, Gfx.sphere(0.05, 6), yellow, -0.11, 0.06, 0.28);
    add(parts.head, Gfx.sphere(0.05, 6), yellow, 0.11, 0.06, 0.28);
    // llama
    add(parts.head, Gfx.cone(0.36, 0.95, 8), Gfx.mat(0xff6a00, { emissive: 0xff4400, emissiveIntensity: 1.6 }), 0, 0.72, -0.02);
    add(parts.head, Gfx.cone(0.2, 0.6, 8), Gfx.mat(0xffc93c, { emissive: 0xffa000, emissiveIntensity: 1.8 }), 0, 0.7, 0.02);
    glowSprite(parts.head, 0xff7a16, 2.25, 0, 0.6, 0, 0.4);

    return { group: g, parts, radius: 0.92, height: 2.65 };
  }

  function fourarms() {
    const g = new THREE.Group();
    const parts = {};
    const red = Gfx.mat(0xb62b2b, { emissive: 0x3a0606, emissiveIntensity: 0.4 });
    const dark = Gfx.mat(0x2a1111);
    const black = Gfx.mat(0x161616);
    const eye = Gfx.glow(0x64ff8f, 1);

    parts.legL = limb(g, -0.34, 1.0, 0, 0.42, 0.9, 0.44, red, dark, 0.46);
    parts.legR = limb(g, 0.34, 1.0, 0, 0.42, 0.9, 0.44, red, dark, 0.46);

    add(g, Gfx.box(1.2, 1.02, 0.66), red, 0, 1.52, 0);
    add(g, Gfx.box(0.12, 1.02, 0.68), black, -0.36, 1.52, 0);
    add(g, Gfx.box(0.12, 1.02, 0.68), black, 0.36, 1.52, 0);
    add(g, Gfx.box(1.25, 0.3, 0.7), dark, 0, 1.0, 0);
    add(g, Gfx.sphere(0.34, 10), red, -0.72, 1.92, 0);
    add(g, Gfx.sphere(0.34, 10), red, 0.72, 1.92, 0);

    function bigArm(x, y, z, scale) {
      const a = grp(g, x, y, z);
      add(a, Gfx.box(0.3 * scale, 0.62 * scale, 0.3 * scale), red, 0, -0.3 * scale, 0);
      add(a, Gfx.box(0.32 * scale, 0.6 * scale, 0.32 * scale), red, 0, -0.82 * scale, 0);
      add(a, Gfx.sphere(0.24 * scale, 10), Gfx.mat(0x8e1f1f), 0, -1.14 * scale, 0);
      add(a, Gfx.box(0.34 * scale, 0.12 * scale, 0.34 * scale), black, 0, -0.55 * scale, 0);
      return a;
    }
    parts.armL = bigArm(-0.86, 1.82, 0.16, 1);
    parts.armR = bigArm(0.86, 1.82, 0.16, 1);
    parts.armL2 = bigArm(-0.82, 1.36, -0.2, 0.9);
    parts.armR2 = bigArm(0.82, 1.36, -0.2, 0.9);

    parts.head = grp(g, 0, 2.2, 0);
    add(parts.head, Gfx.box(0.5, 0.42, 0.44), red, 0, 0.12, 0);
    add(parts.head, Gfx.box(0.54, 0.12, 0.46), black, 0, 0.26, 0);
    add(parts.head, Gfx.box(0.09, 0.06, 0.03), eye, -0.11, 0.12, 0.23);
    add(parts.head, Gfx.box(0.09, 0.06, 0.03), eye, 0.11, 0.12, 0.23);

    return { group: g, parts, radius: 1.12, height: 2.6 };
  }

  function xlr8() {
    const g = new THREE.Group();
    const parts = {};
    const blue = Gfx.mat(0x1f6fe8, { emissive: 0x082a66, emissiveIntensity: 0.6 });
    const black = Gfx.mat(0x101418);
    const visor = Gfx.mat(0x9be8ff, { emissive: 0x39c6ff, emissiveIntensity: 1.4 });

    parts.legL = limb(g, -0.22, 0.92, 0, 0.24, 0.82, 0.28, blue, black, 0.26);
    parts.legR = limb(g, 0.22, 0.92, 0, 0.24, 0.82, 0.28, blue, black, 0.26);
    // ruedas
    add(parts.legL, Gfx.cyl(0.19, 0.19, 0.1, 10), black, 0, -0.95, 0.12, 0, 0, Math.PI / 2);
    add(parts.legR, Gfx.cyl(0.19, 0.19, 0.1, 10), black, 0, -0.95, 0.12, 0, 0, Math.PI / 2);

    add(g, Gfx.box(0.6, 0.88, 0.38), blue, 0, 1.42, 0);
    add(g, Gfx.box(0.12, 0.88, 0.4), black, 0, 1.42, 0);
    add(g, Gfx.box(0.62, 0.2, 0.4), black, 0, 1.04, 0);

    parts.armL = limb(g, -0.42, 1.72, 0, 0.17, 0.68, 0.17, blue, black, 0.2);
    parts.armR = limb(g, 0.42, 1.72, 0, 0.17, 0.68, 0.17, blue, black, 0.2);

    parts.head = grp(g, 0, 1.98, 0.02);
    add(parts.head, Gfx.sphere(0.26, 12), blue, 0, 0.08, 0);
    add(parts.head, Gfx.sphere(0.27, 12), black, 0, 0.18, -0.02).scale.set(1, 0.7, 1);
    add(parts.head, Gfx.box(0.42, 0.12, 0.06), visor, 0, 0.1, 0.25);
    add(parts.head, Gfx.cone(0.12, 0.5, 6), blue, 0, 0.32, -0.36, -0.5);

    // cola
    add(g, Gfx.cone(0.16, 0.9, 6), blue, 0, 1.0, -0.5, Math.PI / 2.4);

    return { group: g, parts, radius: 0.78, height: 2.35 };
  }

  function diamondhead() {
    const g = new THREE.Group();
    const parts = {};
    const crystal = Gfx.mat(0x2fd8b8, { emissive: 0x0b6b58, emissiveIntensity: 0.75 });
    const bright = Gfx.mat(0x9dffe8, { emissive: 0x3fffd8, emissiveIntensity: 1.2 });
    const dark = Gfx.mat(0x14705f);

    parts.legL = limb(g, -0.28, 0.98, 0, 0.34, 0.88, 0.36, crystal, dark, 0.36);
    parts.legR = limb(g, 0.28, 0.98, 0, 0.34, 0.88, 0.36, crystal, dark, 0.36);

    add(g, Gfx.box(0.86, 0.95, 0.5), crystal, 0, 1.45, 0);
    add(g, Gfx.octa(0.34), bright, 0, 1.78, 0.02);
    add(g, Gfx.octa(0.28), crystal, -0.56, 1.86, 0);
    add(g, Gfx.octa(0.28), crystal, 0.56, 1.86, 0);
    add(g, Gfx.cone(0.18, 0.7, 5), bright, -0.36, 1.98, -0.14, 0, 0, -0.45);
    add(g, Gfx.cone(0.18, 0.7, 5), bright, 0.36, 1.98, -0.14, 0, 0, 0.45);

    parts.armL = grp(g, -0.56, 1.72, 0);
    add(parts.armL, Gfx.box(0.24, 0.7, 0.24), crystal, 0, -0.35, 0);
    add(parts.armL, Gfx.cone(0.19, 0.5, 5), bright, 0, -0.85, 0.05, Math.PI);
    parts.armR = grp(g, 0.56, 1.72, 0);
    add(parts.armR, Gfx.box(0.24, 0.7, 0.24), crystal, 0, -0.35, 0);
    add(parts.armR, Gfx.cone(0.19, 0.5, 5), bright, 0, -0.85, 0.05, Math.PI);

    parts.head = grp(g, 0, 1.98, 0);
    add(parts.head, Gfx.box(0.42, 0.46, 0.4), crystal, 0, 0.1, 0);
    add(parts.head, Gfx.cone(0.14, 0.55, 5), bright, 0, 0.44, -0.02);
    add(parts.head, Gfx.cone(0.1, 0.4, 5), bright, -0.16, 0.36, 0, 0, 0, -0.4);
    add(parts.head, Gfx.cone(0.1, 0.4, 5), bright, 0.16, 0.36, 0, 0, 0, 0.4);
    add(parts.head, Gfx.box(0.09, 0.07, 0.03), Gfx.glow(0xd8fff4), -0.1, 0.12, 0.21);
    add(parts.head, Gfx.box(0.09, 0.07, 0.03), Gfx.glow(0xd8fff4), 0.1, 0.12, 0.21);

    return { group: g, parts, radius: 0.98, height: 2.6 };
  }

  function cannonbolt() {
    const g = new THREE.Group();
    const parts = {};
    const yellow = Gfx.mat(0xf5c437, { emissive: 0x5a3f00, emissiveIntensity: 0.5 });
    const white = Gfx.mat(0xf2f6f0);
    const black = Gfx.mat(0x14181a);
    const eye = Gfx.glow(0x64ff8f, 1);

    add(g, Gfx.sphere(0.86, 16), yellow, 0, 1.18, 0).scale.set(1.02, 0.98, 1.02);
    add(g, Gfx.torus(0.86, 0.13, 20), white, 0, 1.18, 0, Math.PI / 2);
    add(g, Gfx.torus(0.86, 0.1, 20), white, 0, 1.18, 0, 0, 0, Math.PI / 2);
    add(g, Gfx.box(1.0, 0.34, 0.5), white, 0, 1.5, 0.5);
    add(g, Gfx.box(0.55, 0.3, 0.42), white, 0, 1.02, -0.62);

    parts.legL = limb(g, -0.36, 0.48, 0, 0.34, 0.42, 0.38, yellow, black, 0.4);
    parts.legR = limb(g, 0.36, 0.48, 0, 0.34, 0.42, 0.38, yellow, black, 0.4);
    parts.armL = limb(g, -0.84, 1.25, 0, 0.28, 0.56, 0.3, yellow, white, 0.34);
    parts.armR = limb(g, 0.84, 1.25, 0, 0.28, 0.56, 0.3, yellow, white, 0.34);

    parts.head = grp(g, 0, 1.55, 0.55);
    add(parts.head, Gfx.box(0.5, 0.36, 0.34), yellow, 0, 0.06, 0);
    add(parts.head, Gfx.box(0.52, 0.14, 0.36), white, 0, 0.24, 0);
    add(parts.head, Gfx.box(0.1, 0.06, 0.03), eye, -0.12, 0.06, 0.19);
    add(parts.head, Gfx.box(0.1, 0.06, 0.03), eye, 0.12, 0.06, 0.19);

    return { group: g, parts, radius: 1.05, height: 2.05 };
  }

  function upgrade() {
    const g = new THREE.Group();
    const parts = {};
    const black = Gfx.mat(0x0d1814, { emissive: 0x02110a, emissiveIntensity: 0.4 });
    const line = Gfx.glow(0x4dff9a, 1);
    const green = Gfx.mat(0x1d5c3a, { emissive: 0x39ff88, emissiveIntensity: 0.9 });

    parts.legL = limb(g, -0.25, 0.96, 0, 0.3, 0.86, 0.34, black, Gfx.mat(0x0a3020), 0.36);
    parts.legR = limb(g, 0.25, 0.96, 0, 0.3, 0.86, 0.34, black, Gfx.mat(0x0a3020), 0.36);
    add(parts.legL, Gfx.box(0.04, 0.7, 0.36), line, 0, -0.45, 0);
    add(parts.legR, Gfx.box(0.04, 0.7, 0.36), line, 0, -0.45, 0);

    add(g, Gfx.box(0.8, 1.0, 0.46), black, 0, 1.42, 0);
    add(g, Gfx.box(0.06, 0.9, 0.48), line, -0.24, 1.42, 0);
    add(g, Gfx.box(0.06, 0.6, 0.48), line, 0.22, 1.3, 0);
    add(g, Gfx.box(0.5, 0.05, 0.48), line, 0, 1.75, 0);
    add(g, Gfx.sphere(0.24, 10), green, 0, 1.42, 0.18).scale.set(1, 1.25, 0.5);

    parts.armL = grp(g, -0.56, 1.72, 0);
    add(parts.armL, Gfx.box(0.24, 0.72, 0.24), black, 0, -0.36, 0);
    add(parts.armL, Gfx.box(0.26, 0.1, 0.26), line, 0, -0.5, 0);
    add(parts.armL, Gfx.sphere(0.15, 8), green, 0, -0.8, 0);
    parts.armR = grp(g, 0.56, 1.72, 0);
    add(parts.armR, Gfx.box(0.24, 0.72, 0.24), black, 0, -0.36, 0);
    add(parts.armR, Gfx.box(0.26, 0.1, 0.26), line, 0, -0.5, 0);
    add(parts.armR, Gfx.sphere(0.15, 8), green, 0, -0.8, 0);

    parts.head = grp(g, 0, 2.02, 0.02);
    add(parts.head, Gfx.sphere(0.3, 12), black, 0, 0.08, 0);
    add(parts.head, Gfx.sphere(0.11, 10), Gfx.glow(0x64ff9f), 0, 0.09, 0.26);
    add(parts.head, Gfx.box(0.5, 0.05, 0.1), line, 0, 0.32, 0.12);
    add(parts.head, Gfx.box(0.34, 0.05, 0.06), line, 0, -0.1, 0.24);
    glowSprite(parts.head, 0x4dff9a, 1.1, 0, 0.1, 0.28, 0.4);

    return { group: g, parts, radius: 0.9, height: 2.45 };
  }

  function waybig() {
    const g = new THREE.Group();
    const parts = {};
    const white = Gfx.mat(0xe8f2ec, { emissive: 0x1e3a2a, emissiveIntensity: 0.35 });
    const red = Gfx.mat(0xa3272f, { emissive: 0x2a0508, emissiveIntensity: 0.4 });
    const black = Gfx.mat(0x14181a);
    const green = Gfx.glow(0x5dff9a, 1);

    parts.legL = limb(g, -0.42, 1.02, 0, 0.46, 0.94, 0.48, white, black, 0.52);
    parts.legR = limb(g, 0.42, 1.02, 0, 0.46, 0.94, 0.48, white, black, 0.52);
    add(parts.legL, Gfx.box(0.48, 0.2, 0.5), red, 0, -0.3, 0);
    add(parts.legR, Gfx.box(0.48, 0.2, 0.5), red, 0, -0.3, 0);

    add(g, Gfx.box(1.3, 1.15, 0.68), white, 0, 1.62, 0);
    add(g, Gfx.box(1.34, 0.35, 0.72), red, 0, 1.25, 0);
    add(g, Gfx.box(0.5, 0.5, 0.74), black, 0, 1.75, 0);
    add(g, Gfx.sphere(0.42, 10), white, -0.86, 2.05, 0);
    add(g, Gfx.sphere(0.42, 10), white, 0.86, 2.05, 0);
    add(g, Gfx.cone(0.16, 0.6, 5), red, -1.02, 2.32, 0, 0, 0, -0.5);
    add(g, Gfx.cone(0.16, 0.6, 5), red, 1.02, 2.32, 0, 0, 0, 0.5);

    function bigArm(x) {
      const a = grp(g, x, 1.95, 0);
      add(a, Gfx.box(0.4, 0.75, 0.4), white, 0, -0.36, 0);
      add(a, Gfx.box(0.42, 0.72, 0.42), white, 0, -1.0, 0);
      add(a, Gfx.sphere(0.3, 10), white, 0, -1.36, 0);
      add(a, Gfx.box(0.44, 0.16, 0.44), red, 0, -0.68, 0);
      return a;
    }
    parts.armL = bigArm(-1.02);
    parts.armR = bigArm(1.02);

    parts.head = grp(g, 0, 2.4, 0);
    add(parts.head, Gfx.box(0.55, 0.5, 0.48), white, 0, 0.1, 0);
    add(parts.head, Gfx.box(0.58, 0.16, 0.5), red, 0, 0.3, 0);
    add(parts.head, Gfx.box(0.11, 0.07, 0.03), green, -0.13, 0.1, 0.25);
    add(parts.head, Gfx.box(0.11, 0.07, 0.03), green, 0.13, 0.1, 0.25);
    add(parts.head, Gfx.cone(0.12, 0.45, 5), white, 0, 0.5, 0);

    g.scale.setScalar(1.55);
    return { group: g, parts, radius: 1.75, height: 4.4 };
  }

  /* ------------------------------------------------------------
     ENEMIGOS
     ------------------------------------------------------------ */

  function dnalien() {
    const g = new THREE.Group();
    const parts = {};
    const green = Gfx.mat(0x4f9a3f, { emissive: 0x0d2e0a, emissiveIntensity: 0.5 });
    const dark = Gfx.mat(0x2d5c26);
    const eye = Gfx.glow(0xffd84d, 1);

    parts.legL = limb(g, -0.24, 0.86, 0, 0.26, 0.8, 0.3, green, dark, 0.32);
    parts.legR = limb(g, 0.24, 0.86, 0, 0.26, 0.8, 0.3, green, dark, 0.32);
    add(g, Gfx.box(0.72, 0.82, 0.44), green, 0, 1.3, 0);
    add(g, Gfx.box(0.74, 0.2, 0.46), dark, 0, 1.0, 0);
    add(g, Gfx.sphere(0.22, 8), dark, 0, 1.35, 0.2).scale.set(1, 1.2, 0.6);

    parts.armL = limb(g, -0.48, 1.6, 0, 0.16, 0.7, 0.16, green, dark, 0.2);
    parts.armR = limb(g, 0.48, 1.6, 0, 0.16, 0.7, 0.16, green, dark, 0.2);
    add(parts.armL, Gfx.cone(0.08, 0.3, 5), dark, 0, -0.82, 0.06, Math.PI);
    add(parts.armR, Gfx.cone(0.08, 0.3, 5), dark, 0, -0.82, 0.06, Math.PI);

    parts.head = grp(g, 0, 1.75, 0);
    add(parts.head, Gfx.sphere(0.34, 12), green, 0, 0.1, 0);
    add(parts.head, Gfx.sphere(0.42, 12), green, 0, 0.14, -0.06).scale.set(1, 0.85, 0.9);
    add(parts.head, Gfx.sphere(0.13, 10), eye, -0.14, 0.12, 0.27);
    add(parts.head, Gfx.sphere(0.13, 10), eye, 0.14, 0.12, 0.27);
    add(parts.head, Gfx.cone(0.06, 0.42, 5), dark, -0.18, 0.44, -0.02, 0, 0, -0.35);
    add(parts.head, Gfx.cone(0.06, 0.42, 5), dark, 0.18, 0.44, -0.02, 0, 0, 0.35);
    add(parts.head, Gfx.box(0.16, 0.06, 0.05), Gfx.mat(0x143d15), 0, -0.08, 0.3);

    return { group: g, parts, radius: 0.85, height: 2.15 };
  }

  function speeder() {
    const g = new THREE.Group();
    const parts = {};
    const purple = Gfx.mat(0x5b3f9e, { emissive: 0x1c0b40, emissiveIntensity: 0.7 });
    const dark = Gfx.mat(0x241a3d);
    const red = Gfx.glow(0xff4d6d, 1);

    parts.legL = limb(g, -0.2, 0.92, 0, 0.18, 0.9, 0.22, purple, dark, 0.26);
    parts.legR = limb(g, 0.2, 0.92, 0, 0.18, 0.9, 0.22, purple, dark, 0.26);
    add(g, Gfx.box(0.5, 0.82, 0.32), purple, 0, 1.38, 0);
    add(g, Gfx.box(0.1, 0.82, 0.34), dark, 0, 1.38, 0);
    add(g, Gfx.cone(0.14, 0.7, 5), purple, 0, 0.98, -0.42, Math.PI / 2.4);

    parts.armL = limb(g, -0.36, 1.68, 0, 0.13, 0.72, 0.13, purple, dark, 0.16);
    parts.armR = limb(g, 0.36, 1.68, 0, 0.13, 0.72, 0.13, purple, dark, 0.16);

    parts.head = grp(g, 0, 1.9, 0.04);
    add(parts.head, Gfx.sphere(0.24, 10), purple, 0, 0.08, 0);
    add(parts.head, Gfx.cone(0.09, 0.4, 5), dark, 0, 0.32, -0.02);
    add(parts.head, Gfx.cone(0.07, 0.3, 5), dark, -0.16, 0.26, -0.02, 0, 0, -0.4);
    add(parts.head, Gfx.cone(0.07, 0.3, 5), dark, 0.16, 0.26, -0.02, 0, 0, 0.4);
    add(parts.head, Gfx.box(0.07, 0.05, 0.03), red, -0.08, 0.1, 0.22);
    add(parts.head, Gfx.box(0.07, 0.05, 0.03), red, 0.08, 0.1, 0.22);

    return { group: g, parts, radius: 0.76, height: 2.15 };
  }

  function drone() {
    const g = new THREE.Group();
    const parts = {};
    const metal = Gfx.mat(0x2a3640, { emissive: 0x0a1418, emissiveIntensity: 0.6 });
    const dark = Gfx.mat(0x111820);
    const red = Gfx.glow(0xff3b3b, 1);
    const cyan = Gfx.glow(0x64e8ff, 0.9);

    const body = grp(g, 0, 1.75, 0);
    parts.hover = body;
    add(body, Gfx.sphere(0.55, 14), metal, 0, 0, 0).scale.set(1.15, 0.8, 1.15);
    add(body, Gfx.torus(0.62, 0.08, 20), dark, 0, 0, 0, Math.PI / 2);
    add(body, Gfx.sphere(0.2, 12), red, 0, 0.02, 0.5);
    glowSprite(body, 0xff3b3b, 1.0, 0, 0.02, 0.56, 0.7);
    add(body, Gfx.box(0.2, 0.1, 0.1), cyan, -0.6, 0, 0);
    add(body, Gfx.box(0.2, 0.1, 0.1), cyan, 0.6, 0, 0);
    add(body, Gfx.cone(0.1, 0.5, 5), dark, 0, 0.35, -0.42, -2.5);
    add(body, Gfx.cone(0.1, 0.5, 5), dark, -0.42, 0.3, -0.3, -2.5, 0, -0.5);
    add(body, Gfx.cone(0.1, 0.5, 5), dark, 0.42, 0.3, -0.3, -2.5, 0, 0.5);

    return { group: g, parts, radius: 0.8, height: 2.3 };
  }

  function brute() {
    const g = new THREE.Group();
    const parts = {};
    const skin = Gfx.mat(0x6b7a4a, { emissive: 0x141c08, emissiveIntensity: 0.5 });
    const armor = Gfx.mat(0x8a9482, { emissive: 0x1a201c, emissiveIntensity: 0.4 });
    const dark = Gfx.mat(0x2b3028);
    const eye = Gfx.glow(0xff6a2a, 1);

    parts.legL = limb(g, -0.36, 0.9, 0, 0.42, 0.84, 0.46, skin, dark, 0.48);
    parts.legR = limb(g, 0.36, 0.9, 0, 0.42, 0.84, 0.46, skin, dark, 0.48);
    add(g, Gfx.box(1.25, 1.15, 0.75), skin, 0, 1.5, 0);
    add(g, Gfx.box(1.0, 0.42, 0.8), armor, 0, 1.78, 0.02);
    add(g, Gfx.box(0.46, 0.5, 0.8), armor, -0.5, 1.35, 0.04);
    add(g, Gfx.box(0.46, 0.5, 0.8), armor, 0.5, 1.35, 0.04);
    add(g, Gfx.box(1.3, 0.24, 0.78), dark, 0, 1.0, 0);

    function arm(x) {
      const a = grp(g, x, 1.9, 0);
      add(a, Gfx.box(0.4, 0.72, 0.4), skin, 0, -0.34, 0);
      add(a, Gfx.box(0.46, 0.55, 0.46), armor, 0, -0.82, 0);
      add(a, Gfx.sphere(0.34, 10), armor, 0, -1.15, 0);
      return a;
    }
    parts.armL = arm(-0.84);
    parts.armR = arm(0.84);

    parts.head = grp(g, 0, 2.02, 0);
    add(parts.head, Gfx.box(0.5, 0.4, 0.42), skin, 0, 0.1, 0);
    add(parts.head, Gfx.box(0.54, 0.14, 0.44), armor, 0, 0.26, 0);
    add(parts.head, Gfx.box(0.1, 0.06, 0.03), eye, -0.12, 0.1, 0.22);
    add(parts.head, Gfx.box(0.1, 0.06, 0.03), eye, 0.12, 0.1, 0.22);

    return { group: g, parts, radius: 1.18, height: 2.65 };
  }

  function vilgax() {
    const g = new THREE.Group();
    const parts = {};
    const skin = Gfx.mat(0x5d7a58, { emissive: 0x101d0c, emissiveIntensity: 0.5 });
    const armor = Gfx.mat(0x2f3a44, { emissive: 0x0a1016, emissiveIntensity: 0.6 });
    const red = Gfx.mat(0x8e1f24, { emissive: 0x3a0508, emissiveIntensity: 0.7 });
    const eye = Gfx.glow(0xff2e3a, 1);

    parts.legL = limb(g, -0.44, 1.05, 0, 0.48, 0.98, 0.52, skin, armor, 0.55);
    parts.legR = limb(g, 0.44, 1.05, 0, 0.48, 0.98, 0.52, skin, armor, 0.55);

    add(g, Gfx.box(1.5, 1.3, 0.82), armor, 0, 1.75, 0);
    add(g, Gfx.box(0.9, 0.7, 0.86), red, 0, 1.7, 0.02);
    add(g, Gfx.box(1.55, 0.3, 0.86), red, 0, 1.16, 0);
    add(g, Gfx.sphere(0.52, 10), armor, -1.0, 2.2, 0);
    add(g, Gfx.sphere(0.52, 10), armor, 1.0, 2.2, 0);
    add(g, Gfx.cone(0.24, 0.9, 5), red, -1.18, 2.5, 0, 0, 0, -0.55);
    add(g, Gfx.cone(0.24, 0.9, 5), red, 1.18, 2.5, 0, 0, 0, 0.55);

    // capa
    add(g, Gfx.box(1.7, 1.9, 0.1), Gfx.mat(0x4a0f16), 0, 1.55, -0.5, 0.12);

    function arm(x) {
      const a = grp(g, x, 2.1, 0);
      add(a, Gfx.box(0.44, 0.8, 0.44), skin, 0, -0.38, 0);
      add(a, Gfx.box(0.46, 0.72, 0.46), skin, 0, -1.02, 0);
      add(a, Gfx.sphere(0.3, 10), armor, 0, -1.42, 0);
      add(a, Gfx.cone(0.1, 0.42, 5), red, 0, -1.62, 0.1, Math.PI);
      return a;
    }
    parts.armL = arm(-1.05);
    parts.armR = arm(1.05);

    parts.head = grp(g, 0, 2.55, 0.02);
    add(parts.head, Gfx.box(0.62, 0.52, 0.5), skin, 0, 0.08, 0);
    add(parts.head, Gfx.box(0.64, 0.14, 0.52), armor, 0, 0.28, 0);
    add(parts.head, Gfx.box(0.12, 0.07, 0.03), eye, -0.14, 0.1, 0.26);
    add(parts.head, Gfx.box(0.12, 0.07, 0.03), eye, 0.14, 0.1, 0.26);
    // tentáculos de la boca
    for (let i = 0; i < 4; i++) {
      const tx = (i - 1.5) * 0.08;
      add(parts.head, Gfx.cone(0.035, 0.28, 5), Gfx.mat(0x3d5a3a), tx, -0.18, 0.24, Math.PI * 0.9 + i * 0.05);
    }
    add(parts.head, Gfx.box(0.5, 0.05, 0.05), Gfx.mat(0x2a3a28), 0, -0.1, 0.27);
    glowSprite(parts.head, 0xff2e3a, 1.4, 0, 0.1, 0.3, 0.35);

    g.scale.setScalar(1.12);
    return { group: g, parts, radius: 1.65, height: 3.6 };
  }

  const PLAYER_BUILDERS = {
    ben, heatblast, fourarms, xlr8, diamondhead, cannonbolt, upgrade, waybig
  };
  const ENEMY_BUILDERS = {
    dna: dnalien, speeder, drone, brute, boss: vilgax
  };

  function buildPlayer(id) {
    const fn = PLAYER_BUILDERS[id] || ben;
    const model = fn(SAVE.skin === 'gold');
    if (SAVE.skin === 'gold' && id !== 'ben') {
      const ring = new THREE.Mesh(Gfx.torus(0.34, 0.06, 16), Gfx.glow(0xffd34d, 0.9));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 1.9, 0);
      model.group.add(ring);
    }
    return model;
  }

  function buildEnemy(type) {
    const fn = ENEMY_BUILDERS[type] || dnalien;
    return fn();
  }

  return { buildPlayer, buildEnemy, glowSprite };
})();
