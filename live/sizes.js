// in-game sprite sizes in WORLD px (scaled by the camera zoom when drawn): { name: [w, h] } — 0 = keep the texture aspect
// (engine.md §7 "Display size vs texture size"): regenerating an asset at another resolution never changes its game size.
window.SIZES = {
  tree: [0, 58],            // a pine, base at its ground point; scaled per tree by the level data
  stump: [15, 0],
  log: [58, 0],
  harvester_body: [0, 300],  // nose to tail
  rival_body: [0, 300],
  trailer: [0, 210],
  coin: [46, 46],
  hand: [0, 190],            // HUD (view px)
};
