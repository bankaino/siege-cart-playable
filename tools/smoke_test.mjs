// smoke_test.mjs — plays a built single-file playable headless, like a QA tester on a phone would.
//   node tools/smoke_test.mjs [dist/default/applovin.html] [--shots dir]
// Mobile viewport + touch, a stub MRAID container that records mraid.open, taps (SAW, START, ability cards), a tap
// on the persistent CTA. Fails (exit 1) on: page errors, any network request other than mraid.js, no coins earned,
// CTA not reaching mraid.open, fps below 50.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { pathToFileURL } from 'node:url';
const req = createRequire(import.meta.url);
const { chromium } = req(process.env.PLAYWRIGHT || 'playwright');
const file = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'dist/default/applovin.html');
const si = process.argv.indexOf('--shots'), shots = si > 0 ? process.argv[si + 1] : 'frames/smoke'; fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [], external = [];
ctx.on('request', (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('file:')) external.push(u); });
await ctx.route('**/mraid.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: `
  window.mraid = { _l: {}, opened: [], getState: () => 'default', isViewable: () => true,
    addEventListener(k, f) { (this._l[k] = this._l[k] || []).push(f); }, open(u) { this.opened.push(u); } };` }));
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(pathToFileURL(file).href);
try { await p.waitForFunction(() => window.__ready, null, { timeout: 20000 }); }
catch (e) { console.log(JSON.stringify({ file: path.basename(file), fails: ['did not boot: ' + (errors.join(' | ') || e.message)] })); await browser.close(); process.exit(1); }
await p.waitForTimeout(600); await p.screenshot({ path: path.join(shots, '0_start.png') });
const box = await p.locator('canvas').boundingBox(), VIEW = await p.evaluate(() => SIM.VIEW);
const V = (x, y) => [box.x + x / VIEW.W * box.width, box.y + y / VIEW.H * box.height];
// taps like a player: SAW → START → wait for energy → BOMB, SAW-THROW (UI rects come from SIM.UI, so layout changes never break the test)
const UI = await p.evaluate(() => SIM.UI);
const tapUI = async (id) => { const r = UI[id], [x, y] = V(r.x + r.w / 2, r.y + r.h / 2); await p.mouse.click(x, y); };
await tapUI('saw'); await p.waitForTimeout(700); await tapUI('start'); await p.waitForTimeout(4200);
await p.screenshot({ path: path.join(shots, '1_battle.png') });
await tapUI('bomb'); await p.waitForTimeout(600); await tapUI('sawt'); await p.waitForTimeout(1500);
await p.screenshot({ path: path.join(shots, '1b_abilities.png') });
const st = await p.evaluate(() => SCENE.state && { earned: SCENE.state.earned, saw: SCENE.state.p.saw, phase: SCENE.state.phase, used: SCENE.state.used, kills: SCENE.state.kills });
const money = st && st.earned;
const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
// tap the always-visible CTA
const cta = await p.evaluate(() => (SCENE.hit || []).find((b) => b.id === 'cta'));
if (cta) { const [cx, cy] = V(cta.x + cta.w / 2, cta.y + cta.h / 2); await p.mouse.click(cx, cy); }
const opened = await p.evaluate(() => (window.mraid && window.mraid.opened) || []);
await p.screenshot({ path: path.join(shots, '2_after_cta.png') });
await browser.close();
const fails = [];
if (errors.length) fails.push('page errors: ' + errors.join(' | '));
const ext = external.filter((u) => !u.endsWith('/mraid.js')); if (ext.length) fails.push('external requests: ' + ext.join(', '));
if (!(st && st.saw && st.phase === 'battle')) fails.push('shop taps did not work: ' + JSON.stringify(st));
if (!(money > 0)) fails.push('no coins earned in battle (earned=' + money + ')');
if (!(st && st.used.bomb + st.used.sawt > 0)) fails.push('ability cards did not respond: ' + JSON.stringify(st && st.used));
if (!opened.length) fails.push('CTA did not call mraid.open');
if (fps < 50) fails.push('fps ' + fps);
console.log(JSON.stringify({ file: path.basename(file), view: VIEW, money, fps, cta: opened[0] || null, fails }));
process.exit(fails.length ? 1 : 0);
