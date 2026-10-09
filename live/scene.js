// live/scene.js — SIEGE CART. Pure function of t and the sim state (no Math.random, no accumulated state).
// Side view: sky → parallax (cliffs, far pines, near pines) → ground → towers → skeletons → cart rig (wheels, crates, archer, saw,
// flamethrowers) → projectiles → FX → grade → HUD (logo, progress flags, coin pill, energy panel, cards, price bubble, hand, CTA, endcard).
// World → screen: sx(x) = CX + (x - cart.x) * zoom; heights are measured UP from the ground line (screen y = GY - h * zoom).
// ART: generated sprites (art/gen → live/assets) are rigged in code: wheels/saw/blades spin, legs swing, crates pop, tower squashes. Effects are shapes.
(function () {
  const S = (window.SCENE = {}), L = LIB, W = SIM.VIEW.W, H = SIM.VIEW.H;
  const K = SIM.K, UI = SIM.UI, GY = SIM.GY, CX = SIM.CART_SX, SS = L.SS, rnd = L.rnd;
  S.REPEAT = ['bg_mountains'];
  S.programs = () => { L.init(W, H); L.glyphs('0123456789+$×'); L.SUN = [W * 0.15, -300]; };
  const M = L.M;
  const FONT = '"Arial Black", "Arial Rounded MT Bold", "Segoe UI Black", sans-serif';
  const ease = (x) => 1 - (1 - x) * (1 - x), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), mix = (a, b, w) => L.lerpP(a, b, w);
  const WHITE = [1, 1, 1], GOLD = [1, 0.82, 0.2], GOLD2 = [0.85, 0.55, 0.05];
  S.hit = [];
  const CP = (window.VARIANT && window.VARIANT.copy) || {};                       // A/B copy overrides (variants/<name>.json → "copy")

  // ---------- shape helpers (screen px) ----------
  const circ = (x, y, r, c0, c1 = c0, a = 1) => L.rrect(x - r, y - r, 2 * r, 2 * r, r, c0, c1, a);
  const bar = (x0, y0, len, th, ang, col, a = 1) => L.solid(x0, y0 - th / 2, len, th, col, ang, 0, th / 2, a);          // bar starting at (x0,y0) pointing at ang
  // sprite anchored at (x,y): h = drawn height, (ax,ay) = anchor inside the sprite (fractions), ang rotation, sx/sy squash, a alpha, tint [r,g,b,mix]
  const put = (n, x, y, h, o = {}) => { const w = L.hsz(n, h), ax = o.ax === undefined ? 0.5 : o.ax, ay = o.ay === undefined ? 1 : o.ay;
    L.sprite(n, 0, 0, { m: M.of(M.t(x, y), M.r(o.ang || 0), M.s(o.sx === undefined ? 1 : o.sx, o.sy === undefined ? 1 : o.sy)), w, h, pivot: [ax * w, ay * h], u: { alpha: o.a === undefined ? 1 : o.a, tint: o.tint || [1, 1, 1, 0] } }); return w; };
  const coin = (x, y, r, spin, a = 1) => { const w = Math.max(0.2, Math.abs(Math.cos(spin))) * r; L.sprite('coin', x - w, y - r, { w: 2 * w, h: 2 * r, u: { alpha: a } }); };
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
    L.beginBG([0.23, 0.66, 0.74, 1]);
    L.rrect(0, 0, W, GY + 40, 0, [0.23, 0.66, 0.74], [0.66, 0.86, 0.74]);
    const MH = 860, MW = MH * 1.5, mu0 = p.x * 0.1 / MW;                                                                                   // misty cliffs (tiled, slow parallax)
    L.sprite('bg_mountains', 0, 0, { w: W, h: GY - 10 - MH + 2, src: [mu0, 0, mu0 + W / MW, 0.01] });                                       // sky above the strip = its own top rows stretched up (no seam at any screen height)
    L.sprite('bg_mountains', 0, GY - 10 - MH, { w: W, h: MH, src: [mu0, 0, mu0 + W / MW, 1] });
    const layer = (f, sp, fn) => { const cam = p.x * f, i0 = Math.floor((cam - CX - 400) / sp), i1 = Math.ceil((cam + W - CX + 400) / sp); for (let i = i0; i <= i1; i++) fn(i, CX + i * sp - cam + shx * f); };
    layer(0.3, 300, (i, x) => { if (rnd(i, 3) < 0.2) return; put('pine_' + Math.floor(rnd(i, 4) * 3), x + 60 * rnd(i, 5), GY - 4, 250 + 90 * rnd(i, 6), { tint: [0.62, 0.8, 0.78, 0.5] }); });
    layer(0.62, 520, (i, x) => { if (rnd(i, 7) < 0.35 || Math.abs(x + 90 * rnd(i, 9) * 0.5 - CX) < 170) return; put('pine_' + Math.floor(rnd(i, 8) * 3), x + 90 * rnd(i, 9), GY + 8, 290 + 80 * rnd(i, 10), { tint: [0.7, 0.86, 0.8, 0.3] }); });
    L.rrect(0, GY - 2, W, H - GY + 6, 0, [0.55, 0.74, 0.40], [0.18, 0.38, 0.10]);
    for (let k = 0; k < 8; k++) L.rrect(0, gyS + 6 + k * 16 * z, W, 16 * z + 1, 0, [0.62, 0.55, 0.28], [0.52, 0.48, 0.24], 0.55 * (1 - k / 8));     // dirt track with a soft lower edge
    for (let k = 0; k < 14; k++) L.solid(0, GY + 160 + k * ((H - GY - 160) / 14), W, (H - GY - 160) / 14 + 1, [0.03, 0.09, 0.02], 0, 0, 0, 0.026 * k);   // foreground darkening
    layer(1, 150, (i, x) => { const r = rnd(i, 9), y = gyS + 20 + 330 * rnd(i, 10), s = 0.6 + 0.9 * (y - gyS) / 330;
      if (r < 0.55) { for (let k = -1; k <= 1; k++) bar(x + k * 9 * s, y, 26 * s, 5 * s, -1.57 + k * 0.5, [0.14, 0.34, 0.08], 0.8); }
      else if (r < 0.8) put('rock_' + (i & 1 ? 0 : 2), x, y + 6 * s, 30 * s, { ay: 1, a: 0.9 }); });
    L.beginComp();

    // ===================== towers =====================
    ST.towers.forEach((q, i) => {
      const hgt = i ? 600 : 440, x = sx(q.x), a = q.alive ? 0 : GT - q.deadT, hit = q.alive ? clamp(1 - (GT - q.hitT) / 0.12, 0, 1) : 0, w = L.hsz('tower', hgt) * 0.8;
      if (x < -500 || x > W + 500) return;
      const jx = a > 0 && a < 0.9 ? 7 * Math.sin(a * 60) * (1 - a / 0.9) : 0;
      if (q.alive || a < 0.9) {
        const cs = q.alive ? 1 : 1 - 0.86 * ease(a / 0.9), H0 = hgt * cs, top = hy(H0);
        L.shadow(x + 20, gyS + 8, w * z * 0.7, 26 * z, 0.4);
        put('tower', x + jx, gyS, hgt * z, { ax: 0.6, ay: 1, sy: cs, tint: [1, 1, 1, 0.5 * hit] });
        const f = q.hp / q.hpMax;
        const crack = (cx, cy, ang, n) => { let px = cx, py = cy; for (let k = 0; k < n; k++) { const an = ang + (k % 2 ? 0.7 : -0.7), l = (26 + 10 * rnd(k, cx)) * z; bar(px, py, l, 5 * z, an, [0.16, 0.15, 0.13], 0.85); px += Math.cos(an) * l; py += Math.sin(an) * l; } };
        if (q.alive && f < 0.7) { crack(x - 30 * z, hy(H0 * 0.78), 1.1, 3); crack(x + 36 * z, hy(H0 * 0.5), 1.9, 3); }
        if (q.alive && f < 0.35) { crack(x + 10 * z, hy(H0 * 0.92), 1.5, 4); crack(x - 45 * z, hy(H0 * 0.38), 1.3, 3); crack(x + 50 * z, hy(H0 * 0.7), 1.7, 3); }
        if (q.alive) { const bw = 190, by = top - 62 * z;                                                                                          // HP bar + number (as in the reference)
          L.rrect(x - bw / 2, by, bw, 24, 12, [0.14, 0.14, 0.14], [0.06, 0.06, 0.06], 0.85); L.rrect(x - bw / 2 + 3, by + 3, Math.max(8, (bw - 6) * f), 18, 9, [1, 0.78, 0.2], [0.92, 0.5, 0.06]);
          if (x > 100 && x < W - 100) L.label('twhp' + i, fmtHp(q.hp), x, by - 34, { size: 50, font: FONT, col: '#ffffff', out: '#2a1a00', al: 0.5 }); }
      }
      if (!q.alive) for (let r = 0; r < 8; r++) put('rock_' + (r % 3), x + (r - 3.5) * 40 * z + 10 * Math.sin(r * 5), gyS + 4 * z, (40 + 34 * rnd(r, i)) * clamp(a / 0.5, 0, 1) * z, { ay: 1, ang: 0.3 * Math.sin(r * 3) });   // rubble pile
    });

    // ===================== skeletons =====================
    const front = SIM.frontOf(p);
    for (const e of ST.enemies) { if (e.dead) continue; const x = sx(e.x), fl = clamp(1 - (GT - e.hitT) / 0.1, 0, 1);
      if (x < -250 || x > W + 250) continue;
      const age = GT - e.t0, emerge = ease(clamp(age / 0.35, 0, 1)), melee = e.x - front < K.SK_REACH + 6, ph = GT * 9 + e.id * 1.7, sc = z * (0.95 + 0.1 * rnd(e.id, 2)), tough = e.hpMax > K.SK_HP * 1.2;
      const tint = fl > 0.02 ? [1, 1, 1, 0.65 * fl] : tough ? [0.6, 0.66, 0.95, 0.3] : [1, 1, 1, 0], sw = melee ? 0 : Math.sin(ph) * 0.5, bob = melee ? 0 : Math.abs(Math.sin(ph)) * 5 * sc;
      const gx = x + 70 * sc, base = gyS + (1 - emerge) * 60 * sc, legH = 92 * sc, hz = base - (legH - 4 * sc) - bob;
      L.shadow(gx - 10 * sc, gyS + 4, 44 * sc, 10 * sc, 0.4 * emerge);
      for (const sg of [1, -1]) put('skel_leg', gx + sg * 6 * sc, hz, legH, { ax: 0.5, ay: 0.02, ang: sg * sw, tint: sg > 0 ? [0.7, 0.7, 0.75, 0.25 + 0.4 * fl] : tint });                      // legs swing around the hip
      put('skel_body', gx, hz + 6 * sc, 138 * sc, { ax: 0.76, ay: 1, ang: melee ? 0.1 * Math.sin(GT * 11 + e.id) : 0.03 * Math.sin(ph * 2), tint });                                     // torso: skull, shield, sword
      if (e.hp < e.hpMax) { const bw = 74 * sc, bx = gx - 45 * sc - bw / 2, by = base - 250 * sc; L.rrect(bx, by, bw, 11, 5, [0.1, 0.1, 0.1], [0.05, 0.05, 0.05], 0.85); L.rrect(bx + 2, by + 2, Math.max(5, (bw - 4) * e.hp / e.hpMax), 7, 3, [1, 0.72, 0.15], [0.92, 0.5, 0.06]); }
    }

    // ===================== cart rig (also reused big on the endcard) =====================
    let flashHurt = 0, upAge = 99, buyAge = 99, aimX = null, boltAge = 9;
    for (const e of ST.ev) { const a = GT - e.t; if (e.k === 'hurt') flashHurt = Math.max(flashHurt, clamp(1 - a / 0.15, 0, 1)); if (e.k === 'upgrade') upAge = a; if (e.k === 'buy' && e.id === 'saw') buyAge = a; if (e.k === 'bolt') { aimX = e.tx; boltAge = a; } }
    const drawCart = (ox, base, sc, o) => {
      const tier = o.tier, bob = o.moving ? Math.abs(Math.sin(o.dist * 0.05)) * 3 * sc : 0, y0 = base - bob, tint = o.hurt > 0.02 ? [1, 0.35, 0.3, 0.55 * o.hurt] : [1, 1, 1, 0];
      L.shadow(ox, base + 4 * sc, 240 * sc, 24 * sc, 0.45);
      put('cart_body', ox, y0 - 62 * sc, 115 * sc, { tint });                                                                                                          // wagon bed (wheels sit in front of its lower edge)
      for (const [wx, wr] of [[-168, 46], [-96, 75], [84, 75]]) put('wheel', ox + wx * sc, y0 - wr * sc, 2 * wr * sc, { ay: 0.5, ang: o.dist / wr, tint });              // wheels roll with the distance
      let top = 177 * sc;                                                                                                                                              // tier 2 stacks two more crates, popping up with an overshoot
      if (tier >= 2) for (let k = 1; k <= 2; k++) { const qk = clamp((o.upAge - 0.12 * k) / 0.35, 0, 1), pop = o.upAge >= 99 ? 1 : ease(qk) * (1 + 0.18 * Math.sin(qk * 3.14)); if (pop < 0.02) continue;
        put('crate_tier', ox, y0 - top, 107 * sc, { sy: pop, tint }); top += 107 * sc * pop; }
      if (o.saw) { const sp = o.sawBuy < 99 ? ease(clamp(o.sawBuy / 0.25, 0, 1)) : 1, r = 72 * sc * (0.6 + 0.4 * sp);                                                  // saw bolted on the nose, spins faster in contact
        put('saw_blade', ox + 190 * sc + (1 - sp) * 70 * sc, y0 - 100 * sc, 2 * r, { ay: 0.5, ang: GT * (o.grind ? 22 : 7), tint }); }
      if (tier >= 2) for (const nh of [230, 338]) put('flamethrower', ox + 150 * sc, y0 - nh * sc, 62 * sc, { ax: 0.15, ay: 0.4, tint });
      L.shadow(ox - 30 * sc, y0 - top + 2 * sc, 50 * sc, 9 * sc, 0.3);
      put('archer', ox - 30 * sc - o.recoil * 7 * sc, y0 - top, 235 * sc, { ang: o.aim * 0.25 - 0.02, tint });                                                         // hero: recoils on every bolt
      if (o.hpBar) { const bh = 150 * sc, bxp = ox - 225 * sc, f = clamp(p.hp / p.hpMax, 0, 1); L.rrect(bxp, y0 - 80 * sc - bh, 14, bh, 7, [0.1, 0.1, 0.1], [0.05, 0.05, 0.05], 0.85);   // hp bar left of the cart
        L.rrect(bxp + 2, y0 - 80 * sc - (bh - 4) * f - 2, 10, Math.max(6, (bh - 4) * f), 5, [0.4, 1, 0.3], [0.2, 0.7, 0.15]); }
    };
    const aim0 = aimX !== null && boltAge < 0.5 ? clamp(0.3 * (1 - (aimX - p.x) / 900), 0.02, 0.3) : 0.02, muzzleH = p.tier >= 2 ? 505 : 290;
    const grind = ST.enemies.some((e) => !e.dead && e.x - front < K.SK_REACH + 12);
    if (!(ST.end >= 0 && GT - ST.end > 0.4)) drawCart(sx(p.x), gyS, z, { tier: p.tier, saw: p.saw, dist: p.x, moving: p.v > 20, hurt: flashHurt, upAge, sawBuy: buyAge, grind: grind && p.saw, recoil: clamp(1 - boltAge / 0.15, 0, 1), aim: aim0, hpBar: ST.phase === 'battle' && ST.end < 0 });

    // ===================== rolling saw blades, bombs in flight =====================
    for (const b of ST.blades) { const x = sx(b.x), r = 62 * z, y = gyS - r - 2; put('saw_blade', x, y, 2 * r, { ay: 0.5, ang: GT * -14 }); L.glow(x, gyS - 8 * z, r * 1.6, [1, 0.55, 0.2], 0.12, 2.4);
      for (let j = 0; j < 3; j++) L.puff(x - (50 + j * 40) * z, gyS - (14 + 10 * j) * z, (22 + 8 * j) * z, [0.7, 0.6, 0.42], 0.35 - 0.08 * j, j + 11);
      for (let j = 0; j < 5; j++) L.star(x - (30 + j * 26) * z, gyS - (4 + 14 * rnd(j, Math.floor(GT * 20))) * z, 14 * z, [1, 0.8, 0.4], 0.8 - j * 0.15); }
    for (const e of ST.ev) { if (e.k !== 'throw') continue; const a = GT - e.t; if (a < 0 || a > e.flight) continue; const u = a / e.flight, bx = sx(e.x0) + (sx(e.x) - sx(e.x0)) * u, sh0 = muzzleH - 30, by = gyS - (sh0 * (1 - u) + 520 * Math.sin(Math.PI * u) - 10) * z;
      put('bomb', bx, by, 64 * z, { ay: 0.55, ang: GT * 5 }); L.star(bx + 10 * z, by - 40 * z, 14 * z, [1, 0.8, 0.3], 0.9); }

    // ===================== event FX (world) =====================
    for (const e of ST.ev) { const a = GT - e.t; if (a < 0) continue;
      if (e.k === 'bolt' && a < 0.16) { const x0 = sx(e.x), y0 = hy(muzzleH - 20), x1 = sx(e.tx), u = a / 0.16, y1 = hy(e.tower ? 230 : 130);
        const sxb = x0 + (x1 - x0) * Math.max(0, u - 0.35), syb = y0 + (y1 - y0) * Math.max(0, u - 0.35), exb = x0 + (x1 - x0) * u, eyb = y0 + (y1 - y0) * u;
        { const ln = Math.hypot(exb - sxb, eyb - syb), an = Math.atan2(eyb - syb, exb - sxb); bar(sxb, syb, ln, 16 * z, an, [1, 0.75, 0.3], 0.35); bar(sxb + (exb - sxb) * 0.3, syb + (eyb - syb) * 0.3, ln * 0.7, 9 * z, an, [1, 0.95, 0.7]); bar(sxb + (exb - sxb) * 0.55, syb + (eyb - syb) * 0.55, ln * 0.45, 5 * z, an, [1, 1, 1]); L.glow(exb, eyb, 26 * z, [1, 0.9, 0.5], 0.8, 2.4); } if (a < 0.05) L.glow(x0 + 40 * z, hy(muzzleH - 20), 50 * z, [1, 0.9, 0.5], 0.7, 2.4);
        if (u > 0.9) L.star(x1, y1, 22 * z, [1, 0.9, 0.5], 0.9); }
      if (e.k === 'sawhit' && a < 0.25) { const x = sx(e.x), q = a / 0.25; for (let j = 0; j < 6; j++) { const an = -Math.PI / 2 + (rnd(j, e.t * 9) - 0.5) * 2.6, d = (30 + 80 * rnd(j, 3)) * ease(q) * z;
        L.star(x - 20 * z + Math.cos(an) * d, hy(60) + Math.sin(an) * d + 120 * q * q * z, 12 * z, [1, 0.8, 0.4], 1 - q); } if (a < 0.08) L.glow(x - 20 * z, hy(70), 70 * z, [1, 0.7, 0.3], 0.6, 2.4); }
      if (e.k === 'kill' && a < 1.1) { const x = sx(e.x), g = e.why === 'bomb' || e.why === 'sawt' || e.why === 'rubble' ? 1.6 : 1;
        if (a < 0.4) for (let j = 0; j < 4; j++) { const q = a / 0.4, an = rnd(j, e.id) * 6.28; L.puff(x + Math.cos(an) * 40 * q * z, hy(60 + 40 * q) + Math.sin(an) * 20 * q * z, (16 + 24 * q) * z, [0.86, 0.82, 0.7], 0.6 * (1 - q), e.id + j); }
        for (let j = 0; j < 7; j++) { const vx = (rnd(j, e.id) - 0.5) * 520 * g, vy = (260 + 380 * rnd(j, e.id + 1)) * g, tt = Math.min(a, 1.0), h = Math.max(0, 70 + vy * tt - 1300 * tt * tt), xx = x + vx * tt * z;
          const al = 1 - SS(0.7, 1.1, a), ang = tt * (6 + 8 * rnd(j, 5)) * (j % 2 ? 1 : -1);
          put(j === 0 ? 'skull' : j % 3 === 0 ? 'sword' : 'bone', xx, hy(h), (j === 0 ? 44 : j % 3 === 0 ? 22 : 20) * z, { ay: 0.5, ang, a: al }); } }
      if (e.k === 'boom' && a < 1.0) { const x = sx(e.x), q = a / 1.0, r = e.r * z; if (a < 0.2) L.glow(x, hy(70), r * 1.6, [1, 0.6, 0.2], 1.3 * (1 - a / 0.2), 2.2);
        L.ring(x, hy(30), r * 1.2 * ease(Math.min(1, a / 0.35)), r * 0.35 * ease(Math.min(1, a / 0.35)), [1, 0.8, 0.5], 0.9 * (1 - Math.min(1, a / 0.4)), 0.16);
        for (let j = 0; j < 8; j++) { const an = j / 8 * 6.283 + 0.4, d = (40 + 150 * ease(Math.min(1, a / 0.6))) * z; L.puff(x + Math.cos(an) * d, hy(60) + Math.sin(an) * d * 0.7 - 80 * q * z, (36 + 50 * q) * z, j % 3 ? [0.32, 0.31, 0.3] : [1, 0.55, 0.15], 0.85 * (1 - q), j + 7); }
        for (let j = 0; j < 8; j++) { const vx = (rnd(j, 11) - 0.5) * 620, tt = Math.min(a, 0.9); L.rrect(x + vx * tt * z - 8 * z, hy(Math.max(0, 40 + (520 + 300 * rnd(j, 12)) * tt - 1500 * tt * tt)) - 8 * z, 16 * z, 14 * z, 4 * z, [0.46, 0.34, 0.2], [0.3, 0.2, 0.1], 1 - SS(0.7, 1, a)); } }
      if (e.k === 'sawimpact' && a < 0.6) { const x = sx(e.x), q = a / 0.6; for (let j = 0; j < 12; j++) { const an = -Math.PI / 2 + (rnd(j, 4) - 0.5) * 3, d = (40 + 170 * rnd(j, 5)) * ease(q) * z; L.star(x + Math.cos(an) * d, hy(50) + Math.sin(an) * d + 200 * q * q * z, 14 * z, [1, 0.82, 0.4], 1 - q); }
        for (let j = 0; j < 5; j++) L.puff(x - 20 * z + j * 14 * z, hy(80 + 40 * q), (24 + 40 * q) * z, [0.7, 0.7, 0.66], 0.6 * (1 - q), j + 3); }
      if (e.k === 'towerdown' && a < 2.4) { const x = sx(e.x), q = a / 2.4;
        for (let j = 0; j < 14; j++) { const vx = (rnd(j, 21) - 0.5) * 760 + 60, vy = 300 + 620 * rnd(j, 22), tt = Math.min(a, 1.4), h = Math.max(0, 200 + vy * tt - 1200 * tt * tt), al = 1 - SS(1.7, 2.4, a), sw = (40 + 50 * rnd(j, 23)) * z;
          const cx = x + vx * tt * z, cy = hy(h); put('rock_' + (j % 3), cx, cy, sw * 0.9, { ay: 0.5, ang: tt * (4 + 6 * rnd(j, 24)) * (j % 2 ? 1 : -1), a: al }); }
        for (let j = 0; j < 12; j++) { const an = j / 12 * 6.283 + 0.3, d = (60 + 340 * ease(Math.min(1, a / 1.2))) * z; L.puff(x + Math.cos(an) * d, hy(50) + Math.sin(an) * d * 0.35 - 110 * q * z, (60 + 80 * q) * z, [0.78, 0.74, 0.66], 0.7 * (1 - q), j + 31); }
        if (a < 0.3) L.glow(x, hy(200), 420 * z, [1, 0.85, 0.5], 0.9 * (1 - a / 0.3), 2.2); }
      if (e.k === 'upgrade' && a < 1.5) { const x = sx(p.x), q = a / 1.5, pil = (1 - SS(0.3, 1, q)) * SS(0, 0.08, a);
        for (let j = 0; j < 6; j++) L.glow(x, hy(100 + j * 90 * (0.4 + q)), (150 - j * 10) * z, [1, 0.88, 0.45], 0.55 * pil * (1 - j / 7), 2.2);
        for (let j = 0; j < 10; j++) { const an = j / 10 * 6.283 + 0.4, d = (80 + 240 * ease(Math.min(1, a / 0.5))) * z; L.puff(x + Math.cos(an) * d, hy(40) + Math.sin(an) * d * 0.3, (30 + 36 * q) * z, [0.86, 0.72, 0.46], 0.55 * (1 - q), j + 3); }
        for (let j = 0; j < 8; j++) { const an = j / 8 * 6.283 + e.t, d = (100 + 220 * ease(q)) * z; L.star(x + Math.cos(an) * d, hy(220) + Math.sin(an) * d * 0.7, 26 * z, [1, 0.9, 0.5], 1 - q); } }
      if (e.k === 'buy' && e.id === 'saw' && a < 0.5) { const x = sx(p.x + 270), q = a / 0.5; for (let j = 0; j < 8; j++) { const an = j / 8 * 6.283, d = (30 + 90 * ease(q)) * z; L.star(x + Math.cos(an) * d, hy(100) + Math.sin(an) * d, 14 * z, [1, 0.85, 0.5], 1 - q); } }
      if (e.k === 'spawn' && a < 0.5) { const x = sx(e.x), q = a / 0.5; L.puff(x, hy(40 + 30 * q), (30 + 40 * q) * z, [0.4, 0.38, 0.36], 0.6 * (1 - q), 5 + Math.floor(e.t * 3)); } }
    if (p.tier >= 2 && ST.fireUntil > GT && ST.end < 0) { const fa = 1 - SS(ST.fireUntil - 0.3, ST.fireUntil, GT);                                  // flames: two cones
      for (const nh of [230, 338]) { const x0 = sx(p.x) + 280 * z, y0 = hy(nh);
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
    { const lx = 30, ly = 38, lw = 270, lh = lw * 898 / 1484; L.sprite('logo_shield', lx, ly, { w: lw, h: lh });                                                                  // logo plate + text
      L.label('logo1', 'SIEGE', lx + lw / 2, ly + lh * 0.36, { size: 46, font: FONT, col: '#ffe9a8', out: '#1a1030', al: 0.5 }); L.label('logo2', 'CART', lx + lw / 2, ly + lh * 0.66, { size: 52, font: FONT, col: '#ffffff', out: '#1a1030', al: 0.5 }); L.uiBox('logoBox', lx, ly, lw, lh, 2); }
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
    const icon = (id, cx, cy, s, a = 1) => { if (id === 'bomb') put('bomb', cx, cy + 4 * s, 84 * s, { ay: 0.5, a, ang: 0.1 * Math.sin(t * 3) });
      else if (id === 'sawt') put('saw_blade', cx, cy, 80 * s, { ay: 0.5, a, ang: t * 2 });
      else if (id === 'fire') put('flamethrower', cx, cy, 52 * s, { ay: 0.5, a, ang: -0.3 }); };
    const chip = (r, label, enough, ico) => { const cw = 150, cx = r.x + r.w / 2 - cw / 2, cy = r.y + r.h + 10; L.rrect(cx, cy, cw, 44, 22, [0.08, 0.1, 0.14], [0.03, 0.04, 0.06], 0.85);
      if (ico === 'bolt') put('bolt', cx + 34, cy + 22, 38, { ay: 0.5, tint: enough ? [1, 1, 1, 0] : [0.55, 0.58, 0.62, 0.75] }); else coin(cx + 34, cy + 22, 16, 0);
      L.label('chip_' + label + ico, label, cx + 64, cy + 23, { size: 34, font: FONT, col: enough ? '#ffffff' : '#c8ccd2', out: '#0a1020' }); };
    if (ST.end < 0 && ST.phase === 'shop') {
      const fS = frame('saw', !ST.bought.saw && ST.money >= K.COST_SAW, !!ST.bought.saw, [0.2, 0.72, 0.28]); icon('sawt', fS.x + fS.w / 2, fS.y + fS.h * 0.42, 1.0, ST.bought.saw ? 0.4 : 1); chip(UI.saw, String(K.COST_SAW), ST.money >= K.COST_SAW && !ST.bought.saw, 'coin');
      if (ST.bought.saw) L.label('sold', 'READY', fS.x + fS.w / 2, fS.y + fS.h * 0.82, { size: 32, font: FONT, col: '#9dff9d', out: '#0a2a0a', al: 0.5 });
      const fF = frame('firelock', false, true, [0.2, 0.72, 0.28]); icon('fire', fF.x + fF.w / 2, fF.y + fF.h * 0.4, 1.0, 0.3); put('padlock', fF.x + fF.w / 2, fF.y + fF.h * 0.42, 62, { ay: 0.5 }); L.label('lv2', 'CART LV2', fF.x + fF.w / 2, fF.y + fF.h * 0.86, { size: 26, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5 });
      for (const [id, nm, cost, key, sub] of [['cart', 'CART+', K.COST_CART, 'cart', '+HP'], ['energy', 'ENERGY', K.COST_ENERGY, 'energy', '+0.3/s']]) { const on = !ST.bought[key] && ST.money >= cost, f = frame(id, on, !!ST.bought[key], [0.2, 0.78, 0.3]);
        L.label('big_' + id, nm, f.x + f.w / 2, f.y + f.h * 0.26, { size: 46, font: FONT, col: '#ffffff', out: '#0a3a14', al: 0.5 }); L.label('sub_' + id, sub, f.x + f.w / 2, f.y + f.h * 0.5, { size: 36, font: FONT, col: '#d8ffd0', out: '#0a3a14', al: 0.5 });
        L.rrect(f.x + f.w / 2 - 70, f.y + f.h * 0.66, 140, 46, 23, [0.06, 0.2, 0.08], [0.03, 0.1, 0.04], 0.85); coin(f.x + f.w / 2 - 44, f.y + f.h * 0.66 + 23, 17, 0); L.label('bp_' + id, String(cost), f.x + f.w / 2 - 20, f.y + f.h * 0.66 + 24, { size: 34, font: FONT, col: '#ffe066', out: '#3a2300' }); }
      { const r = UI.start, hot = ST.hint === 'start', pul = 1 + (hot ? 0.05 * Math.sin(t * 8) : 0), w = r.w * pul, h = r.h * pul, x = r.x + (r.w - w) / 2, y = r.y + (r.h - h) / 2;
        L.rrect(x, y + 10, w, h, 32, [0.55, 0.3, 0.02], [0.4, 0.2, 0.0]); L.rrect(x, y, w, h, 32, [1, 0.8, 0.28], [0.98, 0.55, 0.1]); L.rrect(x + 10, y + 8, w - 20, h * 0.4, 24, [1, 0.9, 0.5], [1, 0.8, 0.3], 0.5); L.uiBox('card_start', r.x, r.y, r.w, r.h, 2);
        L.label('start', 'START', r.x + r.w / 2, r.y + r.h / 2 - 2, { size: 84, font: FONT, col: '#5a2c00', out: '#ffe9a0', al: 0.5 }); S.hit.push({ id: 'tap_start', x: r.x, y: r.y, w: r.w, h: r.h }); }
    } else if (ST.end < 0) {
      { const r = UI.enbar, fr = ST.en >= K.EN_MAX ? 1 : ST.en - Math.floor(ST.en), nx = Math.floor(ST.en); L.rrect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, 26, [0.22, 0.24, 0.26], [0.1, 0.1, 0.12]); L.rrect(r.x, r.y, r.w, r.h, 22, [0.72, 0.7, 0.62], [0.52, 0.5, 0.44]);   // energy panel
        L.rrect(r.x + 6, r.y + 6, Math.max(26, (r.w - 12) * fr), r.h - 12, 18, [0.3, 0.65, 1], [0.12, 0.4, 0.95]); put('bolt', r.x + 78, r.y + r.h / 2, 128, { ay: 0.5 });
        L.label('en', String(nx), r.x + r.w - 110, r.y + r.h / 2 + 2, { size: 118, font: FONT, col: '#ffffff', out: '#10304a', al: 0.5 }); L.uiBox('enbox', r.x, r.y, r.w, r.h, 2); }
      for (const [id, cost] of [['bomb', K.COST_BOMB], ['sawt', K.COST_SAWT], ['fire', K.COST_FIRE]]) { const locked = id === 'fire' && p.tier < 2, ok = ST.en >= cost && !locked, f = frame(id, ok, locked, [0.18, 0.5, 0.95]);
        icon(id, f.x + f.w / 2, f.y + f.h / 2, 1.2, locked ? 0.35 : ok ? 1 : 0.6);
        if (locked) put('padlock', f.x + f.w / 2, f.y + f.h / 2 + 4, 76, { ay: 0.5 });
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
      if (e.k === 'nope') pop('nope', e.msg || (e.coin ? 'NEED ' + Math.ceil(e.need) + ' COINS' : 'NOT ENOUGH ENERGY'), W / 2, H * 0.2, 0.9, 52, '#ffffff', '#8a1208');
      if (e.k === 'locked') pop('lock', 'UPGRADE YOUR CART FIRST', W / 2, H * 0.2, 1.0, 46, '#ffffff', '#6b4a00'); }
    let dj = 0;                                                                                                                                                        // damage numbers (max 3, stacked)
    for (const e of ST.ev) { if (e.k !== 'dmg') continue; const a = GT - e.t, x = sx(e.x); if (a < 0 || a > 0.7 || x < 120 || x > W - 120 || dj >= 3) continue; const j = dj++;
      L.label('dmg' + j, '-' + e.v, x, hy(e.y ? 330 : 260) - 110 * a + j * 64, { size: 46, font: FONT, col: '#fff27a', out: '#5a3a00', al: 0.5, a: 1 - SS(0.5, 0.7, a) }); }
    for (const e of ST.ev) { if (e.k !== 'autotap') continue; const a = GT - e.t, r = UI[e.id]; if (a < 0 || a > 0.5) continue; const hx = r.x + r.w * 0.66, hyy = r.y + r.h * 0.34, pr = a < 0.15 ? 0.9 : 1;
      L.ring(hx, hyy, 30 + 90 * (a / 0.5), 30 + 90 * (a / 0.5), WHITE, 0.6 * (1 - a / 0.5), 0.1); put('hand', hx, hyy, 135 * pr, { ax: 0.5, ay: 0.02, ang: -0.75, a: 1 - SS(0.35, 0.5, a) }); }   // ghost tap: the cart casts for an idle viewer
    // ---- tutorial: banner + hand pointing at the hinted card ----
    const BAN = { saw: 'TAP TO BUILD YOUR CART!', cart: 'STRONGER CART!', start: 'READY? TAP START!', bomb: 'TAP TO ATTACK!', sawt: 'TAP THE SAW!', fire: 'FIRE! TAP NOW!', bubble: 'UPGRADE YOUR CART!' };
    if (ST.end < 0 && ST.hint) { const r = UI[ST.hint], bn = 1 + 0.04 * Math.sin(t * 6), txt = BAN[ST.hint], tw = L.labelW('tut', txt, { size: Math.round(62 * bn), font: FONT });
      if (!calloutOn) { L.rrect(W / 2 - tw / 2 - 40, 330 - 56, tw + 80, 112, 56, [0.05, 0.08, 0.14], [0.02, 0.03, 0.06], 0.72); L.uiBox('tutbox', W / 2 - tw / 2 - 40, 330 - 56, tw + 80, 112, 4);
        L.label('tut', txt, W / 2, 330, { size: Math.round(62 * bn), font: FONT, col: '#ffffff', out: '#102a40', al: 0.5 }); }
      const hx = r.x + r.w * (ST.hint === 'start' ? 0.9 : 0.66), hyy = r.y + r.h * 0.34 + 8 * Math.sin(t * 7), tapq = (t * 1.1) % 1, down = tapq > 0.6, hs = down ? 0.9 : 1, rr = 30 + 60 * ease(Math.min(1, tapq * 1.2));
      if (down) L.ring(hx, hyy, rr, rr, WHITE, 0.55 * (1 - Math.min(1, (tapq - 0.6) / 0.4)), 0.1);
      put('hand', hx, hyy, 135 * hs, { ax: 0.5, ay: 0.02, ang: -0.75 }); }                                                                                      // fingertip on the card, hand tilts away from the price
    if (ST.end < 0) { const bw = 330, bh = 104, bx = W - bw - 36, by = H - bh - 44, pul = 1 + 0.03 * Math.sin(t * 5);                                              // persistent CTA bar
      L.rrect(24, by - 18, W - 48, bh + 36, 30, [0.06, 0.08, 0.14], [0.03, 0.04, 0.08], 0.74); L.uiBox('ctabar', 24, by - 18, W - 48, bh + 36, 4);
      L.label('brand', 'SIEGE CART', 70, by + bh / 2, { size: 50, font: FONT, col: '#ffd84a', out: '#2a1a00' });
      L.rrect(bx - (pul - 1) * bw / 2, by - (pul - 1) * bh / 2, bw * pul, bh * pul, bh / 2, [0.35, 0.8, 0.4], [0.12, 0.6, 0.2]); L.uiBox('cta', bx, by, bw, bh, 2);
      L.label('cta', CP.cta || 'PLAY FREE', bx + bw / 2, by + bh / 2, { size: 50, font: FONT, col: '#ffffff', out: '#0a3a14', al: 0.5 }); S.hit.push({ id: 'cta', x: bx, y: by, w: bw, h: bh }); }

    // ===================== endcard =====================
    if (ST.end >= 0) { const oy = (H - 1920) / 2, a = GT - ST.end, k = SS(0, 0.45, a), pop = (d) => { const q = clamp((a - d) / 0.35, 0, 1); return q < 1 ? 1.12 * ease(q) - 0.12 * q * q : 1; };
      L.solid(0, 0, W, H, [0.02, 0.04, 0.08], 0, 0, 0, 0.86 * k);
      const head = ST.endWhy === 'win' ? (CP.win || 'YOU CRUSHED IT!') : ST.endWhy === 'lose' ? 'SO CLOSE!' : 'BUILD YOUR CART!', s1 = pop(0.2);
      if (s1 > 0.01) { L.label('head', head, W / 2, 310 + oy, { size: Math.round(72 * s1), font: FONT, col: '#ffffff', out: '#102a40', al: 0.5 });
        L.label('logo', 'SIEGE CART', W / 2, 430 + oy, { size: Math.round(124 * s1), font: FONT, col: '#ffd84a', out: '#3a2000', al: 0.5 });
        L.label('tag', CP.tag || 'Smash towers. Upgrade your cart!', W / 2, 540 + oy, { size: 52, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5, a: k }); }
      const sm = pop(0.35); if (sm > 0.01) { L.glow(W / 2 - 40, 880 + oy, 340, [1, 0.85, 0.4], 0.25, 2.2); drawCart(W / 2 - 20, 1180 + oy + (1 - sm) * 200, 0.9 * sm, { tier: 2, saw: true, dist: t * 90, moving: true, hurt: 0, upAge: 99, sawBuy: 99, grind: false, recoil: 0, aim: -0.1 + 0.03 * Math.sin(t * 3), hpBar: false }); }
      const s2 = pop(0.45); if (s2 > 0.01) L.label('stat', ST.kills + (ST.kills === 1 ? ' SKELETON' : ' SKELETONS') + ' SMASHED · ' + ST.towersDown + (ST.towersDown === 1 ? ' TOWER' : ' TOWERS') + ' DOWN', W / 2, 1230 + oy, { size: Math.round(42 * s2), font: FONT, col: '#bff58a', out: '#173307', al: 0.5 });
      const s3 = pop(0.7), pul = 1 + 0.045 * Math.sin(t * 6), bw = 640 * s3 * pul, bh = 170 * s3 * pul, bx = W / 2 - bw / 2, by = 1420 + oy - bh / 2;
      if (s3 > 0.01) { L.glow(W / 2, 1420 + oy, 420, [1, 0.8, 0.3], 0.3, 2.2); L.rrect(bx, by + 12, bw, bh, bh / 2, [0.55, 0.30, 0.02], [0.45, 0.22, 0.0]); L.rrect(bx, by, bw, bh, bh / 2, [1.0, 0.86, 0.30], [0.98, 0.58, 0.10]); L.uiBox('endcta', bx, by, bw, bh, 2);
        L.label('endcta', CP.cta || 'PLAY FREE', W / 2, by + bh / 2, { size: Math.round(86 * s3), font: FONT, col: '#ffffff', out: '#7a3a00', al: 0.5 }); S.hit.push({ id: 'cta', x: bx, y: by, w: bw, h: bh }); }
      if (a > 1.2) { L.label('replay', '↻ REPLAY', W / 2, 1620 + oy, { size: 58, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5, a: SS(1.2, 1.6, a) }); S.hit.unshift({ id: 'replay', x: W / 2 - 170, y: 1570 + oy, w: 400, h: 100 }); }
      if (a > 0.6) S.hit.push({ id: 'cta', x: 0, y: 0, w: W, h: H }); }
  };

  // QA hooks: every HUD screen at its worst case, staged from the attract replay where it happens naturally
  S.QA = () => {
    const at = (tt, o = {}) => Object.assign(JSON.parse(JSON.stringify(SIM.at(tt))), o);
    return { states: [['shop', at(0.3)], ['go', at(2.0)], ['bomb', at(4.9)], ['saw_grind', at(8)], ['tower1', at(10.8)], ['bubble', at(11.8)], ['upgrade', at(12.3)], ['fire', at(17.8)], ['tower2', at(20.2)], ['end', at(24)],
      ['money_worst', at(9, { money: 99999 })]], cycles: {}, sprites: {}, box: () => [0, 0, W, H] };
  };
})();
