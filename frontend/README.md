# Nova — Procedural AI Robot Mascot (three.js)

An interactive 3D mascot built **entirely from code**. No GLB, FBX, Blender file
or downloaded asset is involved — every piece of geometry, every material and
the whole animated face are generated procedurally with three.js at runtime.

![Nova](uploads/pasted-1785999209363-0.png)

---

## What it is

Nova is a website-ready AI mascot: a cute, premium humanoid robot with a
rounded-TV head, glossy white ceramic shell, piano-black display, cyan emissive
accents and dark-metal ball joints. She follows the cursor, blinks, breathes,
reacts to clicks and can play a library of gestures and facial expressions.

The scene ships inside an interactive viewer with orbit controls and a toolbar
that exports the model as **OBJ + MTL** or **GLB**.

---

## Quick start

The project is plain static files — no build step, no npm install.

```bash
# from the project root
python3 -m http.server 8000
# then open:
#   http://localhost:8000/nova-mascot.html
```

Any static server works (`npx serve`, VS Code Live Server, nginx…).
A server **is** required: the page uses ES modules and an import map, which
browsers refuse to load over `file://`.

three.js loads from a pinned CDN import map in `nova-mascot.html`, so the only
external requirement is internet access on first load.

---

## Using it

| Interaction | Result |
|---|---|
| Move the cursor | Head, neck and torso track it on all three axes; eyes follow |
| Hover the canvas | Nova floats slightly higher, emblem pulse brightens |
| Click | Nod + excited face |
| Double-click | Celebration hop with star eyes |
| Drag | Orbit the camera |
| Scroll | Zoom |
| Right-drag | Pan |
| Wait 5s after load | Automatic greeting wave |
| Idle 26s | She falls asleep (`z z z`), wakes on the next input |

**Control bar (bottom of the page)**

- **Face** — 15 expressions: happy, smile, excited, sad, angry, surprised, wink,
  thinking, question, sleep, loading, love, stars, sparkle, talking.
- **Gestures** — 10 animations: wave, thumbs up, point, thinking, celebrate,
  listening, welcome, nod, tilt, bounce.

**Export** — the viewer's bottom-right buttons download the current model:

- `Download OBJ + MTL` — universal geometry + per-material colors.
- `Download GLB` — modern interchange (keeps part hierarchy and PBR materials);
  imports cleanly into Blender, Maya, Cinema 4D, Unity and Unreal.

FBX / USDZ / STEP are not offered — those cannot be written in-browser.
Note that the animated face is a canvas texture and does **not** survive the OBJ
export (GLB keeps materials but not the runtime animation logic).

---

## Project structure

```
nova-mascot.html      Page shell: import map, styling, control bar markup
Main.js               Boots the stage, builds the robot, wires input + UI
three-d-stage.js      Viewer shell: renderer, studio HDRI, shadows,
                      OrbitControls, auto-framing, OBJ/GLB export toolbar
Robot/
  Robot.js            Assembles all parts into one rig; snapshots the rest pose
  Materials.js        The 8-material palette (ceramic, piano black, glass,
                      chrome, dark metal, rubber, cyan glow)
  Shapes.js           Geometry helpers: rounded box, capsule, ball, mesh, group
  Head.js             Shell, bezel, screen, cover glass, ear modules,
                      speaker vents, LED antennae
  Face.js             The procedural face: canvas-drawn eyes, mouth, blink,
                      sparkles, z's — mapped as an emissive texture
  Body.js             Torso, chest emblem, ribbed rubber neck, hips, shoulders
  Arms.js             Shoulder, elbow, forearm, human-anatomy hand:
                      3-bone tapered fingers, nails, thenar mound, thumb web
  Legs.js             Hip, thigh, knee, shin, boot with rubber sole
  Animations.js       Motion system: idle / look-at / gesture layers
  Interaction.js      Pointer, hover, click, double-click, greet, idle sleep
```

---

## How it works

**Rendering.** `three-d-stage.js` owns the renderer (ACES filmic tone mapping,
PCF soft shadows) and paints a procedural equirectangular studio — a sky/floor
gradient with three soft-box highlights — which is prefiltered through
`PMREMGenerator` into the scene environment. That env map is what gives the
ceramic its clearcoat sheen and the chrome its reflections; there is no HDR file
to download.

**Model.** Everything is composed from primitives: bevelled rounded boxes
(`ExtrudeGeometry` over a rounded-rect `Shape`), capsules, spheres, tori and
tapered cylinders. Modelled in real-world meters, y-up, feet resting on y = 0,
roughly 1.5 m tall including antennae. Every mesh and material is **named**, so
the OBJ `o`/`usemtl` entries and GLB node names are readable in Blender.

**Face.** A 1024×672 canvas is redrawn each frame and used as the display's
`emissiveMap`, on the same `MeshPhysicalMaterial` as the piano-black bezel — so
the screen is one continuous black surface and only the cyan features glow.

**Animation.** Every frame the rig is reset to its snapshotted rest pose, then
three layers are added:

1. **Idle** — breathing scale, float, sway, antenna bob, emblem heartbeat, and
   relaxed per-joint finger flexion with slow independent drift.
2. **Look-at** — damped yaw / pitch / roll on head, neck and torso.
3. **Gesture** — a pure function of normalised progress, blended in and out by
   a smoothstep envelope so it always resolves back to idle.

Finger curls use human ratios (the PIP joint travels furthest, MCP about two
thirds, DIP about half) and close in sequence pinky → index.

---

## Customising

| I want to… | Edit |
|---|---|
| Change colors / gloss | `Robot/Materials.js` — `PALETTE` and the material definitions |
| Change proportions | The `DIM` object at the top of `Head.js`, `Body.js`, `Arms.js`, `Legs.js` |
| Add an expression | `Robot/Face.js` — add to `EXPRESSIONS` and a branch in `draw()` |
| Add a gesture | `Robot/Animations.js` — add to `GESTURES` (name → duration) and a `_g_<name>(p, w, t)` method |
| Retune idle motion | The `IDLE` and `LOOK` constants in `Animations.js` |
| Change reaction timing | The `TIMING` constants in `Robot/Interaction.js` |
| Change camera framing / background | The camera block in `Main.js`; `background` attribute on `<three-d-stage>` |

Embedding elsewhere: drop `<three-d-stage>` into any page along with the pinned
import map, then run the four lines at the top of `Main.js`.

---

## Performance

Shared materials, moderate segment counts and no post-processing keep this in
comfortable 60 FPS territory on integrated graphics. Pixel ratio is capped at 2.
Because the pinned three.js import map is a deliberately closed set, bloom and
SSAO passes are not loaded — gloss comes from the environment map and clearcoat
instead. Adding them requires bringing in the post-processing addons separately.

## Requirements

Any modern browser with WebGL 2, ES modules and import-map support
(Chrome/Edge 89+, Safari 16.4+, Firefox 108+).
