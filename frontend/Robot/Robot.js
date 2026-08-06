/**
 * Robot.js — assembles the parts into one rig.
 *
 * Returns { object, rig } where `object` is the THREE.Group handed to
 * the stage (and to the exporters), and `rig` is the named joint map the
 * animator drives.
 */
import { createMaterials } from './Materials.js';
import { Face } from './Face.js';
import { buildHead } from './Head.js';
import { buildBody } from './Body.js';
import { buildArm } from './Arms.js';
import { buildLeg } from './Legs.js';
import { group } from './Shapes.js';

const REST = {
  armOut: 0.13,      // shoulders splay slightly outward at rest
  armForward: 0.06,
  elbowBend: 0.18,
  headAttachY: 0.10, // above the neck group origin
};

export function buildRobot(THREE) {
  const M = createMaterials(THREE);
  const face = new Face(THREE);

  const object = group(THREE, 'AI_Mascot');
  const root = group(THREE, 'root');       // animator's float / bounce handle
  object.add(root);

  const bodyParts = buildBody(THREE, M);
  root.add(bodyParts.body);

  const head = buildHead(THREE, M, face);
  head.position.y = REST.headAttachY;
  bodyParts.neck.add(head);

  const arms = {};
  [-1, 1].forEach((side) => {
    const arm = buildArm(THREE, M, side);
    arm.position.set(side * bodyParts.shoulderX, bodyParts.shoulderY, 0);
    arm.rotation.z = side * REST.armOut;
    arm.rotation.x = REST.armForward;
    arm.userData.elbow.rotation.x = REST.elbowBend;
    root.add(arm);
    arms[side < 0 ? 'right' : 'left'] = arm;
  });

  const legs = {};
  [-1, 1].forEach((side) => {
    const leg = buildLeg(THREE, M, side);
    leg.position.set(side * bodyParts.hipX, bodyParts.hipY, 0);
    root.add(leg);
    legs[side < 0 ? 'right' : 'left'] = leg;
  });

  // Cyan rim light from the emblem grounds the emissive accents in the
  // lighting instead of leaving them as flat glowing decals.
  const emblemLight = new THREE.PointLight(0x38dcff, 0.16, 0.75, 2);
  emblemLight.position.set(0, bodyParts.shoulderY - 0.09, 0.28);
  root.add(emblemLight);

  const rig = {
    object, root, face, materials: M,
    body: bodyParts.body,
    torso: bodyParts.torso,
    neck: bodyParts.neck,
    emblem: bodyParts.emblem,
    emblemLight,
    head,
    antennae: head.userData.antennae,
    arms, legs,
    rest: REST,
  };

  // Snapshot the rest pose so the animator can rebuild it every frame.
  rig.restPose = new Map();
  object.traverse((o) => {
    if (o.isObject3D) rig.restPose.set(o, { r: o.rotation.clone(), p: o.position.clone(), s: o.scale.clone() });
  });

  return { object, rig };
}
