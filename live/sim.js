// live/sim.js — SIEGE CART playable ad: deterministic side-view sim, fixed 120 Hz.
// Loop: SHOP (tap SAW, tap START) → BATTLE: the cart rolls right by itself, the archer shoots, the player taps ability cards
// (BOMB 2⚡, SAW-THROW 4⚡, FIRE 7⚡) paid with auto-filling energy → tower 1 falls → ⬆ upgrade bubble (cart grows, FIRE unlocks)
// → tower 2 falls → endcard. Input is TAPS: inp.click (one step) at view px inp.px/py, hit-tested against SIM.UI (scene + smoke test share it).
// Every reaction lives here as events in S.ev; the scene only draws. World x grows to the right; the cart sits at screen x = CART_SX.
(function (root) {
  const DT = 1 / 120, L = 30.0;
  const ASPECT = typeof window !== 'undefined' && window.innerWidth ? window.innerHeight / window.innerWidth : 16 / 9;
  const VIEW = { W: 1080, H: Math.round(1080 * Math.max(16 / 9, Math.min(19.5 / 9, ASPECT))) }, W = VIEW.W, H = VIEW.H;
  const GY = Math.round(H * 0.55), CART_SX = 300;                           // ground line (wheel contact) in view px at zoom 1; cart's screen x
  const HINT = 'tap SAW · START · tap cards to fight · upgrade the cart';
  const K = {
    START_MONEY: 120, COST_SAW: 95, COST_CART: 100, COST_ENERGY: 10, CART_HP: 200, ENERGY_ADD: 0.3,
    HP: 400, TIER2_HP: 400, SPD: 250, ACC: 700, STOP: 640, WAKE: 1300, RANGE: 900,
    EN_MAX: 10, EN_RATE: 1.0, COST_BOMB: 2, COST_SAWT: 4, COST_FIRE: 7,
    FIRE_CD: 0.55, BOLT: 120, BOMB: 600, BOMB_R: 200, BOMB_FLIGHT: 0.6, SAWT: 700, SAWT_TOWER: 1100, SAWT_SPD: 700, FIRE_TIME: 2.6, FIRE_DPS: 1500, FIRE_RANGE: 520,
    SAW_DPS: 700, SK_HP: 360, SK_SPD: 120, SK_DPS: 28, SK_REACH: 30, SPAWN_GAP: 0.8, KILL_COIN: 15, TOWER_COIN: 200,
    UP_COST: 250, UP_AUTO: 2.8, SHOP_AUTO: 3.2, HAND_IDLE: 2.5, DEMO_DELAY: 0.6,
    END_AFTER_WIN: 2.0, END_AFTER_LOSE: 1.6, END_MAX: 28, END_NO_INPUT: 15, END_IDLE: 12,
    EN_START: 1.0, AUTO_IDLE: 3.5, AUTO_GAP: 2.4, FIRE_DELAY: 1.3,
  };
  // towers: x in world px, hp, wave size, skeleton hp multiplier
  const TOWERS = [{ x: 1500, hp: 2000, n: 7, m: 1, wake: 1300, gap: 0.8 }, { x: 2300, hp: 3400, n: 10, m: 1.35, wake: 1000, gap: 0.45 }];

  // ---- tap targets in view px (laid out from H, never from 1920): shop cards + START, battle cards + energy panel, upgrade bubble ----
  const R = (x, y, w, h) => ({ x, y, w, h });
  const CY = H - 470;
  const UI = {
    saw: R(540, GY + 60, 190, 170), firelock: R(750, GY + 60, 190, 170),            // shop: item cards next to the cart
    cart: R(120, H - 570, 400, 170), energy: R(560, H - 570, 400, 170), start: R(300, H - 390, 480, 150),
    bomb: R(W - 30 - 3 * 190 - 28, CY, 190, 190), sawt: R(W - 30 - 2 * 190 - 14, CY, 190, 190), fire: R(W - 30 - 190, CY, 190, 190),
    enbar: R(30, CY, 380, 190),                                                      // energy panel (display only)
    bubble: R(CART_SX - 150, GY - 600, 300, 130),                                    // ⬆ price bubble over the archer
  };
  const TAP_PAD = 14;
  const hitUI = (ids, x, y) => ids.find((id) => { const r = UI[id]; return x >= r.x - TAP_PAD && x <= r.x + r.w + TAP_PAD && y >= r.y - TAP_PAD && y <= r.y + r.h + TAP_PAD; });
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const frontOf = (p) => p.x + (p.saw ? 270 : 190);                                  // contact point of the cart (saw tip when fitted)

  function create() {
    return { t: 0, steps: 0, wt0: 0, ev: [], freeze: 0, phase: 'shop', goT: -9, cam: 0, zoom: 1,
      p: { x: 0, v: 0, hp: K.HP, hpMax: K.HP, tier: 1, saw: false, flames: false, fireT: -9, sawT: -9, hurtT: -9 },
      money: K.START_MONEY, earned: 0, en: 0, enRate: K.EN_RATE, enemies: [], nid: 1, kills: 0,
      towers: TOWERS.map((q) => ({ x: q.x, hp: q.hp, hpMax: q.hp, alive: true, deadT: -9, spawned: 0, spawnT: 0, hitT: -9 })), ti: 0, towersDown: 0,
      pend: [], blades: [], fireUntil: -9, fireAcc: 0, used: { bomb: 0, sawt: 0, fire: 0 }, bought: { saw: 0, cart: 0, energy: 0 }, up: null, upDone: 0, upT: -9,
      hint: null, hintT: 0, prog: 0, winT: -9, loseT: -9, end: -1, endWhy: '', lastIn: 0, firstIn: -1, sawEvT: 0 };
  }
  const spawn = (worldT) => Object.assign(create(), { wt0: worldT });
  const respawn = (S, worldT) => spawn(worldT);
  const outOfPlay = () => false;

  const push = (S, e) => { e.t = S.t; S.ev.push(e); };
  const gain = (S, n) => { S.money += n; S.earned += n; };
  const tw = (S) => S.towers[Math.min(S.ti, S.towers.length - 1)];
  const inRange = (S) => S.enemies.filter((e) => !e.dead && e.x > S.p.x && e.x - S.p.x < K.RANGE + 200);

  function hurtEnemy(S, e, d, why) {
    if (e.dead) return;
    e.hp -= d; e.hitT = S.t; push(S, { k: 'dmg', x: e.x, y: 0, v: Math.round(d), why });
    if (e.hp <= 0) { e.dead = true; e.deadT = S.t; S.kills++; gain(S, K.KILL_COIN); push(S, { k: 'kill', x: e.x, id: e.id, coin: K.KILL_COIN, why }); }
  }
  function hurtTower(S, q, d, why, quiet) {
    if (!q.alive) return;
    q.hp -= d; q.hitT = S.t; if (!quiet) push(S, { k: 'dmg', x: q.x - 40, y: 1, v: Math.round(d), why });
    if (q.hp <= 0) {
      q.hp = 0; q.alive = false; q.deadT = S.t; gain(S, K.TOWER_COIN); S.towersDown++; S.freeze = 0.1;
      push(S, { k: 'towerdown', x: q.x, i: S.ti, coin: K.TOWER_COIN });
      for (const e of S.enemies) if (!e.dead && Math.abs(e.x - q.x) < 320) { e.dead = true; e.deadT = S.t; S.kills++; gain(S, K.KILL_COIN); push(S, { k: 'kill', x: e.x, id: e.id, coin: K.KILL_COIN, why: 'rubble' }); }
      if (S.ti === 0) S.up = { t0: S.t + 0.8 }; else S.winT = S.t;
      S.ti++;
    }
  }

  function doUpgrade(S, auto) {
    const pay = Math.min(S.money, K.UP_COST); S.money -= pay; S.upDone = 1; S.upT = S.t; S.freeze = 0.08;
    const p = S.p; p.tier = 2; p.flames = true; p.hpMax += K.TIER2_HP; p.hp = p.hpMax; S.en = Math.max(S.en, K.COST_FIRE);   // the upgrade pays out: FIRE is ready right away
    push(S, { k: 'upgrade', x: p.x, auto: !!auto, cost: pay });
  }
  function useAbility(S, id) {
    const cost = id === 'bomb' ? K.COST_BOMB : id === 'sawt' ? K.COST_SAWT : K.COST_FIRE, p = S.p;
    if (id === 'fire' && p.tier < 2) { push(S, { k: 'locked', id }); return; }
    if (S.en < cost - 1e-6) { push(S, { k: 'nope', id, need: cost }); return; }
    S.en -= cost; S.used[id]++;
    if (id === 'bomb') {
      const cand = inRange(S).filter((e) => e.x > p.x + 250); let bx = null, best = 0;
      for (const e of cand) { const n = cand.filter((o) => Math.abs(o.x - e.x) < K.BOMB_R).length; if (n > best) { best = n; bx = e.x; } }
      const q = tw(S); if (bx === null) bx = q.alive && q.x - p.x < K.RANGE + 300 ? q.x - 70 : p.x + 560;
      S.pend.push({ at: S.t + K.BOMB_FLIGHT, x: bx }); push(S, { k: 'throw', id, x: bx, x0: p.x + 60, flight: K.BOMB_FLIGHT });
    } else if (id === 'sawt') { S.blades.push({ x: p.x + 300, hit: [], t0: S.t }); push(S, { k: 'sawt', x: p.x + 300 }); }
    else { S.fireUntil = S.t + K.FIRE_TIME; push(S, { k: 'fire', x: p.x }); }
  }
  function tap(S, x, y) {
    S.lastIn = S.t; if (S.firstIn < 0) S.firstIn = S.t;
    if (S.phase === 'shop') {
      const id = hitUI(['saw', 'cart', 'energy', 'start', 'firelock'], x, y); if (!id) return;
      if ((id === 'cart' || id === 'energy') && !S.bought.saw) { push(S, { k: 'nope', id, need: 0, msg: 'BUY THE SAW FIRST!' }); return; }
      const buy = (cost, key, fn) => { if (S.bought[key]) return; if (S.money < cost) { push(S, { k: 'nope', id, need: cost - S.money, coin: 1 }); return; }
        S.money -= cost; S.bought[key] = 1; fn(); push(S, { k: 'buy', id, cost }); };
      if (id === 'saw') buy(K.COST_SAW, 'saw', () => { S.p.saw = true; });
      else if (id === 'cart') buy(K.COST_CART, 'cart', () => { S.p.hpMax += K.CART_HP; S.p.hp = S.p.hpMax; });
      else if (id === 'energy') buy(K.COST_ENERGY, 'energy', () => { S.enRate += K.ENERGY_ADD; });
      else if (id === 'firelock') push(S, { k: 'locked', id: 'fire' });
      else if (id === 'start') go(S);
      return;
    }
    const id = hitUI(['bubble', 'bomb', 'sawt', 'fire'], x, y); if (!id) return;
    if (id === 'bubble') { if (S.up && S.t >= S.up.t0 && !S.upDone) { if (S.money >= K.UP_COST) doUpgrade(S, false); else push(S, { k: 'nope', id, need: K.UP_COST - S.money, coin: 1 }); } }
    else useAbility(S, id);
  }
  function go(S) { S.phase = 'battle'; S.goT = S.t; S.en = Math.max(S.en, K.EN_START); push(S, { k: 'go' }); }

  function hintOf(S) {
    if (S.end >= 0 || S.winT > 0 || S.loseT > 0) return null;
    if (S.phase === 'shop') return S.bought.saw ? 'start' : 'saw';
    const ok = (c) => S.en >= c - 1e-6;
    if (S.up && S.t >= S.up.t0 && !S.upDone) return 'bubble';
    if (S.p.tier >= 2 && !S.used.fire && ok(K.COST_FIRE) && S.t - S.upT > K.FIRE_DELAY) return 'fire';
    if (!S.used.bomb && ok(K.COST_BOMB)) return 'bomb';
    if (!S.used.sawt && ok(K.COST_SAWT)) return 'sawt';
    if (S.p.tier >= 2 && !S.used.fire) return null;                                   // save energy for the big FIRE moment
    if (S.t - S.lastIn > K.HAND_IDLE) return S.p.tier >= 2 && ok(K.COST_FIRE) ? 'fire' : ok(K.COST_SAWT) ? 'sawt' : ok(K.COST_BOMB) ? 'bomb' : null;
    return null;
  }

  function step(S, inp) {
    const t = S.t + DT; S.t = t; S.steps++;
    if (S.ev.length > 220) S.ev.splice(0, S.ev.length - 220);
    if (S.freeze > 0) { S.freeze -= DT; return S; }
    const p = S.p;
    if (inp.click && inp.px !== undefined && S.end < 0) tap(S, inp.px, inp.py);
    if (S.phase === 'shop' && S.end < 0 && t - S.lastIn > K.SHOP_AUTO) go(S);          // a passive viewer still sees the world move

    if (S.phase === 'battle') {
      if (S.end < 0) S.en = Math.min(K.EN_MAX, S.en + S.enRate * DT);
      const q = tw(S), front = frontOf(p), live = S.enemies.filter((e) => !e.dead);
      // ---- cart: rolls right, stops for a skeleton in contact or a tower in range; keeps rolling (victory lap) after the last tower ----
      const blocked = S.end < 0 && (live.some((e) => e.x - front < K.SK_REACH + 10) || (q.alive && q.x - p.x < K.STOP));
      const tv = S.end >= 0 && S.endWhy !== 'win' ? 0 : blocked ? 0 : K.SPD;
      p.v += clamp(tv - p.v, -K.ACC * 1.6 * DT, K.ACC * DT); p.x += p.v * DT;
      // ---- waves: a woken tower sends skeletons out one by one ----
      for (let i = 0; i < S.towers.length; i++) { const w = S.towers[i], c = TOWERS[i];
        if (!w.alive || S.end >= 0 || p.x < w.x - c.wake || w.spawned >= c.n || t < w.spawnT) continue;
        w.spawned++; w.spawnT = t + c.gap; const hp = Math.round(K.SK_HP * c.m);
        S.enemies.push({ id: S.nid++, x: w.x - 70, hp, hpMax: hp, dead: false, deadT: -9, hitT: -9, t0: t }); push(S, { k: 'spawn', x: w.x - 70, tower: i }); }
      // ---- skeletons: walk at the cart; the saw grinds whatever touches it, survivors chew on the cart ----
      for (const e of S.enemies) { if (e.dead) continue;
        if (e.x - front > K.SK_REACH) { e.x -= K.SK_SPD * DT; continue; }
        if (p.saw) { hurtEnemyQuiet(S, e, K.SAW_DPS * DT); p.sawT = t; if (t - S.sawEvT > 0.12) { S.sawEvT = t; push(S, { k: 'sawhit', x: e.x }); } }
        if (!e.dead && S.end < 0) { p.hp -= K.SK_DPS * DT; if (t - p.hurtT > 0.45) { p.hurtT = t; push(S, { k: 'hurt', x: p.x + 100 }); } } }
      if (p.hp <= 0 && S.loseT < 0 && S.winT < 0) { p.hp = 0; S.loseT = t; push(S, { k: 'wreck', x: p.x }); }
      // ---- archer: nearest skeleton in range, else the tower ----
      const cd = K.FIRE_CD * (p.tier >= 2 ? 0.8 : 1);
      if (S.end < 0 && S.loseT < 0 && t - p.fireT >= cd) {
        const tgt = live.filter((e) => e.x > p.x && e.x - p.x < K.RANGE).sort((a, b) => a.x - b.x)[0];
        if (tgt) { p.fireT = t; push(S, { k: 'bolt', x: p.x + 60, tx: tgt.x, id: tgt.id }); hurtEnemy(S, tgt, K.BOLT, 'bolt'); }
        else if (q.alive && q.x - 110 - p.x < K.RANGE) { p.fireT = t; push(S, { k: 'bolt', x: p.x + 60, tx: q.x - 110, tower: 1 }); hurtTower(S, q, K.BOLT, 'bolt'); }
      }
      // ---- pending bombs, rolling saw blades, flamethrowers ----
      for (const b of S.pend) if (t >= b.at && !b.done) { b.done = 1; push(S, { k: 'boom', x: b.x, r: K.BOMB_R });
        for (const e of S.enemies) if (!e.dead && Math.abs(e.x - b.x) < K.BOMB_R) hurtEnemy(S, e, K.BOMB, 'bomb');
        const w = tw(S); if (w.alive && Math.abs(w.x - b.x) < K.BOMB_R + 110) hurtTower(S, w, K.BOMB, 'bomb'); }
      S.pend = S.pend.filter((b) => !b.done);
      for (const b of S.blades) { b.x += K.SAWT_SPD * DT;
        for (const e of S.enemies) if (!e.dead && !b.hit.includes(e.id) && Math.abs(e.x - b.x) < 50) { b.hit.push(e.id); hurtEnemy(S, e, K.SAWT, 'sawt'); }
        const w = tw(S); if (w.alive && b.x >= w.x - 100) { b.dead = 1; push(S, { k: 'sawimpact', x: w.x - 100 }); hurtTower(S, w, K.SAWT_TOWER, 'sawt'); }
        if (b.x > p.x + 1900) b.dead = 1; }
      S.blades = S.blades.filter((b) => !b.dead);
      if (t < S.fireUntil && S.end < 0) { const x0 = p.x + 280, x1 = x0 + K.FIRE_RANGE; S.fireAcc += DT;
        for (const e of S.enemies) if (!e.dead && e.x > x0 && e.x < x1) hurtEnemyQuiet(S, e, K.FIRE_DPS * DT);
        const w = tw(S); if (w.alive && w.x - 110 < x1) { S.fireSum = (S.fireSum || 0) + K.FIRE_DPS * DT; hurtTower(S, w, K.FIRE_DPS * DT, 'fire', true); }
        if (S.fireAcc >= 0.3) { if (S.fireSum > 0 && w.alive) push(S, { k: 'dmg', x: w.x - 40, y: 1, v: Math.round(S.fireSum), why: 'fire' }); S.fireAcc = 0; S.fireSum = 0; } }
      // ---- idle viewers: after a few quiet seconds the cart casts for them (ghost tap on the card) so a passive viewer still sees the wow ----
      if (S.end < 0 && S.loseT < 0 && S.winT < 0 && t - Math.max(S.lastIn, S.goT) > K.AUTO_IDLE && t - (S.autoT || -9) > K.AUTO_GAP) {
        const pick = p.tier >= 2 && S.en >= K.COST_FIRE && usable(S, 'fire') ? 'fire' : S.en >= K.COST_SAWT && usable(S, 'sawt') ? 'sawt' : S.en >= K.COST_BOMB && usable(S, 'bomb') ? 'bomb' : null;
        if (pick) { S.autoT = t; push(S, { k: 'autotap', id: pick }); useAbility(S, pick); } }
      // ---- upgrade offer: bubble over the cart; auto-taken after a moment so a passive viewer still sees the transformation ----
      if (S.up && !S.upDone && t - S.up.t0 > K.UP_AUTO) doUpgrade(S, true);
      if (S.up && !S.up.said && t >= S.up.t0) { S.up.said = 1; push(S, { k: 'upoffer', x: p.x, cost: K.UP_COST }); }
    }
    { const i = Math.min(S.ti, S.towers.length - 1), c = TOWERS[i], from = i ? TOWERS[i - 1].x - K.STOP : 0, seg = clamp((p.x - from) / (c.x - K.STOP - from), 0, 1), dmg = S.towers[i].alive ? 1 - S.towers[i].hp / S.towers[i].hpMax : 1;
      S.prog = S.winT > 0 ? 1 : clamp((S.towersDown + (i === S.ti ? 0.5 * seg + 0.5 * dmg : 0)) / S.towers.length, 0, 1); }

    // ---- endcard: after the win/lose beat, or when the time box runs out ----
    const why = S.winT > 0 && t - S.winT > K.END_AFTER_WIN ? 'win' : S.loseT > 0 && t - S.loseT > K.END_AFTER_LOSE ? 'lose'
      : S.firstIn >= 0 && t - S.firstIn > K.END_MAX ? 'time' : S.firstIn < 0 && t > K.END_NO_INPUT ? 'time' : S.firstIn >= 0 && t - S.lastIn > K.END_IDLE ? 'time' : '';
    if (S.end < 0 && why) { S.end = t; S.endWhy = why; push(S, { k: 'end', x: p.x }); }

    // ---- hint (which card the hand points at), camera ----
    const h = hintOf(S); if (h !== S.hint) { S.hint = h; S.hintT = t; }
    S.zoom += ((p.tier >= 2 ? 0.86 : 1) - S.zoom) * Math.min(1, 1.6 * DT); S.cam = p.x;
    return S;
  }
  // damage without the floating number (continuous sources: saw contact, fire)
  function hurtEnemyQuiet(S, e, d) {
    e.hp -= d; e.hitT = S.t;
    if (e.hp <= 0 && !e.dead) { e.dead = true; e.deadT = S.t; S.kills++; gain(S, K.KILL_COIN); push(S, { k: 'kill', x: e.x, id: e.id, coin: K.KILL_COIN, why: 'grind' }); }
  }

  // ---- attract demo: a planner that taps like a good player — it clicks whatever the hand points at once it makes sense ----
  const usable = (S, id) => {
    const live = inRange(S), q = tw(S), tIn = q.alive && q.x - 110 - S.p.x < K.RANGE;
    if (id === 'bomb') return live.some((e) => live.filter((o) => Math.abs(o.x - e.x) < K.BOMB_R).length >= 2) || (tIn && live.length === 0);
    if (id === 'sawt') return tIn || live.length >= 3;
    if (id === 'fire') return S.t - S.upT > K.FIRE_DELAY && live.length >= 2 || (q.alive && q.x - 110 - S.p.x < K.FIRE_RANGE + 130);
    return true;
  };
  const scriptInput = (t, S) => {
    const inp = { left: 0, right: 0, up: 0, down: 0, jump: 0, act: 0, click: 0, press: 0, px: W / 2, py: H / 2 };
    let id = S.hint; if (S.end >= 0 || t < 1.0) return inp;
    if (id) { const r = UI[id]; inp.px = r.x + r.w / 2; inp.py = r.y + r.h / 2;
      if (t - S.hintT > K.DEMO_DELAY && (id === 'start' || id === 'saw' || id === 'bubble' ? (id !== 'bubble' || S.money >= K.UP_COST) : usable(S, id))) inp.click = 1; }
    else if (S.phase === 'battle' && t - S.lastIn > 0.9) {                             // spare energy: keep fighting like a player would
      const pick = S.p.tier >= 2 && !S.used.fire ? (S.en >= K.COST_FIRE && usable(S, 'fire') ? 'fire' : null) : (S.p.tier >= 2 && S.en >= K.COST_FIRE && usable(S, 'fire')) ? 'fire' : S.en >= K.COST_SAWT && usable(S, 'sawt') ? 'sawt' : S.en >= K.COST_BOMB + 3 && usable(S, 'bomb') ? 'bomb' : null;
      if (pick) { const r = UI[pick]; inp.px = r.x + r.w / 2; inp.py = r.y + r.h / 2; inp.click = 1; } }
    return inp;
  };
  let cache = null;
  function at(t) {
    const loop = Math.floor(t / L), q = t - loop * L, n = Math.round(q / DT);
    if (!cache || cache.loop !== loop || cache.S.steps > n) { const S0 = Object.assign(create(), { wt0: loop * L }); cache = { loop, S: S0 }; }
    const S = cache.S; while (S.steps < n) step(S, scriptInput(S.t, S));
    return Object.assign({}, S, { loop, q, demo: true, inp: scriptInput(S.t, S) });
  }
  // the demo must hit every beat of the ad inside its loop
  const demoCheck = (S) => { const fails = [];
    if (S.p.tier < 2) fails.push('cart never transformed'); if (S.towersDown < 1) fails.push('tower 1 never fell'); if (!(S.winT > 0)) fails.push('tower 2 never fell');
    if (!S.p.saw) fails.push('saw never bought'); if (S.used.bomb < 1 || S.used.sawt < 1 || S.used.fire < 1) fails.push('not all abilities used: ' + JSON.stringify(S.used));
    if (S.endWhy !== 'win') fails.push('demo ended by ' + S.endWhy); if (S.end < 0 || S.end > L - 3) fails.push('endcard late: ' + S.end.toFixed(1));
    return fails; };

  root.SIM = { DT, L, K, VIEW, HINT, GY, CART_SX, UI, TOWERS, create, spawn, respawn, outOfPlay, step, at, scriptInput, demoCheck, frontOf, tw };
  if (typeof module !== 'undefined') module.exports = root.SIM;
})(typeof window !== 'undefined' ? window : globalThis);
