# SIEGE CART — playable ad plan (state file: keep it current, tick boxes as you go)

Skill: `ref2playable` (`<S>` = ~/.claude/skills/ref2playable, `<R>` = ~/.claude/skills/ref2game/scripts).
Read `<S>/SKILL.md` + `<S>/references/ad-rules.md` once per session. Nothing else from ref2game unless stuck
(`animation.md` only for the skeleton walk rig). Always: `export PYTHONUTF8=1 PLAYWRIGHT=<R>/node_modules/playwright`.
Reference: study/ref/1–5 (a 3D side-view "cart vs skeletons" game, logo "Kingdom Clash" — NEVER reproduce its name/logo).

## Decisions (user, 2026-10-09)
- Mechanic: HYBRID — 1-tap shop → auto battle with tap ability cards → cart transforms → endcard.
- Own brand "SIEGE CART" (logo text drawn in code on a blank shield). Same genre and camera, own palette details.
- HTML5 2.5D via ref2playable (painted AI sprites with soft 3D-render shading), single file, all networks.
- Own git repo in this folder + public GitHub repo + Pages demo (like timber-rush-playable). study/ref, frames/ gitignored.

## Game (portrait 1080×H, fixed SIDE VIEW, camera follows cart at x ≈ 28 % of screen, parallax bg)
Phase SHOP (still world, archer idles on the cart, start coins 120):
  cards on/near the cart: SAW 95 (hand points here), CART+ 100, FIRE 250 (greyed "locked" — desire), big START.
  tap SAW → saw bolts onto cart front (squash, sparks, clank, coins fly OUT of the pill) → hand moves to START.
  tap START → "GO!" → battle. Idle in shop 3 s → auto-START (world must move before input).
Phase BATTLE (cart drives right by itself; slows/stops while enemies touch it):
  archer auto-fires crossbow bolts at nearest enemy (damage numbers "-229"); saw grinds contacting enemies (sparks).
  ENERGY panel bottom-left (big number, fills K.EN_RATE/s). Cards bottom-right: BOMB 2⚡, SAW-THROW 4⚡, FIRE 7⚡
  (FIRE locked until transformation). Card = blue when affordable, grey when not (as in ref). Hand points at the
  first affordable card the first time.
  BOMB: archer lobs a bomb in an arc to the densest cluster → AoE, bones/skulls fly, coin burst.
  SAW-THROW: a big saw blade rolls along the ground through enemies (pierce) and hits the tower.
  FIRE: two flamethrowers on the cart blast a cone for 2 s (particles in code), huge DPS.
  Enemies: skeleton swordsmen walk out of a stone tower; HP bar over each; death = parts scatter + coins → HUD.
  Tower 1 HP "2.0K": destroyed → stone chunks fly, coin shower, flag on the top progress bar turns red.
  TRANSFORM (wow): after tower 1 an upgrade bubble "⬆ 250" floats over the cart (price ON the thing); tap (or auto
  after 2 s) → cart grows 2 crate tiers + 2 flamethrowers bolt on, zoom-out, FIRE card unlocks + hand on it.
  Tower 2 (bigger, more skeletons) → FIRE → collapse → VICTORY → endcard.
  Cart has a green HP bar; HP 0 → endWhy 'lose' ("SO CLOSE! UPGRADE YOUR CART") — no hard fail otherwise.
HUD (lay out from H, never 1920): top-left logo shield, top-right 5-flag progress bar, coin pill under it;
  bottom-up: persistent thin CTA bar "PLAY FREE" (≈110 px) → energy panel + cards row above it.
Endcard: headline by endWhy (win "YOU CRUSHED IT!", lose "SO CLOSE!", time "BUILD THE ULTIMATE CART"), mascot
  (archer + tall cart), stat = coins earned, whole screen = CTA, small replay.

## Beats (target seconds from first input; demo planner must hit them — demoCheck)
| t | beat |
|---|---|
| 0–0.6 | still, hand appears on SAW, line "TAP TO BUILD YOUR CART" |
| ~1.5 | SAW bought (juice) · ~2.5 START → cart rolls |
| 3–8 | first skeletons, archer kills, energy 2 → BOMB with hand → first coin burst (first reward ≤ 8 s) |
| 8–12 | tower 1 reached, SAW-THROW → tower 1 collapses (wow 1) |
| 12–14 | ⬆ 250 bubble → cart transforms, FIRE unlocks (wow 2) |
| 14–20 | wave + tower 2, FIRE → collapse → VICTORY |
| ≤ 22 | endcard (win). END_MAX 28 s, no input 12 s → end, idle 10 s after play → end |

