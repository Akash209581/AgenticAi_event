/**
 * Body.js — torso, floating chest emblem, ribbed rubber neck and hips.
 *
 * Returns { body, torso, neck, emblem } where `body` is the group that
 * the animator breathes and sways, and `neck` carries the head.
 */
import { roundedBox, ball, mesh, group } from './Shapes.js';

const DIM = {
  torsoW: 0.46, torsoH: 0.34, torsoD: 0.30, torsoR: 0.13,
  torsoY: 0.60,
  neckY: 0.79,
  hipW: 0.34, hipH: 0.13, hipD: 0.26, hipR: 0.06,
  hipY: 0.415,
};

export function buildBody(THREE, M) {
  const body = group(THREE, 'body');

  const torso = mesh(THREE,
    roundedBox(THREE, DIM.torsoW, DIM.torsoH, DIM.torsoD, DIM.torsoR, 0.095),
    M.ceramic, 'torso_shell');
  torso.position.y = DIM.torsoY;
  body.add(torso);

  // Shoulder yoke — a slightly shaded band that reads as a separate part.
  const yoke = mesh(THREE,
    roundedBox(THREE, DIM.torsoW * 0.86, 0.07, DIM.torsoD * 0.92, 0.03, 0.025),
    M.ceramicShade, 'shoulder_yoke');
  yoke.position.y = DIM.torsoY + DIM.torsoH / 2 - 0.015;
  body.add(yoke);

  // Back pack module.
  const pack = mesh(THREE,
    roundedBox(THREE, 0.22, 0.18, 0.05, 0.035, 0.02),
    M.pianoBlack, 'back_module');
  pack.position.set(0, DIM.torsoY, -DIM.torsoD / 2 - 0.006);
  body.add(pack);

  // Floating chest emblem: recessed well, chrome ring, glowing core.
  const emblem = group(THREE, 'chest_emblem');
  const well = mesh(THREE, new THREE.CylinderGeometry(0.055, 0.055, 0.012, 48), M.pianoBlack, 'emblem_well');
  well.rotation.x = Math.PI / 2;
  emblem.add(well);
  const ring = mesh(THREE, new THREE.TorusGeometry(0.052, 0.0065, 20, 64), M.chrome, 'emblem_ring');
  emblem.add(ring);
  const core = mesh(THREE, new THREE.CylinderGeometry(0.028, 0.028, 0.009, 48), M.glow, 'emblem_core');
  core.rotation.x = Math.PI / 2;
  core.position.z = 0.022;   // floats proud of the well
  emblem.add(core);
  const halo = mesh(THREE, new THREE.TorusGeometry(0.038, 0.003, 12, 64), M.glow, 'emblem_halo');
  halo.position.z = 0.016;
  emblem.add(halo);
  emblem.position.set(0, DIM.torsoY + 0.01, DIM.torsoD / 2 - 0.012);
  body.add(emblem);

  // Neck: chrome collar + rubber bellows rings.
  const neck = group(THREE, 'neck');
  const collar = mesh(THREE, new THREE.CylinderGeometry(0.085, 0.095, 0.03, 40), M.chrome, 'neck_collar');
  neck.add(collar);
  const bellowGeo = new THREE.TorusGeometry(0.055, 0.017, 14, 40);
  for (let i = 0; i < 3; i++) {
    const b = mesh(THREE, bellowGeo, M.rubber, `neck_bellow_${i}`);
    b.rotation.x = Math.PI / 2;
    b.position.y = 0.032 + i * 0.032;
    neck.add(b);
  }
  const post = mesh(THREE, new THREE.CylinderGeometry(0.042, 0.042, 0.12, 24), M.darkMetal, 'neck_post');
  post.position.y = 0.06;
  neck.add(post);
  neck.position.y = DIM.neckY - 0.03;
  body.add(neck);

  // Hips.
  const hips = mesh(THREE,
    roundedBox(THREE, DIM.hipW, DIM.hipH, DIM.hipD, DIM.hipR, 0.045),
    M.ceramicShade, 'hip_shell');
  hips.position.y = DIM.hipY;
  body.add(hips);
  const waist = mesh(THREE, new THREE.CylinderGeometry(0.10, 0.11, 0.06, 36), M.darkMetal, 'waist_joint');
  waist.position.y = DIM.hipY + 0.075;
  body.add(waist);

  // Shoulder balls, exposed where the arms attach.
  const shoulderGeo = ball(THREE, 0.058, 32);
  [-1, 1].forEach((side) => {
    const s = mesh(THREE, shoulderGeo, M.darkMetal, side < 0 ? 'shoulder_socket_left' : 'shoulder_socket_right');
    s.position.set(side * (DIM.torsoW / 2 - 0.01), DIM.torsoY + 0.085, 0);
    body.add(s);
  });

  return {
    body, torso, neck, emblem,
    shoulderY: DIM.torsoY + 0.085,
    shoulderX: DIM.torsoW / 2 + 0.025,
    hipY: DIM.hipY - DIM.hipH / 2 + 0.02,
    hipX: DIM.hipW / 2 - 0.055,
  };
}
