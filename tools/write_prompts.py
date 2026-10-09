#!/usr/bin/env python3
"""write_prompts.py — (re)writes art/style_bible.txt, art/prompts/*.txt and art/jobs.json for Siege Cart. Run from the project root.
Edit the texts here, run again, then: python ~/.claude/skills/ref2playable/scripts/gen_batch.py art/jobs.json"""
import json, os

STYLE = """STYLE BIBLE: polished casual-mobile 3D-render look matching Image 1 (a mobile game ad), NOT pixel art and NOT flat vector: smooth rounded chunky forms, soft clean shading with gentle gradients (2-3 readable tones per surface: lit top-left, base, soft shade bottom-right), subtle ambient-occlusion darkening in crevices, no outlines, no texture noise; slightly exaggerated toy proportions.
Palette (sampled from Image 1): warm wood #b86a2c / #7a4218 with dark iron bands #4a4f58 and steel #b9c2cc; archer cobalt blue hood and cape #2f66e0 / #1c3fa8 with brown leather #6b4426; skeletons bone #ece4cc with shade #b9ad8c, dark red trousers #b32218, gold round shields #e8a62a; stone #c9c9c2 / #8f8f89 with orange-brown timber ends #c27428; pines #2e7d3a / #1b5a2a; saturated sky teal #3aa0ad to pale green #b7e3b9; coins gold #ffcf33 / #c98a0b.
Light: one soft key light from the upper left (10 o'clock), slightly warm; cool blue-green fill in the shade; NO cast shadows on the ground and NO ground plane included.
Camera: strict SIDE VIEW (orthographic, eye level, at most 5 degrees from above), the whole object visible, objects stand on an imaginary flat ground line along the bottom of the object.
Exclusions: no text, no letters, no numbers, no logos, no watermark, no glow, no light rays, no motion blur, no background scenery unless the asset IS the background.
"""

SHEET3 = "Composition: the three items in one horizontal row, each centred in its third of the canvas with very wide empty gaps (at least 25% of the canvas width) between them, nothing touching, generous margin to the canvas edges."

