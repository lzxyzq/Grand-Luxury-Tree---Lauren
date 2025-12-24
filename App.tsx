import React, { useState, Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sparkles } from '@react-three/drei';
import { GestureController } from './components/GestureController';
import { LuxuryTree } from './components/LuxuryTree';
import { Environment } from './components/Environment';
import { GestureState, InteractionRefs } from './types';
import * as THREE from 'three';

const Loader = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-luxury-900">
    <div className="text-luxury-gold font-display text-2xl animate-pulse tracking-[0.3em] text-center">
      INITIALIZING<br/>DESIGN ENVIRONMENT...
    </div>
  </div>
);

const StartScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-luxury-900/90 backdrop-blur-md transition-opacity duration-700">
    <div className="p-12 border border-luxury-gold/30 bg-black/40 text-center max-w-2xl mx-4">
        <h1 className="text-4xl md:text-6xl text-white font-display font-bold tracking-widest drop-shadow-[0_0_20px_rgba(255,215,0,0.3)] mb-2">
        GRAND LUXURY
        </h1>
        <h2 className="text-2xl md:text-3xl text-luxury-gold font-serif italic mb-8">
        Interactive Christmas Experience
        </h2>
        
        <div className="h-px w-32 bg-luxury-gold/50 mx-auto mb-8"></div>

        <button 
        onClick={onStart}
        className="group relative px-10 py-4 border border-luxury-gold bg-luxury-gold/10 hover:bg-luxury-gold/20 transition-all duration-300"
        >
        <span className="font-display text-luxury-gold tracking-[0.2em] uppercase text-sm group-hover:text-white transition-colors">
            Enter Experience
        </span>
        <div className="absolute inset-0 border border-luxury-gold opacity-50 scale-105 group-hover:scale-110 transition-transform duration-500"></div>
        </button>
        
        <p className="text-luxury-100/40 text-[10px] mt-6 font-sans tracking-widest uppercase">
        Enable Gesture Control for Full Magic
        </p>
    </div>
  </div>
);

