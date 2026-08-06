/**
 * Face.js — the procedural face.
 *
 * The face lives on an emissive canvas texture mapped onto the screen
 * inset of the head. Everything (eyes, lids, mouth, sparkles, hearts) is
 * drawn per frame in device-independent screen units, so expressions can
 * blend, blink and track the cursor without any texture assets.
 */

const CANVAS_W = 1024;
const CANVAS_H = 672;
const EYE_GAP = 152;         // half-distance between eye centers
const EYE_Y = 286;           // eye baseline
const MOUTH_Y = 476;
const CYAN = '#5fe8ff';
const CYAN_DIM = 'rgba(95,232,255,0.35)';

export const EXPRESSIONS = [
  'happy', 'smile', 'excited', 'sad', 'angry', 'surprised', 'wink',
  'thinking', 'question', 'sleep', 'loading', 'love', 'stars',
  'sparkle', 'talking',
];

export class Face {
  constructor(THREE) {
    this.THREE = THREE;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;

    this.material = new THREE.MeshPhysicalMaterial({
      color: 0x090b0f,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.4,
      emissive: 0xffffff,
      emissiveMap: this.texture,
      emissiveIntensity: 1.7,
    });
    this.material.name = 'face_screen';

    this.expression = 'happy';
    this.blink = 0;          // 0 open → 1 shut
    this.look = { x: 0, y: 0 };
    this.mouthOpen = 0;
    this._nextBlink = 1.5;
    this._blinkStart = -1;
  }

  setExpression(name) {
    if (EXPRESSIONS.includes(name)) this.expression = name;
  }

  /** @param {number} t seconds  @param {{x:number,y:number}} look -1..1 */
  update(t, look) {
    if (look) {
      this.look.x += (look.x - this.look.x) * 0.12;
      this.look.y += (look.y - this.look.y) * 0.12;
    }
    // Random, human-ish blink cadence — suppressed while asleep.
    if (this.expression !== 'sleep') {
      if (this._blinkStart < 0 && t > this._nextBlink) {
        this._blinkStart = t;
        this._nextBlink = t + 2.4 + Math.random() * 4;
      }
      if (this._blinkStart >= 0) {
        const p = (t - this._blinkStart) / 0.16;
        this.blink = p < 1 ? Math.sin(p * Math.PI) : 0;
        if (p >= 1) this._blinkStart = -1;
      }
    } else {
      this.blink = 1;
    }
    this.draw(t);
    this.texture.needsUpdate = true;
  }

  draw(t) {
    const c = this.ctx;
    c.clearRect(0, 0, CANVAS_W, CANVAS_H);
    c.fillStyle = '#000000';
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const dx = this.look.x * 34;
    const dy = this.look.y * 22;
    c.save();
    c.translate(dx, dy);
    c.shadowColor = CYAN;
    c.shadowBlur = 30;
    c.fillStyle = CYAN;
    c.strokeStyle = CYAN;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    const e = this.expression;
    const lidsShut = Math.max(this.blink, e === 'sleep' ? 1 : 0);

    if (e === 'love') this._eyes((x, y) => this._heart(x, y, 46));
    else if (e === 'stars') this._eyes((x, y) => this._star(x, y, 46));
    else if (e === 'sleep') this._eyes((x, y) => this._closedArc(x, y, 54));
    else if (e === 'surprised') this._eyes((x, y) => this._round(x, y, 52, lidsShut));
    else if (e === 'sad') this._eyes((x, y, s) => this._sadEye(x, y, s, lidsShut));
    else if (e === 'angry') this._eyes((x, y, s) => this._angryEye(x, y, s, lidsShut));
    else if (e === 'wink') this._eyes((x, y, s) => (s < 0 ? this._round(x, y, 46, lidsShut) : this._closedArc(x, y, 60)));
    else if (e === 'thinking') this._eyes((x, y) => this._round(x, y + 4, 42, lidsShut));
    else if (e === 'loading') this._loadingEyes(t, lidsShut);
    else this._eyes((x, y) => this._round(x, y, 46, lidsShut));

    this._mouth(t, e);
    c.restore();

    this._dots(t);
    if (e === 'sparkle' || e === 'excited' || e === 'love') this._sparkles(t);
    if (e === 'thinking' || e === 'question') this._thoughtGlyph(t, e);
    if (e === 'sleep') this._zzz(t);
  }

  /* ---------- eye primitives ---------- */

  _eyes(fn) {
    fn(CANVAS_W / 2 - EYE_GAP, EYE_Y, -1);
    fn(CANVAS_W / 2 + EYE_GAP, EYE_Y, 1);
  }

  /** The default eye: a large rounded-square "squircle" as in the
   *  reference sheet — soft corners, bright cyan core, squashing to a
   *  line on blink. */
  _round(x, y, r, shut) {
    const c = this.ctx;
    const w = r * 2.45;
    const h = r * 2.9 * (1 - shut * 0.93);
    const rad = Math.min(w, h) * 0.42;
    this._roundRect(x - w / 2, y - h / 2, w, Math.max(h, r * 0.22), rad);
    c.fill();
  }

  _sadEye(x, y, side, shut) {
    const c = this.ctx;
    this._round(x, y + 6, 34, shut);
    c.save();
    c.lineWidth = 16;
    c.beginPath();
    c.moveTo(x - 52 * (side < 0 ? 1 : -1), y - 74);
    c.lineTo(x + 46 * (side < 0 ? 1 : -1), y - 52);
    c.stroke();
    c.restore();
  }