## Template: KEEP (generic) vs REPLACE (game)
KEEP: engine (gl/lib/batch), ad mode in live/index.html, audio.js structure, scene HUD blocks (money pill + coins
  fly-to-HUD, callouts pop(), tutorial hand + line, persistent CTA bar, endcard, S.hit, S.QA()), build_playable.py,
  variants mechanism, verify.sh contract (create/step/at/spawn/demoCheck, S.ev, S.end/endWhy, S.firstIn/lastIn, S.money, VIEW).
REPLACE: sim.js world (side-view: cart x, enemies list, towers, projectiles, energy, phase 'shop'|'battle'),
  input = TAP on press edge (`inp.press && !S.prevPress`) hit-tested against `SIM.UI` rects (defined in sim.js from
  VIEW so scene + smoke test share them); scriptInput = taps at planned times; demoCheck = beats above.
  scene.js world drawing (sky gradient in code, parallax bg_mountains + pines, tiled ground, cart rig, skeleton rig,
  FX particles via BATCH). Remove joystick ring/guide arrow if unused (keep edge marker for the next tower).
  tools/smoke_test.mjs: replace the drag with taps: SAW → START → wait 4 s → tap each card; check `S.earned > 0`
  (buying spends money), then tap CTA. tools/build.json: title, textures below, store links (placeholders ok).
  live/sizes.js: sizes below. Delete template assets not used (tree_*, harvester*, rival*, trailer*, stump, log).

## Assets (name → max px, alpha|lossy) — side view, 3/4 light from upper-left, stylized casual 3D-render look
bg_mountains 1024 alpha (wide tileable cliffs strip) · pine sheet → pine_0..2 256 alpha · ground_tex 512 lossy (grass,
tileable horizontally) · cart_body 560 alpha (wooden crate wagon, NO wheels) · wheel 160 alpha (flat side view, perfect
circle, centered — rotated in code) · crate_tier 420 alpha (one stackable crate block) · saw_blade 220 alpha (circle,
centered) · flamethrower 220 alpha · archer 380 alpha (blue hood + cape, aiming crossbow RIGHT) · skeleton parts sheet →
skel_body 260 + skel_leg 120 (legs swung in code) · debris sheet → skull, bone, sword 96 alpha · tower 620 alpha (stone
watchtower, wooden spikes) · rubble sheet → rock_0..2 160 alpha · bomb 128 alpha · coin 144 (template prompt) · hand 272
(template) · logo_shield 360 alpha (blank gold-rimmed shield, NO text) · bolt 96 alpha (energy icon) · mascot 620 alpha.
Card frames, bars, numbers, fire/explosion/sparks = code.

## Phases (one Sonnet session each; tick and note results here)
- [x] 0. Questions answered, project created on placeholders (new.py), refs in study/ref.
- [x] 1. GIT first: `git init -b main`, .gitignore (study/ref, frames, art/raw, art/logs, dist), author set per repo
      (`git config user.name Artem`, `user.email 208152625+bankaino@users.noreply.github.com`), commit "scaffold".
      SIM: rewrite sim.js to the game above with placeholders; headless tuning (`SIM.at`) until demoCheck passes;
      passive endcard ≤ 12 s; adapt smoke_test.mjs taps. `verify.sh` green. Commit.
- [x] 2. SCENE: side-view world + rigs + HUD layout + cards/energy/progress bar + juice per verb (instant/short/long) +
      sounds in audio.js (clank, bow twang, bomb boom, saw whirr, fire roar, coin). `verify.sh` green. Commit.
- [x] 3. ART (Gate A): art/style_bible.txt (≤ 6 lines, measured from study/ref) → one prompt per asset in art/prompts/
      (see `<S>/template/prompts` as examples) → art/jobs.json → `python <S>/scripts/gen_batch.py art/jobs.json`
      (background) → slice sheets → one contact sheet, reject wrong camera at once → stills + Sonnet critic (critic-brief.md).
