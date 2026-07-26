export const DayNightCycle = {
  cycleDuration: 60, // 60s for a full cycle
  currentTime: 0,
  lastUpdate: 0,

  loadState() {
    const saved = localStorage.getItem("dayNightCycleState");
    if (saved) {
      const data = JSON.parse(saved);
      this.currentTime = data.currentTime || 0;
      this.lastUpdate = data.lastUpdate || Date.now();
    } else {
      // No saved data, start fresh
      this.currentTime = 0;
      this.lastUpdate = Date.now();
    }
  },

  saveState() {
    localStorage.setItem("dayNightCycleState", JSON.stringify({
      currentTime: this.currentTime,
      lastUpdate: this.lastUpdate
    }));
  },

  // Called each frame to increment time
  update() {
    const now = Date.now();
    const delta = (now - this.lastUpdate) / 1000;
    this.currentTime = (this.currentTime + delta) % this.cycleDuration;
    this.lastUpdate = now;
    this.saveState();
  },

  // Called once at startup if you want to simulate offline time
  updateOffline(seconds) {
    this.currentTime = (this.currentTime + seconds) % this.cycleDuration;
    this.lastUpdate = Date.now();
    this.saveState();
  },

  getBrightness() {
    // 0.2 to 1
    const t = this.currentTime / this.cycleDuration;
    return 0.2 + 0.8 * ((Math.cos(2 * Math.PI * (t - 0.5)) + 1) / 2);
  },

  getDigitalTime() {
    const t = this.currentTime / this.cycleDuration; // fraction 0..1
    const totalMinutes = t * 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  },

  drawHeadlights(ctx, carX, carY) {
    if (this.getBrightness() > 0.7) return;
    // same beam code
    ctx.save();
    const beamLength = 100;
    const beamWidth = 60;
    const frontX = carX + 60;
    const startY = carY - 10;

    const gradient = ctx.createRadialGradient(frontX, startY, 0, frontX, startY, beamLength);
    gradient.addColorStop(0, "rgba(255,255,200,0.8)");
    gradient.addColorStop(1, "rgba(255,255,200,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(frontX, startY);
    ctx.lineTo(frontX + beamLength, startY - beamWidth / 2);
    ctx.quadraticCurveTo(frontX + beamLength - 20, startY, frontX + beamLength, startY + beamWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};