// Toggle Switch Component
const ToggleSwitch: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
  <button 
    onClick={onToggle}
    className={`pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-full border border-luxury-gold/50 backdrop-blur-md transition-all duration-300 ${enabled ? 'bg-luxury-gold/20' : 'bg-black/40'}`}
  >
    <span className={`text-xs font-sans font-bold tracking-widest uppercase ${enabled ? 'text-luxury-gold' : 'text-gray-400'}`}>
      Gesture Control
    </span>
    <div className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-luxury-gold' : 'bg-gray-600'}`}>
      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform duration-300 ${enabled ? 'left-6' : 'left-1'}`} />
    </div>
  </button>
);

const UIOverlay: React.FC<{ 
  isLoading: boolean; 
  hasCamera: boolean; 
  gesture: GestureState;
  gesturesEnabled: boolean;
  setGesturesEnabled: (v: boolean) => void;
}> = ({ isLoading, hasCamera, gesture, gesturesEnabled, setGesturesEnabled }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8 animate-in fade-in duration-1000">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div className="text-left">
          <h1 className="text-4xl md:text-6xl text-white font-display font-bold tracking-widest drop-shadow-[0_0_20px_rgba(255,215,0,0.3)]">
            MERRY<br/>CHRISTMAS
          </h1>
          <h2 className="text-3xl md:text-5xl text-luxury-gold font-serif italic mt-2 tracking-wide">
             Lauren
          </h2>
          <div className="h-px w-24 bg-luxury-gold/60 mt-4 mb-2"></div>
          <p className="text-luxury-100 font-sans text-xs tracking-[0.2em] uppercase opacity-80">
            Architecting Wonder & Joy
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="hidden md:block border border-luxury-gold/30 px-4 py-2 bg-luxury-900/50 backdrop-blur-md rounded-sm mb-2">
            <span className="text-luxury-gold text-xs font-sans tracking-widest uppercase">
              Status: {isLoading ? 'Rendering...' : (gesturesEnabled ? (hasCamera ? 'Active' : 'No Camera') : 'Disabled')}
            </span>
          </div>
          <ToggleSwitch enabled={gesturesEnabled} onToggle={() => setGesturesEnabled(!gesturesEnabled)} />
        </div>
      </header>

      {/* Footer / Instructions */}
      <footer className="text-center pb-8">
        <div className="inline-block bg-luxury-900/40 backdrop-blur-xl border-t border-b border-luxury-gold/30 px-10 py-6 rounded-sm">
          <p className="text-luxury-100 font-serif text-xl md:text-2xl leading-relaxed">
            {gesture === GestureState.HAND_OPEN ? (
              <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500">
                ✨ Deconstructing Reality ✨
              </span>
            ) : gesture === GestureState.HEART_SHAPE ? (
              <span className="text-pink-400 drop-shadow-[0_0_15px_rgba(255,105,180,0.8)] transition-all duration-500 font-bold">
                ❤️ With Love ❤️
              </span>
            ) : (
              <span className="text-gray-300 transition-all duration-500 text-base md:text-lg font-light">
                {gesturesEnabled ? (
                  <>
                    <span className="text-luxury-gold font-medium">Open Hand</span> to deconstruct.<br/>
                    <span className="text-luxury-gold font-medium">Fist</span> to rotate & zoom.
                  </>
                ) : (
                  "Drag to rotate this structure."
                )}
              </span>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

// Component to handle Camera Zoom based on gestures
const CameraRig: React.FC<{ interactionRef: React.MutableRefObject<InteractionRefs>; gestureState: GestureState }> = ({ interactionRef, gestureState }) => {
  const { camera } = useThree();
  const targetZoom = useRef(22); // Start slightly further back to see the whole spire

  useFrame(() => {
    if (gestureState === GestureState.HAND_CLOSED) {
      // Read Zoom Delta
      const dZoom = interactionRef.current.zoom;
      if (Math.abs(dZoom) > 0.001) {
        targetZoom.current -= dZoom * 0.5; 
        targetZoom.current = Math.max(10, Math.min(targetZoom.current, 40));
        interactionRef.current.zoom *= 0.9;
      }
    }
    
    // Smoothly interpolate camera position
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZoom.current, 0.05);
  });
  
  return null;
};

export default function App() {
  // Gestures disabled by default. Enabling triggers camera request.
  const [gestureState, setGestureState] = useState<GestureState>(GestureState.IDLE);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gesturesEnabled, setGesturesEnabled] = useState(false); 
  const [hasStarted, setHasStarted] = useState(false);

  // Shared Mutable State for high-frequency interaction data
  const interactionRef = useRef<InteractionRefs>({ rotation: 0, zoom: 0 });

  // Fallback for mouse interaction if camera fails or user prefers mouse
  const handlePointerDown = () => !gesturesEnabled && setGestureState(GestureState.HAND_OPEN);
  const handlePointerUp = () => !gesturesEnabled && setGestureState(GestureState.HAND_CLOSED);

  const startExperience = () => {
    setHasStarted(true);
    // Note: We do not auto-enable gestures here anymore. 
    // User must explicitly toggle it in the UI to request camera.
  };

  return (
    <div className="w-full h-screen bg-luxury-900 relative overflow-hidden select-none"
         onPointerDown={handlePointerDown}
         onPointerUp={handlePointerUp}
         onPointerLeave={handlePointerUp}
    >
      
      {isLoading && <Loader />}

      {!isLoading && !hasStarted && (
        <StartScreen onStart={startExperience} />
      )}
      
      {hasStarted && (
        <UIOverlay 
            isLoading={isLoading} 
            hasCamera={cameraAllowed} 
            gesture={gestureState}
            gesturesEnabled={gesturesEnabled}
            setGesturesEnabled={setGesturesEnabled}
        />
      )}

      <GestureController 
        enabled={gesturesEnabled && hasStarted}
        onGestureChange={setGestureState} 
        onCameraStatusChange={setCameraAllowed}
        onLoadingChange={setIsLoading}
        interactionRef={interactionRef}
      />

      <Canvas
        camera={{ position: [0, 0, 22], fov: 40 }}
        dpr={[1, 2]} 
        gl={{ antialias: false, toneMapping: 3 }} 
        shadows
        className="touch-none"
      >
        <Suspense fallback={null}>
          <Environment />
          
          <CameraRig interactionRef={interactionRef} gestureState={gestureState} />
          
          <LuxuryTree gestureState={gestureState} interactionRef={interactionRef} />

          {/* Magical Ambient Sparkles */}
          <Sparkles 
            count={200} 
            scale={25} 
            size={3} 
            speed={0.4} 
            opacity={0.4} 
            color="#fff" 
            noise={0.1}
          />
          
          <OrbitControls 
            enablePan={false} 
            enableZoom={!gesturesEnabled} 
            enableRotate={!gesturesEnabled || (gestureState !== GestureState.HAND_CLOSED && gestureState !== GestureState.HEART_SHAPE)} 
            minPolarAngle={Math.PI / 2.5} 
            maxPolarAngle={Math.PI / 1.8}
            minDistance={10}
            maxDistance={40}
            autoRotate={gestureState === GestureState.IDLE}
            autoRotateSpeed={0.3}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}