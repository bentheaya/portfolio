'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHue } from '@/components/hue/HueProvider';

// Configuration parameters
const NODE_COUNT = 80;
const MAX_EDGES = 240;
const PROXIMITY_DIST = 1.75;
const MOUSE_ATTRACT_DIST = 2.4;

interface StarNode {
  x0: number;
  y0: number;
  z0: number;
  ax: number;
  ay: number;
  az: number;
  wx: number;
  wy: number;
  wz: number;
  px: number;
  py: number;
  pz: number;
  size: number;
}

// Generate deterministic organic distribution of star nodes
function createNodes(count: number): StarNode[] {
  const nodes: StarNode[] = [];
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random based on sine hashing
    const s1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const r1 = s1 - Math.floor(s1);
    const s2 = Math.sin((i + 1) * 39.346 + 11.135) * 43758.5453;
    const r2 = s2 - Math.floor(s2);
    const s3 = Math.sin((i + 2) * 73.156 + 54.912) * 43758.5453;
    const r3 = s3 - Math.floor(s3);

    nodes.push({
      x0: (r1 - 0.5) * 11.5,      // Wide desktop X spread
      y0: (r2 - 0.5) * 6.8,       // Vertical spread matching hero aspect
      z0: (r3 - 0.5) * 3.8 - 1.2, // Depth spread from -3.1 to +0.7
      ax: 0.12 + r2 * 0.22,
      ay: 0.12 + r3 * 0.22,
      az: 0.08 + r1 * 0.18,
      wx: 0.25 + r1 * 0.45,
      wy: 0.20 + r2 * 0.40,
      wz: 0.15 + r3 * 0.35,
      px: r1 * Math.PI * 2,
      py: r2 * Math.PI * 2,
      pz: r3 * Math.PI * 2,
      size: 0.022 + r1 * 0.022,
    });
  }
  return nodes;
}

