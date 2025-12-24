import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';
import { generateTreeParticles } from '../utils/math';
import { GestureState, InteractionRefs } from '../types';

interface LuxuryTreeProps {
  gestureState: GestureState;
  interactionRef: React.MutableRefObject<InteractionRefs>;
}

// --- FIREWORKS SYSTEM ---
const Fireworks = ({ triggering }: { triggering: boolean }) => {
  const count = 300; 
  const rootRef = useRef<THREE.Group>(null);
  const [particles] = useState(() => {
    return new Array(count).fill(0).map(() => ({
      pos: new THREE.Vector3(0, 7.5, 0),
      vel: new THREE.Vector3(0, 0, 0),
      life: 0,
      maxLife: Math.random() * 1.5 + 0.5,
      color: new THREE.Color()
    }));
  });

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    if (triggering) {
      activeRef.current = true;
      particles.forEach(p => {
        p.pos.set(0, 7.5, 0); 
        p.vel.set(
            (Math.random() - 0.5), 
            (Math.random() - 0.5) + 0.5, 
            (Math.random() - 0.5)
        ).normalize().multiplyScalar(Math.random() * 0.8 + 0.4);
        p.life = 1.0;
        
        const rand = Math.random();
        if (rand > 0.66) p.color.set('#ff0033'); 
        else if (rand > 0.33) p.color.set('#00ff44'); 
        else p.color.set('#ffd700'); 
      });
    }
  }, [triggering, particles]);

  useFrame((state, delta) => {
    if (!meshRef.current || !activeRef.current) return;

    let activeCount = 0;

    particles.forEach((p, i) => {
      if (p.life > 0) {
        p.pos.add(p.vel);
        p.vel.y -= 0.02; 
        p.vel.multiplyScalar(0.98); 
        p.life -= delta * 1.0;

        dummy.position.copy(p.pos);
        const scale = Math.max(0, p.life);
        dummy.scale.setScalar(scale * 0.4);
        dummy.rotation.set(Math.random(), Math.random(), Math.random());
        dummy.updateMatrix();
        
        meshRef.current!.setMatrixAt(i, dummy.matrix);
        activeCount++;
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (activeCount === 0) activeRef.current = false;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <dodecahedronGeometry args={[0.2, 0]} />
      <meshStandardMaterial 
        toneMapped={false} 
        color="#fff"
        emissive="#ffaa00" 
        emissiveIntensity={2} 
      />
    </instancedMesh>
  );
};

const GoldenStar = ({ visible, progress }: { visible: boolean; progress: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.5;
      meshRef.current.rotation.z = Math.sin(state.clock.getElapsedTime()) * 0.1;
      
      let scaleTarget = 0;
      if (visible && progress > 0.96) {
        scaleTarget = 1.4;
      }
      meshRef.current.scale.lerp(new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget), 0.1);
    }
  });

  return (
    <Icosahedron ref={meshRef} args={[1, 1]} position={[0, 7.8, 0]}>
      <meshPhysicalMaterial 
        color="#ffcc00" 
        emissive="#ffcc00"
        emissiveIntensity={2}
        roughness={0.2}
        metalness={1}
        clearcoat={1}
      />
    </Icosahedron>
  );
};

