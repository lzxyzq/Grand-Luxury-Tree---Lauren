import React, { useMemo } from 'react';
import { Stars, MeshReflectorMaterial, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const VirgoGalaxy = ({ count = 2000, radius = 40, colors = ['#ff0000', '#00ff00', '#ffd700'] }) => {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Galaxy Spiral Logic
      const branchAngle = (i % 3) * ((2 * Math.PI) / 3);
      const spin = Math.random() * 10; 
      const dist = Math.pow(Math.random(), 0.5) * radius; 
      
      const x = Math.cos(branchAngle + spin) * dist;
      const y = (Math.random() - 0.5) * (dist / 3); 
      const z = Math.sin(branchAngle + spin) * dist;

      p[i * 3] = x;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = z;

      // Colors 
      const mixedColor = color.set(colors[Math.floor(Math.random() * colors.length)]);
      mixedColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
      
      c[i * 3] = mixedColor.r * 1.2; 
      c[i * 3 + 1] = mixedColor.g * 1.2;
      c[i * 3 + 2] = mixedColor.b * 1.2;
    }
    return { positions: p, colors: c };
  }, [count, radius, colors]);

  const ref = React.useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if(ref.current) {
        ref.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={points.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={points.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.15} sizeAttenuation transparent vertexColors blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
};

export const Environment: React.FC = () => {
  return (
    <>
      {/* Dark Green/Black Background */}
      <color attach="background" args={['#000a05']} />
      
      {/* Christmas Galaxy Layers */}
      <group rotation={[0.5, 0, 0.2]} position={[0, 0, -20]}>
        {/* Main Galaxy - Red/Green/Gold */}
        <VirgoGalaxy count={4000} radius={60} colors={['#b30000', '#006600', '#ffcc00']} />
        <Float speed={1} rotationIntensity={0.2} floatIntensity={2}>
            <group position={[30, 10, -20]} rotation={[1, 1, 0]}>
                {/* Distant Galaxy - Sparkles */}
                <VirgoGalaxy count={2000} radius={30} colors={['#ffffff', '#ff0000', '#00ff00']} />
            </group>
        </Float>
      </group>

      <Stars radius={150} depth={50} count={3000} factor={4} saturation={1.0} fade speed={0.5} />

      {/* Deep Green Architectural Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -9, 0]}>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={80} 
          roughness={0.4} 
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#011a0a" // Very dark pine green
          metalness={0.9}
          mirror={0.8}
        />
      </mesh>

      {/* Lighting Setup */}
      <ambientLight intensity={0.2} color="#001100" />
      
      {/* Red and Green Spotlights */}
      <pointLight position={[20, 10, 20]} intensity={2.0} color="#ff0000" distance={60} decay={2} />
      <pointLight position={[-20, 5, -10]} intensity={2.0} color="#00ff00" distance={60} decay={2} />
      <pointLight position={[0, -5, 10]} intensity={1.5} color="#ffd700" distance={40} decay={2} />
      
      {/* Warm White Top Light */}
      <spotLight 
        position={[0, 40, 0]} 
        angle={0.6} 
        penumbra={0.5} 
        intensity={5} 
        color="#fff5e6" 
      />

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.6} 
          mipmapBlur 
          intensity={2.0} 
          radius={0.7}
        />
        <ChromaticAberration 
            offset={new THREE.Vector2(0.002, 0.002)} 
            radialModulation={false}
            modulationOffset={0}
        />
        <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};