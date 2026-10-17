'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { projectsMetadata, ProjectMetadata } from '@/lib/projects';
import { usePageTransition } from '@/components/transitions/TransitionContext';

// Map projects for fast O(1) lookup
const projectsMap = new Map<string, ProjectMetadata>(
  projectsMetadata.map((p) => [p.slug, p])
);

// Dynamically compute the spherical coordinate positions of all projects
const numProjects = projectsMetadata.length;
export const sphericalPositions: { [slug: string]: [number, number, number] } = {};

// Clamped cluster radius to fit comfortably within dedicated viewport stage
const CLUSTER_RADIUS = 2.0;

projectsMetadata.forEach((project, idx) => {
  const offset = 2 / numProjects;
  const increment = Math.PI * (3 - Math.sqrt(5)); // Golden angle
  
  const y = ((idx * offset) - 1) + (offset / 2);
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = idx * increment;
  
  const x = Math.cos(phi) * r;
  const z = Math.sin(phi) * r;
  
  sphericalPositions[project.slug] = [
    x * CLUSTER_RADIUS,
    y * CLUSTER_RADIUS,
    z * CLUSTER_RADIUS,
  ];
});

// Graph topology: intra-track geodesics + cross-track bridge pathways
const connections: [string, string][] = [
  // AI & Models Track
  ['slopslayer', 'opinionminer'],
  ['opinionminer', 'nutrilogic'],
  ['nutrilogic', 'ai-course-recommender'],
  
  // Spatial & Geometry Track
  ['dira', 'diffgeo'],
  ['diffgeo', 'musicgame'],
  
  // Architectures & Backends Track
  ['spiks', 'legacy-core'],
  ['legacy-core', 'miniecommerce'],
  ['miniecommerce', 'quickfood-frontend'],
  ['quickfood-frontend', 'the-househub'],
  
  // Civic Data & Archives Track
  ['intuilab', 'ukweli'],
  ['ukweli', 'nyaraka'],
  ['nyaraka', 'veld'],
  ['veld', 'digital-economy'],
  ['digital-economy', 'collab'],
  
  // Cross-track structural geodesics (interdisciplinary bridges)
  ['ai-course-recommender', 'dira'],
  ['musicgame', 'spiks'],
  ['the-househub', 'intuilab'],
  ['collab', 'diffgeo'],
  ['collab', 'legacy-core'],
  ['collab', 'slopslayer'],
];

// Coordinate astrolabe rings embodying Riemannian manifold S2
function AstrolabeRings() {
  const ringRef = useRef<THREE.Group>(null);

  const circlePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 64;
    const r = CLUSTER_RADIUS + 0.05;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r));
    }
    return pts;
  }, []);

  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(circlePoints), [circlePoints]);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.03;
      ringRef.current.rotation.z += delta * 0.015;
    }
  });

  return (
    <group ref={ringRef}>
      {/* Equatorial Manifold Ring */}
      <lineLoop geometry={geo}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.12} />
      </lineLoop>
      {/* Inclined Polar Meridian 1 */}
      <lineLoop geometry={geo} rotation={[Math.PI / 4, 0, Math.PI / 6]}>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.10} />
      </lineLoop>
      {/* Inclined Polar Meridian 2 */}
      <lineLoop geometry={geo} rotation={[-Math.PI / 4, Math.PI / 3, 0]}>
        <lineBasicMaterial color="#2dd4a0" transparent opacity={0.08} />
      </lineLoop>
    </group>
  );
}

