export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper to generate a point inside a 3D heart volume
const getHeartPosition = (scale: number): [number, number, number] => {
  let x = 0, y = 0, z = 0;
  let done = false;
  while (!done) {
    // Random point in box
    x = (Math.random() * 2 - 1) * 1.5;
    y = (Math.random() * 2 - 1) * 1.5;
    z = (Math.random() * 2 - 1) * 1.5;

    // Heart Surface Equation: (x^2 + 9/4y^2 + z^2 - 1)^3 - x^2z^3 - 9/80y^2z^3 <= 0
    // We swap Y and Z in the formula to make it stand upright in Three.js (Y is up)
    // Formula becomes: (x^2 + 9/4*z^2 + y^2 - 1)^3 - x^2*y^3 - 9/80*z^2*y^3 <= 0
    
    const a = x * x + 2.25 * z * z + y * y - 1;
    const result = a * a * a - x * x * y * y * y - 0.1125 * z * z * y * y * y;
    
    if (result <= 0) {
      done = true;
    }
  }
  // Scale and offset
  // Lowered from + 5 to + 0 to center it
  return [x * scale, y * scale, z * scale]; 
};

export const generateTreeParticles = (count: number) => {
  const particles = [];
  // Architectural proportions: Taller, more slender
  const height = 15;
  const radius = 4.5;
  
  for (let i = 0; i < count; i++) {
    // 1. Tree Logic (Spiral Cone)
    const p = i / count;
    const y = -height / 2 + p * height;
    const r = Math.pow((1 - p), 1.2) * radius;
    const angle = p * 65; 
    const randomR = r + (Math.random() - 0.5) * 0.3;
    const tx = Math.cos(angle) * randomR;
    const tz = Math.sin(angle) * randomR;
    const ty = y;

    // 2. Exploded Logic (Spherical Galaxy / Big Bang)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const exDist = randomRange(12, 30); 
    const ex = exDist * Math.sin(phi) * Math.cos(theta);
    const ey = exDist * Math.sin(phi) * Math.sin(theta);
    const ez = exDist * Math.cos(phi);

    // 3. Heart Logic
    const [hx, hy, hz] = getHeartPosition(8); // Scale 8

    particles.push({
      tree: [tx, ty, tz] as [number, number, number],
      exploded: [ex, ey, ez] as [number, number, number],
      heart: [hx, hy, hz] as [number, number, number],
      size: Math.random() * 0.15 + 0.05,
      speed: Math.random() * 0.02 + 0.02
    });
  }
  return particles;
};