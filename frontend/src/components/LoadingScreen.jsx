import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildRobot } from '../../Robot/Robot.js';
import { Cpu } from 'lucide-react';

export default function LoadingScreen({ onComplete, minDuration = 6000 }) {
  const mountRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing Agentic AI Engine...');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 750;
    const height = container.clientHeight || 320;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0x7c3aed, 1.5, 10);
    fillLight.position.set(-3, 1, 3);
    scene.add(fillLight);

    // Robot Rig assembly from Robot/Robot.js
    const { object, rig } = buildRobot(THREE);
    scene.add(object);

    // Initial scale and base position
    object.scale.set(1.05, 1.05, 1.05);
    object.position.y = -0.65;

    // Initial Face expression
    rig.face.setExpression('loading');

    const startTime = performance.now();
    let animationFrameId;
    let audioContext;
    let footstepGain;
    let lastStepIndex = -1;

    // Browsers require a user gesture before audible playback. Once enabled, the
    // generated impacts stay synchronized with the robot's marching cadence.
    const enableFootsteps = () => {
      if (!audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        audioContext = new AudioContext();
        footstepGain = audioContext.createGain();
        footstepGain.gain.value = 0.8;
        footstepGain.connect(audioContext.destination);
      }

      audioContext.resume();
    };

    const playFootstep = () => {
      if (!audioContext || audioContext.state !== 'running' || !footstepGain) return;

      const now = audioContext.currentTime;
      const impact = audioContext.createOscillator();
      const impactGain = audioContext.createGain();
      impact.type = 'sine';
      impact.frequency.setValueAtTime(110, now);
      impact.frequency.exponentialRampToValueAtTime(48, now + 0.12);
      impactGain.gain.setValueAtTime(0.7, now);
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      impact.connect(impactGain).connect(footstepGain);

      const click = audioContext.createOscillator();
      const clickGain = audioContext.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(720, now);
      click.frequency.exponentialRampToValueAtTime(180, now + 0.055);
      clickGain.gain.setValueAtTime(0.17, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      click.connect(clickGain).connect(footstepGain);

      impact.start(now);
      impact.stop(now + 0.15);
      click.start(now);
      click.stop(now + 0.07);
    };

    window.addEventListener('pointerdown', enableFootsteps, { once: true });
    window.addEventListener('keydown', enableFootsteps, { once: true });

    const animate = (currentTime) => {
      const elapsed = Math.max(0, currentTime - startTime);

      // Progress calculation: strictly clamped between 0 and 100
      const rawProgress = Math.max(0, Math.min(100, Math.floor((elapsed / minDuration) * 100)));
      const pRatio = rawProgress / 100;

      setProgress(rawProgress);

      // Update status text based on progress threshold


      const tSec = elapsed / 1000;

      if (rawProgress < 100) {
        // --- 3D ROBOT FOOT-LOCKED REALISTIC WALKING GAIT ---
        // Keep the walking motion and the visual progress on one shared timeline.
        const walkSpeed = 5.5;    // Natural walking cadence (rad/s)

        // Exact walking phase based on elapsed time
        const walkPhase = tSec * walkSpeed;

        // Keep the full robot inside the camera frame on every screen width.
        const viewWidth = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
        const travelLimit = Math.max(0.55, viewWidth / 2 - 0.55);
        const startX = -travelLimit;
        const endX = travelLimit;
        object.position.x = startX + (endX - startX) * pRatio;

        // Angle body towards walk direction (+X) with a slight 3/4 angled profile
        object.rotation.y = Math.PI * 0.44;

        const stepSin = Math.sin(walkPhase);
        const stepCos = Math.cos(walkPhase);

        // One footstep sound impact per step contact
        const stepIndex = Math.floor(walkPhase / Math.PI);
        if (stepIndex > lastStepIndex) {
          lastStepIndex = stepIndex;
          playFootstep();
        }

        // 1. GROUND-LOCKED LEG STRIDE KINEMATICS
        // Leg swing angle derived from stride length / leg length ratio
        const strideAngle = 0.38;

        // Right Leg Kinematics:
        const rightThighRot = stepSin * strideAngle;
        rig.legs.right.rotation.x = rightThighRot;

        // Knee flexes ONLY during swing phase (when stepCos < 0 and leg moves forward)
        // During stance phase (stepCos >= 0), leg is straight (0.05 rad) supporting full weight
        const rightKneeFlex = stepCos < 0 ? Math.abs(stepSin) * 0.65 + 0.05 : 0.05;
        rig.legs.right.userData.knee.rotation.x = rightKneeFlex;

        // Left Leg (180 deg out of phase):
        const leftThighRot = -rightThighRot;
        rig.legs.left.rotation.x = leftThighRot;

        const leftKneeFlex = stepCos > 0 ? Math.abs(stepSin) * 0.65 + 0.05 : 0.05;
        rig.legs.left.userData.knee.rotation.x = leftKneeFlex;

        // Ankle / Foot Pitch (Heel Strike & Toe Push-Off)
        if (rig.legs.right.userData.foot) {
          rig.legs.right.userData.foot.rotation.x = Math.cos(walkPhase) * 0.20;
        }
        if (rig.legs.left.userData.foot) {
          rig.legs.left.userData.foot.rotation.x = -Math.cos(walkPhase) * 0.20;
        }

        // 2. COUNTER-BALANCING ARM & HAND SWING
        const elbowRest = -Math.PI / 4;
        rig.arms.right.rotation.x = -leftThighRot * 1.0;
        rig.arms.right.rotation.z = -0.14 + Math.sin(walkPhase) * 0.02;
        rig.arms.right.userData.elbow.rotation.x = elbowRest - Math.max(0, -leftThighRot) * 0.22;

        rig.arms.left.rotation.x = -rightThighRot * 1.0;
        rig.arms.left.rotation.z = 0.14 - Math.sin(walkPhase) * 0.02;
        rig.arms.left.userData.elbow.rotation.x = elbowRest - Math.max(0, -rightThighRot) * 0.22;

        // Hand & finger dynamics
        [rig.arms.right, rig.arms.left].forEach((arm, idx) => {
          const isRight = idx === 0;

          if (arm.userData.hand) {
            const wristLag = Math.sin(walkPhase - 0.4);
            arm.userData.hand.rotation.x = wristLag * (isRight ? 0.15 : -0.15);
            arm.userData.hand.rotation.z = Math.cos(walkPhase) * (isRight ? 0.04 : -0.04);
          }

          if (arm.userData.fingers) {
            arm.userData.fingers.forEach((f, j) => {
              const curl = 0.35 + Math.sin(walkPhase + j * 0.5) * 0.06;
              f.joints.forEach((jt, k) => {
                jt.rotation.x = curl * (k === 1 ? 1.1 : 0.85);
              });
            });
          }

          if (arm.userData.thumb && arm.userData.thumb.joints) {
            arm.userData.thumb.joints[0].rotation.x = -0.22 + Math.sin(walkPhase) * 0.04;
          }
        });

        // 3. TORSO BOBBING & WEIGHT GRAVITY
        // Hips drop at double support (foot contact) and rise at single support stance
        const bounce = Math.abs(stepSin);
        rig.root.position.y = -bounce * 0.038;

        // Pelvis sway & stride pitch
        rig.root.rotation.x = 0.04; // natural forward walking tilt
        rig.root.rotation.z = Math.sin(walkPhase) * 0.03; // weight shift lateral hip drop
        rig.root.rotation.y = Math.sin(walkPhase) * 0.05; // pelvic rotation yaw

        // 4. HEAD STABILITY
        rig.head.rotation.x = 0.02 - bounce * 0.025; // steady head
        rig.head.rotation.y = -Math.sin(walkPhase) * 0.03;
        rig.head.rotation.z = -rig.root.rotation.z * 0.5;

        // Energetic facial expression
        rig.face.setExpression(rawProgress > 70 ? 'stars' : 'excited');

      } else {
        // --- CELEBRATION POSE AT 100% ---
        const viewWidth = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
        object.position.x = Math.max(0.55, viewWidth / 2 - 0.55);
        // Turn to face viewer
        object.rotation.y = THREE.MathUtils.lerp(object.rotation.y, 0, 0.1);

        // Reset legs to standing rest pose
        rig.legs.right.rotation.x = THREE.MathUtils.lerp(rig.legs.right.rotation.x, 0, 0.1);
        rig.legs.left.rotation.x = THREE.MathUtils.lerp(rig.legs.left.rotation.x, 0, 0.1);
        rig.legs.right.userData.knee.rotation.x = THREE.MathUtils.lerp(rig.legs.right.userData.knee.rotation.x, 0, 0.1);
        rig.legs.left.userData.knee.rotation.x = THREE.MathUtils.lerp(rig.legs.left.userData.knee.rotation.x, 0, 0.1);

        // Raise arm in celebration wave
        rig.arms.right.rotation.z = THREE.MathUtils.lerp(rig.arms.right.rotation.z, -2.3, 0.1);
        rig.arms.right.rotation.x = THREE.MathUtils.lerp(rig.arms.right.rotation.x, 0.2, 0.1);
        rig.arms.left.rotation.z = THREE.MathUtils.lerp(rig.arms.left.rotation.z, 0.4, 0.1);

        rig.root.position.y = 0;

        rig.face.setExpression('stars');
      }

      // Update robot procedural face & emissive texture
      rig.face.update(tSec, { x: 0, y: 0 });

      // Render scene
      renderer.render(scene, camera);

      // Continue animation loop for 5000ms + 800ms celebration hold
      if (elapsed < minDuration + 800) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setFadeOut(true);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 600);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', enableFootsteps);
      window.removeEventListener('keydown', enableFootsteps);
      if (audioContext) audioContext.close();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [minDuration, onComplete]);

  return (
    <div className={`loading-screen-container ${fadeOut ? 'fade-out' : ''}`}>
      {/* Background Cyber Glow */}
      <div className="cyber-glow-bg"></div>

      {/* Header Info */}
      <div className="loading-header">
        <div className="badge-tag">
          COMPUTER SCIENCE & ENGINEERING
        </div>
        <h1 className="loading-title">AGENTIC AI DAY 2026</h1>
      </div>

      {/* 3D Robot Canvas Stage */}
      <div className="loading-stage-box" ref={mountRef}></div>

      {/* Progress Bar & Percentage */}
      <div className="loading-bar-wrapper">
        <div className="loading-bar-track">
          <div
            className="loading-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
          <div
            className="loading-percentage-text"
            style={{ left: `${Math.max(4, Math.min(96, 4 + progress * 0.92))}%` }}
          >
            {Math.max(0, progress)}%
          </div>
        </div>
      </div>
    </div>
  );
}
