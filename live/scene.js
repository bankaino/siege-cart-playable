// live/scene.js — SIEGE CART. PHASE-1 PLACEHOLDER renderer: flat shapes for the side-view world, real HUD/CTA/endcard logic.
// Phase 2 replaces the world drawing with sprites + rigs + FX and keeps: money pill, cards via SIM.UI, hand, CTA bar, endcard, S.hit, S.QA.
// Pure function of t and the sim state. World → screen: sx(x) = CART_SX + (x - cart.x) * zoom; ground line y = GY.
(function () {
  const S = (window.SCENE = {}), A = window.ASSETS, L = LIB, W = SIM.VIEW.W, H = SIM.VIEW.H, Z = window.SIZES;
  S.REPEAT = ['ground_tex'];
  S.programs = () => { L.init(W, H); L.glyphs('0123456789+$×'); L.SUN = [W * 0.15, -300]; };
  const has = (n) => !!A[n], SS = L.SS, K = SIM.K, UI = SIM.UI, GY = SIM.GY, CX = SIM.CART_SX;
  const FONT = '"Arial Black", "Arial Rounded MT Bold", "Segoe UI Black", sans-serif';
  const ease = (x) => 1 - (1 - x) * (1 - x), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  S.hit = [];

  S.render = (t) => {
    const ST = S.state || SIM.at(t), GT = ST.t, p = ST.p, z = ST.zoom;
    const sx = (x) => CX + (x - p.x) * z, sy = (y) => GY + (y - GY) * z;
    L.beginBG([0.45, 0.72, 0.85, 1]);
    L.solid(0, 0, W, GY, [0.45, 0.72, 0.85], 0, 0, 0, 1);
    L.solid(0, sy(GY), W, H - sy(GY), [0.36, 0.55, 0.22], 0, 0, 0, 1);
    L.beginComp();
    // towers
    ST.towers.forEach((q, i) => { const x = sx(q.x), a = q.alive ? 1 : 0.25, hh = (i ? 560 : 420) * z;
      L.rrect(x - 110 * z, sy(GY) - hh, 220 * z, hh, 8, [0.62, 0.62, 0.6], [0.5, 0.5, 0.48], a);
      if (q.alive) { const f = q.hp / q.hpMax; L.rrect(x - 90 * z, sy(GY) - hh - 40, 180 * z, 18, 6, [0.2, 0.2, 0.2], [0.1, 0.1, 0.1], 0.8); L.rrect(x - 90 * z, sy(GY) - hh - 40, 180 * z * f, 18, 6, [1, 0.7, 0.1], [0.9, 0.5, 0.05]); } });
    // skeletons
    for (const e of ST.enemies) { if (e.dead && GT - e.deadT > 0.5) continue; const x = sx(e.x), al = e.dead ? 1 - (GT - e.deadT) / 0.5 : 1;
      L.rrect(x - 25 * z, sy(GY) - 130 * z, 50 * z, 130 * z, 10, [0.9, 0.88, 0.8], [0.8, 0.78, 0.7], al);
      if (!e.dead) L.rrect(x - 30 * z, sy(GY) - 160 * z, 60 * z * e.hp / e.hpMax, 10, 4, [1, 0.7, 0.1], [0.9, 0.5, 0.05]); }
    // cart (+ saw, + tier-2 crates, flames)
    { const ch = (p.tier >= 2 ? 330 : 160) * z, x = sx(p.x);
      L.rrect(x - 150 * z, sy(GY) - 50 * z - ch, 270 * z, ch, 10, [0.62, 0.38, 0.16], [0.48, 0.28, 0.1]);
      L.rrect(x - 130 * z, sy(GY) - 70 * z - ch - 150 * z, 80 * z, 150 * z, 14, [0.25, 0.4, 0.9], [0.15, 0.25, 0.7]);
      if (p.saw) L.rrect(x + 110 * z, sy(GY) - 150 * z, 110 * z, 110 * z, 55 * z, [0.8, 0.82, 0.85], [0.6, 0.62, 0.66]);
      if (ST.fireUntil > GT) L.rrect(x + 130 * z, sy(GY) - 120 * z, K.FIRE_RANGE * z, 80 * z, 40, [1, 0.6, 0.1], [1, 0.3, 0.05], 0.7);
      L.rrect(x - 150 * z, sy(GY) - 130 * z - 4, 270 * z * clamp(p.hp / p.hpMax, 0, 1), 10, 4, [0.3, 0.9, 0.3], [0.2, 0.7, 0.2]); }
    for (const b of ST.blades) L.rrect(sx(b.x) - 40, sy(GY) - 90, 80, 80, 40, [0.8, 0.82, 0.85], [0.6, 0.62, 0.66]);
    let dj = 0;
    for (const e of ST.ev) { const a = GT - e.t; if (e.k === 'boom' && a < 0.4) L.glow(sx(e.x), sy(GY) - 60, 260 * z, [1, 0.6, 0.2], 1 - a / 0.4, 2);
      if (e.k === 'bolt' && a < 0.12) L.solid(sx(e.x), sy(GY) - 330 * z, (sx(e.tx) - sx(e.x)) * (a / 0.12), 4, [1, 0.9, 0.6], 0, 0, 0, 1);
      if (e.k === 'dmg' && a >= 0 && a < 0.7 && sx(e.x) > 120 && sx(e.x) < W - 120 && dj < 3) { const j = dj++; L.label('dmg' + j, '-' + e.v, clamp(sx(e.x), 120, W - 120), sy(GY) - 300 * z - 120 * a + j * 80, { size: 44, font: FONT, col: '#fff27a', out: '#5a3a00', al: 0.5, a: 1 - a / 0.7 }); } }
    L.finish(t, { bloom: [0.1, 0.1], vignette: 0.9, warm: 0.5, roll: 0.5 });

    // ===================== HUD =====================
    S.hit = [];
    const shown = Math.max(0, Math.round(ST.money)), txt = String(shown), mtw = Math.max(L.labelW('money', txt, { size: 66, font: FONT }), 60), mpw = 96 + 26 + mtw + 44, mpx = W / 2 - mpw / 2;
    L.rrect(mpx, 70, mpw, 96, 48, [0.10, 0.16, 0.08], [0.05, 0.09, 0.04], 0.78); L.uiBox('money', mpx, 70, mpw, 96, 4);
    L.sprite('coin', mpx + 4, 70, { w: 96, h: 96 }); L.label('money', txt, mpx + 96 + 26, 118, { size: 66, font: FONT, col: '#ffe066', out: '#3a2300' });
    L.rrect(W / 2 - 360, 190, 720, 22, 11, [0.2, 0.2, 0.2], [0.1, 0.1, 0.1], 0.85); L.rrect(W / 2 - 360, 190, 720 * ST.prog, 22, 11, [1, 0.8, 0.2], [0.9, 0.55, 0.1]);
    const card = (id, label, sub, on, locked, col) => { const r = UI[id], hot = ST.hint === id, pul = hot ? 1 + 0.04 * Math.sin(t * 8) : 1;
      L.rrect(r.x, r.y, r.w * pul, r.h * pul, 22, locked ? [0.35, 0.35, 0.37] : on ? col : [0.5, 0.5, 0.52], locked ? [0.25, 0.25, 0.27] : on ? L.lerpP(col, [0, 0, 0], 0.35) : [0.38, 0.38, 0.4]);
      L.uiBox('c_' + id, r.x, r.y, r.w, r.h, 2); L.label('c_' + id, label, r.x + r.w / 2, r.y + r.h * 0.4, { size: 44, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5 });
      L.label('s_' + id, sub, r.x + r.w / 2, r.y + r.h * 0.78, { size: 40, font: FONT, col: '#ffe066', out: '#3a2300', al: 0.5 }); S.hit.push({ id: 'tap_' + id, x: r.x, y: r.y, w: r.w, h: r.h }); };
    S.hit = [];
    if (ST.end < 0 && ST.phase === 'shop') {
      card('saw', 'SAW', K.COST_SAW + '', !ST.bought.saw && ST.money >= K.COST_SAW, !!ST.bought.saw, [0.2, 0.75, 0.25]); card('firelock', 'FIRE', 'LV2', false, true, [0.2, 0.75, 0.25]);
      card('cart', 'CART+', K.COST_CART + '', !ST.bought.cart && ST.money >= K.COST_CART, !!ST.bought.cart, [0.2, 0.75, 0.25]);
      card('energy', 'ENERGY', K.COST_ENERGY + '', !ST.bought.energy && ST.money >= K.COST_ENERGY, !!ST.bought.energy, [0.2, 0.75, 0.25]);
      const r = UI.start, pul = ST.hint === 'start' ? 1 + 0.04 * Math.sin(t * 8) : 1; L.rrect(r.x, r.y, r.w * pul, r.h * pul, 30, [1, 0.72, 0.2], [0.9, 0.5, 0.05]); L.label('start', 'START', r.x + r.w / 2, r.y + r.h / 2, { size: 80, font: FONT, col: '#4a2a00', al: 0.5 });
    } else if (ST.end < 0) {
      const en = UI.enbar; L.rrect(en.x, en.y, en.w, en.h, 22, [0.6, 0.6, 0.62], [0.45, 0.45, 0.48]); L.rrect(en.x, en.y, en.w * ST.en / K.EN_MAX, en.h, 22, [0.2, 0.55, 1], [0.1, 0.35, 0.9], 0.85);
      L.label('en', String(Math.floor(ST.en)), en.x + en.w / 2, en.y + en.h / 2, { size: 100, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5 });
      card('bomb', 'BOMB', K.COST_BOMB + '⚡', ST.en >= K.COST_BOMB, false, [0.2, 0.5, 0.95]); card('sawt', 'SAW', K.COST_SAWT + '⚡', ST.en >= K.COST_SAWT, false, [0.2, 0.5, 0.95]);
      card('fire', 'FIRE', K.COST_FIRE + '⚡', ST.en >= K.COST_FIRE && p.tier >= 2, p.tier < 2, [0.2, 0.5, 0.95]);
      if (ST.up && !ST.upDone && GT >= ST.up.t0) { const r = UI.bubble; L.rrect(r.x, r.y, r.w, r.h, 40, [1, 0.8, 0.2], [0.9, 0.55, 0.1]); L.label('bub', '⬆ ' + K.UP_COST, r.x + r.w / 2, r.y + r.h / 2, { size: 60, font: FONT, col: '#4a2a00', al: 0.5 }); S.hit.push({ id: 'tap_bubble', x: r.x, y: r.y, w: r.w, h: r.h }); }
    }
    // tutorial hand: points at the hint card (demo: always; play: when a hint exists)
    if (ST.end < 0 && ST.hint) { const r = UI[ST.hint], hx = r.x + r.w * 0.6, hy = r.y + r.h * 0.6 + 14 * Math.sin(t * 7);
      if (has('hand')) { const hh = Z.hand[1], hw = L.hsz('hand', hh); L.sprite('hand', hx - hw * 0.33, hy - hh * 0.03, { w: hw, h: hh }); } else L.ring(hx, hy, 52, 52, [1, 1, 1], 0.8, 0.12); }
    // persistent CTA bar
    if (ST.end < 0) { const bw = 330, bh = 104, bx = W - bw - 36, by = H - bh - 44, pul = 1 + 0.03 * Math.sin(t * 5);
      L.rrect(24, by - 18, W - 48, bh + 36, 30, [0.06, 0.10, 0.05], [0.03, 0.05, 0.02], 0.72); L.uiBox('ctabar', 24, by - 18, W - 48, bh + 36, 4);
      L.label('brand', 'SIEGE CART', 70, by + bh / 2, { size: 50, font: FONT, col: '#ffd84a', out: '#2a1a00' });
      L.rrect(bx - (pul - 1) * bw / 2, by - (pul - 1) * bh / 2, bw * pul, bh * pul, bh / 2, [0.35, 0.68, 1.0], [0.10, 0.42, 0.95]); L.uiBox('cta', bx, by, bw, bh, 2);
      L.label('cta', 'PLAY FREE', bx + bw / 2, by + bh / 2, { size: 50, font: FONT, col: '#ffffff', out: '#0a2a70', al: 0.5 }); S.hit.push({ id: 'cta', x: bx, y: by, w: bw, h: bh }); }
    // ===== endcard =====
    if (ST.end >= 0) { const oy = (H - 1920) / 2, a = GT - ST.end, k = SS(0, 0.45, a), pop = (d) => { const q = clamp((a - d) / 0.35, 0, 1); return q < 1 ? 1.12 * ease(q) - 0.12 * q * q : 1; };
      L.solid(0, 0, W, H, [0.02, 0.04, 0.08], 0, 0, 0, 0.72 * k);
      const head = ST.endWhy === 'win' ? 'YOU CRUSHED IT!' : ST.endWhy === 'lose' ? 'SO CLOSE!' : 'BUILD THE ULTIMATE CART', s1 = pop(0.2);
      if (s1 > 0.01) { L.label('head', head, W / 2, 220 + oy, { size: Math.round(72 * s1), font: FONT, col: '#ffffff', out: '#102a40', al: 0.5 });
        L.label('logo', 'SIEGE CART', W / 2, 360 + oy, { size: Math.round(124 * s1), font: FONT, col: '#ffd84a', out: '#3a2000', al: 0.5 });
        L.label('tag', 'Smash towers. Upgrade your cart!', W / 2, 480 + oy, { size: 52, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5, a: k }); }
      const sm = pop(0.35); if (sm > 0.01 && has('mascot')) { const mh = 560 * sm, mw = L.hsz('mascot', mh); L.sprite('mascot', W / 2 - mw / 2, 1070 + oy - mh, { w: mw, h: mh }); }
      const s2 = pop(0.45); if (s2 > 0.01) L.label('stat', ST.kills + ' SKELETONS SMASHED · ' + ST.earned + ' COINS', W / 2, 1130 + oy, { size: Math.round(44 * s2), font: FONT, col: '#bff58a', out: '#173307', al: 0.5 });
      const s3 = pop(0.7), pul = 1 + 0.045 * Math.sin(t * 6), bw = 640 * s3 * pul, bh = 170 * s3 * pul, bx = W / 2 - bw / 2, by = 1330 + oy - bh / 2;
      if (s3 > 0.01) { L.rrect(bx, by + 12, bw, bh, bh / 2, [0.55, 0.30, 0.02], [0.45, 0.22, 0.0]); L.rrect(bx, by, bw, bh, bh / 2, [1.0, 0.86, 0.30], [0.98, 0.58, 0.10]); L.uiBox('endcta', bx, by, bw, bh, 2);
        L.label('endcta', 'PLAY FREE', W / 2, by + bh / 2, { size: Math.round(86 * s3), font: FONT, col: '#ffffff', out: '#7a3a00', al: 0.5 }); S.hit.push({ id: 'cta', x: bx, y: by, w: bw, h: bh }); }
      if (a > 1.2) { L.label('replay', '↻ REPLAY', W / 2, 1560 + oy, { size: 46, font: FONT, col: '#ffffff', out: '#102a40', al: 0.5, a: SS(1.2, 1.6, a) }); S.hit.unshift({ id: 'replay', x: W / 2 - 170, y: 1520 + oy, w: 340, h: 80 }); }
      if (a > 0.6) S.hit.push({ id: 'cta', x: 0, y: 0, w: W, h: H }); }
  };

  // QA hooks: every HUD screen at its worst case, staged from the attract replay
  S.QA = () => {
    const at = (tt, o = {}) => Object.assign(JSON.parse(JSON.stringify(SIM.at(tt))), o);
    return { states: [['shop', at(0.3)], ['go', at(2.5)], ['bomb', at(5)], ['tower1', at(10.8)], ['bubble', at(11.8)], ['fire', at(17.8)], ['end', at(24)], ['money_worst', at(9, { money: 99999 })]],
      cycles: {}, sprites: {}, box: () => [0, 0, W, H] };
  };
})();
