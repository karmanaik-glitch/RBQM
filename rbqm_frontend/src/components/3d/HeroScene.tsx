import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Float, PointMaterial, Points } from '@react-three/drei';
import * as THREE from 'three';

function GlobalGlobe() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create sphere points for the globe
  const spherePoints = useMemo(() => {
    const points = [];
    const radius = 5;
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const phi = Math.acos(-1 + (2 * i) / segments);
      for (let j = 0; j <= segments; j++) {
        const theta = Math.sqrt(segments * Math.PI) * phi;
        points.push(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.cos(phi),
          radius * Math.sin(theta) * Math.sin(phi)
        );
      }
    }
    return new Float32Array(points);
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.02) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[4.9, 64, 64]} />
        <meshBasicMaterial color="#020203" transparent opacity={0.8} />
      </mesh>
      
      {/* Wireframe outer layer */}
      <mesh>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial color="#0f172a" wireframe transparent opacity={0.15} />
      </mesh>
      
      {/* Particle shell */}
      <Points positions={spherePoints} stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#10b981" size={0.02} sizeAttenuation={true} depthWrite={false} opacity={0.4} />
      </Points>
      
      {/* glowing inner core */}
      <mesh>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={2} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

function DataNodes() {
  const nodesRef = useRef<THREE.Group>(null);
  const connectionsRef = useRef<THREE.LineSegments>(null);
  
  const { positions, nodeColors, linePositions, lineColors } = useMemo(() => {
    const nodeCount = 40;
    const radius = 5.2;
    const pos = [];
    const colors = [];
    
    // Generate nodes on the surface
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      
      pos.push(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi)
      );
      
      // Randomly color nodes emerald or blue
      const isEmerald = Math.random() > 0.5;
      const color = new THREE.Color(isEmerald ? '#10b981' : '#3b82f6');
      colors.push(color.r, color.g, color.b);
    }
    
    // Generate connections between nearby nodes
    const lPos = [];
    const lCol = [];
    for (let i = 0; i < nodeCount; i++) {
      const p1 = new THREE.Vector3(pos[i*3], pos[i*3+1], pos[i*3+2]);
      for (let j = i + 1; j < nodeCount; j++) {
        const p2 = new THREE.Vector3(pos[j*3], pos[j*3+1], pos[j*3+2]);
        if (p1.distanceTo(p2) < 4) { // Connect if close
          lPos.push(p1.x, p1.y, p1.z);
          lPos.push(p2.x, p2.y, p2.z);
          
          // Interpolate colors for lines
          const c1 = new THREE.Color(colors[i*3], colors[i*3+1], colors[i*3+2]);
          const c2 = new THREE.Color(colors[j*3], colors[j*3+1], colors[j*3+2]);
          lCol.push(c1.r, c1.g, c1.b);
          lCol.push(c2.r, c2.g, c2.b);
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
    if (nodesRef.current && connectionsRef.current) {
      nodesRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      nodesRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.02) * 0.2;
      
      connectionsRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      connectionsRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.02) * 0.2;
    }
  });

  return (
    <>
      <group ref={nodesRef}>
        {Array.from({ length: positions.length / 3 }).map((_, i) => (
          <Float key={i} speed={2} rotationIntensity={0} floatIntensity={0.5}>
            <mesh position={[positions[i*3], positions[i*3+1], positions[i*3+2]]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial 
                color={new THREE.Color(nodeColors[i*3], nodeColors[i*3+1], nodeColors[i*3+2])}
                emissive={new THREE.Color(nodeColors[i*3], nodeColors[i*3+1], nodeColors[i*3+2])}
                emissiveIntensity={2}
              />
            </mesh>
          </Float>
        ))}
      </group>
      
      <lineSegments ref={connectionsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={linePositions.length / 3} array={linePositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={lineColors.length / 3} array={lineColors} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.3} />
      </lineSegments>
    </>
  );
}

function Atmosphere() {
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.getElapsedTime() * 2) * 0.02;
      glowRef.current.scale.set(scale, scale, scale);
    }
  });
  
  return (
    <mesh ref={glowRef}>
      <sphereGeometry args={[5.5, 32, 32]} />
      <meshBasicMaterial color="#10b981" transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

export default function HeroScene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={45} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#10b981" />
        <pointLight position={[-10, -10, -10]} intensity={2} color="#3b82f6" />
        
        <Stars radius={100} depth={50} count={4000} factor={4} saturation={0} fade speed={0.5} />
        
        <group position={[4, 0, 0]}>
          <GlobalGlobe />
          <DataNodes />
          <Atmosphere />
        </group>
        
        <fog attach="fog" args={['#020203', 10, 30]} />
      </Canvas>
    </div>
  );
}
