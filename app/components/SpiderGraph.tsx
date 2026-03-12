"use client";

import { useRef, useMemo, Suspense, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Text, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Line2 } from "three-stdlib";
import type { PointStats, TrackingPointId } from "@/lib/types";
import { POINT_COLORS, POINT_Z_DEPTH } from "@/lib/types";
import { StatusUpdate } from "./StatusUpdate";
import { NewsHeadlines } from "./NewsHeadlines";
import { useBranch } from "@/app/context/BranchContext";

const TRACKING_POINTS: TrackingPointId[] = [
  "Love and Awareness",
  "Mindfulness",
  "Intelligence",
  "Cool",
  "Technical Ability",
  "Physical Presence",
];

/** Get position for a point: angle from index, distance from score (0–100), Z from world-value + optional news delta */
function getPointPosition(
  index: number,
  maxRadius: number,
  score: number,
  zDeltas?: Partial<Record<TrackingPointId, number>>
): [number, number, number] {
  const angle =
    (index / TRACKING_POINTS.length) * Math.PI * 2 - Math.PI / 2;
  const radius = maxRadius * (Math.min(100, Math.max(0, score)) / 100);
  const id = TRACKING_POINTS[index];
  const baseZ = POINT_Z_DEPTH[id];
  const delta = zDeltas?.[id] ?? 0;
  const z = baseZ + delta;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius, z];
}

// Animated edge with dual-layer glow + data pulse
function SpiderEdge({
  start,
  end,
  index,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  index: number;
  color: string;
}) {
  const lineRef = useRef<Line2 | null>(null);
  const points = useMemo(() => [start, end], [start, end]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.25 + index * 0.1;
    const obj = lineRef.current as { material?: { dashOffset?: number } } | null;
    if (obj?.material && "dashOffset" in obj.material)
      obj.material.dashOffset = -t * 0.12;
  });

  return (
    <group>
      {/* Outer glow */}
      <Line
        points={points}
        color={color}
        lineWidth={3}
        transparent
        opacity={0.2}
      />
      {/* Core bright line - dashed for data flow effect */}
      <Line
        ref={lineRef}
        points={points}
        color={color}
        lineWidth={1.2}
        dashed
        dashSize={0.08}
        gapSize={0.04}
      />
    </group>
  );
}

// Spider web: outer ring + radial spokes to center; positions based on score/100
function SpiderEdges({
  maxRadius,
  statsMap,
  zDeltas,
}: {
  maxRadius: number;
  statsMap: Map<TrackingPointId, PointStats>;
  zDeltas?: Partial<Record<TrackingPointId, number>>;
}) {
  const positions = useMemo(() => {
    return TRACKING_POINTS.map((id, i) => {
      const stats = statsMap.get(id);
      const score = stats?.heroStat ?? 50;
      return getPointPosition(i, maxRadius, score, zDeltas);
    });
  }, [maxRadius, statsMap, zDeltas]);

  const outerPoints = useMemo(() => {
    const pts = [...positions];
    pts.push(positions[0]);
    return pts;
  }, [positions]);

  const referenceRing = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < TRACKING_POINTS.length; i++) {
      pts.push(getPointPosition(i, maxRadius, 100, zDeltas));
    }
    pts.push(getPointPosition(0, maxRadius, 100, zDeltas));
    return pts;
  }, [maxRadius, zDeltas]);

  return (
    <group>
      {/* Reference ring at 100 - scale indicator */}
      <Line
        points={referenceRing}
        color="#22d3ee"
        lineWidth={0.4}
        transparent
        opacity={0.35}
      />
      {/* Spider polygon - connects points at their score-based positions */}
      <Line points={outerPoints} color="#22d3ee" lineWidth={0.8} />
      {/* Radial spokes to center - per-point color */}
      {TRACKING_POINTS.map((_, i) => (
        <SpiderEdge
          key={`spoke-${i}`}
          start={positions[i]}
          end={[0, 0, 0]}
          index={i}
          color={POINT_COLORS[TRACKING_POINTS[i]]}
        />
      ))}
      {/* Outer ring segments - per-point color */}
      {TRACKING_POINTS.map((_, i) => {
        const next = (i + 1) % TRACKING_POINTS.length;
        return (
          <SpiderEdge
            key={`ring-${i}`}
            start={positions[i]}
            end={positions[next]}
            index={i + 10}
            color={POINT_COLORS[TRACKING_POINTS[i]]}
          />
        );
      })}
    </group>
  );
}

