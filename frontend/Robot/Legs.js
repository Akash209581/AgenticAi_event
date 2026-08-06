/**
 * Legs.js — hip ball, thigh, mechanical knee, shin and a large rounded
 * boot with a rubber sole. Origin of the returned group is the hip pivot.
 */
import { roundedBox, capsule, ball, mesh, group } from './Shapes.js';

const DIM = {
  thighLen: 0.13, thighR: 0.062,
  shinLen: 0.115, shinR: 0.055,
  bootW: 0.15, bootH: 0.10, bootD: 0.20, bootR: 0.046,
};

export function buildLeg(THREE, M, side) {
  const label = side < 0 ? 'right' : 'left';
  const hip = group(THREE, `leg_${label}`);

  const hipBall = mesh(THREE, ball(THREE, 0.055, 28), M.darkMetal, `hip_ball_${label}`);
  hip.add(hipBall);

  const thigh = mesh(THREE, capsule(THREE, DIM.thighR, DIM.thighLen - DIM.thighR), M.ceramic, `thigh_${label}`);
  thigh.position.y = -DIM.thighLen / 2 - 0.012;
  hip.add(thigh);

  const knee = group(THREE, `knee_${label}`);
  knee.position.y = -DIM.thighLen - 0.028;
  hip.add(knee);

  const kneeBall = mesh(THREE, ball(THREE, 0.048, 28), M.darkMetal, `knee_ball_${label}`);
  knee.add(kneeBall);
  const kneeRing = mesh(THREE, new THREE.TorusGeometry(0.042, 0.008, 12, 32), M.darkMetal, `knee_ring_${label}`);
  kneeRing.rotation.y = Math.PI / 2;
  knee.add(kneeRing);

  const shin = mesh(THREE, capsule(THREE, DIM.shinR, DIM.shinLen - DIM.shinR), M.ceramic, `shin_${label}`);
  shin.position.y = -DIM.shinLen / 2 - 0.018;
  knee.add(shin);

  const ankle = mesh(THREE, new THREE.CylinderGeometry(0.038, 0.034, 0.024, 24), M.darkMetal, `ankle_${label}`);
  ankle.position.y = -DIM.shinLen - 0.028;
  knee.add(ankle);

  const foot = group(THREE, `foot_${label}`);
  foot.position.y = -DIM.shinLen - 0.042;
  knee.add(foot);

  const boot = mesh(THREE,
    roundedBox(THREE, DIM.bootW, DIM.bootH, DIM.bootD, DIM.bootR, 0.034),
    M.ceramic, `boot_${label}`);
  boot.position.set(0, -DIM.bootH / 2, 0.028);
  foot.add(boot);

  const sole = mesh(THREE,
    roundedBox(THREE, DIM.bootW * 0.94, 0.022, DIM.bootD * 0.96, 0.011, 0.009),
    M.rubber, `sole_${label}`);
  sole.position.set(0, -DIM.bootH + 0.004, 0.028);
  foot.add(sole);

  const toeLight = mesh(THREE, new THREE.CylinderGeometry(0.012, 0.012, 0.006, 24), M.glow, `boot_light_${label}`);
  toeLight.rotation.x = Math.PI / 2;
  toeLight.position.set(0, -DIM.bootH * 0.45, DIM.bootD / 2 + 0.024);
  foot.add(toeLight);

  hip.userData = { knee, foot, side };
  return hip;
}
