/**
 * Arms.js — rounded shoulder cap, mechanical elbow, forearm, and a hand
 * with five articulated fingers (two phalanges each).
 *
 * The arm hangs down -Y from its group origin (the shoulder pivot), so
 * gestures are plain rotations on nested joints.
 */
import { roundedBox, capsule, ball, mesh, group } from './Shapes.js';

const DIM = {
  upperLen: 0.15, upperR: 0.052,
  foreLen: 0.14, foreR: 0.048,
  // Hand scaled up ~28% and palm-dominant: the palm mass carries the
  // silhouette, the fingers are a shorter fringe on top of it.
  palmW: 0.096, palmH: 0.098, palmD: 0.046,
  fingerR: 0.0116,
};

// Anthropometric ratios: middle longest, ring a touch shorter, index
// shorter again, pinky markedly short; three phalanges each. Digits are
// deliberately kept near their previous length while the palm grew, so
// the hand reads palm-dominant rather than spidery.
const FINGERS = [
  { name: 'index',  bones: [0.0290, 0.0192, 0.0132], r: 0.98, splay: -0.11, knuckleY: -0.003, knuckleZ: 0.002, rest: 0.05 },
  { name: 'middle', bones: [0.0322, 0.0214, 0.0142], r: 1.03, splay: -0.02, knuckleY: 0.0,    knuckleZ: 0.004, rest: 0.06 },
  { name: 'ring',   bones: [0.0302, 0.0200, 0.0135], r: 0.95, splay: 0.08,  knuckleY: -0.004, knuckleZ: 0.002, rest: 0.075 },
  { name: 'pinky',  bones: [0.0222, 0.0150, 0.0108], r: 0.79, splay: 0.19,  knuckleY: -0.011, knuckleZ: -0.001, rest: 0.10 },
];
const THUMB = { name: 'thumb', bones: [0.0280, 0.0208], r: 1.20, rest: 0.12 };

