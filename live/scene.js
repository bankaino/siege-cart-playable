// live/scene.js — SIEGE CART. Pure function of t and the sim state (no Math.random, no accumulated state).
// Side view: sky → parallax (cliffs, far pines, near pines) → ground → towers → skeletons → cart rig (wheels, crates, archer, saw,
// flamethrowers) → projectiles → FX → grade → HUD (logo, progress flags, coin pill, energy panel, cards, price bubble, hand, CTA, endcard).
// World → screen: sx(x) = CX + (x - cart.x) * zoom; heights are measured UP from the ground line (screen y = GY - h * zoom).
// ART HOOK: every world object is a rig of code shapes; when real art exists add its name to SPR (below) and the object uses the sprite.
(function () {
  const S = (window.SCENE = {}), L = LIB, W = SIM.VIEW.W, H = SIM.VIEW.H;
  const K = SIM.K, UI = SIM.UI, GY = SIM.GY, CX = SIM.CART_SX, SS = L.SS, rnd = L.rnd;
  S.REPEAT = ['ground_tex'];
  S.programs = () => { L.init(W, H); L.glyphs('0123456789+$×'); L.SUN = [W * 0.15, -300]; };
  const SPR = new Set();                                                     // names with real generated art (phase 3 fills this)
  void SPR;
  const FONT = '"Arial Black", "Arial Rounded MT Bold", "Segoe UI Black", sans-serif';
  const ease = (x) => 1 - (1 - x) * (1 - x), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), mix = (a, b, w) => L.lerpP(a, b, w);
  const WHITE = [1, 1, 1], GOLD = [1, 0.82, 0.2], GOLD2 = [0.85, 0.55, 0.05];
  S.hit = [];

  // ---------- shape helpers (screen px) ----------
  const circ = (x, y, r, c0, c1 = c0, a = 1) => L.rrect(x - r, y - r, 2 * r, 2 * r, r, c0, c1, a);
  const bar = (x0, y0, len, th, ang, col, a = 1) => L.solid(x0, y0 - th / 2, len, th, col, ang, 0, th / 2, a);          // bar starting at (x0,y0) pointing at ang
  const coin = (x, y, r, spin, a = 1) => { const w = Math.max(0.18, Math.abs(Math.cos(spin))) * r; L.rrect(x - w, y - r, 2 * w, 2 * r, w, GOLD, GOLD2, a);
    if (w > r * 0.45) L.rrect(x - w * 0.66, y - r * 0.66, 1.32 * w, 1.32 * r, w * 0.66, [1, 0.93, 0.5], [0.96, 0.72, 0.16], a); };
  const bolt = (x, y, s, col, a = 1) => { bar(x + 4 * s, y - 15 * s, 22 * s, 9 * s, 2.2, col, a); bar(x - 3 * s, y - 2 * s, 22 * s, 9 * s, 0.9, col, a); bar(x + 1 * s, y + 3 * s, 22 * s, 9 * s, 2.2, col, a); };   // lightning zigzag
  const fmtHp = (v) => (v >= 1000 ? (Math.round(v / 100) / 10).toFixed(1) + 'K' : String(Math.max(0, Math.round(v / 10) * 10)));

  S.render = (t) => {
    const ST = S.state || SIM.at(t), GT = ST.t, p = ST.p, z = ST.zoom;
    // ---- camera: trauma shake from recent events ----
    let tr = 0;
    for (const e of ST.ev) { const a = GT - e.t; if (a < 0) continue;
      if (e.k === 'towerdown' && a < 0.9) tr = Math.max(tr, 1 - a / 0.9); if (e.k === 'boom' && a < 0.4) tr = Math.max(tr, 0.6 * (1 - a / 0.4));
      if (e.k === 'sawimpact' && a < 0.3) tr = Math.max(tr, 0.55 * (1 - a / 0.3)); if (e.k === 'upgrade' && a < 0.5) tr = Math.max(tr, 0.7 * (1 - a / 0.5));
      if (e.k === 'hurt' && a < 0.15) tr = Math.max(tr, 0.25 * (1 - a / 0.15)); if (e.k === 'buy' && a < 0.2) tr = Math.max(tr, 0.3 * (1 - a / 0.2)); }
    const sh = 22 * tr * tr, shx = sh * Math.sin(GT * 83), shy = sh * Math.sin(GT * 101 + 1);
    const sx = (x) => CX + (x - p.x) * z + shx, gyS = GY + shy;               // screen x of a world x; screen y of the ground line
    const hy = (h) => gyS - h * z;                                            // screen y of a height above the ground

    // ===== sky + parallax =====
    L.beginBG([0.25, 0.6, 0.68, 1]);
    L.rrect(0, 0, W, GY + 40, 0, [0.20, 0.58, 0.68], [0.70, 0.88, 0.74]);
    L.glow(W * 0.78, GY - 330, 520, [1, 0.95, 0.7], 0.22, 2.4);
    const layer = (f, sp, fn) => { const cam = p.x * f, i0 = Math.floor((cam - CX - 400) / sp), i1 = Math.ceil((cam + W - CX + 400) / sp); for (let i = i0; i <= i1; i++) fn(i, CX + i * sp - cam + shx * f); };
    layer(0.12, 560, (i, x) => { const h = 300 + 160 * rnd(i, 1), w = 700 + 260 * rnd(i, 2);                                  // far cliffs
      L.rrect(x - w / 2, GY - h * 0.9, w, h * 1.4, 130, [0.50, 0.68, 0.62], [0.38, 0.58, 0.50], 0.9);
      L.rrect(x - w * 0.18, GY - h * 0.9, w * 0.42, h * 1.2, 90, [0.62, 0.78, 0.68], [0.50, 0.68, 0.58], 0.7); });
    const pine = (x, base, sz, c0, c1, tx) => { L.solid(x - sz * 0.05, base - sz * 0.22, sz * 0.1, sz * 0.22, tx, 0, 0, 0, 1);
      for (let k = 0; k < 4; k++) { const w = sz * (0.62 - k * 0.12), y0 = base - sz * (0.16 + k * 0.2) - sz * 0.2; L.rrect(x - w / 2, y0, w, sz * 0.3, w * 0.42, mix(c0, WHITE, 0.08 * (3 - k)), c1); } };
    layer(0.3, 330, (i, x) => { if (rnd(i, 3) < 0.25) return; pine(x + 60 * rnd(i, 4), GY - 6, 230 + 70 * rnd(i, 5), [0.30, 0.55, 0.42], [0.20, 0.42, 0.32], [0.36, 0.30, 0.22]); });
    layer(0.62, 430, (i, x) => { if (rnd(i, 6) < 0.2) return; pine(x + 90 * rnd(i, 7), GY + 6, 340 + 110 * rnd(i, 8), [0.22, 0.50, 0.26], [0.13, 0.36, 0.17], [0.34, 0.24, 0.16]); });
    // ground: lit grass band at the horizon fading to deep green, dirt track the cart rolls on, tufts + stones that sell the speed
    L.rrect(0, GY - 4, W, H - GY + 8, 0, [0.52, 0.70, 0.20], [0.18, 0.38, 0.10]);
    L.rrect(0, gyS + 6, W, 120 * z, 0, [0.62, 0.55, 0.28], [0.45, 0.42, 0.20], 0.55);
    layer(1, 150, (i, x) => { const r = rnd(i, 9), y = gyS + 20 + 330 * rnd(i, 10), s = 0.6 + 0.9 * (y - gyS) / 330;
      if (r < 0.55) { for (let k = -1; k <= 1; k++) bar(x + k * 9 * s, y, 26 * s, 5 * s, -1.57 + k * 0.5, [0.14, 0.34, 0.08], 0.8); }
      else if (r < 0.8) L.rrect(x - 16 * s, y - 10 * s, 32 * s, 20 * s, 9 * s, [0.62, 0.64, 0.58], [0.42, 0.46, 0.4], 0.9); });
    L.beginComp();

    // ===================== towers =====================
    ST.towers.forEach((q, i) => {
      const w = (i ? 300 : 240), hgt = i ? 600 : 440, x = sx(q.x), a = q.alive ? 0 : GT - q.deadT, hit = q.alive ? clamp(1 - (GT - q.hitT) / 0.12, 0, 1) : 0;
      if (x < -400 || x > W + 400) return;
      const col = (c) => mix(c, WHITE, 0.5 * hit), jx = a > 0 && a < 0.9 ? 7 * Math.sin(a * 60) * (1 - a / 0.9) : 0;
      if (q.alive || a < 0.9) {
        const cs = q.alive ? 1 : 1 - 0.86 * ease(a / 0.9), H0 = hgt * cs, bx = x - w * z / 2 + jx, top = hy(H0);
        L.shadow(x + 20, gyS + 8, w * z * 0.7, 26 * z, 0.4);
        L.rrect(bx, top, w * z, H0 * z, 10 * z, col([0.78, 0.78, 0.74]), col([0.55, 0.55, 0.52]));
        L.rrect(bx + w * z * 0.62, top, w * z * 0.38, H0 * z, 10 * z, col([0.62, 0.62, 0.6]), col([0.46, 0.46, 0.44]), 0.8);                    // shaded side
        for (let r = 1; r * 52 < H0; r++) L.solid(bx, hy(r * 52 * cs), w * z, 3 * z, [0.38, 0.38, 0.36], 0, 0, 0, 0.5);                           // brick courses
        for (let r = 0; r * 52 < H0; r++) for (let c = 0; c < 4; c++) L.solid(bx + (c + 0.5 * (r % 2) + 0.4) * w * z / 4.2, hy((r + 1) * 52 * cs), 3 * z, 52 * cs * z, [0.38, 0.38, 0.36], 0, 0, 0, 0.35);
        for (let m = 0; m < 4; m++) L.rrect(bx + m * 0.26 * w * z, top - 28 * z * cs, w * z * 0.22, 36 * z * cs, 4 * z, col([0.8, 0.8, 0.76]), col([0.6, 0.6, 0.57]));   // merlons
        L.rrect(x - 36 * z + jx, hy(110 * cs), 72 * z, 110 * cs * z, 36 * z, [0.12, 0.10, 0.10], [0.05, 0.04, 0.04]);                             // door (skeletons come out here)
        L.rrect(x + 40 * z + jx, hy(H0 * 0.72), 34 * z, 70 * cs * z, 16 * z, [0.14, 0.12, 0.12], [0.07, 0.06, 0.06]);
        for (let b = 0; b < 3; b++) { const by = hy(H0 * (0.55 + 0.13 * b)), bl = (70 + 24 * b) * z; bar(bx + 4 * z, by, bl, 22 * z, 3.14 + 0.18 + b * 0.1, col([0.74, 0.42, 0.16])); circ(bx - bl + 14 * z, by - 0.17 * bl, 11 * z, col([0.92, 0.6, 0.28]), col([0.7, 0.4, 0.14])); }   // timber beams
        const f = q.hp / q.hpMax;
        if (q.alive && f < 0.7) { bar(x - 10 * z, hy(H0 * 0.8), 90 * z, 6 * z, 1.3, [0.12, 0.12, 0.1], 0.8); bar(x + 20 * z, hy(H0 * 0.55), 80 * z, 6 * z, 1.9, [0.12, 0.12, 0.1], 0.8); }
        if (q.alive && f < 0.35) { bar(x + 60 * z, hy(H0 * 0.9), 110 * z, 7 * z, 1.7, [0.1, 0.1, 0.08], 0.85); bar(x - 70 * z, hy(H0 * 0.4), 100 * z, 7 * z, 1.2, [0.1, 0.1, 0.08], 0.85); }
        if (q.alive) { const bw = 190, by = top - 62 * z;                                                                                          // HP bar + number (as in the reference)
          L.rrect(x - bw / 2, by, bw, 24, 12, [0.14, 0.14, 0.14], [0.06, 0.06, 0.06], 0.85); L.rrect(x - bw / 2 + 3, by + 3, Math.max(8, (bw - 6) * f), 18, 9, [1, 0.78, 0.2], [0.92, 0.5, 0.06]);
          if (x > 100 && x < W - 100) L.label('twhp' + i, fmtHp(q.hp), x, by - 34, { size: 50, font: FONT, col: '#ffffff', out: '#2a1a00', al: 0.5 }); }
      }
      if (!q.alive) { for (let r = 0; r < 9; r++) { const rx = x + (r - 4) * 30 * z + 14 * Math.sin(r * 5), rh = (22 + 26 * rnd(r, i)) * clamp(a / 0.5, 0, 1) * z;                // rubble pile
        L.rrect(rx - 24 * z, gyS - rh, 48 * z, rh + 6 * z, 10 * z, [0.72, 0.72, 0.68], [0.5, 0.5, 0.47]); } }
    });

    // ===================== skeletons =====================
    const front = SIM.frontOf(p);
    for (const e of ST.enemies) { if (e.dead) continue; const x = sx(e.x), fl = clamp(1 - (GT - e.hitT) / 0.1, 0, 1);
      if (x < -120 || x > W + 140) continue;
      const age = GT - e.t0, emerge = ease(clamp(age / 0.35, 0, 1)), melee = e.x - front < K.SK_REACH + 6, ph = GT * 9 + e.id * 1.7, sc = z * (0.95 + 0.1 * rnd(e.id, 2)), helm = e.hpMax > K.SK_HP * 1.2;
      const c = (col) => mix(col, WHITE, 0.55 * fl), BONE = c([0.93, 0.9, 0.78]), SHADE = c([0.74, 0.68, 0.54]), RED = c([0.78, 0.14, 0.12]), hipH = 70 * sc, sw = melee ? 0 : Math.sin(ph) * 0.55;
      const bob = melee ? 0 : Math.abs(Math.sin(ph)) * 5 * sc, gx = x, base = gyS + (1 - emerge) * 40 * sc, hz = base - hipH - bob;
      L.shadow(gx, gyS + 4, 34 * sc, 9 * sc, 0.4 * emerge);
      for (const sg of [-1, 1]) bar(gx + sg * 8 * sc, hz, 68 * sc, 12 * sc, 1.5708 + sg * sw, sg < 0 ? SHADE : BONE);                                                  // legs
      L.rrect(gx - 24 * sc, hz - 26 * sc, 48 * sc, 36 * sc, 8 * sc, RED, mix(RED, [0, 0, 0], 0.3));                                                                    // red trousers
      L.rrect(gx - 22 * sc, hz - 92 * sc, 44 * sc, 70 * sc, 12 * sc, BONE, SHADE);                                                                                      // ribcage
      for (let r = 0; r < 3; r++) L.solid(gx - 17 * sc, hz - (74 - r * 15) * sc, 34 * sc, 4 * sc, [0.35, 0.3, 0.22], 0, 0, 0, 0.75);
      circ(gx - 2 * sc, hz - 112 * sc, 22 * sc, BONE, SHADE);                                                                                                           // skull
      circ(gx - 11 * sc, hz - 114 * sc, 5.5 * sc, [0.1, 0.06, 0.05]); circ(gx + 6 * sc, hz - 114 * sc, 5.5 * sc, [0.1, 0.06, 0.05]);
      L.rrect(gx - 14 * sc, hz - 98 * sc, 24 * sc, 8 * sc, 3 * sc, [0.25, 0.2, 0.15], [0.15, 0.1, 0.08]);
      if (helm) L.rrect(gx - 25 * sc, hz - 138 * sc, 50 * sc, 26 * sc, 12 * sc, c([0.55, 0.57, 0.6]), c([0.33, 0.35, 0.4]));
      const swing = melee ? Math.sin(GT * 11 + e.id) * 0.9 : -0.2 + 0.25 * Math.sin(ph + 1);                                                                           // sword arm toward the cart (left)
      bar(gx - 14 * sc, hz - 78 * sc, 40 * sc, 10 * sc, 3.14 - 0.5 - swing, BONE);
      bar(gx - 14 * sc - Math.cos(0.5 + swing) * 38 * sc, hz - 78 * sc - Math.sin(0.5 + swing) * 38 * sc, 66 * sc, 9 * sc, 3.14 - 1.0 - swing, c([0.72, 0.74, 0.8]));
      if (e.id % 2 === 0) { circ(gx - 26 * sc, hz - 62 * sc, 20 * sc, c([0.95, 0.7, 0.2]), c([0.7, 0.4, 0.08])); circ(gx - 26 * sc, hz - 62 * sc, 7 * sc, c([0.55, 0.3, 0.06])); }
      if (e.hp < e.hpMax) { const bw = 70 * sc; L.rrect(gx - bw / 2, base - 175 * sc, bw, 11, 5, [0.1, 0.1, 0.1], [0.05, 0.05, 0.05], 0.85); L.rrect(gx - bw / 2 + 2, base - 175 * sc + 2, Math.max(5, (bw - 4) * e.hp / e.hpMax), 7, 3, [1, 0.72, 0.15], [0.92, 0.5, 0.06]); }
    }

    // ===================== cart rig (also reused big on the endcard) =====================
    let flashHurt = 0, upAge = 99, buyAge = 99, aimX = null, boltAge = 9;
    for (const e of ST.ev) { const a = GT - e.t; if (e.k === 'hurt') flashHurt = Math.max(flashHurt, clamp(1 - a / 0.15, 0, 1)); if (e.k === 'upgrade') upAge = a; if (e.k === 'buy' && e.id === 'saw') buyAge = a; if (e.k === 'bolt') { aimX = e.tx; boltAge = a; } }
    const drawCart = (ox, base, sc, o) => {
      const tier = o.tier, rot = o.dist / 60, bob = o.moving ? Math.abs(Math.sin(o.dist * 0.05)) * 3 * sc : 0, y0 = base - bob, crates = tier >= 2 ? 3 : 1;
      const c = (col) => mix(col, [1, 0.25, 0.2], 0.5 * o.hurt);
      L.shadow(ox, base + 4 * sc, 190 * sc, 22 * sc, 0.45);
      for (const [wx, wr] of [[-150, 36], [-72, 60], [52, 60]]) { const cx0 = ox + wx * sc, cy0 = y0 - wr * sc, rr = wr * sc;                                    // wheels
        circ(cx0, cy0, rr, [0.46, 0.27, 0.12], [0.30, 0.17, 0.07]); circ(cx0, cy0, rr * 0.82, [0.66, 0.42, 0.2], [0.5, 0.32, 0.14]);
        for (let s = 0; s < 6; s++) bar(cx0, cy0, rr * 0.8, rr * 0.13, rot * 60 / wr + s * 1.047, [0.38, 0.22, 0.1]);
        circ(cx0, cy0, rr * 0.22, [0.7, 0.78, 0.82], [0.4, 0.46, 0.5]); circ(cx0, cy0, rr * 0.08, [0.2, 0.22, 0.24]); }
      bar(ox - 150 * sc, y0 - 36 * sc, 215 * sc, 8 * sc, 0, [0.24, 0.16, 0.1]);
      let top = 70 * sc;                                                                                                                                              // crates (tier 2: two more pop up with an overshoot)
      for (let k = 0; k < crates; k++) { const h = (k === 0 ? 110 : 96) * sc, qk = clamp((o.upAge - 0.12 * k) / 0.35, 0, 1), pop = k === 0 || o.upAge >= 99 ? 1 : ease(qk) * (1 + 0.18 * Math.sin(qk * 3.14)), hh = h * pop;
        if (hh < 2) continue; const bx = ox - 150 * sc + (k ? 14 * sc : 0), bw = (k ? 246 : 270) * sc, by = y0 - top - hh;
        L.rrect(bx, by, bw, hh, 8 * sc, c([0.70, 0.42, 0.18]), c([0.50, 0.28, 0.11]));
        for (let pl = 1; pl < 3; pl++) L.solid(bx, by + hh * pl / 3, bw, 4 * sc, [0.22, 0.12, 0.05], 0, 0, 0, 0.7);
        L.solid(bx, by, 14 * sc, hh, [0.42, 0.24, 0.1], 0, 0, 0, 0.9); L.solid(bx + bw - 14 * sc, by, 14 * sc, hh, [0.42, 0.24, 0.1], 0, 0, 0, 0.9);
        bar(bx + 6 * sc, by + 6 * sc, Math.hypot(bw - 12 * sc, hh - 12 * sc), 8 * sc, Math.atan2(hh - 12 * sc, bw - 12 * sc), [0.3, 0.17, 0.07], 0.55);
        for (const [rx, ry] of [[14, 14], [bw / sc - 14, 14], [14, hh / sc - 14], [bw / sc - 14, hh / sc - 14]]) circ(bx + rx * sc, by + ry * sc, 4.5 * sc, [0.75, 0.78, 0.8], [0.45, 0.48, 0.5]);
        if (tier >= 2 && k >= 1) L.solid(bx, by + hh - 8 * sc, bw, 8 * sc, [0.55, 0.58, 0.62], 0, 0, 0, 0.85);
        top += hh; }
      if (o.saw) { const sp = o.sawBuy < 99 ? ease(clamp(o.sawBuy / 0.25, 0, 1)) : 1, sxp = ox + 150 * sc + (1 - sp) * 60 * sc, syp = y0 - 96 * sc, r = 62 * sc * (0.6 + 0.4 * sp), ang = GT * (o.grind ? 22 : 7);   // saw on the nose
        circ(sxp, syp, r, [0.82, 0.86, 0.9], [0.55, 0.6, 0.66]);
        for (let g = 0; g < 12; g++) bar(sxp + Math.cos(ang + g * 0.5236) * r * 0.9, syp + Math.sin(ang + g * 0.5236) * r * 0.9, r * 0.28, r * 0.2, ang + g * 0.5236 + 0.6, [0.7, 0.74, 0.8]);
        circ(sxp, syp, r * 0.62, [0.7, 0.74, 0.8], [0.45, 0.5, 0.56]); circ(sxp, syp, r * 0.34, [0.95, 0.55, 0.15], [0.7, 0.32, 0.06]); circ(sxp, syp, r * 0.1, [0.25, 0.25, 0.28]);
        bar(sxp - r * 0.4, syp, r * 0.55, 10 * sc, 3.1, [0.3, 0.3, 0.34]); }
      if (tier >= 2) for (const nh of [150, 250]) { const ny = y0 - nh * sc; bar(ox + 120 * sc, ny, 50 * sc, 18 * sc, 0, [0.34, 0.36, 0.4]); circ(ox + 172 * sc, ny, 11 * sc, [0.18, 0.18, 0.2], [0.08, 0.08, 0.1]); circ(ox + 120 * sc, ny, 16 * sc, [0.9, 0.5, 0.15], [0.6, 0.3, 0.08]); }
      // archer: blue hood, fluttering cape, crossbow aimed at the current target
      const ax = ox - 10 * sc, ab = y0 - top, lean = o.recoil * 5 * sc, aim = o.aim;
      L.shadow(ax, ab + 2 * sc, 40 * sc, 8 * sc, 0.3);
      bar(ax - 14 * sc, ab - 70 * sc, 60 * sc, 26 * sc, 3.14 + 0.05, [0.25, 0.5, 0.95], 0.9); bar(ax - 16 * sc, ab - 100 * sc, 74 * sc, 24 * sc, 3.14 - 0.15 + 0.12 * Math.sin(GT * 7), [0.18, 0.4, 0.88], 0.9);
      for (const sg of [-1, 1]) bar(ax + sg * 11 * sc, ab - 62 * sc, 62 * sc, 20 * sc, 1.5708, [0.32, 0.22, 0.16]);
      L.rrect(ax - 24 * sc - lean, ab - 128 * sc, 48 * sc, 74 * sc, 14 * sc, [0.42, 0.28, 0.2], [0.28, 0.18, 0.13]); L.rrect(ax - 24 * sc - lean, ab - 92 * sc, 48 * sc, 10 * sc, 3 * sc, [0.9, 0.7, 0.2], [0.7, 0.5, 0.1]);
      circ(ax - lean, ab - 148 * sc, 24 * sc, [0.35, 0.52, 0.98], [0.15, 0.3, 0.8]); circ(ax + 8 * sc - lean, ab - 144 * sc, 13 * sc, [0.9, 0.72, 0.58], [0.75, 0.55, 0.42]);
      const hx = ax + 12 * sc - lean, hyy = ab - 110 * sc; bar(hx, hyy, 74 * sc, 12 * sc, aim, [0.34, 0.22, 0.14]);
      const tipx = hx + Math.cos(aim) * 56 * sc, tipy = hyy + Math.sin(aim) * 56 * sc; bar(tipx, tipy, 34 * sc, 9 * sc, aim + 1.5708, [0.2, 0.2, 0.22]); bar(tipx, tipy, 34 * sc, 9 * sc, aim - 1.5708, [0.2, 0.2, 0.22]);
      bar(ax - 6 * sc - lean, ab - 112 * sc, 40 * sc, 11 * sc, aim + 0.2, [0.9, 0.72, 0.58]);
      if (o.hpBar) { const bh = 150 * sc, bxp = ox - 190 * sc, f = clamp(p.hp / p.hpMax, 0, 1); L.rrect(bxp, y0 - 80 * sc - bh, 14, bh, 7, [0.1, 0.1, 0.1], [0.05, 0.05, 0.05], 0.85);    // hp bar left of the cart
        L.rrect(bxp + 2, y0 - 80 * sc - (bh - 4) * f - 2, 10, Math.max(6, (bh - 4) * f), 5, [0.4, 1, 0.3], [0.2, 0.7, 0.15]); }
    };
    const aim0 = aimX !== null && boltAge < 0.5 ? clamp(0.3 * (1 - (aimX - p.x) / 900), 0.02, 0.3) : 0.02;
    const grind = ST.enemies.some((e) => !e.dead && e.x - front < K.SK_REACH + 12);
    drawCart(sx(p.x), gyS, z, { tier: p.tier, saw: p.saw, dist: p.x, moving: p.v > 20, hurt: flashHurt, upAge, sawBuy: buyAge, grind: grind && p.saw, recoil: clamp(1 - boltAge / 0.15, 0, 1), aim: aim0, hpBar: ST.phase === 'battle' && ST.end < 0 });

    // ===================== rolling saw blades, bombs in flight =====================
    for (const b of ST.blades) { const x = sx(b.x), r = 46 * z, y = gyS - r - 4; circ(x, y, r, [0.85, 0.88, 0.92], [0.55, 0.6, 0.66]);
      for (let g = 0; g < 10; g++) bar(x + Math.cos(GT * -16 + g * 0.628) * r * 0.9, y + Math.sin(GT * -16 + g * 0.628) * r * 0.9, r * 0.3, r * 0.2, GT * -16 + g * 0.628 + 0.6, [0.72, 0.76, 0.82]);
      circ(x, y, r * 0.5, [0.95, 0.55, 0.15], [0.7, 0.32, 0.06]); L.glow(x, y, r * 2, [1, 0.7, 0.3], 0.35, 2.4);
      for (let j = 0; j < 5; j++) L.star(x - (20 + j * 26) * z, gyS - (4 + 14 * rnd(j, Math.floor(GT * 20))) * z, 14 * z, [1, 0.8, 0.4], 0.8 - j * 0.15); }
    for (const e of ST.ev) { if (e.k !== 'throw') continue; const a = GT - e.t; if (a < 0 || a > e.flight) continue; const u = a / e.flight, bx = sx(e.x0) + (sx(e.x) - sx(e.x0)) * u, by = gyS - (260 * (1 - u) + 520 * Math.sin(Math.PI * u) - 10) * z;
      circ(bx, by, 24 * z, [0.28, 0.28, 0.32], [0.08, 0.08, 0.1]); circ(bx - 7 * z, by - 8 * z, 7 * z, [0.6, 0.6, 0.66], [0.4, 0.4, 0.46], 0.8);
      bar(bx + 6 * z, by - 22 * z, 16 * z, 4 * z, -1.2 + GT * 9, [0.4, 0.3, 0.2]); L.star(bx + 10 * z, by - 36 * z, 14 * z, [1, 0.8, 0.3], 0.9); }

    // ===================== event FX (world) =====================
    for (const e of ST.ev) { const a = GT - e.t; if (a < 0) continue;
      if (e.k === 'bolt' && a < 0.16) { const x0 = sx(e.x), y0 = hy(e.tower ? 250 : 200), x1 = sx(e.tx), u = a / 0.16, y1 = hy(e.tower ? 230 : 90);
        const sxb = x0 + (x1 - x0) * Math.max(0, u - 0.35), syb = y0 + (y1 - y0) * Math.max(0, u - 0.35), exb = x0 + (x1 - x0) * u, eyb = y0 + (y1 - y0) * u;
        bar(sxb, syb, Math.hypot(exb - sxb, eyb - syb), 5 * z, Math.atan2(eyb - syb, exb - sxb), [1, 0.95, 0.7]); if (a < 0.05) L.glow(x0 + 70 * z, hy(190), 50 * z, [1, 0.9, 0.5], 0.7, 2.4);
        if (u > 0.9) L.star(x1, y1, 22 * z, [1, 0.9, 0.5], 0.9); }
      if (e.k === 'sawhit' && a < 0.25) { const x = sx(e.x), q = a / 0.25; for (let j = 0; j < 6; j++) { const an = -Math.PI / 2 + (rnd(j, e.t * 9) - 0.5) * 2.6, d = (30 + 80 * rnd(j, 3)) * ease(q) * z;
        L.star(x - 20 * z + Math.cos(an) * d, hy(60) + Math.sin(an) * d + 120 * q * q * z, 12 * z, [1, 0.8, 0.4], 1 - q); } if (a < 0.08) L.glow(x - 20 * z, hy(70), 70 * z, [1, 0.7, 0.3], 0.6, 2.4); }
      if (e.k === 'kill' && a < 1.1) { const x = sx(e.x), g = e.why === 'bomb' || e.why === 'sawt' || e.why === 'rubble' ? 1.6 : 1;
        if (a < 0.4) for (let j = 0; j < 4; j++) { const q = a / 0.4, an = rnd(j, e.id) * 6.28; L.puff(x + Math.cos(an) * 40 * q * z, hy(60 + 40 * q) + Math.sin(an) * 20 * q * z, (16 + 24 * q) * z, [0.86, 0.82, 0.7], 0.6 * (1 - q), e.id + j); }
        for (let j = 0; j < 7; j++) { const vx = (rnd(j, e.id) - 0.5) * 520 * g, vy = (260 + 380 * rnd(j, e.id + 1)) * g, tt = Math.min(a, 1.0), h = Math.max(0, 70 + vy * tt - 1300 * tt * tt), xx = x + vx * tt * z;
          const al = 1 - SS(0.7, 1.1, a), ang = tt * (6 + 8 * rnd(j, 5)) * (j % 2 ? 1 : -1);
          if (j === 0) circ(xx, hy(h), 20 * z, [0.93, 0.9, 0.78], [0.74, 0.68, 0.54], al); else bar(xx - Math.cos(ang) * 16 * z, hy(h) - Math.sin(ang) * 16 * z, 34 * z, 8 * z, ang, j % 3 ? [0.93, 0.9, 0.78] : [0.78, 0.14, 0.12], al); } }
      if (e.k === 'boom' && a < 1.0) { const x = sx(e.x), q = a / 1.0, r = e.r * z; if (a < 0.2) L.glow(x, hy(70), r * 1.6, [1, 0.6, 0.2], 1.3 * (1 - a / 0.2), 2.2);
        L.ring(x, hy(30), r * 1.2 * ease(Math.min(1, a / 0.35)), r * 0.35 * ease(Math.min(1, a / 0.35)), [1, 0.8, 0.5], 0.9 * (1 - Math.min(1, a / 0.4)), 0.16);
        for (let j = 0; j < 8; j++) { const an = j / 8 * 6.283 + 0.4, d = (40 + 150 * ease(Math.min(1, a / 0.6))) * z; L.puff(x + Math.cos(an) * d, hy(60) + Math.sin(an) * d * 0.7 - 80 * q * z, (36 + 50 * q) * z, j % 3 ? [0.32, 0.31, 0.3] : [1, 0.55, 0.15], 0.85 * (1 - q), j + 7); }
        for (let j = 0; j < 8; j++) { const vx = (rnd(j, 11) - 0.5) * 620, tt = Math.min(a, 0.9); L.rrect(x + vx * tt * z - 8 * z, hy(Math.max(0, 40 + (520 + 300 * rnd(j, 12)) * tt - 1500 * tt * tt)) - 8 * z, 16 * z, 14 * z, 4 * z, [0.46, 0.34, 0.2], [0.3, 0.2, 0.1], 1 - SS(0.7, 1, a)); } }
      if (e.k === 'sawimpact' && a < 0.6) { const x = sx(e.x), q = a / 0.6; for (let j = 0; j < 12; j++) { const an = -Math.PI / 2 + (rnd(j, 4) - 0.5) * 3, d = (40 + 170 * rnd(j, 5)) * ease(q) * z; L.star(x + Math.cos(an) * d, hy(50) + Math.sin(an) * d + 200 * q * q * z, 14 * z, [1, 0.82, 0.4], 1 - q); }
        for (let j = 0; j < 5; j++) L.puff(x - 20 * z + j * 14 * z, hy(80 + 40 * q), (24 + 40 * q) * z, [0.7, 0.7, 0.66], 0.6 * (1 - q), j + 3); }
      if (e.k === 'towerdown' && a < 2.4) { const x = sx(e.x), q = a / 2.4;
        for (let j = 0; j < 14; j++) { const vx = (rnd(j, 21) - 0.5) * 760 + 60, vy = 300 + 620 * rnd(j, 22), tt = Math.min(a, 1.4), h = Math.max(0, 200 + vy * tt - 1200 * tt * tt), al = 1 - SS(1.7, 2.4, a), sw = (40 + 50 * rnd(j, 23)) * z;
          const cx = x + vx * tt * z, cy = hy(h); L.rrect(cx - sw / 2, cy - sw / 2, sw, sw * 0.8, 6 * z, [0.8, 0.8, 0.76], [0.52, 0.52, 0.48], al); }
        for (let j = 0; j < 12; j++) { const an = j / 12 * 6.283 + 0.3, d = (60 + 340 * ease(Math.min(1, a / 1.2))) * z; L.puff(x + Math.cos(an) * d, hy(50) + Math.sin(an) * d * 0.35 - 110 * q * z, (60 + 80 * q) * z, [0.78, 0.74, 0.66], 0.7 * (1 - q), j + 31); }
        if (a < 0.3) L.glow(x, hy(200), 420 * z, [1, 0.85, 0.5], 0.9 * (1 - a / 0.3), 2.2); }
      if (e.k === 'upgrade' && a < 1.5) { const x = sx(p.x), q = a / 1.5, pil = (1 - SS(0.3, 1, q)) * SS(0, 0.08, a);
        for (let j = 0; j < 6; j++) L.glow(x, hy(100 + j * 90 * (0.4 + q)), (150 - j * 10) * z, [1, 0.88, 0.45], 0.55 * pil * (1 - j / 7), 2.2);
        for (let j = 0; j < 10; j++) { const an = j / 10 * 6.283 + 0.4, d = (80 + 240 * ease(Math.min(1, a / 0.5))) * z; L.puff(x + Math.cos(an) * d, hy(40) + Math.sin(an) * d * 0.3, (30 + 36 * q) * z, [0.86, 0.72, 0.46], 0.55 * (1 - q), j + 3); }
        for (let j = 0; j < 8; j++) { const an = j / 8 * 6.283 + e.t, d = (100 + 220 * ease(q)) * z; L.star(x + Math.cos(an) * d, hy(220) + Math.sin(an) * d * 0.7, 26 * z, [1, 0.9, 0.5], 1 - q); } }
      if (e.k === 'buy' && e.id === 'saw' && a < 0.5) { const x = sx(p.x + 190), q = a / 0.5; for (let j = 0; j < 8; j++) { const an = j / 8 * 6.283, d = (30 + 90 * ease(q)) * z; L.star(x + Math.cos(an) * d, hy(100) + Math.sin(an) * d, 14 * z, [1, 0.85, 0.5], 1 - q); } }
      if (e.k === 'spawn' && a < 0.5) { const x = sx(e.x), q = a / 0.5; L.puff(x, hy(40 + 30 * q), (30 + 40 * q) * z, [0.4, 0.38, 0.36], 0.6 * (1 - q), 5 + Math.floor(e.t * 3)); } }
    if (p.tier >= 2 && ST.fireUntil > GT && ST.end < 0) { const fa = 1 - SS(ST.fireUntil - 0.3, ST.fireUntil, GT);                                  // flames: two cones
      for (const nh of [150, 250]) { const x0 = sx(p.x) + 172 * z, y0 = hy(nh);
        for (let j = 0; j < 22; j++) { const qq = (GT * 2.6 + j / 22 + nh * 0.01) % 1, d = (20 + K.FIRE_RANGE * qq) * z, sp = (rnd(j, nh) - 0.5) * qq * 150 * z, r = (18 + 62 * qq) * z;
          L.puff(x0 + d, y0 + sp + 30 * qq * z, r, qq < 0.6 ? [1, 0.55 - 0.3 * qq, 0.1] : [0.3, 0.22, 0.2], 0.8 * (1 - qq) * fa, j + nh); if (qq < 0.7) L.glow(x0 + d, y0 + sp, r * 1.3, [1, 0.5, 0.1], 0.35 * (1 - qq) * fa, 2.4); }
        L.glow(x0, y0, 70 * z, [1, 0.8, 0.4], 0.8 * fa, 2.2); } }
    if (p.v > 30) for (let j = 0; j < 3; j++) { const q = (GT * 1.8 + j / 3) % 1; L.puff(sx(p.x) - (90 + 120 * q) * z, gyS - (12 + 30 * q) * z, (12 + 26 * q) * z, [0.7, 0.6, 0.4], 0.35 * (1 - q) * Math.min(1, p.v / 200), j); }
    L.finish(t, { bloom: [0.14, 0.12], vignette: 0.9, warm: 0.5, roll: 0.5 });

    // ===================== HUD (screen space) =====================
    S.hit = [];
    const mtw = Math.max(L.labelW('money', String(Math.max(0, Math.round(ST.money))), { size: 62, font: FONT }), 56), mpw = 96 + 20 + mtw + 40, mpx = W - 40 - mpw, mpy = 150, hudC = [mpx + 52, mpy + 48];
    let inFlight = 0;                                                                                                                                                  // coins collected fly to the pill
    for (const e of ST.ev) { const a = GT - e.t; if (a < 0 || !e.coin || e.k === 'nope') continue;
      const n = e.k === 'towerdown' ? 12 : 3, ox = sx(e.x), oy = hy(e.k === 'towerdown' ? 200 : 80); inFlight += e.coin * (1 - clamp((a - 0.3) / 0.75, 0, 1));
      for (let j = 0; j < n; j++) { const qj = clamp((a - j * 0.045) / 0.9, 0, 1); if (qj <= 0 || qj >= 1) continue;
        const sx0 = ox + (rnd(j, e.t * 7) - 0.5) * 120, sy0 = oy - 70 * Math.sin(Math.min(1, qj * 4) * 1.57), u = Math.pow(clamp((qj - 0.25) / 0.75, 0, 1), 1.6);
        coin(sx0 + (hudC[0] - sx0) * u, sy0 + (hudC[1] - sy0) * u - 90 * Math.sin(Math.PI * u) * (1 - u), 26 - 8 * u, GT * 10 + j); } }
    const shown = Math.max(0, Math.round(ST.money - inFlight)); let mb = 0; for (const e of ST.ev) { const a = GT - e.t - 0.7; if (e.coin && a >= 0 && a < 0.12) mb = Math.max(mb, 1 - a / 0.12); }
    { const lx = 36, ly = 50; L.rrect(lx, ly, 250, 150, 30, [0.95, 0.76, 0.28], [0.7, 0.45, 0.1]); L.rrect(lx + 9, ly + 9, 232, 132, 24, [0.18, 0.22, 0.4], [0.08, 0.1, 0.24]);                // logo shield
      L.label('logo1', 'SIEGE', lx + 125, ly + 52, { size: 46, font: FONT, col: '#ffe9a8', out: '#1a1030', al: 0.5 }); L.label('logo2', 'CART', lx + 125, ly + 100, { size: 52, font: FONT, col: '#ffffff', out: '#1a1030', al: 0.5 }); L.uiBox('logoBox', lx, ly, 250, 150, 2); }
    { const bx = 330, bw = W - 330 - 40, by = 92, lit = [0, 2, 5][Math.min(2, ST.towersDown)];                                                                         // progress bar + 5 flags
      L.rrect(bx, by, bw, 36, 18, [0.32, 0.34, 0.36], [0.14, 0.15, 0.17]); L.rrect(bx + 4, by + 4, Math.max(10, (bw - 8) * ST.prog), 28, 14, [0.55, 0.95, 0.3], [0.25, 0.7, 0.12]);
      for (let f = 0; f < 5; f++) { const fx = bx + bw * (f + 0.8) / 5.2 - 8, col = f < lit ? [0.92, 0.2, 0.18] : [0.62, 0.64, 0.68];
        L.solid(fx, by - 30, 5, 40, [0.35, 0.36, 0.4], 0, 0, 0, 1); L.solid(fx + 5, by - 28, 30, 22, col, 0, 0, 0, 1); L.solid(fx + 24, by - 28, 12, 22, mix(col, [0, 0, 0], 0.25), 0, 0, 0, 1); } }
    { L.rrect(mpx, mpy, mpw, 96, 48, [0.12, 0.13, 0.12], [0.05, 0.06, 0.05], 0.8); L.uiBox('money', mpx, mpy, mpw, 96, 4); coin(hudC[0], hudC[1], 40 * (1 + 0.1 * mb), 0);
      L.label('money', String(shown), mpx + 96 + 20, mpy + 48, { size: 62, font: FONT, col: '#ffe066', out: '#3a2300' }); }

    // ---- cards ----
    const press = (id) => { let b = 0; for (const e of ST.ev) { const a = GT - e.t; if (a >= 0 && a < 0.14 && (e.id === id || (id === 'bomb' && e.k === 'throw') || (id === 'sawt' && e.k === 'sawt') || (id === 'fire' && e.k === 'fire'))) b = Math.max(b, 1 - a / 0.14); } return b; };
    const shake = (id) => { let s2 = 0; for (const e of ST.ev) { const a = GT - e.t; if (e.k === 'nope' && e.id === id && a >= 0 && a < 0.3) s2 = 10 * Math.sin(a * 70) * (1 - a / 0.3); } return s2; };
    const frame = (id, on, locked, base) => { const r = UI[id], hot = ST.hint === id, pr = press(id), pul = 1 + (hot ? 0.04 * Math.sin(t * 8) : 0) - 0.06 * pr, w = r.w * pul, h = r.h * pul, x = r.x + (r.w - w) / 2 + shake(id), y = r.y + (r.h - h) / 2;
      const c0 = locked ? [0.42, 0.44, 0.46] : on ? base : [0.56, 0.58, 0.6], c1 = locked ? [0.28, 0.3, 0.32] : on ? mix(base, [0, 0, 0], 0.35) : [0.38, 0.4, 0.42];
      L.rrect(x - 5, y - 5, w + 10, h + 10, 26, [0.22, 0.24, 0.26], [0.1, 0.1, 0.12]); L.rrect(x, y, w, h, 22, c0, c1); if (hot) L.glow(x + w / 2, y + h / 2, w * 0.9, [1, 1, 0.8], 0.2 + 0.1 * Math.sin(t * 8), 2.4);
      S.hit.push({ id: 'tap_' + id, x: r.x, y: r.y, w: r.w, h: r.h }); L.uiBox('card_' + id, r.x, r.y, r.w, r.h, 2); return { x, y, w, h }; };
    const icon = (id, cx, cy, s, a = 1) => { if (id === 'bomb') { circ(cx, cy + 6 * s, 34 * s, [0.3, 0.3, 0.34], [0.08, 0.08, 0.1], a); circ(cx - 10 * s, cy - 4 * s, 9 * s, [0.65, 0.65, 0.7], [0.45, 0.45, 0.5], 0.8 * a); bar(cx + 12 * s, cy - 28 * s, 22 * s, 6 * s, -0.9, [0.6, 0.45, 0.25], a); L.star(cx + 28 * s, cy - 42 * s, 14 * s, [1, 0.8, 0.3], a); }
      else if (id === 'sawt') { circ(cx, cy, 36 * s, [0.8, 0.84, 0.88], [0.5, 0.55, 0.62], a); for (let k = 0; k < 10; k++) bar(cx + Math.cos(k * 0.628 + t) * 33 * s, cy + Math.sin(k * 0.628 + t) * 33 * s, 12 * s, 9 * s, k * 0.628 + t + 0.6, [0.7, 0.74, 0.8], a); circ(cx, cy, 15 * s, [0.95, 0.55, 0.15], [0.7, 0.32, 0.06], a); }
      else if (id === 'fire') { circ(cx, cy + 8 * s, 28 * s, [1, 0.45, 0.1], [0.85, 0.15, 0.05], a); circ(cx, cy + 14 * s, 16 * s, [1, 0.88, 0.4], [1, 0.6, 0.15], a); bar(cx - 14 * s, cy - 8 * s, 40 * s, 18 * s, -1.4, [1, 0.5, 0.1], a * 0.9); bar(cx + 8 * s, cy - 6 * s, 34 * s, 14 * s, -1.9, [1, 0.6, 0.15], a * 0.9); } };
    const chip = (r, label, enough, ico) => { const cw = 150, cx = r.x + r.w / 2 - cw / 2, cy = r.y + r.h + 10; L.rrect(cx, cy, cw, 44, 22, [0.08, 0.1, 0.14], [0.03, 0.04, 0.06], 0.85);
      if (ico === 'bolt') bolt(cx + 34, cy + 22, 0.9, enough ? [0.45, 0.8, 1] : [0.6, 0.62, 0.66]); else coin(cx + 34, cy + 22, 16, 0);
      L.label('chip_' + label + ico, label, cx + 64, cy + 23, { size: 34, font: FONT, col: enough ? '#ffffff' : '#c8ccd2', out: '#0a1020' }); };
    if (ST.end < 0 && ST.phase === 'shop') {
      const fS = frame('saw', !ST.bought.saw && ST.money >= K.COST_SAW, !!ST.bought.saw, [0.2, 0.72, 0.28]); icon('sawt', fS.x + fS.w / 2, fS.y + fS.h * 0.42, 1.0, ST.bought.saw ? 0.4 : 1); chip(UI.saw, String(K.COST_SAW), ST.money >= K.COST_SAW && !ST.bought.saw, 'coin');
      if (ST.bought.saw) L.label('sold', 'READY', fS.x + fS.w / 2, fS.y + fS.h * 0.82, { size: 32, font: FONT, col: '#9dff9d', out: '#0a2a0a', al: 0.5 });
      const fF = frame('firelock', false, true, [0.2, 0.72, 0.28]); icon('fire', fF.x + fF.w / 2, fF.y + fF.h * 0.4, 1.0, 0.35); L.label('lv2', 'CART LV2', fF.x + fF.w / 2, fF.y + fF.h * 0.86, { size: 26, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5 });
      for (const [id, nm, cost, key, sub] of [['cart', 'CART+', K.COST_CART, 'cart', '+HP'], ['energy', 'ENERGY', K.COST_ENERGY, 'energy', '+0.3/s']]) { const on = !ST.bought[key] && ST.money >= cost, f = frame(id, on, !!ST.bought[key], [0.2, 0.78, 0.3]);
        L.label('big_' + id, nm, f.x + f.w / 2, f.y + f.h * 0.26, { size: 46, font: FONT, col: '#ffffff', out: '#0a3a14', al: 0.5 }); L.label('sub_' + id, sub, f.x + f.w / 2, f.y + f.h * 0.5, { size: 36, font: FONT, col: '#d8ffd0', out: '#0a3a14', al: 0.5 });
        L.rrect(f.x + f.w / 2 - 70, f.y + f.h * 0.66, 140, 46, 23, [0.06, 0.2, 0.08], [0.03, 0.1, 0.04], 0.85); coin(f.x + f.w / 2 - 44, f.y + f.h * 0.66 + 23, 17, 0); L.label('bp_' + id, String(cost), f.x + f.w / 2 - 20, f.y + f.h * 0.66 + 24, { size: 34, font: FONT, col: '#ffe066', out: '#3a2300' }); }
      { const r = UI.start, hot = ST.hint === 'start', pul = 1 + (hot ? 0.05 * Math.sin(t * 8) : 0), w = r.w * pul, h = r.h * pul, x = r.x + (r.w - w) / 2, y = r.y + (r.h - h) / 2;
        L.rrect(x, y + 10, w, h, 32, [0.55, 0.3, 0.02], [0.4, 0.2, 0.0]); L.rrect(x, y, w, h, 32, [1, 0.8, 0.28], [0.98, 0.55, 0.1]); L.rrect(x + 10, y + 8, w - 20, h * 0.4, 24, [1, 0.9, 0.5], [1, 0.8, 0.3], 0.5); L.uiBox('card_start', r.x, r.y, r.w, r.h, 2);
        L.label('start', 'START', r.x + r.w / 2, r.y + r.h / 2 - 2, { size: 84, font: FONT, col: '#5a2c00', out: '#ffe9a0', al: 0.5 }); S.hit.push({ id: 'tap_start', x: r.x, y: r.y, w: r.w, h: r.h }); }
    } else if (ST.end < 0) {
      { const r = UI.enbar, fr = ST.en >= K.EN_MAX ? 1 : ST.en - Math.floor(ST.en), nx = Math.floor(ST.en); L.rrect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, 26, [0.22, 0.24, 0.26], [0.1, 0.1, 0.12]); L.rrect(r.x, r.y, r.w, r.h, 22, [0.72, 0.7, 0.62], [0.52, 0.5, 0.44]);   // energy panel
        L.rrect(r.x + 6, r.y + 6, Math.max(26, (r.w - 12) * fr), r.h - 12, 18, [0.3, 0.65, 1], [0.12, 0.4, 0.95]); bolt(r.x + 76, r.y + r.h / 2, 3.4, [1, 1, 1]);
        L.label('en', String(nx), r.x + r.w - 110, r.y + r.h / 2 + 2, { size: 118, font: FONT, col: '#ffffff', out: '#10304a', al: 0.5 }); L.uiBox('enbox', r.x, r.y, r.w, r.h, 2); }
      for (const [id, cost] of [['bomb', K.COST_BOMB], ['sawt', K.COST_SAWT], ['fire', K.COST_FIRE]]) { const locked = id === 'fire' && p.tier < 2, ok = ST.en >= cost && !locked, f = frame(id, ok, locked, [0.18, 0.5, 0.95]);
        icon(id, f.x + f.w / 2, f.y + f.h / 2, 1.2, locked ? 0.35 : ok ? 1 : 0.6);
        if (locked) { circ(f.x + f.w / 2, f.y + f.h / 2 + 4, 26, [0.9, 0.78, 0.3], [0.6, 0.45, 0.1]); L.rrect(f.x + f.w / 2 - 17, f.y + f.h / 2 + 4, 34, 30, 6, [0.95, 0.82, 0.35], [0.65, 0.5, 0.12]); }
        chip(UI[id], String(cost), ok, 'bolt'); }
      if (ST.up && !ST.upDone && GT >= ST.up.t0) { const r = UI.bubble, q = clamp((GT - ST.up.t0) / 0.3, 0, 1), pul = 1 + 0.05 * Math.sin(t * 7), ok = ST.money >= K.UP_COST, w = r.w * ease(q) * pul, h = r.h * ease(q) * pul, x = r.x + (r.w - w) / 2, y = r.y + (r.h - h) / 2 + 8 * Math.sin(t * 4);   // ⬆ price bubble
        L.glow(x + w / 2, y + h / 2, w * 0.9, [1, 0.85, 0.4], 0.3, 2.4); L.rrect(x, y, w, h, 36, ok ? [1, 0.85, 0.3] : [0.7, 0.7, 0.72], ok ? [0.95, 0.55, 0.1] : [0.5, 0.5, 0.54]);
        bar(x + w * 0.16, y + h * 0.6, h * 0.5, h * 0.2, -0.9, [0.2, 0.55, 0.15]); bar(x + w * 0.16 + h * 0.31, y + h * 0.6 - h * 0.4, h * 0.5, h * 0.2, -2.24, [0.2, 0.55, 0.15]);
        coin(x + w * 0.52, y + h / 2, 22, 0); L.label('bub', String(K.UP_COST), x + w * 0.52 + 32, y + h / 2 + 2, { size: 54, font: FONT, col: ok ? '#4a2a00' : '#444444', out: ok ? '#fff0b0' : '#dddddd' });
        circ(CX, y + h + 20, 9, [1, 0.85, 0.3], [0.95, 0.55, 0.1], 0.9 * q); S.hit.push({ id: 'tap_bubble', x: r.x, y: r.y, w: r.w, h: r.h }); L.uiBox('bubbox', r.x, r.y, r.w, r.h, 2); }
    }
    // ---- callouts from events ----
    let calloutOn = false;
    for (const e of ST.ev) { const a = GT - e.t; if (a < 0) continue;
      if (['go', 'towerdown', 'upgrade', 'nope', 'locked'].includes(e.k) && a < (e.k === 'go' ? 1.0 : e.k === 'nope' ? 0.9 : e.k === 'towerdown' ? 1.3 : 1.6)) calloutOn = true;
      const pop = (slot, txt, x, y, life, size, col, out) => { if (a > life) return; const q = a / life, s = size * (a < 0.12 ? 0.6 + 0.4 * a / 0.12 : 1);
        L.label(slot, txt, x, y - 90 * ease(q), { size: Math.round(s), font: FONT, col, out, al: 0.5, a: 1 - SS(0.7, 1, q) }); };
      if (e.k === 'go') pop('go', 'GO!', W / 2, H * 0.2, 1.0, 130, '#fff27a', '#5a3a00');
      if (e.k === 'towerdown') pop('td', 'TOWER DESTROYED!', W / 2, H * 0.2, 1.3, 74, '#fff27a', '#7a1a00');
      if (e.k === 'upgrade') pop('up', 'CART UPGRADED!', W / 2, H * 0.2, 1.6, 78, '#fff27a', '#5a3a00');
      if (e.k === 'upgrade' && a > 0.5) pop('newfire', 'FIRE UNLOCKED!', W / 2, H * 0.27, 1.4, 62, '#ffb060', '#6a1a00');
      if (e.k === 'nope') pop('nope', e.coin ? 'NEED ' + Math.ceil(e.need) + ' COINS' : 'NOT ENOUGH ENERGY', W / 2, H * 0.2, 0.9, 52, '#ffffff', '#8a1208');
      if (e.k === 'locked') pop('lock', 'UPGRADE YOUR CART FIRST', W / 2, H * 0.2, 1.0, 46, '#ffffff', '#6b4a00'); }
    let dj = 0;                                                                                                                                                        // damage numbers (max 3, stacked)
    for (const e of ST.ev) { if (e.k !== 'dmg') continue; const a = GT - e.t, x = sx(e.x); if (a < 0 || a > 0.7 || x < 120 || x > W - 120 || dj >= 3) continue; const j = dj++;
      L.label('dmg' + j, '-' + e.v, x, hy(e.y ? 330 : 260) - 110 * a + j * 64, { size: 46, font: FONT, col: '#fff27a', out: '#5a3a00', al: 0.5, a: 1 - SS(0.5, 0.7, a) }); }
    // ---- tutorial: banner + hand pointing at the hinted card ----
    const BAN = { saw: 'TAP TO BUILD YOUR CART!', start: 'READY? TAP START!', bomb: 'TAP TO ATTACK!', sawt: 'TAP THE SAW!', fire: 'FIRE! TAP NOW!', bubble: 'UPGRADE YOUR CART!' };
    if (ST.end < 0 && ST.hint) { const r = UI[ST.hint], bn = 1 + 0.04 * Math.sin(t * 6), txt = BAN[ST.hint], tw = L.labelW('tut', txt, { size: Math.round(62 * bn), font: FONT });
      if (!calloutOn) { L.rrect(W / 2 - tw / 2 - 40, 330 - 56, tw + 80, 112, 56, [0.05, 0.08, 0.14], [0.02, 0.03, 0.06], 0.72); L.uiBox('tutbox', W / 2 - tw / 2 - 40, 330 - 56, tw + 80, 112, 4);
        L.label('tut', txt, W / 2, 330, { size: Math.round(62 * bn), font: FONT, col: '#ffffff', out: '#102a40', al: 0.5 }); }
      const hx = r.x + r.w * 0.58, hyy = r.y + r.h * 0.5 + 18 * Math.sin(t * 7), tapq = (t * 1.6) % 1, down = tapq > 0.55, rr = 40 + 50 * (1 - Math.min(1, tapq * 1.5)), hs = down ? 0.92 : 1;
      if (down) L.ring(hx, hyy, rr, rr, WHITE, 0.5, 0.1);
      bar(hx + 8, hyy + 70 * hs, 78 * hs, 44 * hs, -1.9, [0.88, 0.9, 0.94]); circ(hx, hyy, 30 * hs, [0.96, 0.97, 1], [0.7, 0.74, 0.8]); circ(hx - 6, hyy - 8, 10 * hs, WHITE, WHITE, 0.6); }
    if (ST.end < 0) { const bw = 330, bh = 104, bx = W - bw - 36, by = H - bh - 44, pul = 1 + 0.03 * Math.sin(t * 5);                                              // persistent CTA bar
      L.rrect(24, by - 18, W - 48, bh + 36, 30, [0.06, 0.08, 0.14], [0.03, 0.04, 0.08], 0.74); L.uiBox('ctabar', 24, by - 18, W - 48, bh + 36, 4);
      L.label('brand', 'SIEGE CART', 70, by + bh / 2, { size: 50, font: FONT, col: '#ffd84a', out: '#2a1a00' });
      L.rrect(bx - (pul - 1) * bw / 2, by - (pul - 1) * bh / 2, bw * pul, bh * pul, bh / 2, [0.35, 0.8, 0.4], [0.12, 0.6, 0.2]); L.uiBox('cta', bx, by, bw, bh, 2);
      L.label('cta', 'PLAY FREE', bx + bw / 2, by + bh / 2, { size: 50, font: FONT, col: '#ffffff', out: '#0a3a14', al: 0.5 }); S.hit.push({ id: 'cta', x: bx, y: by, w: bw, h: bh }); }

    // ===================== endcard =====================
    if (ST.end >= 0) { const oy = (H - 1920) / 2, a = GT - ST.end, k = SS(0, 0.45, a), pop = (d) => { const q = clamp((a - d) / 0.35, 0, 1); return q < 1 ? 1.12 * ease(q) - 0.12 * q * q : 1; };
      L.solid(0, 0, W, H, [0.02, 0.04, 0.08], 0, 0, 0, 0.86 * k);
      const head = ST.endWhy === 'win' ? 'YOU CRUSHED IT!' : ST.endWhy === 'lose' ? 'SO CLOSE!' : 'BUILD THE ULTIMATE CART', s1 = pop(0.2);
      if (s1 > 0.01) { L.label('head', head, W / 2, 310 + oy, { size: Math.round(72 * s1), font: FONT, col: '#ffffff', out: '#102a40', al: 0.5 });
        L.label('logo', 'SIEGE CART', W / 2, 430 + oy, { size: Math.round(124 * s1), font: FONT, col: '#ffd84a', out: '#3a2000', al: 0.5 });
        L.label('tag', 'Smash towers. Upgrade your cart!', W / 2, 540 + oy, { size: 52, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5, a: k }); }
      const sm = pop(0.35); if (sm > 0.01) { L.glow(W / 2 - 40, 880 + oy, 340, [1, 0.85, 0.4], 0.25, 2.2); drawCart(W / 2 - 40, 1120 + oy + (1 - sm) * 200, sm, { tier: 2, saw: true, dist: t * 90, moving: true, hurt: 0, upAge: 99, sawBuy: 99, grind: false, recoil: 0, aim: -0.1 + 0.03 * Math.sin(t * 3), hpBar: false }); }
      const s2 = pop(0.45); if (s2 > 0.01) L.label('stat', ST.kills + ' SKELETONS SMASHED · ' + ST.earned + ' COINS', W / 2, 1230 + oy, { size: Math.round(42 * s2), font: FONT, col: '#bff58a', out: '#173307', al: 0.5 });
      const s3 = pop(0.7), pul = 1 + 0.045 * Math.sin(t * 6), bw = 640 * s3 * pul, bh = 170 * s3 * pul, bx = W / 2 - bw / 2, by = 1420 + oy - bh / 2;
      if (s3 > 0.01) { L.glow(W / 2, 1420 + oy, 420, [1, 0.8, 0.3], 0.3, 2.2); L.rrect(bx, by + 12, bw, bh, bh / 2, [0.55, 0.30, 0.02], [0.45, 0.22, 0.0]); L.rrect(bx, by, bw, bh, bh / 2, [1.0, 0.86, 0.30], [0.98, 0.58, 0.10]); L.uiBox('endcta', bx, by, bw, bh, 2);
        L.label('endcta', 'PLAY FREE', W / 2, by + bh / 2, { size: Math.round(86 * s3), font: FONT, col: '#ffffff', out: '#7a3a00', al: 0.5 }); S.hit.push({ id: 'cta', x: bx, y: by, w: bw, h: bh }); }
      if (a > 1.2) { L.label('replay', '↻ REPLAY', W / 2, 1620 + oy, { size: 46, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5, a: SS(1.2, 1.6, a) }); S.hit.unshift({ id: 'replay', x: W / 2 - 170, y: 1580 + oy, w: 340, h: 80 }); }
      if (a > 0.6) S.hit.push({ id: 'cta', x: 0, y: 0, w: W, h: H }); }
  };

  // QA hooks: every HUD screen at its worst case, staged from the attract replay where it happens naturally
  S.QA = () => {
    const at = (tt, o = {}) => Object.assign(JSON.parse(JSON.stringify(SIM.at(tt))), o);
    return { states: [['shop', at(0.3)], ['go', at(2.0)], ['bomb', at(4.9)], ['saw_grind', at(8)], ['tower1', at(10.8)], ['bubble', at(11.8)], ['upgrade', at(12.3)], ['fire', at(17.8)], ['tower2', at(20.2)], ['end', at(24)],
      ['money_worst', at(9, { money: 99999 })]], cycles: {}, sprites: {}, box: () => [0, 0, W, H] };
  };
})();
