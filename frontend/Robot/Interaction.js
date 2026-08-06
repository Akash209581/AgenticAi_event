/**
 * Interaction.js — pointer, hover, click and idle behaviour.
 *
 * Translates raw input into animator intents: the mascot follows the
 * cursor, reacts to hover, greets on click, celebrates on double-click,
 * waves shortly after load and dozes off when nothing happens.
 */

const TIMING = {
  greetDelay: 5.0,       // seconds after load before the welcome wave
  idleSleep: 26.0,       // seconds of no input before dozing off
  clickCooldown: 0.35,
};

export class Interaction {
  constructor({ element, animator, face }) {
    this.el = element;
    this.animator = animator;
    this.face = face;
    this.lastInput = performance.now() / 1000;
    this.startedAt = performance.now() / 1000;
    this.greeted = false;
    this.asleep = false;
    this._lastClick = 0;

    this._onMove = this._onMove.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onEnter = this._onEnter.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onDouble = this._onDouble.bind(this);

    window.addEventListener('pointermove', this._onMove, { passive: true });
    this.el.addEventListener('pointerenter', this._onEnter);
    this.el.addEventListener('pointerleave', this._onLeave);
    this.el.addEventListener('click', this._onClick);
    this.el.addEventListener('dblclick', this._onDouble);
  }

  _mark() { this.lastInput = performance.now() / 1000; this._wake(); }

  _wake() {
    if (!this.asleep) return;
    this.asleep = false;
    this.face.setExpression('surprised');
    this.animator.play('tilt');
    setTimeout(() => { if (!this.asleep) this.face.setExpression('happy'); }, 900);
  }

  _onMove(e) {
    const r = this.el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    this.animator.setLookTarget(x, y);
    this._mark();
  }

  _onEnter() { this.animator.setHover(true); this._mark(); }

  _onLeave() {
    this.animator.setHover(false);
    this.animator.setLookTarget(0, 0);
  }

  _onClick() {
    const now = performance.now() / 1000;
    this._mark();
    if (now - this._lastClick < TIMING.clickCooldown) return;
    this._lastClick = now;
    if (this.animator.playing) return;
    this.animator.play('nod');
    this.face.setExpression('excited');
    setTimeout(() => this.face.setExpression('happy'), 1200);
  }

  _onDouble() {
    this._mark();
    this.animator.play('celebrate');
    this.face.setExpression('stars');
    setTimeout(() => this.face.setExpression('happy'), 2600);
  }

  /** Called from the render loop. */
  update(t) {
    if (!this.greeted && t - this.startedAt > TIMING.greetDelay) {
      this.greeted = true;
      this.animator.play('wave', t);
      this.face.setExpression('excited');
      setTimeout(() => { if (!this.asleep) this.face.setExpression('happy'); }, 2400);
    }
    if (!this.asleep && t - this.lastInput > TIMING.idleSleep) {
      this.asleep = true;
      this.face.setExpression('sleep');
    }
  }

  dispose() {
    window.removeEventListener('pointermove', this._onMove);
    this.el.removeEventListener('pointerenter', this._onEnter);
    this.el.removeEventListener('pointerleave', this._onLeave);
    this.el.removeEventListener('click', this._onClick);
    this.el.removeEventListener('dblclick', this._onDouble);
  }
}
