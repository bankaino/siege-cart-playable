# Siege Cart — playable ad, idea → shippable HTML5 in one working day

A 17-second, one-finger **playable ad** for a fictional casual game: build a war cart, roll out, tap energy cards, topple two skeleton towers, watch the cart transform, hit the store button. Built end-to-end with AI tools as a portfolio case for **playable-ads / creative-automation** work.

**Play it:** `docs/index.html` (GitHub Pages: control build) · A/B builds: `combat_first.html`, `fast_energy.html`, `rich_start.html`, `cta_copy.html`.
Single-file builds for **AppLovin · Unity Ads · ironSource · Mintegral · Google (zip) · Meta** come from `python tools/build_playable.py --variant all` (`dist/<variant>/…`, gitignored).

| | |
|---|---|
| Size | **0.50 MB** per network (limits: 5 MB, Meta 2 MB; Google zip 0.32 MB). Code 104 KB + 25 textures 283 KB (15.8 MB of AI source PNGs → WebP at the drawn size) |
| Runtime | WebGL2, no engine, no external requests except `mraid.js` / `exitapi.js` (smoke test fails on anything else) |
| Perf | 60 fps in the headless phone-viewport smoke test (390×844 @2x). ~150–300 draw calls/frame (HUD shapes are not batched yet — see Known gaps) |
| Length | good player: first kill 4.0 s, tower 1 at 9.5 s, cart transformation 11.0 s, FIRE 12.9 s, victory + endcard 16.8 s. A viewer who does not tap the cards **loses** (cart wrecked at ~9–11 s → "SO CLOSE!" endcard with the store button) |

## What the case demonstrates
- **Reference → playable**: the reference is a 3D "cart vs skeletons" ad (5 frames). I read its loop (shop → auto-battle with energy cards → boss tower → upgrade) and rebuilt a *new* game from it — own name, own art, own tuning (nothing from the reference ships; its frames are not in this repo).
- **AI toolchain**: Claude Code orchestrates; image generation runs through Codex (ChatGPT plan, 19 generated images → 25 sprites, ~100 s each, 0 re-rolls on the main set because prompts are orientation-explicit: "side view facing right, flat bottom edge, wheels separate"); sprites are **rigged in code** (wheels roll with distance, saw spins faster in contact, skeleton legs swing around the hip, crates pop with overshoot, tower squashes when it falls) so animation costs 0 bytes. Sound is procedural WebAudio (0 bytes).
- **Hypotheses, not one perfect creative**: five builds from one codebase, one variable each (see below).
- **Network readiness**: MRAID / DAPI / `window.install` / `FbPlayableAd` / ExitApi adapters, `gameReady`/`gameEnd`, audio mute on viewability, size report per build.
- **Automation**: `tools/` has the build, a viewer-policy balance printer (`policies.js`), a phone-viewport **smoke test** (taps SAW → START → BOMB → SAW-THROW → CTA; fails on page errors, external requests, no progress, low fps), a headless **timeline** printer for tuning (`node tools/timeline.js`), a draw-call probe, and a prompt generator (`tools/write_prompts.py` → `art/prompts/*.txt` + `art/jobs.json`). `verify.sh` (in the skill) is the definition of "works": syntax, demo beats, passive viewer reaches the endcard, HUD overlap QA on 11 staged screens, build for every network, smoke test.
- **Independent critics**: three Sonnet sub-agents reviewed the work at gates (`study/critique/*.md`) with measured evidence; their fixes are logged in `study/PLAN.md`.

## Ad design (why it is shaped like this)
Instruction → gameplay → endcard, ≤ 30 s, one tap at a time, medium difficulty.

| t | beat |
|---|---|
| 0–3 s | static shop with a pointing hand: tap SAW (95), tap START. Idle for 3.2 s → auto-start so the world always moves |
| 3–8 s | first skeletons, archer fires by itself, energy card lights up → first BOMB, coins fly into the HUD pill (first reward ≤ 8 s) |
| ~9.5 s | wow 1: SAW-THROW topples tower 1 (stone chunks, dust, coin shower, flag turns red) |
| ~11 s | wow 2: ⬆ 250 bubble over the cart → cart grows two crate tiers + flamethrowers, FIRE unlocks and is *paid for* (energy gift) |
| 13–17 s | FIRE cone melts the wave, tower 2 falls → endcard (whole screen = store, REPLAY small) |

