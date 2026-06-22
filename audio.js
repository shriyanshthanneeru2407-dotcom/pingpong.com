class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
  }

  // Initialize AudioContext on user interaction
  async init() {
    if (this.initialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Resume if suspended (common in browsers)
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.initialized = true;
      console.log("Audio Engine Initialized Successfully.");
    } catch (e) {
      console.warn("Web Audio API not supported or blocked in this browser:", e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  setMuted(muted) {
    this.muted = muted;
  }

  createOscillator(type, startFreq, endFreq, sweepDuration, startGain, decayDuration) {
    if (!this.initialized || this.muted || !this.ctx) return null;

    // Ensure context is running (can be suspended if user leaves tab)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    
    // Frequency sweep
    if (endFreq && sweepDuration) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + sweepDuration);
    }

    // Gain envelope
    gainNode.gain.setValueAtTime(startGain, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + decayDuration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + decayDuration);

    return { osc, gainNode };
  }

  // Play the iconic wooden table bounce sound ("plock")
  playTableBounce() {
    // Primary wood block simulator
    this.createOscillator('triangle', 520, 260, 0.07, 0.45, 0.08);
    // Secondary plastic shell click (high freq overlay)
    this.createOscillator('sine', 1100, 750, 0.03, 0.12, 0.04);
  }

  // Play rubber paddle hit sound ("tuck")
  playPaddleHit() {
    // Rubbery bounce, slightly higher pitch, shorter decay
    this.createOscillator('sine', 640, 320, 0.05, 0.5, 0.07);
    // Add a quick mid-frequency triangle burst for texture
    this.createOscillator('triangle', 400, 200, 0.04, 0.15, 0.05);
  }

  // Play edge or boundary wall hit ("thud")
  playWallHit() {
    this.createOscillator('sine', 280, 140, 0.12, 0.35, 0.15);
  }

  // Play score points melody
  playScore() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    
    // Play a happy double chime
    setTimeout(() => {
      this.createOscillator('sine', 587.33, 587.33, 0.08, 0.3, 0.15); // D5
    }, 0);

    setTimeout(() => {
      this.createOscillator('sine', 880.00, 880.00, 0.08, 0.3, 0.2);  // A5
    }, 100);
  }

  // Play Game Over sequence (win or lose)
  playGameOver(win) {
    if (!this.initialized || this.muted || !this.ctx) return;

    if (win) {
      // Upward arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.createOscillator('sine', freq, freq, 0.1, 0.2, 0.25);
        }, idx * 120);
      });
    } else {
      // Downward dissonant sweep
      const notes = [311.13, 293.66, 277.18, 233.08, 196.00]; // Eb4, D4, Db4, Bb3, G3
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.createOscillator('triangle', freq, freq - 30, 0.18, 0.25, 0.3);
        }, idx * 180);
      });
    }
  }
}

// Export single instance
const gameAudio = new AudioEngine();
export default gameAudio;
