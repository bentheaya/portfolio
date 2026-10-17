'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHue } from '@/components/hue/HueProvider';

const PARTICLE_COUNT = 650;
const TRAIL_LENGTH = 0.28;

interface FlowParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  life: number;
  maxLife: number;
}

function createFlowParticles(count: number): FlowParticle[] {
  const particles: FlowParticle[] = [];
  for (let i = 0; i < count; i++) {
    const s1 = Math.sin(i * 19.123 + 45.67) * 43758.5453;
    const r1 = s1 - Math.floor(s1);
    const s2 = Math.sin((i + 1) * 31.456 + 12.89) * 43758.5453;
    const r2 = s2 - Math.floor(s2);
    const s3 = Math.sin((i + 2) * 57.789 + 89.01) * 43758.5453;
    const r3 = s3 - Math.floor(s3);

    particles.push({
      x: (r1 - 0.5) * 12.5,
      y: (r2 - 0.5) * 7.5,
      z: (r3 - 0.5) * 3.5 - 1.0,
      vx: 0,
      vy: 0,
      vz: 0,
      speed: 0.85 + r1 * 0.7,
      life: r2 * 200,
      maxLife: 200 + r3 * 200,
    });
  }
  return particles;
}

function RiemannianFlowMesh({ heroHeight }: { heroHeight: number }) {
  const { clock, viewport } = useThree();
  const { hue } = useHue();

  const particles = useMemo(() => createFlowParticles(PARTICLE_COUNT), []);
  const linesGeoRef = useRef<THREE.BufferGeometry>(null);
  const headsInstancedRef = useRef<THREE.InstancedMesh>(null);

  // Math buffers for streamline segments (head and tail)
  const linePositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 2 * 3), []);
  const lineColors = useMemo(() => new Float32Array(PARTICLE_COUNT * 2 * 3), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Mouse tracking with smooth inertial damping
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollY = useRef(0);

  // Dynamic theme colors from HueProvider
  const themeColors = useMemo(() => {
    const headCol = new THREE.Color().setHSL(hue / 360, 0.95, 0.70);
    const midCol = new THREE.Color().setHSL(hue / 360, 0.85, 0.50);
    const tailCol = new THREE.Color().setHSL(((hue + 45) % 360) / 360, 0.70, 0.30);
    return { headCol, midCol, tailCol };
  }, [hue]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleScroll = () => {
      scrollY.current = window.scrollY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useFrame((_, delta) => {
    const time = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    // Smooth mouse interpolation
    mouse.current.x = THREE.MathUtils.lerp(mouse.current.x, mouse.current.targetX, 0.05);
    mouse.current.y = THREE.MathUtils.lerp(mouse.current.y, mouse.current.targetY, 0.05);

    // Mouse coordinates in world units
    const mouseX = mouse.current.x * (viewport.width * 0.5);
    const mouseY = mouse.current.y * (viewport.height * 0.5);

    // Scroll fade
    const effectiveHeight = heroHeight > 0 ? heroHeight : window.innerHeight;
    const scrollProgress = Math.min(1, Math.max(0, scrollY.current / effectiveHeight));
    const fadeFactor = Math.max(0, 1 - scrollProgress * 1.4);

    if (fadeFactor <= 0.01) return;

    let posIdx = 0;
    let colIdx = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];

      // Vector field calculation: continuous differential manifold streamlines
      const fx = Math.sin(p.y * 0.65 + time * 0.25) + Math.cos(p.z * 0.5);
      const fy = Math.cos(p.x * 0.65 + time * 0.25) - p.y * 0.12;
      const fz = Math.sin(p.x * 0.45) * Math.cos(p.y * 0.45);

      // Mouse gravitational singularity / geodesic vortex deflection
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const distSq = dx * dx + dy * dy;

      let vortexX = 0;
      let vortexY = 0;
      if (distSq < 12.0) {
        const factor = 1.2 / (distSq + 0.6);
        // Orthogonal tangent force (vorticity swirl) + gentle attraction
        vortexX = -dy * factor + dx * factor * 0.3;
        vortexY = dx * factor + dy * factor * 0.3;
      }

      // Update particle velocity with smooth inertia
      p.vx = THREE.MathUtils.lerp(p.vx, (fx + vortexX) * p.speed, 0.08);
      p.vy = THREE.MathUtils.lerp(p.vy, (fy + vortexY) * p.speed, 0.08);
      p.vz = THREE.MathUtils.lerp(p.vz, fz * p.speed * 0.5, 0.08);

      // Advance particle position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life++;

      // Respawn if out of bounds or expired life
      if (
        Math.abs(p.x) > 6.8 ||
        Math.abs(p.y) > 4.2 ||
        p.z < -4.0 ||
        p.z > 1.2 ||
        p.life > p.maxLife
      ) {
        p.x = (Math.random() - 0.5) * 12.0;
        p.y = (Math.random() - 0.5) * 7.0;
        p.z = (Math.random() - 0.5) * 3.0 - 1.0;
        p.vx = 0;
        p.vy = 0;
        p.vz = 0;
        p.life = 0;
      }

      // Compute head and tail of streamline
      const speedMag = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz) || 1;
      const nx = p.vx / speedMag;
      const ny = p.vy / speedMag;
      const nz = p.vz / speedMag;

      const trailDist = TRAIL_LENGTH * Math.min(1.8, Math.max(0.6, speedMag));

      // Head vertex
      linePositions[posIdx++] = p.x;
      linePositions[posIdx++] = p.y;
      linePositions[posIdx++] = p.z;

      // Tail vertex (behind motion vector)
      linePositions[posIdx++] = p.x - nx * trailDist;
      linePositions[posIdx++] = p.y - ny * trailDist;
      linePositions[posIdx++] = p.z - nz * trailDist;

      // Color gradient: Head is bright, Tail fades out smoothly
      const lifeNorm = Math.sin((p.life / p.maxLife) * Math.PI);
      const alphaHead = 0.55 * lifeNorm * fadeFactor;
      const alphaTail = 0.06 * lifeNorm * fadeFactor;

      const cHead = themeColors.headCol;
      const cTail = themeColors.tailCol;

      lineColors[colIdx++] = cHead.r * alphaHead;
      lineColors[colIdx++] = cHead.g * alphaHead;
      lineColors[colIdx++] = cHead.b * alphaHead;

      lineColors[colIdx++] = cTail.r * alphaTail;
      lineColors[colIdx++] = cTail.g * alphaTail;
      lineColors[colIdx++] = cTail.b * alphaTail;

      // Luminous head dot
      if (headsInstancedRef.current && i < PARTICLE_COUNT / 2) {
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar(0.018 * lifeNorm * fadeFactor);
        dummy.updateMatrix();
        headsInstancedRef.current.setMatrixAt(i, dummy.matrix);
      }
    }

    if (linesGeoRef.current) {
      linesGeoRef.current.attributes.position.needsUpdate = true;
      linesGeoRef.current.attributes.color.needsUpdate = true;
    }

    if (headsInstancedRef.current) {
      headsInstancedRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Streamline Geodesic Trajectory Segments */}
      <lineSegments>
        <bufferGeometry ref={linesGeoRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[lineColors, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Luminous Head Quantum Particles */}
      <instancedMesh
        ref={headsInstancedRef}
        args={[undefined, undefined, Math.floor(PARTICLE_COUNT / 2)]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={themeColors.headCol}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </>
  );
}

export default function FlowFieldScene({ heroHeight }: { heroHeight: number }) {
  return (
    <div className="absolute inset-0 z-[1] w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <RiemannianFlowMesh heroHeight={heroHeight} />
      </Canvas>
    </div>
  );
}