// Central hub node with terminal-style label - green sphere + glow
function CenterHub() {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !ringRef.current) return;
    const t = state.clock.elapsedTime * 0.12;
    meshRef.current.rotation.y = t;
    ringRef.current.rotation.x = Math.PI / 2;
    ringRef.current.rotation.z = t * 0.15;
    // Pulsing emissive glow
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat?.emissiveIntensity !== undefined) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 0.8) * 0.25;
      mat.emissiveIntensity = pulse;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y = t * 0.5;
    }
  });

  const termW = 0.24;
  const termH = 0.085;
  const termLeft = -termW / 2 + 0.02;
  const termTop = termH / 2 - 0.015;
  const lineHeight = 0.024;
  const fontSize = 0.0182; /* 0.013 * 1.4 = +40% */

  return (
    <group position={[0, 0, 0]}>
      {/* Soft outer glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Mid glow layer */}
      <mesh>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={0.6}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.116, 0.13, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Terminal window */}
      <group position={[0, -0.18, 0]}>
        <mesh position={[0, 0, -0.002]}>
          <planeGeometry args={[termW, termH]} />
          <meshBasicMaterial
            color="#0a0a12"
            transparent
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
        <Line
          points={[
            [-termW / 2, termH / 2, 0.001],
            [termW / 2, termH / 2, 0.001],
            [termW / 2, -termH / 2, 0.001],
            [-termW / 2, -termH / 2, 0.001],
            [-termW / 2, termH / 2, 0.001],
          ]}
          color="#22d3ee"
          lineWidth={0.5}
          transparent
          opacity={0.6}
        />
        <Text
          position={[termLeft, termTop, 0.002]}
          fontSize={fontSize}
          color="#22d3ee"
          anchorX="left"
          anchorY="top"
        >
          MCGRAY, DREW
        </Text>
        <Text
          position={[termLeft, termTop - lineHeight, 0.002]}
          fontSize={fontSize * 0.9}
          color="#22d3ee"
          anchorX="left"
          anchorY="top"
        >
          ASSET ID: 10211647-BUILD72
        </Text>
        <group position={[termLeft, termTop - lineHeight * 2, 0.002]}>
          <mesh position={[0.008, 0, 0]}>
            <sphereGeometry args={[0.004, 8, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <Text
            position={[0.022, 0, 0]}
            fontSize={fontSize * 0.9}
            color="#22d3ee"
            anchorX="left"
            anchorY="middle"
          >
            HOST ONLINE
          </Text>
        </group>
      </group>
    </group>
  );
}

