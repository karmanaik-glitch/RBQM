import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Float, PointMaterial, Points } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Uniformly distributed points on a sphere using the golden-angle method.
 * Produces a visually clean, even distribution with no spiral banding.
 */
function uniformSpherePoints(count: number, radius: number): Float32Array {
  const points: number[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    points.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }
  return new Float32Array(points);
}

/* ─── Core Globe ─── */
function GlobalGlobe() {
  const groupRef = useRef<THREE.Group>(null);

  const shellPoints = useMemo(() => uniformSpherePoints(2400, 5), []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.04;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.015) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Dark fill sphere */}
      <mesh>
        <sphereGeometry args={[4.9, 96, 96]} />
        <meshBasicMaterial color="#030306" transparent opacity={0.85} />
      </mesh>

      {/* Primary wireframe — fine grid */}
      <mesh>
        <sphereGeometry args={[5, 64, 64]} />
        <meshBasicMaterial color="#5E6AD2" wireframe transparent opacity={0.06} />
      </mesh>

      {/* Subtle second wireframe layer for depth */}
      <mesh>
        <sphereGeometry args={[5.02, 32, 32]} />
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.03} />
      </mesh>

      {/* Particle shell — even distribution */}
      <Points positions={shellPoints} stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#10b981" size={0.018} sizeAttenuation depthWrite={false} opacity={0.5} />
      </Points>

      {/* Inner core glow */}
      <mesh>
        <sphereGeometry args={[3.2, 64, 64]} />
        <meshStandardMaterial
          color="#5E6AD2"
          emissive="#5E6AD2"
          emissiveIntensity={1.5}
          transparent
          opacity={0.08}
        />
      </mesh>
    </group>
  );
}

/* ─── Site Data Nodes ─── */
function DataNodes() {
  const nodesRef = useRef<THREE.Group>(null);
  const connectionsRef = useRef<THREE.LineSegments>(null);

  const { positions, nodeColors, linePositions, lineColors } = useMemo(() => {
    const nodeCount = 36;
    const radius = 5.15;
    const pos: number[] = [];
    const colors: number[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < nodeCount; i++) {
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / nodeCount);
      pos.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );

      // Brand colors: alternating indigo and emerald
      const isIndigo = i % 3 === 0;
      const color = new THREE.Color(isIndigo ? '#5E6AD2' : '#10b981');
      colors.push(color.r, color.g, color.b);
    }

    // Connect nodes within proximity
    const lPos: number[] = [];
    const lCol: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const p1 = new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      for (let j = i + 1; j < nodeCount; j++) {
        const p2 = new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
        if (p1.distanceTo(p2) < 4) {
          lPos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
          const c1 = new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
          const c2 = new THREE.Color(colors[j * 3], colors[j * 3 + 1], colors[j * 3 + 2]);
          lCol.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
        }
      }
    }

    return {
      positions: new Float32Array(pos),
      nodeColors: new Float32Array(colors),
      linePositions: new Float32Array(lPos),
      lineColors: new Float32Array(lCol)
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (nodesRef.current) {
      nodesRef.current.rotation.y = t * 0.04;
      nodesRef.current.rotation.x = Math.sin(t * 0.015) * 0.15;
    }
    if (connectionsRef.current) {
      connectionsRef.current.rotation.y = t * 0.04;
      connectionsRef.current.rotation.x = Math.sin(t * 0.015) * 0.15;
    }
  });

  return (
    <>
      <group ref={nodesRef}>
        {Array.from({ length: positions.length / 3 }).map((_, i) => (
          <Float key={i} speed={1.5} rotationIntensity={0} floatIntensity={0.3}>
            <mesh position={[positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshStandardMaterial
                color={new THREE.Color(nodeColors[i * 3], nodeColors[i * 3 + 1], nodeColors[i * 3 + 2])}
                emissive={new THREE.Color(nodeColors[i * 3], nodeColors[i * 3 + 1], nodeColors[i * 3 + 2])}
                emissiveIntensity={2.5}
              />
            </mesh>
          </Float>
        ))}
      </group>

      <lineSegments ref={connectionsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[lineColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.2} />
      </lineSegments>
    </>
  );
}

/* ─── Breathing Atmosphere ─── */
function Atmosphere() {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const s = 1 + Math.sin(state.clock.getElapsedTime() * 1.5) * 0.015;
      glowRef.current.scale.set(s, s, s);
    }
  });

  return (
    <mesh ref={glowRef}>
      <sphereGeometry args={[5.6, 64, 64]} />
      <meshBasicMaterial
        color="#5E6AD2"
        transparent
        opacity={0.04}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ─── Ambient Floating Particles ─── */
function AmbientParticles() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 200; i++) {
      pts.push(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20 - 5
      );
    }
    return new Float32Array(pts);
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.008;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#5E6AD2"
        size={0.03}
        sizeAttenuation
        depthWrite={false}
        opacity={0.25}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

/* ─── Scene Root ─── */
export default function HeroScene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={45} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 8, 10]} intensity={1.5} color="#5E6AD2" />
        <pointLight position={[-10, -8, -10]} intensity={1} color="#10b981" />

        {/* Ambient dust instead of stars */}
        <AmbientParticles />

        <group position={[4, 0, 0]}>
          <GlobalGlobe />
          <DataNodes />
          <Atmosphere />
        </group>

        <fog attach="fog" args={['#020203', 12, 32]} />
      </Canvas>
    </div>
  );
}
