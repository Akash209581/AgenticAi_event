/**
 * Animations.js — the motion system.
 *
 * Every frame the rig is reset to its rest pose, then three layers are
 * added on top: idle (breathing, float, sway), look-at (head/eye
 * tracking) and an optional gesture. Gestures are pure functions of a
 * normalised progress value, blended in and out by an envelope, so they
 * never snap and always resolve back to the idle pose.
 */

export const GESTURES = {
  wave: 2.6,
  thumbsUp: 2.0,
  point: 2.2,
  peace: 2.4,
  fist: 1.8,
  grab: 2.2,
  openHand: 2.0,
  thinking: 3.2,
  celebrate: 2.8,
  listening: 3.0,
  welcome: 2.4,
  nod: 1.4,
  tilt: 1.6,
  bounce: 1.6,
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

const IDLE = {
  breathHz: 0.26,
  breathAmp: 0.018,
  floatAmp: 0.014,
  swayAmp: 0.045,
  antennaAmp: 0.07,
};

const LOOK = {
  headYaw: 0.62,
  headPitch: 0.42,
  headRoll: 0.22,
  neckShare: 0.30,
  bodyYaw: 0.16,
  bodyPitch: 0.07,
  damping: 0.1,
};

export class Animator {
  constructor(rig) {
    this.rig = rig;
    this.look = { x: 0, y: 0 };
    this.lookTarget = { x: 0, y: 0 };
    this.hover = 0;
    this.hoverTarget = 0;
    this.gesture = null;
    this.onGestureEnd = null;
  }

  /** Cursor position in -1..1 screen space. */
  setLookTarget(x, y) {
    this.lookTarget.x = clamp(x, -1, 1);
    this.lookTarget.y = clamp(y, -1, 1);
  }

  setHover(on) { this.hoverTarget = on ? 1 : 0; }

  play(name, t = performance.now() / 1000) {
    if (!GESTURES[name]) return;
    this.gesture = { name, start: t, dur: GESTURES[name] };
  }

  get playing() { return this.gesture ? this.gesture.name : null; }

  update(t) {
    const rig = this.rig;
    // 1. Reset — the pose is rebuilt from scratch every frame.
    rig.restPose.forEach((rest, obj) => {
      obj.rotation.copy(rest.r);
      obj.position.copy(rest.p);
      obj.scale.copy(rest.s);
    });

    this.look.x = lerp(this.look.x, this.lookTarget.x, LOOK.damping);
    this.look.y = lerp(this.look.y, this.lookTarget.y, LOOK.damping);
    this.hover = lerp(this.hover, this.hoverTarget, 0.08);

    this._idle(t);
    this._lookAt();

    if (this.gesture) {
      const p = (t - this.gesture.start) / this.gesture.dur;
      if (p >= 1) {
        const ended = this.gesture.name;
        this.gesture = null;
        if (this.onGestureEnd) this.onGestureEnd(ended);
      } else {
        const w = Math.min(smoothstep(p / 0.16), smoothstep((1 - p) / 0.22));
        const fn = this[`_g_${this.gesture.name}`];
        if (fn) fn.call(this, p, w, t);
      }
    }

    rig.face.update(t, { x: this.look.x, y: this.look.y });
  }

  /* ---------------- layers ---------------- */

  _idle(t) {
    const rig = this.rig;
    const breath = Math.sin(t * Math.PI * 2 * IDLE.breathHz);
    const lift = 1 + this.hover * 0.6;

    rig.torso.scale.y *= 1 + breath * IDLE.breathAmp;
    rig.torso.scale.x *= 1 - breath * IDLE.breathAmp * 0.6;
    rig.torso.scale.z *= 1 - breath * IDLE.breathAmp * 0.6;

    rig.root.position.y += breath * IDLE.floatAmp * lift + this.hover * 0.035;
    rig.root.rotation.y += Math.sin(t * 0.33) * IDLE.swayAmp;
    rig.root.rotation.z += Math.sin(t * 0.47) * 0.012;

    Object.values(rig.arms).forEach((arm, i) => {
      arm.rotation.x += Math.sin(t * Math.PI * 2 * IDLE.breathHz + i * 0.6) * 0.05;
      arm.rotation.z += Math.sin(t * 0.4 + i) * 0.03;
      // A relaxed hand hangs open with only a whisper of flex — enough
      // to avoid rod-straight fingers, never enough to read as a claw.
      arm.userData.fingers.forEach((f, j) => {
        const drift = Math.sin(t * 0.7 + j * 1.1 + i * 2.0) * 0.015;
        if (f.name.startsWith('thumb')) {
          f.joints[0].rotation.x += 0.04 + drift;
          if (f.joints[1]) f.joints[1].rotation.x += 0.07 + drift;
          return;
        }
        f.joints.forEach((jt, k) => {
          jt.rotation.x += (f.rest || 0.06) * (k === 1 ? 1.15 : k === 2 ? 0.7 : 0.85) + drift;
        });
      });
      // Wrist settles a beat after the arm — cheap follow-through.
      arm.userData.hand.rotation.x += Math.sin(t * Math.PI * 2 * IDLE.breathHz + i * 0.6 - 0.5) * 0.05;
      arm.userData.hand.rotation.z += Math.sin(t * 0.4 + i - 0.6) * 0.04;
    });

    rig.antennae.forEach((a, i) => {
      a.rotation.z += Math.sin(t * 1.9 + i * 1.7) * IDLE.antennaAmp;
      a.rotation.x += Math.cos(t * 1.4 + i) * IDLE.antennaAmp * 0.5;
    });

    // Emblem heartbeat.
    const pulse = 2.1 + Math.sin(t * 2.2) * 0.55 + this.hover * 0.8;
    rig.materials.glow.emissiveIntensity = pulse;
    rig.emblemLight.intensity = 0.08 + pulse * 0.04;
  }

  /** Free-look: yaw, pitch and roll all track the cursor so the head
   *  turns on any axis rather than snapping to two. Pitch follows the
   *  cursor directly — cursor above the mascot lifts the chin, cursor
   *  below drops it. */
  _lookAt() {
    const rig = this.rig;
    const { x, y } = this.look;
    const diag = Math.min(1, Math.hypot(x, y));

    rig.head.rotation.y += x * LOOK.headYaw;
    rig.head.rotation.x += y * LOOK.headPitch;
    rig.head.rotation.z += -x * LOOK.headRoll * (1 - Math.abs(y) * 0.4);

    rig.neck.rotation.y += x * LOOK.neckShare;
    rig.neck.rotation.x += y * LOOK.neckShare * 0.45;
    rig.neck.rotation.z += -x * 0.08;

    rig.body.rotation.y += x * LOOK.bodyYaw;
    rig.body.rotation.x += y * LOOK.bodyPitch;
    rig.root.rotation.z += -x * 0.02 * diag;
  }

  /* ---------------- gestures ---------------- */

  /** Right arm up beside the head, hand swinging. */
  _g_wave(p, w, t) {
    const arm = this.rig.arms.right;
    const side = -1;
    arm.rotation.z = lerp(arm.rotation.z, side * 2.35, w);
    arm.rotation.x = lerp(arm.rotation.x, 0.15, w);
    arm.userData.elbow.rotation.z = lerp(0, side * 0.35, w);
    arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -0.25, w);
    arm.userData.hand.rotation.z = Math.sin(t * 11) * 0.55 * w;
    arm.userData.hand.rotation.y = Math.sin(t * 5.5) * 0.08 * w;
    this._spread(arm, w * 0.4);
    this.rig.head.rotation.z += -0.1 * w;
    this.rig.root.position.y += Math.sin(t * 5.5) * 0.006 * w;
    void p;
  }

  /** Fist with the thumb raised, arm brought forward. */
  _g_thumbsUp(p, w, t) {
    const arm = this.rig.arms.right;
    arm.rotation.x = lerp(arm.rotation.x, -0.85, w);
    arm.rotation.z = lerp(arm.rotation.z, -0.45, w);
    arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -1.15, w);
    arm.userData.hand.rotation.x = lerp(0, 0.5, w);
    this._curl(arm, w, { exceptThumb: true });
    arm.userData.thumb.joints[0].rotation.x = lerp(arm.userData.thumb.joints[0].rotation.x, -1.45, w);
    arm.userData.thumb.joints[0].rotation.z = lerp(arm.userData.thumb.joints[0].rotation.z, arm.userData.side * -0.2, w);
    if (arm.userData.thumb.joints[1]) arm.userData.thumb.joints[1].rotation.x = lerp(0, -0.2, w);
    this.rig.root.position.y += Math.abs(Math.sin(t * 3)) * 0.008 * w;
    void p;
  }

  /** Index finger extended, arm pointing forward-out. */
  _g_point(p, w) {
    const arm = this.rig.arms.right;
    arm.rotation.x = lerp(arm.rotation.x, -1.35, w);
    arm.rotation.z = lerp(arm.rotation.z, -0.25, w);
    arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -0.15, w);
    arm.userData.hand.rotation.x = lerp(0, -0.35, w);
    this._curl(arm, w, { except: [0] });
    this.rig.head.rotation.y += -0.12 * w;
    void p;
  }

  /** Index + middle raised in a V, other fingers folded under the thumb. */
  _g_peace(p, w) {
    const arm = this.rig.arms.right;
    arm.rotation.x = lerp(arm.rotation.x, -0.55, w);
    arm.rotation.z = lerp(arm.rotation.z, -0.9, w);
    arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -1.55, w);
    this._curl(arm, w, { except: [0, 1] });
    const f = arm.userData.fingers;
    f[0].base.rotation.z += 0.22 * w * -arm.userData.side;
    f[1].base.rotation.z -= 0.18 * w * -arm.userData.side;
    f[0].joints.forEach((j) => { j.rotation.x -= 0.14 * w; });
    f[1].joints.forEach((j) => { j.rotation.x -= 0.14 * w; });
    void p;
  }

  /** Closed fist, thumb wrapped across the fingers. */
  _g_fist(p, w) {
    const arm = this.rig.arms.right;
    arm.rotation.x = lerp(arm.rotation.x, -0.7, w);
    arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -1.35, w);
    this._curl(arm, Math.min(1, w * 1.15), { exceptThumb: true });
    const th = arm.userData.thumb;
    th.joints[0].rotation.x = lerp(th.joints[0].rotation.x, -0.15, w);
    th.joints[0].rotation.z = lerp(th.joints[0].rotation.z, arm.userData.side * 0.55, w);
    if (th.joints[1]) th.joints[1].rotation.x = lerp(th.joints[1].rotation.x, 0.85, w);
    void p;
  }

  /** Reach out and close into a grip — open on the way there, closing
   *  on the fingertips with the thumb in opposition. */
  _g_grab(p, w) {
    const arm = this.rig.arms.right;
    const close = smoothstep((p - 0.35) / 0.35);
    arm.rotation.x = lerp(arm.rotation.x, -1.15, w);
    arm.rotation.z = lerp(arm.rotation.z, -0.3, w);
    arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -0.5, w);
    arm.userData.hand.rotation.x = lerp(0, -0.3, w);
    this._spread(arm, w * (1 - close) * 0.8);
    this._curl(arm, w * close * 0.82, { exceptThumb: true });
    const th = arm.userData.thumb;
    th.joints[0].rotation.x = lerp(th.joints[0].rotation.x, -0.55 * close, w);
    th.joints[0].rotation.z = lerp(th.joints[0].rotation.z, arm.userData.side * 0.3 * close, w);
    if (th.joints[1]) th.joints[1].rotation.x = lerp(th.joints[1].rotation.x, 0.55 * close, w);
  }

  /** Palm presented, fingers fully extended and fanned. */
  _g_openHand(p, w, t) {
    const arm = this.rig.arms.right;
    arm.rotation.x = lerp(arm.rotation.x, -1.25, w);
    arm.rotation.z = lerp(arm.rotation.z, -0.35, w);
    arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -0.35, w);
    arm.userData.hand.rotation.x = lerp(0, -0.5, w);
    arm.userData.hand.rotation.z = Math.sin(t * 1.6) * 0.05 * w;
    arm.userData.fingers.forEach((f) => {
      f.joints.forEach((j) => { j.rotation.x = lerp(j.rotation.x, -0.05, w); });
    });
    this._spread(arm, w);
    void p;
  }

  /** Hand to chin, head tilted, weight shifted. */
  _g_thinking(p, w, t) {
    const arm = this.rig.arms.left;
    arm.rotation.x = lerp(arm.rotation.x, -1.0, w);
    arm.rotation.z = lerp(arm.rotation.z, -0.3, w);
    arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -2.45, w);
    arm.userData.elbow.rotation.z = lerp(0, 0.25, w);
    arm.userData.hand.rotation.x = lerp(0, -0.5, w);
    this._curl(arm, w * 0.55);
    this.rig.head.rotation.z += 0.22 * w;
    this.rig.head.rotation.x += -0.1 * w;
    this.rig.head.rotation.y += 0.16 * w + Math.sin(t * 1.2) * 0.05 * w;
    void p;
  }

  /** Both arms up, hopping. */
  _g_celebrate(p, w, t) {
    Object.values(this.rig.arms).forEach((arm) => {
      const side = arm.userData.side;
      arm.rotation.z = lerp(arm.rotation.z, side * 2.55, w);
      arm.rotation.x = lerp(arm.rotation.x, -0.2 + Math.sin(t * 9) * 0.12, w);
      arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -0.35, w);
      this._spread(arm, w * 0.6);
    });
    const hop = Math.abs(Math.sin(p * Math.PI * 4));
    this.rig.root.position.y += hop * 0.09 * w;
    this.rig.root.rotation.y += Math.sin(p * Math.PI * 4) * 0.12 * w;
    Object.values(this.rig.legs).forEach((leg) => {
      leg.userData.knee.rotation.x = lerp(0, 0.45 * (1 - hop), w);
      leg.rotation.x = lerp(leg.rotation.x, -0.25 * (1 - hop), w);
    });
    this.rig.head.rotation.x += -0.12 * w;
  }

  /** Attentive lean-in with a slow head tilt. */
  _g_listening(p, w, t) {
    this.rig.head.rotation.z += 0.26 * w;
    this.rig.head.rotation.x += 0.08 * w;
    this.rig.body.rotation.x += 0.07 * w;
    this.rig.antennae.forEach((a, i) => { a.rotation.z += Math.sin(t * 5 + i) * 0.12 * w; });
    void p;
  }

  /** Arms opened forward with a small bow. */
  _g_welcome(p, w) {
    Object.values(this.rig.arms).forEach((arm) => {
      const side = arm.userData.side;
      arm.rotation.x = lerp(arm.rotation.x, -0.95, w);
      arm.rotation.z = lerp(arm.rotation.z, side * 0.85, w);
      arm.userData.elbow.rotation.x = lerp(arm.userData.elbow.rotation.x, -0.35, w);
      this._spread(arm, w * 0.5);
    });
    const bow = Math.sin(p * Math.PI);
    this.rig.body.rotation.x += bow * 0.16 * w;
    this.rig.head.rotation.x += bow * 0.1 * w;
    this.rig.root.position.y -= bow * 0.02 * w;
  }

  _g_nod(p, w) {
    this.rig.head.rotation.x += Math.sin(p * Math.PI * 4) * 0.3 * w;
    this.rig.neck.rotation.x += Math.sin(p * Math.PI * 4) * 0.08 * w;
  }

  _g_tilt(p, w) {
    this.rig.head.rotation.z += Math.sin(p * Math.PI) * 0.42 * w;
    this.rig.head.rotation.y += Math.sin(p * Math.PI) * 0.14 * w;
  }

  _g_bounce(p, w) {
    const hop = Math.abs(Math.sin(p * Math.PI * 2));
    this.rig.root.position.y += hop * 0.11 * w;
    Object.values(this.rig.legs).forEach((leg) => {
      leg.userData.knee.rotation.x = lerp(0, 0.6 * (1 - hop), w);
    });
    Object.values(this.rig.arms).forEach((arm) => {
      arm.rotation.x = lerp(arm.rotation.x, -0.5 * hop, w);
    });
    this.rig.head.rotation.x += (0.12 - hop * 0.2) * w;
  }

  /* ---------------- finger helpers ---------------- */

  /** Human curl: the PIP joint travels furthest, the MCP about two
   *  thirds of that, the DIP about half — and fingers close in sequence
   *  (pinky leads, index trails) instead of snapping shut together. */
  _curl(arm, w, { except = [], exceptThumb = false } = {}) {
    const RATIO = [0.66, 1.0, 0.55];
    arm.userData.fingers.forEach((f, i) => {
      const isThumb = f.name.startsWith('thumb');
      if (isThumb ? exceptThumb : except.includes(i)) return;
      const fw = clamp((w - (f.base.userData.curlBias || 0)) / 0.9, 0, 1);
      if (isThumb) {
        f.joints[0].rotation.x = lerp(f.joints[0].rotation.x, -0.35, fw);
        f.joints[0].rotation.z += -f.base.userData.side * 0 + 0;
        if (f.joints[1]) f.joints[1].rotation.x = lerp(f.joints[1].rotation.x, 0.9, fw);
        return;
      }
      f.joints.forEach((j, k) => {
        j.rotation.x = lerp(j.rotation.x, 1.45 * (RATIO[k] ?? 0.5), fw);
      });
    });
  }

  /** Open hand: fingers fan out and straighten, with the natural slight
   *  hyperextension a relaxed open palm has. */
  _spread(arm, w) {
    arm.userData.fingers.forEach((f, i) => {
      if (f.name.startsWith('thumb')) {
        f.joints[0].rotation.z += -0.25 * w * arm.userData.side;
        return;
      }
      f.base.rotation.z += (i - 1.5) * 0.13 * w;
      f.joints.forEach((j, k) => { j.rotation.x -= (k === 0 ? 0.16 : 0.08) * w; });
    });
  }
}
