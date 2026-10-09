// timeline.js — prints the demo's event times (headless tuning): node tools/timeline.js [variant.json]
const S = require('../live/sim.js');
const s = S.at(S.L - 0.01); const seen = {};
const rows = []; for (const e of s.ev) { if (['dmg', 'bolt', 'sawhit', 'hurt'].includes(e.k)) continue; rows.push(e.t.toFixed(1) + ' ' + e.k + (e.id ? ':' + e.id : '')); }
console.log(rows.join(' | ')); console.log('end', s.end.toFixed(1), s.endWhy, 'money', Math.round(s.money), 'hp', Math.round(s.p.hp), 'kills', s.kills, 'used', JSON.stringify(s.used), 'fails', S.demoCheck(s));
