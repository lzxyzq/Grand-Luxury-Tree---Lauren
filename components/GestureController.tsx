import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureState, InteractionRefs } from '../types';

interface GestureControllerProps {
  enabled: boolean;
  onGestureChange: (state: GestureState) => void;
  onCameraStatusChange: (allowed: boolean) => void;
  onLoadingChange: (loading: boolean) => void;
  interactionRef: React.MutableRefObject<InteractionRefs>;
}

export const GestureController: React.FC<GestureControllerProps> = ({
  enabled,
  onGestureChange,
  onCameraStatusChange,
  onLoadingChange,
  interactionRef
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTime = useRef<number>(-1);
  
  // Tracking previous frames for deltas
  const lastWristPos = useRef<{ x: number, size: number } | null>(null);

  // Initialize MediaPipe
  useEffect(() => {
    const initLandmarker = async () => {
      onLoadingChange(true);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2 // Enable 2 hands for Heart gesture
        });
        setLandmarker(handLandmarker);
        onLoadingChange(false);
      } catch (error) {
        console.error("Error loading MediaPipe:", error);
        onLoadingChange(false);
      }
    };
    initLandmarker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start Camera
  const enableCam = async () => {
    if (!landmarker) return;

    try {
      const constraints = { 
        video: {
          width: 640,
          height: 480
        } 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
        onCameraStatusChange(true);
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      onCameraStatusChange(false);
    }
  };

  const stopCam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
       const stream = videoRef.current.srcObject as MediaStream;
       stream.getTracks().forEach(track => track.stop());
       videoRef.current.srcObject = null;
    }
    onCameraStatusChange(false);
  };

  // Prediction Loop
  const predictWebcam = () => {
    if (!enabled || !landmarker || !videoRef.current) return;
    
    // Safety check
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    if (videoRef.current.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = videoRef.current.currentTime;
      const startTimeMs = performance.now();
      
      const result = landmarker.detectForVideo(videoRef.current, startTimeMs);

      if (result.landmarks && result.landmarks.length > 0) {
        const hands = result.landmarks;
        let newState = GestureState.HAND_CLOSED;
        
        // --- HEART GESTURE DETECTION (Requires 2 hands) ---
        if (hands.length === 2) {
          const hand1 = hands[0];
          const hand2 = hands[1];
          
          // Index tips: 8, Thumb tips: 4
          const h1Index = hand1[8];
          const h2Index = hand2[8];
          const h1Thumb = hand1[4];
          const h2Thumb = hand2[4];

          const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
          
          const indexDist = dist(h1Index, h2Index);
          const thumbDist = dist(h1Thumb, h2Thumb);
          
          // Thresholds need tuning based on camera distance, but 0.1 is usually a good starting point for normalized coords
          if (indexDist < 0.1 && thumbDist < 0.15) {
            newState = GestureState.HEART_SHAPE;
          }
        }

        // --- FALLBACK: SINGLE HAND LOGIC ---
        // If not forming a heart, check individual hands for Open/Closed
        if (newState !== GestureState.HEART_SHAPE) {
          // If ANY hand is Open, we treat it as Explode
          let anyHandOpen = false;
          
          // Also track the first hand for rotation/zoom manipulation
          const primaryHand = hands[0]; 
          
          for (const landmarks of hands) {
             const wrist = landmarks[0];
             const indexMcp = landmarks[5];
             const tips = [4, 8, 12, 16, 20];
             
             let avgTipDist = 0;
             for (const t of tips) {
                avgTipDist += Math.hypot(wrist.x - landmarks[t].x, wrist.y - landmarks[t].y);
             }
             avgTipDist /= 5;
             const palmSize = Math.hypot(wrist.x - indexMcp.x, wrist.y - indexMcp.y);
             const ratio = avgTipDist / (palmSize || 0.1);
             
             if (ratio > 1.4) {
               anyHandOpen = true;
             }
          }
          
          if (anyHandOpen) {
            newState = GestureState.HAND_OPEN;
            lastWristPos.current = null; // Stop manipulation if exploding
          } else {
            newState = GestureState.HAND_CLOSED;
            
            // Manipulation Logic (using primary hand)
            const wrist = primaryHand[0];
            const indexMcp = primaryHand[5];
            const palmSize = Math.hypot(wrist.x - indexMcp.x, wrist.y - indexMcp.y);
            
            const currentX = wrist.x;
            const currentSize = palmSize;

            if (lastWristPos.current) {
                const dx = currentX - lastWristPos.current.x;
                const dSize = currentSize - lastWristPos.current.size;
                interactionRef.current.rotation += dx * 10.0;
                interactionRef.current.zoom += dSize * 60.0;
            }
            lastWristPos.current = { x: currentX, size: currentSize };
          }
        } else {
            // If Heart, reset manipulation
            lastWristPos.current = null;
        }

        onGestureChange(newState);

      } else {
        // No hands detected
        onGestureChange(GestureState.HAND_CLOSED); // Default back to tree
        lastWristPos.current = null;
      }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  useEffect(() => {
    if (enabled && landmarker) {
      enableCam();
    } else {
      stopCam();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, landmarker]);

  return (
    <div className={`fixed bottom-4 right-4 w-32 h-24 border-2 border-luxury-gold rounded-lg overflow-hidden bg-black z-50 shadow-[0_0_15px_rgba(212,175,55,0.5)] transition-opacity duration-300 ${enabled ? 'opacity-50 hover:opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <video ref={videoRef} className="w-full h-full object-cover -scale-x-100" autoPlay playsInline muted />
    </div>
  );
};