// Colored multi-tone geodesic lines connecting projects
function GeodesicEdges({
  activeFilter,
  hoveredSlug,
}: {
  activeFilter: string;
  hoveredSlug: string | null;
}) {
  const { points, colors } = useMemo(() => {
    const pts: number[] = [];
    const cols: number[] = [];

    connections.forEach(([s1, s2]) => {
      const p1 = sphericalPositions[s1];
      const p2 = sphericalPositions[s2];
      const proj1 = projectsMap.get(s1);
      const proj2 = projectsMap.get(s2);

      if (p1 && p2 && proj1 && proj2) {
        pts.push(...p1, ...p2);
        const c1 = new THREE.Color(proj1.accentColor);
        const c2 = new THREE.Color(proj2.accentColor);
        cols.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
      }
    });

    return {
      points: new Float32Array(pts),
      colors: new Float32Array(cols),
    };
  }, []);

  const isFiltering = activeFilter !== 'All';
  const hasHover = hoveredSlug !== null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[points, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={hasHover ? 0.20 : (isFiltering ? 0.25 : 0.45)}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

// Glowing highlighted edges for currently hovered project
function ActiveNodeConnections({ hoveredSlug }: { hoveredSlug: string }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    connections.forEach(([s1, s2]) => {
      if (s1 === hoveredSlug || s2 === hoveredSlug) {
        const p1 = sphericalPositions[s1];
        const p2 = sphericalPositions[s2];
        if (p1 && p2) {
          pts.push(new THREE.Vector3(...p1));
          pts.push(new THREE.Vector3(...p2));
        }
      }
    });
    return pts;
  }, [hoveredSlug]);

  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const activeProj = useMemo(() => projectsMap.get(hoveredSlug), [hoveredSlug]);
  const color = activeProj?.accentColor || '#38bdf8';

  if (points.length === 0) return null;

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

// Traveling data packet photons traversing edges
function SynapticPhotons({
  activeFilter,
  hoveredSlug,
}: {
  activeFilter: string;
  hoveredSlug: string | null;
}) {
  const { clock } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = connections.length * 2;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    let idx = 0;
    connections.forEach(([s1, s2]) => {
      const c1 = new THREE.Color(projectsMap.get(s1)?.accentColor || '#38bdf8');
      const c2 = new THREE.Color(projectsMap.get(s2)?.accentColor || '#2dd4a0');
      meshRef.current!.setColorAt(idx++, c1);
      meshRef.current!.setColorAt(idx++, c2);
    });
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const time = clock.getElapsedTime();

    let index = 0;
    connections.forEach(([s1, s2], idx) => {
      const p1 = sphericalPositions[s1];
      const p2 = sphericalPositions[s2];
      if (!p1 || !p2) return;

      const v1 = new THREE.Vector3(...p1);
      const v2 = new THREE.Vector3(...p2);

      const isConnectedToHover = hoveredSlug === s1 || hoveredSlug === s2;
      const proj1 = projectsMap.get(s1);
      const proj2 = projectsMap.get(s2);
      const isFilteredIn =
        activeFilter === 'All' ||
        (proj1?.track === activeFilter && proj2?.track === activeFilter);

      const speed = isConnectedToHover ? 0.65 : (isFilteredIn ? 0.35 : 0.12);
      const baseScale = isConnectedToHover ? 1.5 : (isFilteredIn ? 1.0 : 0.35);

      // Forward direction
      const t1 = (time * speed + idx * 0.17) % 1.0;
      dummy.position.lerpVectors(v1, v2, t1);
      dummy.scale.setScalar(baseScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index++, dummy.matrix);

      // Reverse direction
      const t2 = (time * speed * 0.85 + idx * 0.23 + 0.5) % 1.0;
      dummy.position.lerpVectors(v2, v1, t2);
      dummy.scale.setScalar(baseScale * 0.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(index++, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.026, 8, 8]} />
      <meshBasicMaterial
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

interface NodeProps {
  project: ProjectMetadata;
  position: [number, number, number];
  activeFilter: string;
  isHovered: boolean;
  onNodeClick: (slug: string, clientX?: number, clientY?: number) => void;
  onHover: (slug: string | null) => void;
}

// Single node component with depth culling and high-contrast HUD badge
function ConstellationNode({
  project,
  position,
  activeFilter,
  isHovered,
  onNodeClick,
  onHover,
}: NodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const tempVec = useMemo(() => new THREE.Vector3(), []);

  const isDimmed = activeFilter !== 'All' && project.track !== activeFilter;

  useFrame(() => {
    if (!groupRef.current || !labelRef.current) return;

    // Spin holographic orbital micro-ring
    if (ringRef.current) {
      ringRef.current.rotation.z += isHovered ? 0.08 : 0.025;
    }

    // World position depth culling (only front hemisphere displays labels)
    groupRef.current.getWorldPosition(tempVec);
    const isFront = tempVec.z > -0.15;
    const depthFactor = THREE.MathUtils.clamp((tempVec.z + 0.3) / 1.4, 0, 1);

    if (isHovered) {
      labelRef.current.style.opacity = '1';
      labelRef.current.style.transform = 'scale(1.08)';
      labelRef.current.style.display = 'block';
    } else if (isDimmed) {
      labelRef.current.style.opacity = '0.12';
      labelRef.current.style.transform = 'scale(0.85)';
      labelRef.current.style.display = 'block';
    } else if (!isFront || depthFactor < 0.22) {
      labelRef.current.style.opacity = '0';
      labelRef.current.style.display = 'none';
    } else {
      labelRef.current.style.opacity = String(Math.max(0.65, depthFactor));
      labelRef.current.style.transform = `scale(${0.88 + depthFactor * 0.12})`;
      labelRef.current.style.display = 'block';
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Invisible expanded hit-target for effortless clicking & hovering */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (!isDimmed) onNodeClick(project.slug, e.nativeEvent?.clientX, e.nativeEvent?.clientY);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!isDimmed) {
            onHover(project.slug);
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.24, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Quantum Node Core */}
      <mesh>
        <sphereGeometry args={[0.065, 20, 20]} />
        <meshStandardMaterial
          color={project.accentColor}
          emissive={project.accentColor}
          emissiveIntensity={isHovered ? 0.9 : 0.35}
          roughness={0.25}
          metalness={0.75}
        />
      </mesh>

      {/* Holographic Orbital Micro-Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[0.092, 0.104, 32]} />
        <meshBasicMaterial
          color={project.accentColor}
          transparent
          opacity={isDimmed ? 0.15 : (isHovered ? 0.95 : 0.45)}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* High-Contrast Monospace HUD Label */}
      <Html
        distanceFactor={7.5}
        center
        style={{
          pointerEvents: isDimmed ? 'none' : 'auto',
          transition: 'transform 0.18s ease-out',
        }}
      >
        <div
          ref={labelRef}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDimmed) onNodeClick(project.slug, e.clientX, e.clientY);
          }}
          onPointerEnter={() => {
            if (!isDimmed) {
              onHover(project.slug);
              document.body.style.cursor = 'pointer';
            }
          }}
          onPointerLeave={() => {
            onHover(null);
            document.body.style.cursor = 'default';
          }}
          className="cursor-pointer select-none group flex flex-col items-center pointer-events-auto"
        >
          <div
            className="px-2.5 py-1 rounded-md bg-[#0a0c10]/95 backdrop-blur-md border flex items-center gap-2 shadow-2xl transition-all duration-200"
            style={{
              borderColor: isHovered ? project.accentColor : 'rgba(255, 255, 255, 0.22)',
              boxShadow: isHovered
                ? `0 0 20px ${project.accentColor}60, 0 4px 14px rgba(0,0,0,0.85)`
                : '0 4px 14px rgba(0,0,0,0.7)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: project.accentColor }}
            />
            <span className="text-[10px] font-mono font-bold tracking-wide text-white whitespace-nowrap">
              {project.title}
            </span>
            <span className="text-[9px] font-mono text-white/50 group-hover:text-accent-bright transition-colors">
              ↗
            </span>
          </div>

          {/* Micro domain tag on hover */}
          {isHovered && (
            <div
              className="mt-1 px-2 py-0.5 rounded bg-[#0a0c10]/95 border text-[9px] font-mono text-accent-bright whitespace-nowrap shadow-lg animate-in fade-in duration-150"
              style={{ borderColor: `${project.accentColor}50` }}
            >
              {project.domain}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

interface SceneOrchestratorProps {
  activeFilter: string;
  mouseState: React.MutableRefObject<{
    targetX: number;
    targetY: number;
    isDown: boolean;
    lastX: number;
    lastY: number;
    dragX: number;
    dragY: number;
  }>;
}

function SceneOrchestrator({ activeFilter, mouseState }: SceneOrchestratorProps) {
  const { camera, clock } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const { startTransition } = usePageTransition();

  const currentMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Subtle focal zoom without displacing Y bounds
    const trigger = ScrollTrigger.create({
      trigger: '#constellation-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        camera.position.z = 6.2 + self.progress * 0.4;
        camera.lookAt(0, 0, 0);
      },
    });

    return () => {
      trigger.kill();
    };
  }, [camera]);

  useFrame(() => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();

    // Smooth inertial lerp for mouse parallax
    currentMouse.current.x = THREE.MathUtils.lerp(
      currentMouse.current.x,
      mouseState.current.targetX,
      0.06
    );
    currentMouse.current.y = THREE.MathUtils.lerp(
      currentMouse.current.y,
      mouseState.current.targetY,
      0.06
    );

    const targetRotY =
      time * 0.035 +
      mouseState.current.dragY +
      currentMouse.current.x * 0.35;
    const targetRotX =
      Math.sin(time * 0.025) * 0.04 +
      mouseState.current.dragX -
      currentMouse.current.y * 0.25;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY,
      0.08
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      0.08
    );
  });

  const handleNodeClick = (slug: string, clientX?: number, clientY?: number) => {
    const x = clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
    const y = clientY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
    startTransition(`/work/${slug}`, x, y);
  };

  return (
    <>
      <ambientLight intensity={0.9} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, -10, -5]} intensity={0.6} color="#38bdf8" />

      <group ref={groupRef}>
        <AstrolabeRings />
        <GeodesicEdges activeFilter={activeFilter} hoveredSlug={hoveredSlug} />
        {hoveredSlug && <ActiveNodeConnections hoveredSlug={hoveredSlug} />}
        <SynapticPhotons activeFilter={activeFilter} hoveredSlug={hoveredSlug} />

        {projectsMetadata.map((project) => {
          const position = sphericalPositions[project.slug];
          if (!position) return null;
          return (
            <ConstellationNode
              key={project.slug}
              project={project}
              position={position}
              activeFilter={activeFilter}
              isHovered={hoveredSlug === project.slug}
              onNodeClick={handleNodeClick}
              onHover={setHoveredSlug}
            />
          );
        })}
      </group>
    </>
  );
}

export default function ConstellationScene({ activeFilter }: { activeFilter: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseState = useRef({
    targetX: 0,
    targetY: 0,
    isDown: false,
    lastX: 0,
    lastY: 0,
    dragX: 0,
    dragY: 0,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    mouseState.current.isDown = true;
    mouseState.current.lastX = e.clientX;
    mouseState.current.lastY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mouseState.current.targetX = x;
    mouseState.current.targetY = y;

    if (mouseState.current.isDown) {
      const dx = (e.clientX - mouseState.current.lastX) * 0.005;
      const dy = (e.clientY - mouseState.current.lastY) * 0.005;
      mouseState.current.dragY += dx;
      mouseState.current.dragX += dy;
      mouseState.current.lastX = e.clientX;
      mouseState.current.lastY = e.clientY;
    }
  };

  const handlePointerUp = () => {
    mouseState.current.isDown = false;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="absolute inset-0 z-0 w-full h-full pointer-events-auto bg-transparent cursor-grab active:cursor-grabbing"
    >
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <SceneOrchestrator activeFilter={activeFilter} mouseState={mouseState} />
      </Canvas>
    </div>
  );
}
