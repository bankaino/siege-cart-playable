// live/scene.js — TIMBER RUSH. Pure function of t and the sim state (no Math.random, no accumulated state).
// Layers: forest floor (REPEAT tile, world space) → concrete yard + upgrade pad → stumps → Y-SORTED band (pine rows,
// falling trees, machines and trailers) → FX (sawdust, needles, smoke, coins, bursts) → grade → HUD, guide, hand, CTA, endcard.
(function () {
  const S = (window.SCENE = {}), A = window.ASSETS, L = LIB, M = L.M, W = SIM.VIEW.W, H = SIM.VIEW.H, Z = window.SIZES;
  S.REPEAT = ['ground_tex'];
  S.programs = () => { L.init(W, H); L.glyphs('0123456789+$×'); L.SUN = [W * 0.15, -300]; BATCH.init(['tree_0', 'tree_1', 'tree_2', 'stump', 'blob', 'log']); };
  const has = (n) => !!A[n], SS = L.SS;
  const FONT = '"Arial Black", "Arial Rounded MT Bold", "Segoe UI Black", sans-serif';
  const DUST = [0.86, 0.72, 0.46], NEEDLE = [0.30, 0.62, 0.18], SMOKE = [0.32, 0.33, 0.30];
  const TREES = SIM.TREES, SP = SIM.SP, NX = SIM.NX, NY = SIM.NY;
  const ease = (x) => 1 - (1 - x) * (1 - x), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const hudCoin = [W / 2 - 92, 118];                                         // where flying coins land (the money pill's icon)
  S.hit = [];                                                                // tappable HUD rects (index.html: CTA → store, replay)

  S.render = (t) => {
    const ST = S.state || SIM.at(t), GT = ST.t, rnd = L.rnd, p = ST.p, rv = ST.rv;
    // ---- camera + trauma shake from recent events ----
    let tr = 0;
    for (const e of ST.ev) { const a = GT - e.t; if (a < 0) continue;
      if (e.k === 'smash' && a < 0.6) tr = Math.max(tr, 1 - a / 0.6); if (e.k === 'bump' && a < 0.35) tr = Math.max(tr, 0.55 * (1 - a / 0.35));
      if (e.k === 'upgrade' && a < 0.3) tr = Math.max(tr, 0.35 * (1 - a / 0.3)); }
    const sh = 26 * tr * tr, z = ST.zoom;
    const cx = ST.cam[0] + sh * Math.sin(GT * 83) / z, cy = ST.cam[1] + sh * Math.sin(GT * 101 + 1) / z;
    const sx = (x) => (x - cx) * z + W / 2, sy = (y) => (y - cy) * z + H / 2;
    const vx0 = cx - W / 2 / z, vx1 = cx + W / 2 / z, vy0 = cy - H / 2 / z, vy1 = cy + H / 2 / z;

    // ===== ground: forest floor tiled in world space =====
    L.beginBG([0.10, 0.19, 0.05, 1]);
    { const T = 460; L.sprite('ground_tex', 0, 0, { w: W, h: H, src: [vx0 / T, vy0 / T, vx1 / T, vy1 / T], u: { grade: [1.12, 1.65, 0, 0.95] } }); }
    // darker floor under standing forest (canopy occlusion) reads as depth between the cones
    L.beginComp();

    // ===== concrete yard + upgrade pad =====
    const B = SIM.BASE, PAD = SIM.PAD;
    L.shadow(sx((B.x0 + B.x1) / 2), sy(B.y0 + 8), (B.x1 - B.x0) * 0.55 * z, 40 * z, 0.35);
    L.rrect(sx(B.x0), sy(B.y0), (B.x1 - B.x0) * z, (B.y1 - B.y0 + 200) * z, 26 * z, [0.80, 0.76, 0.70], [0.70, 0.66, 0.60]);
    L.rrect(sx(B.x0), sy(B.y0), (B.x1 - B.x0) * z, 14 * z, 7 * z, [0.88, 0.85, 0.80], [0.84, 0.80, 0.74]);   // lit lip
    for (const [x0, y0, x1, y1] of [[B.x0 + 40, B.y0 + 120, B.x1 - 40, B.y0 + 128], [B.x0 + 40, B.y1 - 200, B.x1 - 40, B.y1 - 192]])
      L.solid(sx(x0), sy(y0), (x1 - x0) * z, (y1 - y0) * z, [0.95, 0.95, 0.92], 0, 0, 0, 0.8);
    const dashed = (x, y, w, h, col, a, th = 7, seg = 26) => {                 // a dashed rectangle outline in world px
      for (let u = 0; u < w; u += seg * 1.8) { const l = Math.min(seg, w - u); L.solid(sx(x + u), sy(y), l * z, th * z, col, 0, 0, 0, a); L.solid(sx(x + u), sy(y + h - th), l * z, th * z, col, 0, 0, 0, a); }
      for (let u = 0; u < h; u += seg * 1.8) { const l = Math.min(seg, h - u); L.solid(sx(x), sy(y + u), th * z, l * z, col, 0, 0, 0, a); L.solid(sx(x + w - th), sy(y + u), th * z, l * z, col, 0, 0, 0, a); } };
    // the pad: dashed gold square that fills as coins pour in; pulses when the player can afford it
    const cost = SIM.K.PAD_COST[ST.padLv], left = Math.max(0, cost - ST.padPaid), afford = cost < 999 && ST.money >= left;
    { const R = PAD.r, pul = afford ? 0.5 + 0.5 * Math.sin(t * 7) : 0, fr = cost < 999 ? ST.padPaid / cost : 1;
      L.rrect(sx(PAD.x - R), sy(PAD.y - R), 2 * R * z, 2 * R * z, 16 * z, [0.55, 0.50, 0.42], [0.50, 0.45, 0.38]);
      if (fr > 0) L.rrect(sx(PAD.x - R), sy(PAD.y + R - 2 * R * fr), 2 * R * z, 2 * R * fr * z, 16 * z, [0.98, 0.80, 0.18], [0.92, 0.62, 0.10], 0.9);
      if (pul > 0) L.glow(sx(PAD.x), sy(PAD.y), (R * 1.6 + 20 * pul) * z, [1, 0.8, 0.25], 0.35 + 0.25 * pul, 2.4);
      dashed(PAD.x - R, PAD.y - R, 2 * R, 2 * R, [1.0, 0.86, 0.16], 1, 9, 30); }

    // ===== stumps of everything cut (persistent trace) =====
    const g0x = Math.max(0, Math.floor(vx0 / SP) - 1), g1x = Math.min(NX - 1, Math.floor(vx1 / SP) + 1);
    const g0y = Math.max(0, Math.floor(vy0 / SP) - 1), g1y = Math.min(NY - 1, Math.floor((vy1 + 140) / SP) + 1);
    const cut = ST.cut, sw = Z.stump[0];
    for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const i = gy * NX + gx, c = cut[i]; if (c < 0 || GT - c < 0.25) continue;
      const [x, y, , s] = TREES[i], w = sw * s * z; BATCH.add('stump', sx(x) - w / 2, sy(y) - w * 0.55, w, w / BATCH.aspect('stump')); }
    BATCH.flush(t, [0.50, 0.40, 0.33, 0.9]);
    // contact shadows of the standing forest (light from the upper left): a dark floor under the mass and a dark rim at every cut edge
    for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const i = gy * NX + gx; if (cut[i] !== -1) continue;
      const [x, y, v, s] = TREES[i], h = Z.tree[1] * s * z, w = h * BATCH.aspect('tree_' + v); BATCH.add('blob', sx(x) - w * 0.55, sy(y) - w * 0.32, w * 1.5, w * 0.8); }
    BATCH.flush(t, [1, 1, 1, 0.75]);

    // ===== Y-sorted band: machines + trailers + falling trees, interleaved with the pine rows =====
    const act = [], badges = [];
    const machine = (m, red) => {
      const nT = SIM.trailers(m), body = red && has('rival_body') ? 'rival_body' : 'harvester_body';
      const wreck = [0.32, 0.27, 0.25, 0.9], tint = !m.alive ? wreck : red && !has('rival_body') ? [1.6, 0.45, 0.4, 1] : [1, 1, 1, 0], ttint = !m.alive ? wreck : [1, 1, 1, 0];
      const trn = red && has('rival_trailer') ? 'rival_trailer' : 'trailer';
      const dead = !m.alive, da = dead ? GT - m.deadT : 0;
      for (let k = nT - 1; k >= 0; k--) { const [x, y, a] = SIM.alongTrail(m, SIM.K.TRAILER_GAP * (k + 1));
        act.push([y + 40, () => { const h = Z.trailer[1] * z, w = L.hsz(trn, h);
          L.shadow(sx(x) + 10 * z, sy(y) + 14 * z, w * 0.62, h * 0.5, 0.42);
          L.sprite(trn, 0, 0, { m: M.of(M.t(sx(x), sy(y)), M.r(a + (dead ? 0.25 * (k % 2 ? 1 : -1) * SS(0, 0.4, da) : 0))), w, h, pivot: [w / 2, h * 0.45], u: { tint: ttint } });
        }]); }
      act.push([m.y + 60, () => { const h = Z.harvester_body[1] * z * SIM.K.CUT_W[Math.min(m.lv, 4)] / SIM.K.CUT_W[1], w = L.hsz(body, h), cutting = GT - m.cutT < 0.12;
        const jit = cutting ? 1.6 * Math.sin(GT * 160) : 0, sq = dead ? 1 - 0.12 * SS(0, 0.3, da) : 1;
        L.shadow(sx(m.x) + 12 * z, sy(m.y) + 16 * z, w * 0.56, h * 0.42, 0.5);
        L.sprite(body, 0, 0, { m: M.of(M.t(sx(m.x) + jit, sy(m.y)), M.r(m.a), M.s(sq, sq)), w, h, pivot: [w / 2, h * 0.5], u: { tint } });
        // level badge over the cab
        if (m.alive) badges.push([sx(m.x), sy(m.y) - 150 * z * h / (Z.harvester_body[1] * z), m.lv, red]); }]);
    };
    // trees falling right now (cut within the last 0.55 s) leave the rows and join the sort as actors
    for (const e of ST.ev) { if (e.k !== 'cut') continue; const a = GT - e.t; if (a < 0 || a > 0.55) continue;
      const [x, y, v, s] = TREES[e.i]; if (x < vx0 - 100 || x > vx1 + 100 || y < vy0 - 50 || y > vy1 + 200) continue;
      act.push([y, () => { const k = Math.pow(clamp(a / 0.5, 0, 1), 1.8), up = Math.sin(e.fa + Math.PI / 2), side = Math.cos(e.fa + Math.PI / 2);
        const h = Z.tree[1] * s * z, w = L.hsz('tree_' + v, h), rot = clamp(Math.atan2(Math.cos(e.fa), -Math.sin(e.fa)), -1.5, 1.5) * k;
        L.sprite('tree_' + v, 0, 0, { m: M.of(M.t(sx(x), sy(y)), M.r(rot), M.s(1, 1 - 0.55 * k * Math.abs(up) - 0.1 * k * Math.abs(side))), w, h, pivot: [w / 2, h * 0.96],
          u: { alpha: 1 - SS(0.42, 0.55, a), rim: [0.35, -0.004, -0.004, 1] } }); }]); }
    act.sort((a, b) => a[0] - b[0]);
    let ai = 0;
    const WIND = (x, y) => 0.5 + 0.5 * Math.sin(t * 0.9 + x * 0.004 - y * 0.002);
    for (let gy = g0y; gy <= g1y; gy++) {
      const rowY = gy * SP + SP / 2;
      for (let gx = g0x; gx <= g1x; gx++) { const i = gy * NX + gx; if (cut[i] !== -1) continue;
        const [x, y, v, s] = TREES[i], n = 'tree_' + v, h = Z.tree[1] * s * z, w = h * BATCH.aspect(n);
        BATCH.add(n, sx(x) - w / 2, sy(y) - h * 0.96, w, h, 0.035 * WIND(x, y), 6.28 * rnd(i, 5)); }
    }
    BATCH.flush(t, [0.6, 0.72, 0.56, 1]); while (ai < act.length) act[ai++][1]();
    act.length = 0; machine(p, false); if (rv) machine(rv, true); act.sort((a, b) => a[0] - b[0]); act.forEach((x) => x[1]());

    // ===== event FX =====
    for (const e of ST.ev) { const a = GT - e.t; if (a < 0) continue; const ex = sx(e.x), ey = sy(e.y);
      if (e.k === 'cut' && a < 0.9) {
        // sawdust + needles thrown off the cutter, thud dust where the top lands
        if (a < 0.4) for (let j = 0; j < 3; j++) { const q = a / 0.4, an = e.fa + (rnd(e.i, j) - 0.5) * 2.2, d = (30 + 70 * rnd(e.i, j + 4)) * ease(q) * z;
          L.puff(ex + Math.cos(an) * d, ey - 30 * z + Math.sin(an) * d - 40 * z * q * (1 - q), (5 + 7 * q) * z, j ? NEEDLE : DUST, 0.85 * (1 - q), e.i + j); }
        if (a > 0.45 && a < 0.9) { const q = (a - 0.45) / 0.45, lx = ex + Math.cos(e.fa) * 60 * z, ly = ey + Math.sin(e.fa) * 40 * z;
          L.puff(lx, ly - 6 * z, (14 + 20 * q) * z, [0.38, 0.52, 0.22], 0.45 * (1 - q), e.i); }
      }
      if (e.k === 'pay' && a < 0.45) { const q = a / 0.45, px0 = sx(SIM.PAD.x), py0 = sy(SIM.PAD.y), u = ease(q);
        L.sprite('coin', ex + (px0 - ex) * u - 20 * z, ey - 90 * z * Math.sin(Math.PI * u) + (py0 - ey) * u - 20 * z, { w: 40 * z, h: 40 * z, u: { alpha: 1 - SS(0.8, 1, q) } }); }
      if (e.k === 'upgrade' && a < 1.4) { const q = a / 1.4, pil = (1 - SS(0.3, 1, q)) * SS(0, 0.08, a);
        for (let j = 0; j < 6; j++) L.glow(ex, ey - j * 70 * z * (0.4 + q), (110 - j * 10) * z, [1, 0.88, 0.45], 0.55 * pil * (1 - j / 7), 2.2);   // light pillar
        for (let j = 0; j < 10; j++) { const an = j / 10 * 6.283 + 0.4, d = (60 + 200 * ease(Math.min(1, a / 0.5))) * z;                   // dust ring
          L.puff(ex + Math.cos(an) * d, ey + Math.sin(an) * d * 0.6, (24 + 30 * q) * z, DUST, 0.55 * (1 - q), j + 3); }
        for (let j = 0; j < 12; j++) { const tt = a - j * 0.03; if (tt < 0 || tt > 0.9) continue; const an = -Math.PI / 2 + (rnd(j, 7) - 0.5) * 1.6, v = (380 + 220 * rnd(j, 8)) * z;   // coin fountain
          L.sprite('coin', ex + Math.cos(an) * v * tt * 0.6 - 20 * z, ey + Math.sin(an) * v * tt + 900 * z * tt * tt - 20 * z, { w: 40 * z, h: 40 * z, u: { alpha: 1 - SS(0.7, 0.9, tt) } }); }
        for (let j = 0; j < 8; j++) { const an = j / 8 * 6.283 + e.t, d = (50 + 170 * ease(q)) * z; L.star(ex + Math.cos(an) * d, ey + Math.sin(an) * d * 0.6 - 120 * q * z, 26 * z, [1, 0.9, 0.5], 1 - q); } }
      if (e.k === 'bump' && a < 0.5) { const q = a / 0.5; for (let j = 0; j < 8; j++) { const an = j * 0.785 + e.t, d = (20 + 110 * ease(q)) * z; L.star(ex + Math.cos(an) * d, ey + Math.sin(an) * d, 16 * z, [1, 0.85, 0.5], 1 - q); } }
      if (e.k === 'smash' && a < 1.6) { const q = a / 1.6, rx = sx(e.rx), ry = sy(e.ry);
        if (a < 0.25) L.glow(rx, ry, 360 * z, [1, 0.6, 0.2], 1.2 * (1 - a / 0.25), 2);
        for (let j = 0; j < 12; j++) { const an = j / 12 * 6.283 + rnd(j, 2), d = (40 + 260 * ease(Math.min(1, a / 0.7))) * z * (0.6 + 0.6 * rnd(j, 3));
          L.puff(rx + Math.cos(an) * d, ry + Math.sin(an) * d * 0.8 - 60 * z * q, (40 + 50 * q) * z * (0.7 + 0.5 * rnd(j, 4)), j % 3 ? SMOKE : [1, 0.55, 0.15], 0.9 * (1 - q), j + 7); }
        for (let j = 0; j < 10; j++) { const an = j / 10 * 6.283 + 0.3, v = (260 + 260 * rnd(j, 9)) * z, tt = Math.min(a, 0.75), land = a >= 0.75;   // tumbling debris
          const dx = rx + Math.cos(an) * v * tt, dy = ry + Math.sin(an) * v * tt * 0.7, hz = land ? 0 : Math.max(0, (520 * tt - 700 * tt * tt)) * z, al = 1 - SS(1.1, 1.6, a);
          L.shadow(dx, dy, 18 * z, 8 * z, 0.35 * al); const lw = (j % 2 ? 54 : 34) * z;
          L.sprite('log', 0, 0, { m: M.of(M.t(dx, dy - hz), M.r((land ? 0.75 : tt) * (7 + 5 * rnd(j, 5)) + j)), w: lw, pivot: [lw / 2, lw * 0.18], u: { alpha: al, tint: j % 3 ? [1, 1, 1, 0] : [0.9, 0.25, 0.2, 0.8] } }); }
        for (let j = 0; j < 14; j++) { const an = j / 14 * 6.283, d = (90 + 330 * ease(Math.min(1, a / 0.6))) * z;                               // dust ring
          L.puff(rx + Math.cos(an) * d, ry + Math.sin(an) * d * 0.65, (30 + 40 * q) * z, DUST, 0.6 * Math.max(0, 1 - a / 0.8), j + 21); } }
      if (e.k === 'smash' && a < 4) for (let j = 0; j < 6; j++) { const qq = ((a * 0.6 + j / 6) % 1), al = (1 - qq) * SS(0, 0.3, a) * (1 - SS(3, 4, a));   // smoke column off the wreck
        L.puff(sx(e.rx) + 30 * z * Math.sin(qq * 4 + j), sy(e.ry) - 220 * z * qq, (20 + 50 * qq) * z, SMOKE, 0.5 * al, j + 40); }
    }
    // exhaust smoke from each machine's stack (rear of the body), streaming back as it drives
    for (const m of [p, rv]) { if (!m || !m.alive) continue; const [dx, dy] = SIM.dirOf(m.a);
      for (let j = 0; j < 4; j++) { const q = ((t * 1.7 + j / 4 + (m === rv ? 0.37 : 0)) % 1), bx = m.x - dx * 70 - dy * 26, by = m.y - dy * 70 + dx * 26;
        L.puff(sx(bx - dx * q * 70), sy(by - dy * q * 70) - 60 * q * z, (8 + 20 * q) * z, SMOKE, 0.32 * (1 - q) * (0.4 + 0.6 * Math.min(1, m.v / 200)), j + (m === rv ? 9 : 0)); } }
    L.finish(t, { bloom: [0.12, 0.10], vignette: 0.88, warm: 0.6, roll: 0.6 });

    // ===================== HUD (screen space) =====================
    S.hit = [];
    const mtxt0 = String(Math.max(0, Math.round(ST.money))), mtw = Math.max(L.labelW('money', mtxt0, { size: 66, font: FONT }), 60), mpw = 96 + 26 + mtw + 44, mpx = W / 2 - mpw / 2;
    hudCoin[0] = mpx + 52; hudCoin[1] = 118;
    // coins flying from each felled tree to the money pill (a short pop up first, then an accelerating flight)
    let inFlight = 0;
    for (const e of ST.ev) { const a = GT - e.t;
      if (e.k === 'cut' && e.coin && a >= 0 && a < 0.7) { inFlight += SIM.K.TREE_VAL;
        const x0 = sx(e.x), y0 = sy(e.y) - 70 * z; let x, y, s;
        if (a < 0.18) { const q = a / 0.18; x = x0; y = y0 - 70 * Math.sin(q * Math.PI / 2) * z; s = 0.6 + 0.5 * q; }
        else { const q = Math.pow((a - 0.18) / 0.52, 1.6); x = x0 + (hudCoin[0] - x0) * q; y = y0 - 70 * z + (hudCoin[1] - (y0 - 70 * z)) * q; s = 1.1 - 0.4 * q; }
        L.sprite('coin', x - 23 * s, y - 23 * s, { w: 46 * s, h: 46 * s }); }
      if (e.k === 'smash' && a >= 0 && a < 1.2) { const q = clamp(a / 1.2, 0, 1); inFlight += SIM.K.SMASH_BONUS * (1 - q);
        for (let j = 0; j < 14; j++) { const qj = clamp((a - j * 0.04) / 0.8, 0, 1); if (qj <= 0 || qj >= 1) continue; const ox = sx(e.rx) + Math.cos(j * 2.4) * 120 * z, oy = sy(e.ry) + Math.sin(j * 2.4) * 80 * z, u = Math.pow(qj, 1.5);
          L.sprite('coin', ox + (hudCoin[0] - ox) * u - 28, oy + (hudCoin[1] - oy) * u - 28 - 160 * Math.sin(Math.PI * qj), { w: 56, h: 56 }); } } }
    const shown = Math.max(0, Math.round(ST.money - inFlight));
    // money pill (sized to its content), bumps when a coin lands
    let bump = 0; for (const e of ST.ev) { const a = GT - e.t - 0.7; if (e.k === 'cut' && e.coin && a >= 0 && a < 0.12) bump = Math.max(bump, 1 - a / 0.12); }
    { const txt = String(shown), sc = 1 + 0.08 * bump;
      L.rrect(mpx, 70, mpw, 96, 48, [0.10, 0.16, 0.08], [0.05, 0.09, 0.04], 0.78); L.uiBox('money', mpx, 70, mpw, 96, 4);
      L.sprite('coin', hudCoin[0] - 48 * sc, hudCoin[1] - 48 * sc, { w: 96 * sc, h: 96 * sc });
      L.label('money', txt, mpx + 96 + 26, 118, { size: 66, font: FONT, col: '#ffe066', out: '#3a2300' }); }
    // level badges (after the coins, so a coin stream never covers them; the rival's steps up when the two collide)
    if (badges.length === 2 && Math.abs(badges[0][0] - badges[1][0]) < 170 && Math.abs(badges[0][1] - badges[1][1]) < 64) badges[1][1] = badges[0][1] - 66;
    for (const [bx, by, lv, red] of ST.end < 0 ? badges : []) { if (bx < 90 || bx > W - 90 || by < 200 || by > H - 220) continue;
      const slot = 'lv' + (red ? 'r' : 'p'), txt = 'LV ' + lv + (red ? (p.lv > lv ? '  CRUSH IT!' : '  TOO STRONG') : ''), bw = L.labelW(slot, txt, { size: 34, font: FONT }) + 34;
      L.rrect(bx - bw / 2, by - 27, bw, 54, 27, red ? [0.92, 0.22, 0.18] : [0.24, 0.70, 0.18], red ? [0.70, 0.10, 0.08] : [0.12, 0.48, 0.10]);
      L.uiBox(slot, bx - bw / 2, by - 27, bw, 54, 2);
      L.label(slot, txt, bx, by, { size: 34, font: FONT, col: '#ffffff', out: '#1b2a0c', al: 0.5 }); }
    // the pad's price, on the pad (what it costs and what it gives)
    if (ST.end < 0 && cost < 999) { const px = sx(PAD.x), py = sy(PAD.y);
      if (px > 120 && px < W - 120 && py > 260 && py < H - 300) { const txt = String(Math.ceil(left)), tw = L.labelW('padc', txt, { size: 52, font: FONT }), w = tw + 80;
        L.rrect(px - w / 2, py - 36, w, 72, 36, [0.10, 0.16, 0.08], [0.05, 0.09, 0.04], 0.8); L.uiBox('padc', px - w / 2, py - 36, w, 72, 4);
        L.sprite('coin', px - w / 2 + 8, py - 25, { w: 50, h: 50 }); L.label('padc', txt, px - w / 2 + 66, py, { size: 52, font: FONT, col: '#ffe066', out: '#3a2300' });
        L.label('padt', '+1 LEVEL', px, py - 76, { size: 40, font: FONT, col: '#ffffff', out: '#173307', al: 0.5 }); } }
    // guide arrow from the harvester toward the current goal (pad when affordable, the rival once you out-level it)
    let goal = null, gcol = [1, 0.84, 0.2], gtxt = '';
    if (ST.end < 0 && rv && rv.alive && p.lv > rv.lv) { goal = [rv.x, rv.y]; gcol = [1, 0.3, 0.2]; gtxt = 'CRUSH IT!'; }
    else if (ST.end < 0 && cost < 999 && shown >= left && Math.hypot(p.x - PAD.x, p.y - PAD.y) > PAD.r + 40) { goal = [PAD.x, PAD.y]; gtxt = 'UPGRADE!'; }
    if (goal) { const gx = sx(goal[0]), gy = sy(goal[1]), hx = sx(p.x), hy = sy(p.y), an = Math.atan2(gy - hy, gx - hx), bob = 12 * Math.sin(t * 8);
      const r = 250 * z + bob, ax = hx + Math.cos(an) * r, ay = hy + Math.sin(an) * r;
      for (let j = 0; j < 3; j++) { const o = j * 52; for (const sgn of [-1, 1]) { L.solid(ax + Math.cos(an) * o, ay + Math.sin(an) * o - 10, 80, 28, [0.1, 0.06, 0.02], an + Math.PI + sgn * 0.7, 0, 14, 0.5 * (1 - j * 0.25));
        L.solid(ax + Math.cos(an) * o, ay + Math.sin(an) * o - 13, 76, 22, gcol, an + Math.PI + sgn * 0.7, 0, 11, 1 - j * 0.25); } }
      const onScreen = gx > 60 && gx < W - 60 && gy > 200 && gy < H - 260;
      if (onScreen) { L.glow(gx, gy, 140, gcol, 0.25 + 0.15 * Math.sin(t * 6), 2.4); }
      else { const ex2 = clamp(gx, 70, W - 70), ey2 = clamp(gy, 240, H - 260), pb = 1 + 0.12 * Math.sin(t * 8);   // edge marker toward an off-screen goal
        L.rrect(ex2 - 44 * pb, ey2 - 44 * pb, 88 * pb, 88 * pb, 44 * pb, gcol, L.lerpP(gcol, [0, 0, 0], 0.35));
        if (gtxt === 'UPGRADE!') L.sprite('coin', ex2 - 30, ey2 - 30, { w: 60, h: 60 }); else L.sprite(has('rival_body') ? 'rival_body' : 'coin', 0, 0, { m: M.of(M.t(ex2, ey2), M.r(0)), h: 70, pivot: [L.hsz(has('rival_body') ? 'rival_body' : 'coin', 70) / 2, 35] }); }
      const lx = clamp(ax + Math.cos(an) * 120, 170, W - 170), ly = clamp(ay + Math.sin(an) * 80 + (Math.abs(Math.cos(an)) > 0.7 ? 60 : 0), 230, H - 300);
      L.label('goal', gtxt, lx, ly, { size: 46, font: FONT, col: '#ffffff', out: gcol[1] < 0.5 ? '#7a0d06' : '#6b4a00', al: 0.5 }); }
    // floating callouts from events
    for (const e of ST.ev) { const a = GT - e.t; if (a < 0) continue;
      const pop = (slot, txt, x, y, life, size, col, out) => { if (a > life) return; const q = a / life, s = size * (a < 0.12 ? 0.6 + 0.4 * a / 0.12 : 1);
        L.label(slot, txt, x, y - 90 * ease(q), { size: Math.round(s), font: FONT, col, out, al: 0.5, a: 1 - SS(0.7, 1, q) }); };
      if (e.k === 'upgrade') pop('up', 'LEVEL UP!', W / 2, H * 0.36, 1.3, 96, '#fff27a', '#5a3a00');
      if (e.k === 'bump') pop('weak', 'TOO WEAK! UPGRADE', W / 2, H * 0.36, 1.1, 64, '#ffffff', '#8a1208');
      if (e.k === 'smash') pop('smash', 'CRUSHED! +' + SIM.K.SMASH_BONUS, W / 2, H * 0.44, 1.5, 100, '#fff27a', '#7a1a00');
      if (e.k === 'broke') pop('broke', 'NEED ' + Math.ceil(e.need) + ' COINS', W / 2, H * 0.40, 1.1, 60, '#ffffff', '#6b4a00');
      if (e.k === 'rival') pop('rival', 'RIVAL INVADES!', W / 2, 300, 1.8, 72, '#ff6a50', '#3a0400'); }
    // tutorial: the hand shows the drag (demo: the scripted finger; play: before the first drag or after 2.5 s idle)
    const idle = ST.end < 0 && (ST.demo ? GT < 2.6 : (ST.firstIn < 0 || GT - ST.lastIn > 2.5));
    if (ST.end < 0 && (ST.demo || idle)) {
      let hx, hy, down;
      if (ST.demo && ST.inp && ST.inp.press) { hx = ST.inp.px; hy = ST.inp.py; down = 1; }
      else { const q = (t * 0.8) % 1, u = SS(0.15, 0.75, q); hx = SIM.DEMO_ANC[0] + 150 * Math.sin(u * 3.2); hy = SIM.DEMO_ANC[1] - 130 * u; down = q > 0.1 && q < 0.85; }
      if (idle || ST.demo) {
        if (down) L.glow(hx, hy, 70, [1, 1, 1], 0.35, 2.5);
        if (has('hand')) { const hh = Z.hand[1] * (down ? 0.92 : 1), hw = L.hsz('hand', hh); L.sprite('hand', hx - hw * 0.33, hy - hh * 0.03, { w: hw, h: hh }); }
        else { L.rrect(hx - 34, hy - 34, 68, 68, 34, [1, 1, 1], [0.86, 0.86, 0.9], 0.9); L.ring(hx, hy, 52, 52, [1, 1, 1], down ? 0.8 : 0.3, 0.12); }
      }
      if ((idle && ST.firstIn < 0) || (ST.demo && GT < 2.6)) { const b = 1 + 0.04 * Math.sin(t * 6), tw = L.labelW('tut', 'DRAG TO CUT TREES!', { size: Math.round(70 * b), font: FONT });
        L.rrect(W / 2 - tw / 2 - 40, 330 - 62, tw + 80, 124, 62, [0.05, 0.10, 0.04], [0.02, 0.05, 0.02], 0.7); L.uiBox('tut', W / 2 - tw / 2 - 40, 330 - 62, tw + 80, 124, 4);
        L.label('tut', 'DRAG TO CUT TREES!', W / 2, 330, { size: Math.round(70 * b), font: FONT, col: '#ffffff', out: '#173307', al: 0.5 }); }
    }
    if (!ST.demo && ST.anc && ST.end < 0) { const [jx0, jy0] = ST.anc; L.ring(jx0, jy0, 90, 90, [1, 1, 1], 0.35, 0.05); L.glow(jx0, jy0, 40, [1, 1, 1], 0.2, 2.5); }
    // persistent CTA bar (store button visible the whole time, as networks and UA teams expect)
    if (ST.end < 0) { const bw = 330, bh = 104, bx = W - bw - 36, by = H - bh - 44, pul = 1 + 0.03 * Math.sin(t * 5);
      L.rrect(24, by - 18, W - 48, bh + 36, 30, [0.06, 0.10, 0.05], [0.03, 0.05, 0.02], 0.72);
      L.uiBox('ctabar', 24, by - 18, W - 48, bh + 36, 4);
      L.label('brand', 'TIMBER RUSH', 70, by + bh / 2, { size: 50, font: FONT, col: '#ffd84a', out: '#2a1a00' });
      L.rrect(bx - (pul - 1) * bw / 2, by - (pul - 1) * bh / 2, bw * pul, bh * pul, bh / 2, [0.35, 0.68, 1.0], [0.10, 0.42, 0.95]);
      L.uiBox('cta', bx, by, bw, bh, 2);
      L.label('cta', 'PLAY NOW', bx + bw / 2, by + bh / 2, { size: 50, font: FONT, col: '#ffffff', out: '#0a2a70', al: 0.5 });
      S.hit.push({ id: 'cta', x: bx, y: by, w: bw, h: bh }); }
    // ===== endcard =====
    if (ST.end >= 0) { const oy = (H - 1920) / 2, a = GT - ST.end, k = SS(0, 0.45, a), pop = (d) => { const q = clamp((a - d) / 0.35, 0, 1); return q < 1 ? 1.12 * ease(q) - 0.12 * q * q : 1; };
      L.solid(0, 0, W, H, [0.02, 0.05, 0.02], 0, 0, 0, 0.7 * k);
      const s1 = pop(0.2); if (s1 > 0.01) { L.label('head', ST.endWhy === 'win' ? 'RIVAL CRUSHED!' : 'YOUR FOREST AWAITS!', W / 2, 220 + oy, { size: Math.round(64 * s1), font: FONT, col: '#ffffff', out: '#173307', al: 0.5 });
        L.label('logo', 'TIMBER RUSH', W / 2, 340 + oy, { size: Math.round(124 * s1), font: FONT, col: '#ffd84a', out: '#3a2000', al: 0.5 });
        L.label('tag', 'Build your timber empire!', W / 2, 460 + oy, { size: 56, font: FONT, col: '#ffffff', out: '#173307', al: 0.5, a: k }); }
      const sm = pop(0.35); if (sm > 0.01 && has('mascot')) { const mh = 560 * sm * (1 + 0.012 * Math.sin(t * 2.2)), mw = L.hsz('mascot', mh); L.glow(W / 2, 800 + oy, 330, [1, 0.85, 0.4], 0.25, 2.2);
        L.sprite('mascot', W / 2 - mw / 2, 1070 + oy - mh, { w: mw, h: mh }); }
      const s2 = pop(0.45); if (s2 > 0.01) { const txt = (ST.felled || 0) + ' TREES CUT · LV ' + p.lv;
        L.label('stat', txt, W / 2, 1130 + oy, { size: Math.round(54 * s2), font: FONT, col: '#bff58a', out: '#173307', al: 0.5 }); }
      const s3 = pop(0.7), pul = 1 + 0.045 * Math.sin(t * 6), bw = 640 * s3 * pul, bh = 170 * s3 * pul, bx = W / 2 - bw / 2, by = 1330 + oy - bh / 2;
      if (s3 > 0.01) { L.glow(W / 2, 1330 + oy, 420, [1, 0.8, 0.3], 0.3, 2.2);
        L.rrect(bx, by + 12, bw, bh, bh / 2, [0.55, 0.30, 0.02], [0.45, 0.22, 0.0]);
        L.rrect(bx, by, bw, bh, bh / 2, [1.0, 0.86, 0.30], [0.98, 0.58, 0.10]); L.uiBox('endcta', bx, by, bw, bh, 2);
        L.label('endcta', 'PLAY NOW', W / 2, by + bh / 2, { size: Math.round(86 * s3), font: FONT, col: '#ffffff', out: '#7a3a00', al: 0.5 });
        S.hit.push({ id: 'cta', x: bx, y: by, w: bw, h: bh }); }
      if (a > 1.2) { L.label('replay', '↻ REPLAY', W / 2, 1560 + oy, { size: 46, font: FONT, col: '#ffffff', out: '#173307', al: 0.5, a: SS(1.2, 1.6, a) });
        S.hit.unshift({ id: 'replay', x: W / 2 - 170, y: 1520 + oy, w: 340, h: 80 }); }
      if (a > 0.6) S.hit.push({ id: 'cta', x: 0, y: 0, w: W, h: H }); }
  };


  // QA hooks (engine.md §7): every HUD screen at its worst case, staged from the attract replay where it happens naturally
  S.QA = () => {
    const at = (tt, o = {}) => Object.assign(JSON.parse(JSON.stringify(SIM.at(tt))), o);
    const worst = at(9, { money: 99999 });
    return { states: [['start', at(0.3)], ['mow', at(4)], ['pad', at(7.7)], ['rival', at(16)], ['smash', at(21.6)], ['end', at(26)],
      ['money_worst', worst], ['match', at(5)]], cycles: {}, sprites: {}, box: () => [0, 0, W, H] };
  };
})();
