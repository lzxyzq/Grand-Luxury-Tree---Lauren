export interface ParticleData {
  tree: [number, number, number];
  exploded: [number, number, number];
  heart: [number, number, number];
  size: number;
  speed: number;
}

export enum GestureState {
  IDLE = 'IDLE',
  DETECTING = 'DETECTING',
  HAND_OPEN = 'HAND_OPEN',   // Explode
  HAND_CLOSED = 'HAND_CLOSED', // Assemble & Manipulate
  HEART_SHAPE = 'HEART_SHAPE' // Form a Heart
}

export interface AppContextType {
  gestureState: GestureState;
  setGestureState: (state: GestureState) => void;
  cameraAllowed: boolean;
  setCameraAllowed: (allowed: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export interface InteractionRefs {
  rotation: number; // Accumulated rotation delta
  zoom: number;     // Accumulated zoom delta
}