- [x] 4. FEEL (Gate B): apply critic top fixes (max 2 rounds), 60 fps on 390×844, `verify.sh all` green.
- [x] 5. VARIANTS + DELIVERY: variants/ (short_loop: tower 1 only, fast energy; power_fantasy: FIRE from start;
      tight_timebox: END_MAX 20) → `python tools/build_playable.py --variant all` → dist/*/report.md.
- [ ] 6. PUBLISH (ask the user before pushing): .gitignore (study/ref, frames, art/raw, art/logs, dist except docs),
      README case study (decisions → vacancy bullets, timings, sizes, fps, A/B hypotheses, what differs from the
      reference), author `Artem <208152625+bankaino@users.noreply.github.com>` set per repo, public repo + Pages (/docs).

## Log
- 2026-10-09: project created; baseline `verify.sh` on the untouched template = VERIFY OK (demo end 22.1 s, passive
  12.0 s, build 0.12 MB, smoke fps 61). No git yet — phase 1 starts with it.
- 2026-10-09 phase 1 DONE (Sonnet 5.5): git init + commit "scaffold"; `live/sim.js` rewritten (side view, taps via `inp.click`+`px/py`
  hit-tested on `SIM.UI`; phases shop→battle; events: buy go spawn bolt dmg kill sawhit throw boom sawt sawimpact fire towerdown
  upoffer upgrade hurt wreck nope locked end). `S.hint` = card id the hand points at ('saw','start','bomb','sawt','fire','bubble').
  Camera contract: screen x = CART_SX(300) + (x - cart.x)*S.zoom, ground line y = SIM.GY (0.55·H). Headless timeline:
  `node tools/timeline.js` → buy saw 1.0, go 1.6, first skeleton 3.4, bomb 4.2 (first reward ≤ 8 s ✓), tower 1 falls 10.7 (wow 1),
  upgrade 12.1 (wow 2), FIRE 17.4, tower 2 falls 19.9, endcard 21.9 (win); passive viewer endcard 12.0 s.
  `live/scene.js` is a PLACEHOLDER (flat shapes + real HUD/CTA/endcard/hand/cards) so verify/qa/smoke run — phase 2 replaces the world
  drawing, keeps HUD blocks. `tools/smoke_test.mjs` now taps SAW→START→BOMB→SAW-THROW→CTA. `verify.sh` = VERIFY OK (build 0.10 MB, fps 61).
  Known leftovers for later phases: variants/*.json are still Timber Rush overrides (rewrite in phase 5); build.json still lists the
  template's textures (rename in phase 3); audio.js still has the harvester engine + tree-cut SFX (rewrite in phase 2); ENERGY shop card
  (10 coins, +0.3/s) and CART+ (100, +200 HP) exist in sim but the demo only buys SAW.
- 2026-10-09 phase 2 DONE (Sonnet 5.5): `live/scene.js` rewritten — sky + 3 parallax layers (cliffs 0.12, far pines 0.3, near pines 0.62), ground
  with tufts/stones, towers (bricks, timber beams, cracks by HP, "2.0K"-style HP number, collapse + rubble + 14 stone chunks), skeleton rig
  (walk cycle, sword swing in melee, shield/helmet variants, HP bar, bone-scatter death), cart rig `drawCart(ox, base, scale, opts)` (3 wheels
  with spokes, crates — tier 2 pops two more with overshoot —, spinning saw, 2 flamethrowers, archer with cape + aimed crossbow + recoil, vertical HP
  bar; reused big on the endcard), bombs in flight, rolling saw blades, flame cones, explosions/sparks/dust, coins flying to the HUD pill with
  honest displayed money, shake trauma. HUD: logo shield, 5-flag progress bar (flags turn red per tower), coin pill, shop cards (green
  CART+/ENERGY, SAW, locked FIRE, START), energy panel + blue/grey ability cards with ⚡ chips, ⬆250 bubble, tutorial banner + hand pointing at `S.hint`,
  callouts, CTA bar, endcard (headline by endWhy, drawn cart, stats, whole-screen CTA, replay). `SPR` set in scene.js = names with real art (empty until phase 3).
  `live/audio.js` rewritten (clank on buy, crossbow twang, bones+coin, grind, bomb, saw-throw, impact, flame roar loop, tower collapse, upgrade arpeggio, cart rumble).
  Layout fixes found by qa.mjs: shop cards h=170, big cards y=H-570, callouts at 0.2·H (banner hides while a callout shows), endcard stack moved down.
  `verify.sh` = VERIFY OK (code 108 KB, fps 61). Critic run on phase 2: study/critique/phase2.md.
  Phase 3 TODO from this phase: when real sprites land, add their names to `SPR` and swap the matching rig part (cart_body, wheel, crate_tier, saw_blade,
  flamethrower, archer, skel_body/skel_leg, tower, bomb, coin, hand, logo_shield, pine_*, bg_mountains, rubble); keep rig motion (spin/swing) in code.
- 2026-10-09 phase 3 DONE (Sonnet 5.5): style bible measured from the reference (soft casual 3D render, side view, palette hexes, light upper-left) in
  art/style_bible.txt; 17 prompts + art/jobs.json are GENERATED by `python tools/write_prompts.py` (edit the texts there, re-run, then
  `gen_batch.py art/jobs.json`). All 17 images came out right first time via Codex (~100 s each, 3 parallel): no re-rolls. Sheets sliced:
  debris→skull/bone/sword, rubble→rock_0..2, pine→pine_0..2 (`slice.py ... --order x`). `tools/build.json` now lists the 23 real textures
  (14.8 MB source → 275 KB WebP, build ≈0.4 MB). scene.js: `put(name,x,y,h,{ax,ay,ang,sx,sy,a,tint})` helper rigs every sprite (wheels roll with
  distance, saw/blade spin, legs swing around the hip, crates pop with overshoot, tower squashes on collapse, hand = fingertip pivot, tinted flashes).
  sim geometry for the bigger cart: frontOf 270 (saw) / 190, flame origin +280, blade +300. Demo now ends at 17.0 s (win), passive endcard 12.0 s.
  Known art nits: bg_mountains tiles with a small colour step at the seam (every ~1290 px of parallax); skel_body hip cut shows a red cap.
- 2026-10-09 phase 4 DONE (Sonnet 5.5): Gate A critic (study/critique/gateA.md: overall 6.5, art 7, tech 8) → round 1 fixes applied:
  sim: idle viewers get auto-cast with a ghost tap after 3.5 s quiet (`K.AUTO_IDLE/AUTO_GAP`, event `autotap`), END_NO_INPUT 15 / END_IDLE 12, start energy 1 so a
  card lights up at ~2.6 s, tower 1 at x=1500, per-tower `wake`/`gap` (tower 2: wake 1000, gap 0.45 → 5-6 skeletons alive when FIRE lands), hint null once win/lose started,
  FIRE offered only ≥1.3 s after the upgrade, progress bar = towers down + current segment (no early full bar), "BUY THE SAW FIRST!" when CART+/ENERGY tapped first.
  scene: sky strip's top rows stretched up (no seam on tall phones), near pines sparser/muted and skipped behind the archer, dirt band soft edge + foreground darkening,
  generated bolt + padlock sprites (2 extra Codex images), hand fingertip on the card's upper right and tilted away from the price, tapered bolt with trail, saw blade glow
  toned down + dust, short jagged cracks inside the tower, endcard stat = skeletons + towers (no coin mismatch), bigger REPLAY.
  Results: demo wins at 16.8 s (tower 1 9.5, upgrade 11.0, FIRE 12.9, tower 2 14.8); idle viewer after SAW+START: tower 1 + upgrade + FIRE before endcard at 13 s;
  fully passive: endcard 15.0 s after tower 1, upgrade, FIRE. `verify.sh all` = VERIFY OK, 0.50 MB per network (Meta limit 2 MB), fps 61.
  NOT done (nice-to-have for phase 5/polish): tile a real ground texture (ground_tex is not generated), starting-hook variants, Gate B critic after variants exist.
- 2026-10-09 phase 5 DONE (Sonnet 5.5): stale Timber Rush variants deleted; 3 hypotheses written from the Gate A critic (all keys exist in SIM.K, each passes demoCheck):
  `fast_energy` (EN_RATE 1.4, COST_FIRE 5, UP_AUTO 2.0 → wow 1 at 8.4 s, endcard 15.0 s), `rich_start` (START_MONEY 215, UP_COST 230 → demo also buys CART+, hint 'cart'
  added to the shop sequence, endcard 17.5 s), `danger` (SK_DPS 85, HP 300+300, SK_REACH 40 → HP bar drains, endcard 17.4 s). Default: wow 1 at 9.5 s, endcard 16.8 s.
  `python tools/build_playable.py --variant all --pages docs` → dist/<variant>/<network>.html|zip + report.md and the Pages previews in docs/ (index.html = default,
  fast_energy.html, rich_start.html, danger.html). All 4 × 6 networks ≈ 0.50 MB (google zip 0.32 MB; limits 5 MB, Meta 2 MB). verify.sh all = VERIFY OK, fps 60–61.
- 2026-10-09 Gate B (study/critique/gateB.md: overall 6, publish NO-GO until fixed) → fixes applied: only taps that hit a target count as input (empty taps no longer freeze the shop /
  stretch the endcard), shop auto-go cap `SHOP_MAX` 7 s, absolute end cap `END_ABS` 26 s, idle/passive endings wait while FIRE plays or <3.5 s after the upgrade
  (passive viewer now sees both towers + FIRE, endcard 17.7 s), `K.COMBAT_FIRST` hook switch, variants rewritten to ONE variable each (default control, combat_first,
  fast_energy 1.8/s, rich_start 215 coins, cta_copy via `"copy"` in the variant JSON), endcard headline shortened + plural stats, hand moved off the START label,
  template leftovers removed (art/gen + live/assets stale names, art/prompts/example, placeholders, resolved jobs), store links → the repo URL (demo), README case study,
  `tools/perf_probe.mjs` (draw calls 150–300/frame at the busiest beats → listed as a known gap). `verify.sh all` = OK, 0.50 MB, 60–61 fps.
  PHASE 6 STATUS: everything except the push is done. Waiting for the user's go: public repo name `siege-cart-playable` (bankaino), Pages from /docs, no LICENSE added (user's call).

