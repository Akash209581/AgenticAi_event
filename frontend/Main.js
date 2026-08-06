/**
 * Main.js — boots the stage, builds the mascot, wires input and the
 * expression / gesture control bar.
 */
import { buildRobot } from './Robot/Robot.js';
import { Animator, GESTURES } from './Robot/Animations.js';
import { Interaction } from './Robot/Interaction.js';
import { EXPRESSIONS } from './Robot/Face.js';

const stage = document.querySelector('three-d-stage');
const { THREE } = await stage.ready;

const { object, rig } = buildRobot(THREE);
stage.setObject(object);

// Frame the mascot as a portrait: chest-height target, room for the UI.
const camera = stage._camera;
const controls = stage._controls;
controls.target.set(0, 0.34, 0);
camera.position.set(0.62, 0.88, 4.3);
controls.minDistance = 1.4;
controls.maxDistance = 8;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = Math.PI * 0.56;
controls.update();

const animator = new Animator(rig);
const interaction = new Interaction({ element: stage, animator, face: rig.face });

// One update per rendered frame, driven by the stage's own loop.
stage.onFrame = (t) => {
  animator.update(t);
  interaction.update(t);
};

/* ---------- control bar ---------- */

const bar = document.querySelector('#controls');
const expressionRow = document.querySelector('#expressions');
const gestureRow = document.querySelector('#gestures');
const makeChip = (label, onClick, groupName) => {
  const b = document.createElement('button');
  b.className = 'chip';
  b.textContent = label;
  b.dataset.group = groupName;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    bar.querySelectorAll(`[data-group="${groupName}"]`).forEach((n) => n.classList.remove('on'));
    b.classList.add('on');
    onClick();
  });
  return b;
};

const expressionRow2 = expressionRow;
EXPRESSIONS.forEach((name) => {
  expressionRow.appendChild(makeChip(name, () => {
    interaction.asleep = false;
    interaction.lastInput = performance.now() / 1000;
    rig.face.setExpression(name);
  }, 'expression'));
});
expressionRow.querySelector('.chip').classList.add('on');

const gestureRow2 = gestureRow;
const GESTURE_FACE = {
  wave: 'excited', thumbsUp: 'happy', point: 'smile', peace: 'wink',
  fist: 'excited', grab: 'thinking', openHand: 'happy', thinking: 'thinking',
  celebrate: 'stars', listening: 'loading', welcome: 'love', nod: 'happy',
  tilt: 'question', bounce: 'excited',
};
Object.keys(GESTURES).forEach((name) => {
  gestureRow.appendChild(makeChip(name.replace(/([A-Z])/g, ' $1').toLowerCase(), () => {
    interaction.asleep = false;
    interaction.lastInput = performance.now() / 1000;
    rig.face.setExpression(GESTURE_FACE[name] || 'happy');
    animator.play(name);
  }, 'gesture'));
});

animator.onGestureEnd = () => {
  gestureRow.querySelectorAll('.chip').forEach((n) => n.classList.remove('on'));
};

document.body.classList.add('ready');