  _angryEye(x, y, side, shut) {
    const c = this.ctx;
    c.save();
    c.beginPath();
    const w = 82, h = 92 * (1 - shut * 0.9);
    c.moveTo(x - w / 2, y - h / 2 + (side < 0 ? 0 : 34));
    c.lineTo(x + w / 2, y - h / 2 + (side < 0 ? 34 : 0));
    c.lineTo(x + w / 2, y + h / 2);
    c.lineTo(x - w / 2, y + h / 2);
    c.closePath();
    c.fill();
    c.restore();
  }

  _closedArc(x, y, w) {
    const c = this.ctx;
    c.save();
    c.lineWidth = 16;
    c.beginPath();
    c.arc(x, y - 14, w / 2, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
    c.restore();
  }

  _heart(x, y, s) {
    const c = this.ctx;
    c.save();
    c.translate(x, y - s * 0.35);
    c.scale(s / 60, s / 60);
    c.beginPath();
    c.moveTo(0, 62);
    c.bezierCurveTo(-70, 12, -46, -46, 0, -14);
    c.bezierCurveTo(46, -46, 70, 12, 0, 62);
    c.closePath();
    c.fill();
    c.restore();
  }

  _star(x, y, s) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s : s * 0.42;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    c.restore();
  }

  _loadingEyes(t, shut) {
    const c = this.ctx;
    this._eyes((x, y, side) => {
      c.save();
      c.lineWidth = 16;
      c.beginPath();
      const a = t * 4 + (side > 0 ? Math.PI : 0);
      c.arc(x, y, 52, a, a + Math.PI * 1.25);
      c.stroke();
      c.restore();
    });
    void shut;
  }

  /* ---------- mouth ---------- */

  _mouth(t, e) {
    const c = this.ctx;
    c.save();
    c.lineWidth = 12;
    c.beginPath();
    const x = CANVAS_W / 2;
    if (e === 'surprised' || e === 'question') {
      c.ellipse(x, MOUTH_Y + 6, 24, 30, 0, 0, Math.PI * 2);
      c.stroke();
    } else if (e === 'sad') {
      c.arc(x, MOUTH_Y + 40, 42, Math.PI * 1.2, Math.PI * 1.8);
      c.stroke();
    } else if (e === 'angry') {
      c.moveTo(x - 42, MOUTH_Y + 20);
      c.lineTo(x + 42, MOUTH_Y + 20);
      c.stroke();
    } else if (e === 'sleep') {
      c.arc(x, MOUTH_Y - 6, 26, Math.PI * 0.15, Math.PI * 0.85);
      c.stroke();
    } else if (e === 'thinking' || e === 'loading') {
      c.moveTo(x - 32, MOUTH_Y + 4);
      c.lineTo(x + 32, MOUTH_Y + 4);
      c.stroke();
    } else if (e === 'talking') {
      const open = 14 + Math.abs(Math.sin(t * 9)) * 34;
      c.ellipse(x, MOUTH_Y + 4, 34, open / 2, 0, 0, Math.PI * 2);
      c.fill();
    } else if (e === 'excited') {
      c.arc(x, MOUTH_Y - 4, 44, 0.1 * Math.PI, 0.9 * Math.PI);
      c.fill();
    } else {
      c.lineWidth = 14;
      c.arc(x, MOUTH_Y - 22, 40, Math.PI * 0.22, Math.PI * 0.78);
      c.stroke();
    }
    c.restore();
  }

  /* ---------- decorations ---------- */

  _sparkles(t) {
    const c = this.ctx;
    const pts = [[120, 140], [900, 180], [180, 540], [860, 520], [512, 96]];
    c.save();
    c.shadowColor = CYAN;
    c.shadowBlur = 30;
    c.fillStyle = '#bff4ff';
    pts.forEach(([x, y], i) => {
      const s = 10 + Math.abs(Math.sin(t * 2.2 + i)) * 16;
      c.beginPath();
      c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y);
      c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y);
      c.quadraticCurveTo(x, y, x, y - s);
      c.fill();
    });
    c.restore();
  }

  _thoughtGlyph(t, e) {
    const c = this.ctx;
    c.save();
    c.shadowColor = CYAN;
    c.shadowBlur = 34;
    c.fillStyle = CYAN;
    c.font = '700 130px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const bob = Math.sin(t * 2) * 8;
    c.fillText(e === 'question' ? '?' : '?', 872, 168 + bob);
    if (e === 'thinking') {
      c.fillStyle = CYAN_DIM;
      c.beginPath(); c.arc(792, 300 + bob * 0.5, 14, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(742, 372 + bob * 0.3, 9, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  _zzz(t) {
    const c = this.ctx;
    c.save();
    c.shadowColor = CYAN;
    c.shadowBlur = 26;
    c.fillStyle = CYAN;
    c.textAlign = 'center';
    [0, 1, 2].forEach((i) => {
      const p = ((t * 0.5 + i * 0.33) % 1);
      c.globalAlpha = 1 - p;
      c.font = `700 ${44 + i * 16}px system-ui, sans-serif`;
      c.fillText('z', 838 + i * 30, 220 - p * 110);
    });
    c.restore();
  }

  _dots(t) {
    const c = this.ctx;
    const pts = [[190, 130], [834, 130], [190, 542], [834, 542]];
    c.save();
    c.shadowColor = CYAN;
    c.shadowBlur = 12;
    c.fillStyle = 'rgba(95,232,255,0.55)';
    pts.forEach(([x, y], i) => {
      c.globalAlpha = 0.5 + Math.sin(t * 1.4 + i) * 0.2;
      c.beginPath();
      c.arc(x, y, 5, 0, Math.PI * 2);
      c.fill();
    });
    c.restore();
  }

  _roundRect(x, y, w, h, r) {
    const c = this.ctx;
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }
}