P = {
'cart_body': ("1536x1024", """Use case: main vehicle body sprite for a 2D side-view mobile game; wheels are separate sprites added in code, so DO NOT draw any wheels.
Subject: a chunky wooden medieval war-cart box in strict SIDE VIEW facing RIGHT: one sturdy wooden crate wagon bed made of horizontal planks (warm wood #b86a2c with darker plank gaps), four dark iron corner brackets with round rivets, a thick dark iron band along the top and bottom edge, a short wooden drawbar stub poking out at the back (left) and a small iron hook at the front (right). The bottom edge is perfectly flat and horizontal. Wider than tall (about 2.4 : 1).
Orientation: side view facing right, flat bottom edge, no perspective, no visible top face.
Composition: one object, centred, filling about 85% of the canvas width, margin all round.
Constraints: NO wheels, no axle, no archer, no saw, no ground, no shadow, no text."""),
'wheel': (None, """Use case: wheel sprite that is rotated in code, so it must be a perfectly centred circle.
Subject: one chunky wooden cart wheel seen exactly from the SIDE (face-on, like a flat 2D circle): thick dark iron rim around a warm wood #b86a2c ring, six sturdy wooden spokes, a round steel hub in the exact centre with a dark centre bolt. Slightly beveled, toy-like, soft shading from the upper left.
Orientation: face-on, perfectly circular and perfectly centred in the canvas, six spokes evenly spaced.
Composition: the wheel fills about 88% of the canvas height, centred, margin all round.
Constraints: one wheel only, no axle, no cart, no ground, no shadow, no text."""),
'crate_tier': ("1536x1024", """Use case: a stackable wooden crate tier added on top of a war cart in a 2D side-view mobile game.
Subject: one chunky wooden crate box in strict SIDE VIEW, 2.6 : 1 wide, built of horizontal planks in warm wood #b86a2c with darker gaps, a dark iron band along the top and bottom edge, four iron corner brackets with round rivets, and a big diagonal wooden cross brace across the face. Flat top and flat bottom edges so copies stack cleanly.
Orientation: side view, perfectly rectangular silhouette, no perspective, no visible top face.
Composition: one crate, centred, filling about 90% of the canvas width, margin all round.
Constraints: one crate only, no wheels, no archer, no ground, no shadow, no text."""),
'saw_blade': (None, """Use case: spinning saw-blade sprite rotated in code, so it must be a perfectly centred circle.
Subject: one large circular saw blade seen face-on: polished steel disc #b9c2cc with a ring of 14 evenly spaced chunky triangular teeth around the rim, a darker steel inner ring, and in the centre a round orange #e8742a hub cap with a dark bolt in the middle (the orange hub reads like a little hat). Soft shading from the upper left, chunky toy proportions.
Orientation: face-on, perfectly circular, perfectly centred, teeth evenly spaced.
Composition: the blade including its teeth fills about 92% of the canvas height, centred, margin all round.
Constraints: one blade only, no handle, no mount, no ground, no shadow, no text, no motion lines."""),
'flamethrower': ("1536x1024", """Use case: a flamethrower weapon sprite mounted on the front of a war cart in a 2D side-view mobile game.
Subject: a chunky steel flamethrower in strict SIDE VIEW pointing RIGHT: a round dark steel fuel tank with two iron straps at the back (left), a thick tube with ring segments, a wide flared nozzle at the right tip with a small orange glowing pilot inside (no flame coming out), warm copper #c27428 fittings. About 3 : 1 wide.
Orientation: side view, pointing right, horizontal axis, no perspective.
Composition: one weapon, centred, filling about 88% of the canvas width, margin all round.
Constraints: no fire or flame outside the nozzle, no cart, no hands, no ground, no shadow, no text."""),
'archer': ("1024x1536", """Use case: the hero character sprite standing on top of a cart in a 2D side-view mobile game.
Subject: a stylized archer hero in strict SIDE VIEW facing RIGHT, standing upright with feet together on a flat ground line, aiming a medieval crossbow straight forward (to the right) with both arms extended: a cobalt-blue #2f66e0 pointed hood pulled up, a long blue cape with a darker inner side flowing backward to the left, brown leather jerkin #6b4426 with a gold buckle belt, dark leather trousers and boots, light skin face with a small determined eye. Chunky casual 3D-render proportions, big head, about 1 : 1.9 wide to tall including the crossbow.
Orientation: side view facing right, feet on the bottom edge, crossbow level and horizontal.
Composition: one character, centred, filling about 88% of the canvas height, margin all round.
Constraints: one character only, no cart, no ground, no shadow, no enemies, no text."""),
'skel_body': (None, """Use case: upper body of a skeleton enemy for a 2D side-view mobile game; legs are separate sprites added in code, so DO NOT draw legs.
Subject: a cartoon skeleton warrior from the waist up in strict SIDE VIEW facing LEFT (walking toward the left): a round bone-white #ece4cc skull with big dark eye sockets and a grim jaw, a short ribcage with a spine, dark red #b32218 trousers waistband at the bottom edge (cut off flat at the hip), one arm stretched forward to the left holding a rusty steel short sword pointing forward-left, a round gold #e8a62a wooden shield with a dark red boss on the other arm in front of the chest. Chunky toy proportions, big skull.
Orientation: side view facing LEFT, bottom edge is a clean flat cut at the hips.
Composition: one torso, centred, filling about 88% of the canvas height, margin all round.
Constraints: no legs, no feet, no ground, no shadow, no text."""),
'skel_leg': ("1024x1536", """Use case: one leg of a skeleton enemy, rotated in code around its top end to make a walk cycle.
Subject: a single cartoon skeleton leg in SIDE VIEW hanging STRAIGHT DOWN: dark red #b32218 trouser leg covering the thigh (top third), then a bone-white #ece4cc shin bone with a round knee joint, ending in a chunky bone foot pointing LEFT. Chunky toy proportions.
Orientation: perfectly vertical, the hip end at the top centre of the canvas, the foot at the bottom.
Composition: one leg, centred, filling about 90% of the canvas height, margin all round; the leg is narrow so it only fills a small part of the width.
Constraints: one leg only, no body, no ground, no shadow, no text."""),
'debris_sheet': ("1536x1024", """Use case: three small death-debris sprites for a skeleton enemy that bursts apart.
Subject: three separate items in one horizontal row, same scale: (1) a round cartoon bone-white #ece4cc skull seen from the side facing left with dark eye sockets, (2) a single chunky cartoon bone shaped like a dog bone lying horizontal, (3) a rusty steel short sword lying horizontal with a brown leather grip.
""" + SHEET3 + """
Constraints: exactly three items, no ground, no shadows, no text."""),
'tower': ("1024x1536", """Use case: enemy fortress tower sprite for a 2D side-view mobile game (the player destroys it).
Subject: a chunky stone watchtower in strict SIDE VIEW (front elevation, no perspective): light grey stone block walls #c9c9c2 with subtle darker brick courses and a soft shaded right side #8f8f89, four crenellation blocks along the flat top, a dark arched wooden doorway at the bottom centre, one narrow dark arrow-slit window high up, and on the LEFT side three thick wooden timber beams with orange-brown #c27428 round beam ends sticking out diagonally upward-left like a bristling defence. Slightly tapered, about 1 : 1.8 wide to tall, flat bottom edge sitting on the ground line. Undamaged.
Orientation: front elevation, flat bottom edge.
Composition: one tower, centred, filling about 90% of the canvas height, margin all round.
Constraints: no skeletons, no flag, no ground, no grass, no shadow, no text."""),
'rubble_sheet': ("1536x1024", """Use case: three stone rubble chunks for a collapsing tower.
Subject: three separate chunky stone blocks of different shapes in one horizontal row: (1) a squarish grey stone brick chunk with a chipped corner, (2) a flat broken slab, (3) a rounded irregular boulder. Same light grey stone #c9c9c2 with soft shaded sides #8f8f89, casual 3D-render look.
""" + SHEET3 + """
Constraints: exactly three chunks, no dust, no ground, no shadows, no text."""),
'bomb': (None, """Use case: thrown bomb projectile sprite, rotated in code.
Subject: one classic round cartoon bomb: a glossy dark iron-black sphere #2b2d35 with a soft white highlight on the upper left, a small iron cap on top with a short twisted brown fuse ending in a little unlit tip. Chunky toy proportions.
Orientation: fuse pointing up, centred.
Composition: one bomb, centred, filling about 85% of the canvas height, margin all round.
Constraints: no spark, no flame, no ground, no shadow, no text."""),
'coin': (None, """Use case: collectible coin icon for a mobile game HUD and flying coin effect.
Subject: one shiny gold coin seen exactly face-on: round, thick beveled rim in #ffcf33 with a darker #c98a0b inner edge, and an embossed simple star symbol in the centre, soft highlight on the upper left, chunky casual 3D-render look.
Orientation: face-on, perfectly circular, perfectly centred.
Composition: the coin fills about 90% of the canvas height, centred, margin all round.
Constraints: one coin only, no text or numbers, no stack, no ground, no shadow, no glow."""),
'hand': (None, """Use case: tutorial pointer icon for a mobile game ("tap here" hint).
Subject: a cartoon white knight-gauntlet glove hand (light steel-white with soft blue-grey shading, #ffffff lit facets, #c9d2e0 shade) with the index finger pointing straight UP, other fingers curled, short cuff at the wrist, chunky casual 3D-render look. The fingertip is at the top centre of the image.
Composition: one hand, upright, centred horizontally, filling about 80% of the canvas height, margin all round.
Constraints: no text, no motion lines, no shadow, no glow."""),
'logo_shield': ("1536x1024", """Use case: blank heraldic shield badge used as a game logo plate (text is added in code).
Subject: one chunky heraldic shield seen face-on: a thick polished gold #e0a82a metal rim with rivets around the edge, a deep navy-blue #1f2a5a face with a soft inner gradient, a small gold gem or star ornament at the very top centre. The face area is EMPTY and calm (no emblem, no letters) so text can be placed on it. Wider than tall (about 1.4 : 1) with a flat top edge and a gently pointed bottom.
Composition: one shield, centred, filling about 90% of the canvas width, margin all round.
Constraints: absolutely no text, no letters, no logo, no sword emblem, no ground, no shadow."""),
'pine_sheet': ("1536x1024", """Use case: background pine tree sprites for a side-view mobile game (soft rounded 3D-render look like the pines in Image 1).
Subject: three separate stylized pine trees in side view standing on a flat ground line, each made of 3-4 stacked rounded cone tiers in saturated greens (#2e7d3a lit, #1b5a2a shade) with a short brown trunk stub at the bottom. Tree 1 medium, tree 2 taller and narrower, tree 3 shorter and rounder; all bases on the same horizontal line.
""" + SHEET3 + """
Constraints: exactly three trees, no ground, no grass, no shadows, no other objects."""),
'bg_mountains': ("1536x1024", """Use case: far background strip for a side-view mobile game: misty green rock cliffs and hills behind a forest, HORIZONTALLY TILEABLE.
Subject: a wide panoramic strip of soft stylized grey-green rock cliffs and rounded hills (#6f9a8a lit, #4f7e70 shade, haze toward the bottom) with a few small dark green pine silhouettes on their ridges, atmospheric perspective: low contrast, slightly hazy so the foreground stays readable. The left and right edges must match seamlessly (the same shapes continue across the edge so the strip can repeat). The bottom edge fades to flat pale green-grey #9fc7a8 along its full width, the top part is empty sky.
Composition: panoramic, all content in the lower 60% of the canvas, upper 40% empty sky.
Constraints: no sun, no clouds, no foreground objects, no text."""),
}

os.makedirs('art/prompts', exist_ok=True)
open('art/style_bible.txt', 'w', encoding='utf-8').write(STYLE)
jobs = []
for n, (size, text) in P.items():
    open(f'art/prompts/{n}.txt', 'w', encoding='utf-8').write(text + '\n')
    j = {'name': n, 'prompt': f'art/prompts/{n}.txt'}
    if size: j['size'] = size
    jobs.append(j)
json.dump(jobs, open('art/jobs.json', 'w'), indent=1)
print(len(jobs), 'prompts + style bible written')