/** @param {number} side -1 = robot's right (screen left), +1 = left */
export function buildArm(THREE, M, side) {
  const label = side < 0 ? 'right' : 'left';
  const shoulder = group(THREE, `arm_${label}`);

  const cap = mesh(THREE, ball(THREE, 0.072, 32), M.ceramic, `shoulder_cap_${label}`);
  shoulder.add(cap);
  const ring = mesh(THREE, new THREE.TorusGeometry(0.062, 0.008, 14, 40), M.chrome, `shoulder_ring_${label}`);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = side * 0.03;
  shoulder.add(ring);

  const upper = mesh(THREE, capsule(THREE, DIM.upperR, DIM.upperLen - DIM.upperR), M.ceramic, `upper_arm_${label}`);
  upper.position.y = -DIM.upperLen / 2 - 0.015;
  shoulder.add(upper);

  // Elbow joint group — everything below rotates with it.
  const elbow = group(THREE, `elbow_${label}`);
  elbow.position.y = -DIM.upperLen - 0.03;
  shoulder.add(elbow);

  const elbowBall = mesh(THREE, ball(THREE, 0.044, 28), M.darkMetal, `elbow_ball_${label}`);
  elbow.add(elbowBall);
  const elbowRing = mesh(THREE, new THREE.TorusGeometry(0.038, 0.007, 12, 32), M.darkMetal, `elbow_ring_${label}`);
  elbowRing.rotation.y = Math.PI / 2;
  elbow.add(elbowRing);

  const fore = mesh(THREE, capsule(THREE, DIM.foreR, DIM.foreLen - DIM.foreR), M.ceramic, `forearm_${label}`);
  fore.position.y = -DIM.foreLen / 2 - 0.02;
  elbow.add(fore);

  // Wrist assembly: the forearm shell ends in a chrome race, a dark
  // rotating gimbal ring rides inside it, and the hand's ceramic collar
  // grows straight out of that — an engineered joint with no visible
  // gap or hard intersection between arm and hand.
  const cuff = mesh(THREE, new THREE.CylinderGeometry(0.046, 0.041, 0.020, 32), M.ceramic, `forearm_cuff_${label}`);
  cuff.position.y = -DIM.foreLen - 0.026;
  elbow.add(cuff);
  const race = mesh(THREE, new THREE.CylinderGeometry(0.0385, 0.0385, 0.016, 32), M.darkMetal, `wrist_race_${label}`);
  race.position.y = -DIM.foreLen - 0.040;
  elbow.add(race);
  const gimbal = mesh(THREE, new THREE.TorusGeometry(0.0345, 0.0075, 16, 44), M.chrome, `wrist_gimbal_${label}`);
  gimbal.rotation.x = Math.PI / 2;
  gimbal.position.y = -DIM.foreLen - 0.040;
  elbow.add(gimbal);

  // ---------------------------------------------------------------
  // HAND — a human hand wearing a robotic glove: a dominant metacarpal
  // shell, hinge-pinned knuckles, tapered three-bone digits.
  // ---------------------------------------------------------------
  const hand = group(THREE, `hand_${label}`);
  hand.position.y = -DIM.foreLen - 0.048;
  elbow.add(hand);

  // Ceramic collar bridging race → palm, so nothing floats.
  const wristCollar = mesh(THREE,
    new THREE.CylinderGeometry(0.038, 0.042, 0.024, 32), M.ceramic, `wrist_collar_${label}`);
  wristCollar.position.y = -0.004;
  hand.add(wristCollar);
  const wristRing = mesh(THREE,
    new THREE.TorusGeometry(0.0335, 0.0028, 12, 44), M.glow, `wrist_ring_${label}`);
  wristRing.rotation.x = Math.PI / 2;
  wristRing.position.y = -0.010;
  hand.add(wristRing);

  // Metacarpal block — the dominant mass of the hand.
  const palm = mesh(THREE,
    roundedBox(THREE, DIM.palmW, DIM.palmH, DIM.palmD, 0.021, 0.017),
    M.ceramic, `palm_${label}`);
  palm.position.y = -DIM.palmH / 2 - 0.006;
  hand.add(palm);

  // Wrist-to-palm fairing: a wedge that fills the shoulder of the palm
  // where it meets the collar, hiding the hard cylinder intersection.
  const fairing = mesh(THREE,
    roundedBox(THREE, DIM.palmW * 0.80, 0.026, DIM.palmD * 0.86, 0.012, 0.010),
    M.ceramic, `wrist_fairing_${label}`);
  fairing.position.y = -0.012;
  hand.add(fairing);

  // Back-of-hand shell plate and its seam — the "glove" panel lines.
  const backPlate = mesh(THREE,
    roundedBox(THREE, DIM.palmW * 0.84, DIM.palmH * 0.72, 0.010, 0.017, 0.005),
    M.ceramicShade, `hand_plate_${label}`);
  backPlate.position.set(0, -DIM.palmH * 0.52, -DIM.palmD / 2 + 0.001);
  hand.add(backPlate);
  const seam = mesh(THREE,
    roundedBox(THREE, DIM.palmW * 0.88, 0.004, DIM.palmD * 0.88, 0.002, 0.0014),
    M.darkMetal, `hand_seam_${label}`);
  seam.position.set(0, -DIM.palmH * 0.34, -0.001);
  hand.add(seam);
  const seam2 = mesh(THREE,
    roundedBox(THREE, 0.0035, DIM.palmH * 0.5, DIM.palmD * 0.5, 0.0016, 0.0012),
    M.darkMetal, `hand_seam_v_${label}`);
  seam2.position.set(-side * DIM.palmW * 0.18, -DIM.palmH * 0.58, -DIM.palmD / 2 + 0.004);
  hand.add(seam2);

  // Thenar mound — the thumb base, blended into the palm mass.
  const thenar = mesh(THREE, ball(THREE, 0.026, 28), M.ceramic, `thenar_${label}`);
  thenar.scale.set(0.88, 1.28, 0.80);
  thenar.position.set(side * (DIM.palmW / 2 - 0.017), -DIM.palmH * 0.52, 0.006);
  hand.add(thenar);

  // Grip pad on the inner palm.
  const pad = mesh(THREE,
    roundedBox(THREE, DIM.palmW * 0.70, DIM.palmH * 0.60, 0.008, 0.016, 0.004),
    M.rubber, `palm_pad_${label}`);
  pad.position.set(0, -DIM.palmH * 0.54, DIM.palmD / 2 - 0.002);
  hand.add(pad);

  const fingers = [];

  /** Tapered phalanx: shell + matching end caps, so a bent finger keeps
   *  a continuous silhouette with no gap or intersection at the joint. */
  const phalanx = (r0, r1, len, name) => {
    const g = group(THREE, name);
    const shaft = mesh(THREE,
      new THREE.CylinderGeometry(r0, r1, len, 22, 1, true), M.ceramic, `${name}_shell`);
    shaft.position.y = -len / 2;
    g.add(shaft);
    const capTop = mesh(THREE, ball(THREE, r0, 20), M.ceramic, `${name}_capA`);
    g.add(capTop);
    const capEnd = mesh(THREE, ball(THREE, r1, 20), M.ceramic, `${name}_capB`);
    capEnd.position.y = -len;
    g.add(capEnd);
    return g;
  };

  /** Mechanical hinge at a knuckle: a dark pin through a slim collar,
   *  sized just under the shell radius so it never pokes through. */
  const hinge = (r, name) => {
    const g = group(THREE, name);
    const collar = mesh(THREE,
      new THREE.CylinderGeometry(r * 0.86, r * 0.86, r * 1.9, 18), M.darkMetal, `${name}_collar`);
    collar.rotation.z = Math.PI / 2;
    g.add(collar);
    const pin = mesh(THREE,
      new THREE.CylinderGeometry(r * 0.30, r * 0.30, r * 2.25, 12), M.chrome, `${name}_pin`);
    pin.rotation.z = Math.PI / 2;
    g.add(pin);
    return g;
  };

  const makeFinger = (spec, x, y, z, splay, curlBias) => {
    const r = DIM.fingerR * spec.r;
    const base = group(THREE, `${spec.name}_${label}`);
    base.position.set(x, y, z);
    base.rotation.z = splay;
    base.userData.curlBias = curlBias;
    base.userData.side = side;

    const joints = [];
    let parent = base;
    const n = spec.bones.length;
    spec.bones.forEach((len, i) => {
      const r0 = r * (1 - i * 0.14);
      const r1 = r * (1 - (i + 1) * 0.14);
      const seg = i === 0 ? base : group(THREE, `${spec.name}_${label}_j${i}`);
      if (i > 0) {
        seg.position.y = -spec.bones[i - 1];
        parent.add(seg);
      }
      seg.add(hinge(r0, `${spec.name}_${label}_hinge${i}`));
      seg.add(phalanx(r0, r1, len, `${spec.name}_${label}_p${i}`));
      // Rounded knuckle cowl over the hinge — the visual "armour" bump.
      const cowl = mesh(THREE, ball(THREE, r0 * 1.06, 20), M.ceramic, `${spec.name}_${label}_knuckle${i}`);
      cowl.scale.set(0.96, 0.9, 1.02);
      cowl.position.z = -r0 * 0.12;
      seg.add(cowl);

      if (i === n - 1) {
        const tipPad = mesh(THREE, ball(THREE, r1 * 1.0, 20), M.ceramic, `${spec.name}_${label}_tip`);
        tipPad.position.y = -len - r1 * 0.12;
        tipPad.scale.set(1, 0.9, 0.95);
        seg.add(tipPad);
        const nail = mesh(THREE,
          roundedBox(THREE, r1 * 1.25, len * 0.58, r1 * 0.38, r1 * 0.45, r1 * 0.18),
          M.ceramicShade, `${spec.name}_${label}_nail`);
        nail.position.set(0, -len * 0.55, -r1 * 0.76);
        seg.add(nail);
      }
      joints.push(seg);
      parent = seg;
    });

    hand.add(base);
    const f = { base, joints, tip: joints[1] || base, name: `${spec.name}_${label}`, rest: spec.rest };
    fingers.push(f);
    return f;
  };

  // Knuckle line: fingers spring from the TOP of the palm block, spaced
  // across its full width so they read as growing out of the hand.
  const step = (DIM.palmW - 0.024) / 3;
  FINGERS.forEach((spec, i) => {
    makeFinger(spec,
      -DIM.palmW / 2 + 0.012 + i * step,
      -DIM.palmH - 0.004 + spec.knuckleY,
      spec.knuckleZ,
      spec.splay * -side,
      i * 0.06);
  });

  // Thumb: seated on the thenar mound, swung ~52° out of the palm plane
  // and rotated into true opposition so a grip closes on the fingertips.
  const thumb = makeFinger(THUMB,
    side * (DIM.palmW / 2 - 0.010), -DIM.palmH * 0.40, 0.016, side * -0.60, 0);
  thumb.base.rotation.x = -0.60;
  thumb.base.rotation.y = side * 0.55;
  thumb.isThumb = true;

  // Thumb web — fills the first interosseous space.
  const web = mesh(THREE, ball(THREE, 0.019, 24), M.ceramic, `thumb_web_${label}`);
  web.scale.set(0.92, 1.2, 0.66);
  web.position.set(side * (DIM.palmW / 2 - 0.022), -DIM.palmH * 0.76, 0.010);
  hand.add(web);

  shoulder.userData = { elbow, hand, fingers, thumb, side };
  return shoulder;
}
