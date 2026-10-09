// perf_probe.mjs — draw calls per frame at the busiest demo beats of a built playable: node tools/perf_probe.mjs [dist/default/preview.html]
import { createRequire } from 'node:module'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
const file = path.resolve(process.argv[2] || 'dist/default/preview.html');
const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
await p.goto(pathToFileURL(file).href); await p.waitForFunction(() => window.__ready, null, { timeout: 20000 });
const out = [];
for (const t of [1, 4, 7.5, 9.5, 12.5, 14, 16]) {
  const r = await p.evaluate((t) => { SCENE.state = SIM.at(t); G.stats.draws = 0; SCENE.render(t); return { draws: G.stats.draws, events: SCENE.state.ev.length }; }, t);
  out.push(`t=${t}s draws=${r.draws}`);
}
console.log(out.join('  ')); await b.close();