// HUD-style node: octahedron + rings + wireframe + stat display
function SpiderNode({
  index,
  maxRadius,
  stats,
  isHovered,
  onHover,
  onClick,
  zDeltas,
}: {
  index: number;
  maxRadius: number;
  stats: PointStats | undefined;
  isHovered: boolean;
  onHover: (v: boolean) => void;
  onClick: () => void;
  zDeltas?: Partial<Record<TrackingPointId, number>>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const heroStat = stats?.heroStat ?? 50;
  const pos = useMemo(
    () => getPointPosition(index, maxRadius, heroStat, zDeltas),
    [index, maxRadius, heroStat, zDeltas]
  );

  useFrame((state) => {
    if (!meshRef.current || !ringRef.current) return;
    const t = state.clock.elapsedTime * 0.15 + index * 0.1;
    const pulse = 1 + Math.sin(t) * 0.04;
    meshRef.current!.scale.setScalar(pulse);
    ringRef.current.rotation.z = t * 0.12;
  });

  const pointId = TRACKING_POINTS[index];
  const color = POINT_COLORS[pointId];
  const size = 0.014 + (heroStat / 100) * 0.017;
  const ringSize = size * 1.8;
  const glowScale = isHovered ? 3.5 : 2.5 + (heroStat / 100) * 1;
  const glowOpacity = isHovered ? 0.25 : 0.08 + (heroStat / 100) * 0.08;

  const label =
    pointId === "Love and Awareness"
      ? "LOVE"
      : pointId === "Physical Presence"
        ? "PHYSICAL"
        : pointId === "Technical Ability"
          ? "TECHNICAL"
          : pointId.toUpperCase();

  return (
    <group position={pos}>
      {/* Glow halo - stronger when hovered or high score */}
      <mesh scale={glowScale}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={glowOpacity}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Outer targeting ring */}
      <mesh
        ref={ringRef}
        onClick={onClick}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <ringGeometry args={[ringSize, ringSize + 0.003, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHovered ? 0.9 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Core octahedron */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <octahedronGeometry args={[size, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.8 : 0.4}
          transparent
          opacity={0.95}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh
        onClick={onClick}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <octahedronGeometry args={[size * 1.02, 0]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={isHovered ? 0.9 : 0.3}
        />
      </mesh>
      {/* Stat badge - HUD readout */}
      <Text
        position={[0, -size - 0.021, 0]}
        fontSize={0.0165}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {isHovered ? `${heroStat}` : label}
      </Text>
    </group>
  );
}

function Scene({
  statsMap,
  hoveredIndex,
  setHoveredIndex,
  onPointClick,
  zDeltas,
}: {
  statsMap: Map<TrackingPointId, PointStats>;
  hoveredIndex: number | null;
  setHoveredIndex: (i: number | null) => void;
  onPointClick: (id: TrackingPointId) => void;
  zDeltas?: Partial<Record<TrackingPointId, number>>;
}) {
  const maxRadius = 1.1;

  return (
    <>
      <fog attach="fog" args={["#0a0a12", 2, 5]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[2, 2, 2]} intensity={1.2} color="#00ff88" />
      <pointLight position={[-2, -2, 2]} intensity={0.6} color="#0088ff" />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#00ffcc" />
      <SpiderEdges maxRadius={maxRadius} statsMap={statsMap} zDeltas={zDeltas} />
      <CenterHub />
      {TRACKING_POINTS.map((id, i) => (
        <SpiderNode
          key={id}
          index={i}
          maxRadius={maxRadius}
          stats={statsMap.get(id)}
          isHovered={hoveredIndex === i}
          onHover={(v) => setHoveredIndex(v ? i : null)}
          onClick={() => onPointClick(id)}
          zDeltas={zDeltas}
        />
      ))}
    </>
  );
}

export interface SpiderGraphProps {
  statsMap: Map<TrackingPointId, PointStats>;
  onPointClick: (id: TrackingPointId) => void;
}

export function SpiderGraph({ statsMap, onPointClick }: SpiderGraphProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [zDeltas, setZDeltas] = useState<Partial<Record<TrackingPointId, number>>>({});
  const { branchZDeltas } = useBranch();

  const effectiveZDeltas = branchZDeltas ?? zDeltas;

  const handleHeadlinesLoaded = useCallback(
    (_headlines: unknown, deltas: Record<string, number>) => {
      setZDeltas(deltas as Partial<Record<TrackingPointId, number>>);
    },
    []
  );

  return (
    <div className="spider-graph-hud relative w-full h-full min-h-[400px]">
      {/* HUD label */}
      <div className="absolute top-8 left-10 z-10 pointer-events-none">
        <span className="text-cyan-500/80 font-orbitron tracking-tight uppercase text-[0.72rem]">
          NEURAL PROFILE
        </span>
        <span className="ml-4 text-cyan-500/50 font-orbitron animate-pulse text-[0.72rem] tracking-tight">
          ● LIVE
        </span>
      </div>
      {/* Status updates - left edge */}
      <StatusUpdate />
      {/* News headlines - right edge */}
      <NewsHeadlines onHeadlinesLoaded={handleHeadlinesLoaded} />
      {/* Scanline overlay */}
      <div className="hud-scanlines" aria-hidden />
      {/* Canvas */}
      <div className="absolute inset-0 rounded overflow-hidden">
        <Canvas
          camera={{ position: [0, 0, 2.6], fov: 45 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#050508"]} />
          <Suspense fallback={null}>
            <OrbitControls
              enableZoom={true}
              enablePan={true}
              minDistance={1.2}
              maxDistance={4}
              autoRotate={true}
              autoRotateSpeed={0.35}
            />
            <Scene
              statsMap={statsMap}
              hoveredIndex={hoveredIndex}
              setHoveredIndex={setHoveredIndex}
              onPointClick={onPointClick}
              zDeltas={effectiveZDeltas}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
