/**
 * Materials.js — the robot's material library.
 *
 * A small, shared palette: every part of the model reuses one of these
 * instances, which keeps material count (and therefore state changes and
 * exported .mtl entries) low. Names are meaningful because they become
 * the `usemtl` entries in the exported OBJ and the material names in GLB.
 */

export const PALETTE = Object.freeze({
  ceramic: 0xf4f6f9,
  ceramicShade: 0xdfe3ea,
  pianoBlack: 0x090b0f,
  chrome: 0xe3e8ef,
  darkMetal: 0x4c545f,
  rubber: 0x1a1d22,
  cyan: 0x38dcff,
});

export function createMaterials(THREE) {
  const M = {};

  /** Glossy white ceramic shell — clearcoat gives the wet, injection
   *  moulded highlight that reads as "premium consumer product". */
  M.ceramic = new THREE.MeshPhysicalMaterial({
    color: PALETTE.ceramic,
    roughness: 0.28,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.1,
  });
  M.ceramic.name = 'ceramic_white';

  /** Slightly shaded ceramic for recessed / secondary panels. */
  M.ceramicShade = M.ceramic.clone();
  M.ceramicShade.color.setHex(PALETTE.ceramicShade);
  M.ceramicShade.name = 'ceramic_shade';

  /** Piano-black display housing. */
  M.pianoBlack = new THREE.MeshPhysicalMaterial({
    color: PALETTE.pianoBlack,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.4,
  });
  M.pianoBlack.name = 'piano_black';

  /** Thin cover glass over the face screen. */
  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.02,
    metalness: 0.0,
    transparent: true,
    opacity: 0.07,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    envMapIntensity: 1.1,
    depthWrite: false,
  });
  M.glass.name = 'display_glass';

  /** Polished chrome for joints and trim rings. */
  M.chrome = new THREE.MeshPhysicalMaterial({
    color: PALETTE.chrome,
    roughness: 0.12,
    metalness: 1.0,
    envMapIntensity: 1.6,
  });
  M.chrome.name = 'chrome';

  /** Anodised dark metal for mechanical interiors. */
  M.darkMetal = new THREE.MeshPhysicalMaterial({
    color: PALETTE.darkMetal,
    roughness: 0.35,
    metalness: 0.9,
    envMapIntensity: 1.2,
  });
  M.darkMetal.name = 'dark_metal';

  /** Soft matte rubber for the neck bellows and sole pads. */
  M.rubber = new THREE.MeshPhysicalMaterial({
    color: PALETTE.rubber,
    roughness: 0.85,
    metalness: 0.0,
    envMapIntensity: 0.5,
  });
  M.rubber.name = 'rubber';

  /** Cyan emissive accent — rings, emblem core, antenna tips. */
  M.glow = new THREE.MeshStandardMaterial({
    color: 0x06222c,
    emissive: PALETTE.cyan,
    emissiveIntensity: 2.4,
    roughness: 0.25,
    metalness: 0.0,
    toneMapped: false,
  });
  M.glow.name = 'glow_cyan';

  return M;
}