export const LuxuryTree: React.FC<LuxuryTreeProps> = ({ gestureState, interactionRef }) => {
  const count = 6000; 
  const data = useMemo(() => generateTreeParticles(count), []);
  const pointsRef = useRef<THREE.Points>(null);
  const growthProgress = useRef(0);
  
  const prevGesture = useRef(gestureState);
  const [triggerFireworks, setTriggerFireworks] = useState(false);

  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const typeMap = useMemo(() => new Float32Array(count), [count]); 
  const colors = useMemo(() => new Float32Array(count * 3), [count]);

  const tempPos = new THREE.Vector3();
  const targetVec = new THREE.Vector3();

  // Initialize Palette
  useMemo(() => {
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      positions[i * 3] = data[i].tree[0];
      positions[i * 3 + 1] = data[i].tree[1];
      positions[i * 3 + 2] = data[i].tree[2];

      const r = Math.random();
      let type = 0; 
      if (r > 0.95) { type = 3; color.setHex(0xffffff); color.multiplyScalar(3.0); } 
      else if (r > 0.80) { type = 2; color.setHex(0xffd700); color.multiplyScalar(1.5); } 
      else if (r > 0.60) { type = 1; color.setHex(Math.random() > 0.5 ? 0xdc143c : 0xff0040); color.multiplyScalar(2.0); } 
      else { type = 0; const gVar = Math.random(); if (gVar > 0.7) color.setHex(0x50c878); else if (gVar > 0.3) color.setHex(0x228b22); else color.setHex(0x006400); color.multiplyScalar(0.8); }

      typeMap[i] = type;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
  }, [data, count, positions, colors, typeMap]);

  useFrame((state) => {
    if (prevGesture.current === GestureState.HAND_CLOSED && gestureState === GestureState.HAND_OPEN) {
        if (growthProgress.current > 0.5) {
            setTriggerFireworks(true);
            setTimeout(() => setTriggerFireworks(false), 100);
        }
    }
    prevGesture.current = gestureState;

    if (!pointsRef.current) return;

    const positionsAttribute = pointsRef.current.geometry.attributes.position;
    const colorsAttribute = pointsRef.current.geometry.attributes.color;
    
    const isExploding = gestureState === GestureState.HAND_OPEN;
    const isFist = gestureState === GestureState.HAND_CLOSED;
    const isHeart = gestureState === GestureState.HEART_SHAPE;
    
    const t = state.clock.getElapsedTime();

    // Growth/Mode Logic
    // We map growthProgress to: 0 = Exploded, 1 = Tree. 
    // Heart is a special override state.
    
    let targetGrowth = 0;
    if (isFist || isHeart) targetGrowth = 1; // Both assemble, but to different targets
    if (isExploding) targetGrowth = 0;

    const growthSpeed = isFist ? 0.04 : 0.08; 
    growthProgress.current = THREE.MathUtils.lerp(growthProgress.current, targetGrowth, growthSpeed);

    const currentGrowth = growthProgress.current;
    
    const tempColor = new THREE.Color(); 

    for (let i = 0; i < count; i++) {
      const particle = data[i];
      const normalizedHeight = i / count;
      const formThreshold = currentGrowth * 1.1; 
      const isForming = normalizedHeight < formThreshold;

      // --- POSITION ---
      tempPos.set(positionsAttribute.getX(i), positionsAttribute.getY(i), positionsAttribute.getZ(i));

      if (isHeart) {
         // --- HEART MODE ---
         targetVec.set(particle.heart[0], particle.heart[1], particle.heart[2]);
         // Pulse effect
         const pulse = 1 + Math.sin(t * 3) * 0.05;
         targetVec.multiplyScalar(pulse);
         tempPos.lerp(targetVec, 0.08); // Smooth transition to heart
      } 
      else if (!isForming) {
        // --- EXPLODED MODE ---
        targetVec.set(particle.exploded[0], particle.exploded[1], particle.exploded[2]);
        targetVec.y += Math.sin(t * 0.5 + i * 0.1) * 1.2;
        targetVec.x += Math.cos(t * 0.3 + i * 0.1) * 1.2;
        tempPos.lerp(targetVec, 0.08);
      } else {
        // --- TREE MODE ---
        targetVec.set(particle.tree[0], particle.tree[1], particle.tree[2]);
        
        // Spiral Snap
        const distToThreshold = formThreshold - normalizedHeight;
        if (distToThreshold < 0.25 && isFist) {
           const spinAngle = (distToThreshold) * Math.PI * 12; 
           const x = targetVec.x;
           const z = targetVec.z;
           targetVec.x = x * Math.cos(spinAngle) - z * Math.sin(spinAngle);
           targetVec.z = x * Math.sin(spinAngle) + z * Math.cos(spinAngle);
        }
        
        targetVec.y += Math.sin(t * 2 + i) * 0.04; 
        tempPos.lerp(targetVec, 0.15);
      }
      positionsAttribute.setXYZ(i, tempPos.x, tempPos.y, tempPos.z);

      // --- COLOR DYNAMICS ---
      
      if (isHeart) {
          // Pink/Ruby Gradient for Heart
          // Adjusted for new center at Y=0. Height range roughly -8 to +8.
          // (y + 8) / 16 gives a 0-1 range.
          const heartH = (tempPos.y + 8) / 16; 
          tempColor.setHSL(0.95 + heartH * 0.05, 1.0, 0.5 + Math.sin(t * 4 + i) * 0.2);
          tempColor.multiplyScalar(2.0); // Glow
      } else {
          // Standard Tree Colors
          const type = typeMap[i];
          if (type === 3) { // White
             tempColor.setHex(0xffffff).multiplyScalar(2.0 + Math.sin(t * 5 + i) * 1.0);
          } else if (type === 2) { // Gold
             tempColor.setHex(0xffd700).multiplyScalar(1.5 + Math.sin(t * 3 + i) * 0.5);
          } else if (type === 1) { // Red
             tempColor.setHex(0xdc143c).multiplyScalar(2.0 + Math.sin(t * 4 + i) * 0.2);
          } else { // Green
             const gVar = (i % 10) / 10;
             if (gVar > 0.7) tempColor.setHex(0x50c878);
             else if (gVar > 0.3) tempColor.setHex(0x228b22);
             else tempColor.setHex(0x006400);
             tempColor.multiplyScalar(0.8);
          }

          // Construction Edge
          if (isFist && isForming) {
             const distanceToEdge = formThreshold - normalizedHeight;
             if (distanceToEdge >= 0 && distanceToEdge < 0.15) {
                const intensity = 1 - (distanceToEdge / 0.15);
                tempColor.setHex(0xffd700); 
                tempColor.multiplyScalar(5.0 * intensity + 1.0); 
             } 
          } else if (isExploding) {
             tempColor.multiplyScalar(1.5);
          }
      }

      colorsAttribute.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }
    
    positionsAttribute.needsUpdate = true;
    colorsAttribute.needsUpdate = true;
    
    if (isExploding) {
       pointsRef.current.rotation.y += 0.0005;
    } else {
       // Auto rotate slightly faster in Heart mode for display
       const rotSpeed = isHeart ? 0.005 : 0.0015;
       
       const rotDelta = interactionRef.current.rotation;
       if (Math.abs(rotDelta) > 0.001) {
          pointsRef.current.rotation.y += rotDelta * 0.15; 
          interactionRef.current.rotation *= 0.90; 
       } else {
          pointsRef.current.rotation.y += rotSpeed; 
       }
    }
  });

  return (
    <group>
        <Points ref={pointsRef} positions={positions} colors={colors} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                vertexColors
                size={0.15} 
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
            />
        </Points>
        
        <Fireworks triggering={triggerFireworks} />
        {/* Star is hidden during Heart mode */}
        <GoldenStar visible={gestureState === GestureState.HAND_CLOSED} progress={growthProgress.current} />
    </group>
  );
};