function AmbientProximityMesh({ heroHeight }: { heroHeight: number }) {
  const { clock, viewport } = useThree();
  const { hue } = useHue();

  const nodes = useMemo(() => createNodes(NODE_COUNT), []);
  const instancedNodesRef = useRef<THREE.InstancedMesh>(null);
  const linesGeoRef = useRef<THREE.BufferGeometry>(null);
  const photonsRef = useRef<THREE.InstancedMesh>(null);

  // Temporary reusable math objects (0 GC allocation per frame)
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useMemo(
    () => Array.from({ length: NODE_COUNT }, () => new THREE.Vector3()),
    []
  );

  // Pre-allocated static buffers for dynamic edge geometry
  const linePositions = useMemo(() => new Float32Array(MAX_EDGES * 2 * 3), []);
  const lineColors = useMemo(() => new Float32Array(MAX_EDGES * 2 * 3), []);

  // Mouse tracking with smooth inertial damping
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollY = useRef(0);

  // Color tokens synchronized with HueProvider
  const themeColors = useMemo(() => {
    const primary = new THREE.Color().setHSL(hue / 360, 0.85, 0.55);
    const bright = new THREE.Color().setHSL(hue / 360, 0.95, 0.70);
    const secondary = new THREE.Color().setHSL(((hue + 32) % 360) / 360, 0.75, 0.45);
    const dim = new THREE.Color().setHSL(hue / 360, 0.40, 0.25);
    return { primary, bright, secondary, dim };
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

  useFrame(() => {
    const time = clock.getElapsedTime();

    // Smooth mouse interpolation
    mouse.current.x = THREE.MathUtils.lerp(mouse.current.x, mouse.current.targetX, 0.06);
    mouse.current.y = THREE.MathUtils.lerp(mouse.current.y, mouse.current.targetY, 0.06);

    // Compute mouse world coordinates on plane Z=0
    const mouseWorldX = mouse.current.x * (viewport.width * 0.5);
    const mouseWorldY = mouse.current.y * (viewport.height * 0.5);

    // Scroll fade calculation (fades out as user scrolls into About section)
    const effectiveHeight = heroHeight > 0 ? heroHeight : window.innerHeight;
    const scrollProgress = Math.min(1, Math.max(0, scrollY.current / effectiveHeight));
    const fadeFactor = Math.max(0, 1 - scrollProgress * 1.35);

    if (fadeFactor <= 0.01) return;

    // 1. Update node positions with harmonic drift & mouse attraction
    for (let i = 0; i < NODE_COUNT; i++) {
      const n = nodes[i];

      // Base harmonic drift
      let px = n.x0 + Math.sin(time * n.wx + n.px) * n.ax;
      let py = n.y0 + Math.cos(time * n.wy + n.py) * n.ay;
      let pz = n.z0 + Math.sin(time * n.wz + n.pz) * n.az;

      // Mouse gravitational attraction
      const dx = mouseWorldX - px;
      const dy = mouseWorldY - py;
      const distToMouse = Math.sqrt(dx * dx + dy * dy);

      if (distToMouse < MOUSE_ATTRACT_DIST && distToMouse > 0.05) {
        const pull = (1 - distToMouse / MOUSE_ATTRACT_DIST) * 0.35;
        px += dx * pull;
        py += dy * pull;
      }

      currentPositions[i].set(px, py, pz);

      // Update instanced sphere matrix
      if (instancedNodesRef.current) {
        dummy.position.set(px, py, pz);
        const hoverPulse = distToMouse < 1.0 ? 1.4 : 1.0;
        dummy.scale.setScalar(n.size * hoverPulse * fadeFactor);
        dummy.updateMatrix();
        instancedNodesRef.current.setMatrixAt(i, dummy.matrix);
      }
    }

    if (instancedNodesRef.current) {
      instancedNodesRef.current.instanceMatrix.needsUpdate = true;
    }

    // 2. Compute dynamic proximity lines between drifting nodes
    let edgeCount = 0;
    let posIdx = 0;
    let colIdx = 0;

    for (let i = 0; i < NODE_COUNT && edgeCount < MAX_EDGES - 4; i++) {
      const p1 = currentPositions[i];

      for (let j = i + 1; j < NODE_COUNT && edgeCount < MAX_EDGES - 4; j++) {
        const p2 = currentPositions[j];
        const dist = p1.distanceTo(p2);

        if (dist < PROXIMITY_DIST) {
          // Line start vertex
          linePositions[posIdx++] = p1.x;
          linePositions[posIdx++] = p1.y;
          linePositions[posIdx++] = p1.z;

          // Line end vertex
          linePositions[posIdx++] = p2.x;
          linePositions[posIdx++] = p2.y;
          linePositions[posIdx++] = p2.z;

          // Alpha inversely proportional to distance (smooth quadratic falloff)
          const normDist = dist / PROXIMITY_DIST;
          const alpha = (1 - normDist * normDist) * 0.38 * fadeFactor;

          const c1 = themeColors.primary;
          const c2 = themeColors.secondary;

          lineColors[colIdx++] = c1.r * alpha;
          lineColors[colIdx++] = c1.g * alpha;
          lineColors[colIdx++] = c1.b * alpha;

          lineColors[colIdx++] = c2.r * alpha;
          lineColors[colIdx++] = c2.g * alpha;
          lineColors[colIdx++] = c2.b * alpha;

          edgeCount++;
        }
      }
    }

    // 3. Tether the 3 closest nodes to the mouse cursor
    const nodeDists: { idx: number; d: number }[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const dx = mouseWorldX - currentPositions[i].x;
      const dy = mouseWorldY - currentPositions[i].y;
      nodeDists.push({ idx: i, d: Math.sqrt(dx * dx + dy * dy) });
    }
    nodeDists.sort((a, b) => a.d - b.d);

    for (let k = 0; k < 3 && edgeCount < MAX_EDGES; k++) {
      const nearest = nodeDists[k];
      if (nearest.d < MOUSE_ATTRACT_DIST * 1.2) {
        const p = currentPositions[nearest.idx];
        linePositions[posIdx++] = mouseWorldX;
        linePositions[posIdx++] = mouseWorldY;
        linePositions[posIdx++] = 0;

        linePositions[posIdx++] = p.x;
        linePositions[posIdx++] = p.y;
        linePositions[posIdx++] = p.z;

        const tetherAlpha = (1 - nearest.d / (MOUSE_ATTRACT_DIST * 1.2)) * 0.55 * fadeFactor;
        const c = themeColors.bright;

        lineColors[colIdx++] = c.r * tetherAlpha;
        lineColors[colIdx++] = c.g * tetherAlpha;
        lineColors[colIdx++] = c.b * tetherAlpha;

        lineColors[colIdx++] = c.r * tetherAlpha * 0.7;
        lineColors[colIdx++] = c.g * tetherAlpha * 0.7;
        lineColors[colIdx++] = c.b * tetherAlpha * 0.7;

        edgeCount++;
      }
    }

    // Update lines buffer geometry
    if (linesGeoRef.current) {
      linesGeoRef.current.attributes.position.needsUpdate = true;
      linesGeoRef.current.attributes.color.needsUpdate = true;
      linesGeoRef.current.setDrawRange(0, edgeCount * 2);
    }

    // 4. Update traveling synaptic pulse photons along nodes
    if (photonsRef.current) {
      const PHOTON_COUNT = 8;
      for (let p = 0; p < PHOTON_COUNT; p++) {
        const n1Idx = (p * 9 + Math.floor(time * 0.1)) % NODE_COUNT;
        const n2Idx = (n1Idx + 5) % NODE_COUNT;

        const p1 = currentPositions[n1Idx];
        const p2 = currentPositions[n2Idx];

        const t = (time * 0.35 + p * 0.22) % 1.0;
        dummy.position.lerpVectors(p1, p2, t);
        dummy.scale.setScalar(0.038 * fadeFactor);
        dummy.updateMatrix();
        photonsRef.current.setMatrixAt(p, dummy.matrix);
      }
      photonsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Node Star Vertices */}
      <instancedMesh ref={instancedNodesRef} args={[undefined, undefined, NODE_COUNT]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={themeColors.bright}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* Dynamic Proximity Mesh Lines */}
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

      {/* Synaptic Energy Pulses */}
      <instancedMesh ref={photonsRef} args={[undefined, undefined, 8]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={themeColors.bright}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </>
  );
}

export default function HeroScene({ heroHeight }: { heroHeight: number }) {
  return (
    <div className="absolute inset-0 z-[1] w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <AmbientProximityMesh heroHeight={heroHeight} />
      </Canvas>
    </div>
  );
}
