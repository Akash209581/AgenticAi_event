/**
 * Shapes.js — geometry helpers shared by every body part.
 *
 * The mascot's language is "rounded everything", so almost every hard
 * volume is a bevelled rounded box rather than a raw BoxGeometry.
 */

const CURVE_SEGMENTS = 10;
const BEVEL_SEGMENTS = 6;

/**
 * A box with rounded corners in X/Y and a bevelled edge in Z — i.e. a
 * soft-cornered slab. Centered on the origin.
 *
 * @param {object} THREE
 * @param {number} width  full size on X
 * @param {number} height full size on Y
 * @param {number} depth  full size on Z
 * @param {number} radius corner radius in the XY plane
 * @param {number} bevel  edge softness on the Z faces
 */
export function roundedBox(THREE, width, height, depth, radius, bevel = radius * 0.55) {
  const b = Math.min(bevel, depth / 2 - 0.001, radius * 0.95);
  const w = width - b * 2;
  const h = height - b * 2;
  const r = Math.max(0.001, radius - b);

  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments: BEVEL_SEGMENTS,
    curveSegments: CURVE_SEGMENTS,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/** Capsule aligned to Y, `length` measured between the cap centers. */
export function capsule(THREE, radius, length, radial = 24) {
  return new THREE.CapsuleGeometry(radius, length, 8, radial);
}

/** Sphere with enough segments to stay smooth at full screen. */
export function ball(THREE, radius, segments = 36) {
  return new THREE.SphereGeometry(radius, segments, Math.max(16, segments / 2));
}

/** Convenience mesh factory that also tags the object name. */
export function mesh(THREE, geometry, material, name) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  return m;
}

/** Named group helper. */
export function group(THREE, name) {
  const g = new THREE.Group();
  g.name = name;
  return g;
}
