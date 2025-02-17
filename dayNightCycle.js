// dayNightCycle.js
export const DayNightCycle = {
  cycleDuration: 60, // Total cycle length in seconds (30 sec day, 30 sec night for testing)
  currentTime: 0, // in seconds

  // Update cycle based on deltaTime (in seconds)
  update(deltaTime) {
    this.currentTime = (this.currentTime + deltaTime) % this.cycleDuration;
  },

  // Returns a brightness factor between 0.5 (night) and 1 (day)
  // Using a cosine interpolation: at t=0 (day) brightness=1, at t=0.5 (night) brightness=0.5.
  getBrightness() {
    const t = this.currentTime / this.cycleDuration; // t from 0 to 1
    // brightness oscillates smoothly: 0.75 + 0.25*cos(2πt)
    return 0.75 + 0.25 * Math.cos(2 * Math.PI * t);
  },

  // Returns a digital time string in 24-hour format based on the cycle progress.
  // The full cycle maps to 24 hours.
  getDigitalTime() {
    const t = this.currentTime / this.cycleDuration; // 0 to 1 over a full day
    const totalMinutes = t * 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  },

  // Draws a curved headlight beam in front of the car on the road.
  // Parameters: ctx (CanvasRenderingContext2D), carX and carY represent the car's drawing position.
  drawHeadlights(ctx, carX, carY) {
    // Only draw headlights if it's night (brightness is low)
    if (this.getBrightness() > 0.7) return;

    ctx.save();
    // Define beam properties
    const beamLength = 100;
    const beamWidth = 60;
    // Assume the car's front is at carX + 60 (since car body is 60px wide in drawCar)
    const frontX = carX + 60;
    // Adjust the vertical starting point for the beam as needed.
    const startY = carY - 10;

    // Create a radial gradient for a soft beam effect.
    const gradient = ctx.createRadialGradient(frontX, startY, 0, frontX, startY, beamLength);
    gradient.addColorStop(0, "rgba(255,255,200,0.8)");
    gradient.addColorStop(1, "rgba(255,255,200,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    // Define the beam as a curved cone:
    ctx.moveTo(frontX, startY);
    // Draw to the right edge of the beam
    ctx.lineTo(frontX + beamLength, startY - beamWidth / 2);
    // Use a quadratic curve for a curved end edge
    ctx.quadraticCurveTo(frontX + beamLength - 20, startY, frontX + beamLength, startY + beamWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};