Rules baked into `live/sim.js`: store button visible the whole time; every tap either does something or answers ("NEED 95 COINS", "NOT ENOUGH ENERGY", "BUY THE SAW FIRST!"); taps on empty space never count as input (can't freeze the shop or the endcard timer); the game is **not** self-playing: the cart rolls and the archer shoots, but without BOMB / SAW-THROW / the ⬆ upgrade / FIRE the skeleton waves wreck the cart (`node tools/policies.js` prints what each kind of viewer gets: no taps → lose ~10 s, fast and average tappers win with some HP lost, a 4 s-reaction player loses); the hand keeps pointing at the next useful card; idle endings wait until the transformation/FIRE has played; absolute cap 26 s; losing also ends on the CTA ("SO CLOSE!"). The idle auto-cast / auto-upgrade still exist as `K.AUTO_IDLE` / `K.UP_AUTO` (disabled).

## A/B hypotheses (`variants/*.json`, one variable each)
| build | variable | hypothesis / expected metric |
|---|---|---|
| `default` | — | control |
| `combat_first` | skip shop (SAW pre-bought, cart already rolling) | first kill 4.0 → 2.4 s; tests opening in combat vs the build fantasy → 3 s tap-rate, completion |
| `fast_energy` | energy fill 1.0 → 1.8 /s | card ready ~every second, wow ~2.5 s earlier → taps/session, completion |
| `rich_start` | start coins 120 → 215 | SAW **and** CART+ before START, no 120-coin dead end → 3 s tap-rate, CTR |
| `cta_copy` | store button + endcard copy ("INSTALL", "CRUSH THEM ALL!") | isolates CTA text → CTR |

Each variant is verified against the demo planner (`SIM.demoCheck`) and the passive-viewer rule before it is built.

## Differences from the reference / honest notes
- Same genre and camera as the reference, **different** game: own brand, own cart/archer/skeleton/tower art, own economy; the hero and pines are generated, not extracted.
- The reference is real 3D; this is **2.5D**: painted AI sprites with baked soft shading, rigged in 2D. A Unity/Luna Playworks port is a separate step (the sim is deterministic and engine-free, so mechanics and timings port 1:1).
- Store links point to this repo (`tools/build.json`) because there is no real store listing — replace them with `market://` / App Store URLs for a real network test.
- Mechanics shown are the ones the game would have (shop, energy cards, towers, upgrade); nothing is promised that a real game wouldn't deliver.

## Known gaps / next steps
- **Draw calls**: ~150–300 per frame at the busiest beats (every HUD `rrect`/`solid` is a draw). Batching HUD shapes and label quads is the first optimisation for low-end Android; no real-device run yet.
- bg_mountains tiles with a slight colour step at the seam; ground is a code gradient (no generated ground texture).
- No Pangle / TikTok / Liftoff adapters; no `document.hidden` audio pause (MRAID viewability is handled).
- Needs a real-device pass and a real network preview (AppLovin/Unity previewers).

## Repo map
```
live/      engine (gl.js, lib.js, batch.js) + game: sim.js (deterministic 120 Hz sim, tap input, demo planner), scene.js (rigs, FX, HUD), audio.js
tools/     build_playable.py (all networks + size report), smoke_test.mjs, timeline.js, perf_probe.mjs, write_prompts.py
variants/  A/B overrides of SIM.K (+ optional copy)
art/       style_bible.txt, prompts/, jobs.json, gen/ (AI source images)
study/     PLAN.md (decisions, phase log with measured numbers), critique/ (3 independent reviews)
docs/      GitHub Pages previews of every variant
```
Run locally: `python -m http.server` in the repo root → `/live/index.html?ad=1` (hot-reload dev page) or open `docs/index.html`.

Built with Claude Code (Opus for planning, Sonnet for execution) on the `ref2playable` skill; art by Codex image generation.
