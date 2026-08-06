/**
 * Head.js — rounded-TV head: shell, bezel, screen inset, cover glass,
 * ear modules, speaker vents and LED antennae.
 *
 * The returned group's origin sits at the neck joint (bottom of the
 * head) so the animator can tilt and nod around a natural pivot.
 */
import { roundedBox, ball, mesh, group } from './Shapes.js';

const DIM = {
  shellW: 0.58, shellH: 0.44, shellD: 0.38, shellR: 0.165,
  centerY: 0.235,
  screenW: 0.462, screenH: 0.318, screenR: 0.152,
  faceW: 0.355, faceH: 0.234,
  earR: 0.062,
  antennaLen: 0.17,
};

export function buildHead(THREE, M, face) {
  const head = group(THREE, 'head');
  const cy = DIM.centerY;

  const shell = mesh(THREE,
    roundedBox(THREE, DIM.shellW, DIM.shellH, DIM.shellD, DIM.shellR, 0.11),
    M.ceramic, 'head_shell');
  shell.position.y = cy;
  head.add(shell);

  // Piano-black bezel, inset into the front face — a soft, near-oval
  // pill (high corner radius) so it reads as one smooth cutout, not a
  // hard-edged rectangle with visible corners.
  const bezel = mesh(THREE,
    roundedBox(THREE, DIM.screenW, DIM.screenH, 0.045, DIM.screenR, 0.018),
    M.pianoBlack, 'display_bezel');
  bezel.position.set(0, cy, DIM.shellD / 2 - 0.008);
  head.add(bezel);

  // The face screen itself (emissive canvas texture).
  const screen = mesh(THREE,
    new THREE.PlaneGeometry(DIM.faceW, DIM.faceH),
    face.material, 'face_screen');
  screen.position.set(0, cy, DIM.shellD / 2 + 0.0175);
  screen.castShadow = false;
  head.add(screen);

  // Cover glass floats a hair proud of the screen (no z-fighting),
  // matching the bezel's soft oval outline so no rectangular seam shows.
  const glassPane = mesh(THREE,
    roundedBox(THREE, DIM.screenW - 0.008, DIM.screenH - 0.008, 0.012, DIM.screenR - 0.004, 0.005),
    M.glass, 'display_glass');
  glassPane.position.set(0, cy, DIM.shellD / 2 + 0.022);
  glassPane.castShadow = false;
  head.add(glassPane);

  // Ear modules: chrome barrel + cyan light ring, both sides.
  const earGeo = new THREE.CylinderGeometry(DIM.earR, DIM.earR, 0.055, 40);
  const ringGeo = new THREE.TorusGeometry(DIM.earR * 0.66, 0.011, 16, 48);
  const capGeo = new THREE.CylinderGeometry(DIM.earR * 0.5, DIM.earR * 0.5, 0.02, 32);
  [-1, 1].forEach((side) => {
    const ear = group(THREE, side < 0 ? 'ear_left' : 'ear_right');
    const barrel = mesh(THREE, earGeo, M.chrome, 'ear_barrel');
    barrel.rotation.z = Math.PI / 2;
    ear.add(barrel);
    const ring = mesh(THREE, ringGeo, M.glow, 'ear_ring');
    ring.rotation.y = Math.PI / 2;
    ring.position.x = side * 0.029;
    ear.add(ring);
    const cap = mesh(THREE, capGeo, M.ceramicShade, 'ear_cap');
    cap.rotation.z = Math.PI / 2;
    cap.position.x = side * 0.031;
    ear.add(cap);
    ear.position.set(side * (DIM.shellW / 2 + 0.012), cy - 0.01, 0.01);
    head.add(ear);
  });

  // Speaker vents milled into the lower rear shell.
  const ventGeo = roundedBox(THREE, 0.15, 0.011, 0.012, 0.005, 0.004);
  for (let i = 0; i < 4; i++) {
    const vent = mesh(THREE, ventGeo, M.darkMetal, `vent_${i}`);
    vent.position.set(0, cy - 0.10 + i * 0.028, -DIM.shellD / 2 + 0.012);
    head.add(vent);
  }

  // LED antennae.
  const stemGeo = new THREE.CylinderGeometry(0.0075, 0.009, DIM.antennaLen, 16);
  const tipGeo = ball(THREE, 0.023, 28);
  const antennae = [];
  [-1, 1].forEach((side) => {
    const a = group(THREE, side < 0 ? 'antenna_left' : 'antenna_right');
    const stem = mesh(THREE, stemGeo, M.chrome, 'antenna_stem');
    stem.position.y = DIM.antennaLen / 2;
    a.add(stem);
    const tip = mesh(THREE, tipGeo, M.glow, 'antenna_tip');
    tip.position.y = DIM.antennaLen + 0.012;
    a.add(tip);
    const base = mesh(THREE, new THREE.CylinderGeometry(0.022, 0.026, 0.022, 24), M.chrome, 'antenna_base');
    a.add(base);
    a.position.set(side * 0.135, cy + DIM.shellH / 2 - 0.02, -0.02);
    a.rotation.z = side * 0.16;
    antennae.push(a);
    head.add(a);
  });

  head.userData.antennae = antennae;
  return head;
}
