// policies.js — what different viewers experience (headless): node tools/policies.js [variant]. Balance goal: no card taps → the cart loses; the attract demo wins.
const S = require('../live/sim.js'); const fs = require('fs');
const v = process.argv[2]; if (v) Object.assign(S.K, JSON.parse(fs.readFileSync('variants/' + v + '.json', 'utf8')).K || {});
const tap = (id) => ({ click: 1, px: S.UI[id].x + S.UI[id].w / 2, py: S.UI[id].y + S.UI[id].h / 2 });
function run(name, f, T = 40) { const p = S.spawn(0); let minHp = 1e9;
  for (let i = 0; i < T * 120; i++) { S.step(p, f(p) || {}); minHp = Math.min(minHp, p.p.hp); if (p.end >= 0 && p.t > p.end + 0.05) break; }
  console.log(name.padEnd(26), 'end', p.end.toFixed(1).padStart(5), (p.endWhy || '-').padEnd(5), 'towers', p.towersDown, 'tier', p.p.tier, 'kills', String(p.kills).padStart(2), 'minHP', String(Math.round(minHp)).padStart(4), 'used', JSON.stringify(p.used)); }
let once = {};
run('no taps at all', () => null);
run('SAW+START, then nothing', (p) => { if (p.t > 0.5 && !once.a) { once.a = 1; return tap('saw'); } if (p.t > 1 && !once.b) { once.b = 1; return tap('start'); } });
once = {};
run('SAW+START + 1 bomb only', (p) => { if (p.t > 0.5 && !once.a) { once.a = 1; return tap('saw'); } if (p.t > 1 && !once.b) { once.b = 1; return tap('start'); } if (p.phase === 'battle' && p.en >= 2 && !once.c) { once.c = 1; return tap('bomb'); } });
const demo = S.at(S.L - 0.01); console.log('attract demo'.padEnd(26), 'end', demo.end.toFixed(1).padStart(5), demo.endWhy.padEnd(5), 'towers', demo.towersDown, 'tier', demo.p.tier, 'kills', String(demo.kills).padStart(2), 'used', JSON.stringify(demo.used), S.demoCheck(demo).join(';') || 'demoCheck ok');
// humans: greedy tapper with a reaction delay (taps every ready card / upgrade bubble, FIRE first)
function human(name, delay, start = 1) { const st = { last: -9 };
  run(name, (p) => { if (p.t < start) return; if (!p.bought.saw) return tap('saw'); if (p.phase === 'shop') return tap('start');
    if (p.t - st.last < delay) return; if (p.up && p.t >= p.up.t0 && !p.upDone && p.money >= S.K.UP_COST) { st.last = p.t; return tap('bubble'); }
    const id = p.p.tier >= 2 && p.en >= S.K.COST_FIRE ? 'fire' : p.en >= S.K.COST_SAWT ? 'sawt' : p.en >= S.K.COST_BOMB ? 'bomb' : null; if (id) { st.last = p.t; return tap(id); } }); }
human('human fast (0.7 s)', 0.7); human('human average (1.5 s)', 1.5); human('human slow (2.5 s)', 2.5); human('human very slow (4 s)', 4);
