import gameAudio from './audio.js';

// Virtual coordinate space for physics consistency (16:10 aspect ratio)
const VIRT_WIDTH = 800;
const VIRT_HEIGHT = 500;

// Game State
const state = {
  playerScore: 0,
  aiScore: 0,
  winningScore: 11,
  difficulty: 'hard', // easy, hard, extreme
  status: 'menu', // menu, playing, paused, gameover
  controlScheme: 'mouse', // mouse, keyboard
  winner: null
};

// Difficulty Configurations
const aiConfigs = {
  easy: {
    maxSpeed: 4.0,
    reactChance: 0.65,
    errorMargin: 38,
    prediction: false
  },
  hard: {
    maxSpeed: 6.5,
    reactChance: 0.88,
    errorMargin: 12,
    prediction: false
  },
  extreme: {
    maxSpeed: 10.0,
    reactChance: 1.0,
    errorMargin: 0,
    prediction: true
  }
};

// Canvas & Context references
let canvas = null;
let ctx = null;
let animationFrameId = null;

// Screen Shake variables
let shakeDuration = 0;
let shakeIntensity = 0;

// Game Objects
const player = {
  x: 24,
  y: VIRT_HEIGHT / 2 - 45,
  width: 12,
  height: 90,
  score: 0,
  speed: 8.5
};

const ai = {
  x: VIRT_WIDTH - 36,
  y: VIRT_HEIGHT / 2 - 45,
  width: 12,
  height: 90,
  score: 0,
  targetY: VIRT_HEIGHT / 2 - 45,
  speed: 0
};

const ball = {
  x: VIRT_WIDTH / 2,
  y: VIRT_HEIGHT / 2,
  radius: 8,
  vx: 5,
  vy: 3,
  speed: 6.8,
  color: '#39ff14', // Neon Green
  trail: [] // Stores trailing positions
};

// Keyboard inputs
const keys = {};

// Spark particles
let particles = [];

// Initialize Canvas resolution
function initCanvas() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  // Set the high-definition canvas size (Retina sharp 2x scaling)
  canvas.width = 1600;
  canvas.height = 1000;
}

// Input Event Listeners
function setupInputs() {
  window.addEventListener('mousemove', (e) => {
    if (state.status !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    
    // Scale current mouse position back to virtual coordinate grid
    const virtualMouseY = (relativeY / rect.height) * VIRT_HEIGHT;
    player.y = Math.max(0, Math.min(VIRT_HEIGHT - player.height, virtualMouseY - player.height / 2));
  });

  canvas.addEventListener('touchmove', (e) => {
    if (state.status !== 'playing') return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const relativeY = touch.clientY - rect.top;
    
    const virtualTouchY = (relativeY / rect.height) * VIRT_HEIGHT;
    player.y = Math.max(0, Math.min(VIRT_HEIGHT - player.height, virtualTouchY - player.height / 2));
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(e.key)) {
      state.controlScheme = 'keyboard';
    }

    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (state.status === 'playing') {
        pauseGame();
      } else if (state.status === 'paused') {
        resumeGame();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });
}

// Trigger screen shake duration and amplitude
function triggerScreenShake(duration, intensity) {
  shakeDuration = duration;
  shakeIntensity = intensity;
}

// Generate collision particles
function createHitParticles(x, y, color) {
  const count = 15 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 4.5;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1.5 + Math.random() * 2.5,
      alpha: 1.0,
      decay: 0.02 + Math.random() * 0.03,
      color: color
    });
  }
}

// Update particle animation steps
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// Reset Ball launch
function resetBall(servingToPlayer) {
  ball.x = VIRT_WIDTH / 2;
  ball.y = VIRT_HEIGHT / 2 + (Math.random() * 100 - 50);
  ball.trail = [];
  
  const config = aiConfigs[state.difficulty];
  ball.speed = state.difficulty === 'extreme' ? 7.8 : 6.2;
  
  const direction = servingToPlayer ? -1 : 1;
  const launchAngle = (Math.random() * 24 - 12) * (Math.PI / 180); // max 12 degrees
  
  ball.vx = direction * ball.speed * Math.cos(launchAngle);
  ball.vy = ball.speed * Math.sin(launchAngle);
}

// AI Paddle Logic
function updateAI() {
  const config = aiConfigs[state.difficulty];
  ai.speed = config.maxSpeed;
  
  let targetY = ball.y;

  if (config.prediction && ball.vx > 0) {
    const paddleX = ai.x;
    const timeToHit = (paddleX - ball.x) / ball.vx;
    let predictedY = ball.y + ball.vy * timeToHit;

    // Simulate bouncing wall projections
    while (predictedY < ball.radius || predictedY > VIRT_HEIGHT - ball.radius) {
      if (predictedY < ball.radius) {
        predictedY = ball.radius + (ball.radius - predictedY);
      } else {
        predictedY = (VIRT_HEIGHT - ball.radius) - (predictedY - (VIRT_HEIGHT - ball.radius));
      }
    }
    targetY = predictedY;
  }

  if (Math.random() < config.reactChance) {
    const error = (Math.random() - 0.5) * config.errorMargin;
    ai.targetY = targetY + error - ai.height / 2;
  }

  const diffY = ai.targetY - ai.y;
  if (Math.abs(diffY) > 2) {
    if (diffY > 0) {
      ai.y += Math.min(diffY, ai.speed);
    } else {
      ai.y -= Math.min(Math.abs(diffY), ai.speed);
    }
  }

  ai.y = Math.max(0, Math.min(VIRT_HEIGHT - ai.height, ai.y));
}

// Player Keyboard tracking
function updatePlayerKeyboard() {
  if (state.controlScheme !== 'keyboard') return;

  if (keys['ArrowUp'] || keys['w'] || keys['W']) {
    player.y -= player.speed;
  }
  if (keys['ArrowDown'] || keys['s'] || keys['S']) {
    player.y += player.speed;
  }

  player.y = Math.max(0, Math.min(VIRT_HEIGHT - player.height, player.y));
}

// Main Physics Loop
function updatePhysics() {
  updatePlayerKeyboard();
  updateAI();

  // Save current position to the trail array
  ball.trail.unshift({ x: ball.x, y: ball.y });
  if (ball.trail.length > 7) {
    ball.trail.pop();
  }

  // Move Ball
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Collision: Top/Bottom bounds
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy;
    gameAudio.playTableBounce();
    createHitParticles(ball.x, ball.y, '#ffffff');
    triggerScreenShake(3, 1.5);
  } else if (ball.y + ball.radius >= VIRT_HEIGHT) {
    ball.y = VIRT_HEIGHT - ball.radius;
    ball.vy = -ball.vy;
    gameAudio.playTableBounce();
    createHitParticles(ball.x, ball.y, '#ffffff');
    triggerScreenShake(3, 1.5);
  }

  // Collision: Player Paddle
  if (ball.vx < 0) {
    if (ball.x - ball.radius <= player.x + player.width &&
        ball.x + ball.radius >= player.x &&
        ball.y + ball.radius >= player.y &&
        ball.y - ball.radius <= player.y + player.height) {
      
      const relativeIntersectY = (player.y + player.height / 2) - ball.y;
      const normalizedIntersectY = relativeIntersectY / (player.height / 2);
      const bounceAngle = normalizedIntersectY * (Math.PI / 3.1); // max ~58 degrees

      const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const nextSpeed = Math.min(currentSpeed * 1.06, 17.5);

      ball.vx = nextSpeed * Math.cos(bounceAngle);
      ball.vy = -nextSpeed * Math.sin(bounceAngle);
      ball.x = player.x + player.width + ball.radius; // push out
      
      gameAudio.playPaddleHit();
      createHitParticles(ball.x, ball.y, '#00f0ff');
      triggerScreenShake(4, 2.5);
    }
  }

  // Collision: AI Paddle
  if (ball.vx > 0) {
    if (ball.x + ball.radius >= ai.x &&
        ball.x - ball.radius <= ai.x + ai.width &&
        ball.y + ball.radius >= ai.y &&
        ball.y - ball.radius <= ai.y + ai.height) {
      
      const relativeIntersectY = (ai.y + ai.height / 2) - ball.y;
      const normalizedIntersectY = relativeIntersectY / (ai.height / 2);
      const bounceAngle = normalizedIntersectY * (Math.PI / 3.1);

      const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const nextSpeed = Math.min(currentSpeed * 1.06, 17.5);

      ball.vx = -nextSpeed * Math.cos(bounceAngle);
      ball.vy = -nextSpeed * Math.sin(bounceAngle);
      ball.x = ai.x - ball.radius; // push out

      gameAudio.playPaddleHit();
      createHitParticles(ball.x, ball.y, '#ff007f');
      triggerScreenShake(4, 2.5);
    }
  }

  // Scoring
  if (ball.x - ball.radius < 0) {
    state.aiScore++;
    showScoreToast('AI +1', 'ai');
    gameAudio.playScore();
    triggerScreenShake(12, 6.0);
    
    if (state.aiScore >= state.winningScore) {
      endGame(false);
    } else {
      resetBall(true);
    }
  } else if (ball.x + ball.radius > VIRT_WIDTH) {
    state.playerScore++;
    showScoreToast('PLAYER +1', 'player');
    gameAudio.playScore();
    triggerScreenShake(12, 6.0);
    
    if (state.playerScore >= state.winningScore) {
      endGame(true);
    } else {
      resetBall(false);
    }
  }

  updateParticles();
}

// Show animated float score toast
function showScoreToast(text, scorer) {
  const toast = document.getElementById('scoreToast');
  toast.innerText = text;
  toast.className = `score-toast active ${scorer}`;
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 1000);
}

// Render game scene
function render() {
  // Semi-transparent redraw to enable smooth motion blur trail
  ctx.fillStyle = 'rgba(5, 5, 11, 0.24)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  
  // Apply Screen Shake if active
  if (shakeDuration > 0) {
    const dx = (Math.random() - 0.5) * shakeIntensity;
    const dy = (Math.random() - 0.5) * shakeIntensity;
    ctx.translate(dx, dy);
    shakeDuration--;
    
    // Trigger CSS shake on game card for screen slam feedback
    const wrapper = document.getElementById('gameWrapper');
    if (wrapper && !wrapper.classList.contains('shake')) {
      wrapper.classList.add('shake');
      setTimeout(() => wrapper.classList.remove('shake'), 250);
    }
  }

  // Scale our drawing context to fit our virtual space coordinates
  ctx.scale(2, 2);

  // --- DRAW RETRO STATIC GRID lines ---
  ctx.save();
  ctx.strokeStyle = 'rgba(157, 0, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < VIRT_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIRT_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < VIRT_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIRT_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  // --- DRAW CENTER NET (Futuristic purple divider) ---
  ctx.save();
  ctx.strokeStyle = 'rgba(157, 0, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.setLineDash([12, 10]);
  ctx.moveTo(VIRT_WIDTH / 2, 0);
  ctx.lineTo(VIRT_WIDTH / 2, VIRT_HEIGHT);
  ctx.stroke();
  ctx.restore();

  // --- DRAW ARCADE LED SCOREBOARD ---
  ctx.save();
  ctx.fillStyle = 'rgba(157, 0, 255, 0.05)';
  ctx.font = `900 120px 'Orbitron'`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Player Score
  ctx.fillText(state.playerScore, VIRT_WIDTH / 4, VIRT_HEIGHT / 2);
  // AI Score
  ctx.fillText(state.aiScore, VIRT_WIDTH * 0.75, VIRT_HEIGHT / 2);
  ctx.restore();

  // --- DRAW BALL TRAIL GHOSTS (Motion Blur) ---
  ctx.save();
  for (let i = 0; i < ball.trail.length; i++) {
    const pos = ball.trail[i];
    const opacity = 0.28 - (i / ball.trail.length) * 0.24;
    const radius = ball.radius * (1.0 - (i / ball.trail.length) * 0.55);
    
    ctx.fillStyle = ball.color;
    ctx.globalAlpha = opacity;
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 8;
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- DRAW PLAYER PADDLE (Cyan Neon) ---
  ctx.save();
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.roundRect(player.x, player.y, player.width, player.height, 5);
  ctx.fill();
  ctx.restore();

  // --- DRAW AI PADDLE (Pink Neon) ---
  ctx.save();
  ctx.fillStyle = '#ff007f';
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.roundRect(ai.x, ai.y, ai.width, ai.height, 5);
  ctx.fill();
  ctx.restore();

  // --- DRAW BALL (Glowing Lime) ---
  ctx.save();
  ctx.fillStyle = ball.color;
  ctx.shadowColor = ball.color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- DRAW COLLISION PARTICLES ---
  ctx.save();
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  ctx.restore(); // Restore Translation
}

// Game Loop
function gameLoop() {
  if (state.status === 'playing') {
    updatePhysics();
  }
  render();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Menu Actions ---

export function startGame() {
  gameAudio.init();
  
  state.status = 'playing';
  state.playerScore = 0;
  state.aiScore = 0;
  
  player.y = VIRT_HEIGHT / 2 - player.height / 2;
  ai.y = VIRT_HEIGHT / 2 - ai.height / 2;
  
  resetBall(true);
  
  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('gameOverOverlay').classList.add('hidden');
  document.getElementById('pauseOverlay').classList.add('hidden');
  
  if (!animationFrameId) {
    gameLoop();
  }
}

export function pauseGame() {
  if (state.status !== 'playing') return;
  state.status = 'paused';
  document.getElementById('pauseOverlay').classList.remove('hidden');
}

export function resumeGame() {
  if (state.status !== 'paused') return;
  gameAudio.init();
  
  state.status = 'playing';
  document.getElementById('pauseOverlay').classList.add('hidden');
}

export function endGame(playerWon) {
  state.status = 'gameover';
  gameAudio.playGameOver(playerWon);
  
  const title = document.getElementById('gameOverTitle');
  const details = document.getElementById('gameOverDetails');
  
  if (playerWon) {
    title.innerText = 'VICTORY!';
    title.className = 'menu-title win';
    details.innerText = `You defeated the AI on ${state.difficulty.toUpperCase()}! Score: ${state.playerScore} - ${state.aiScore}`;
  } else {
    title.innerText = 'DEFEAT!';
    title.className = 'menu-title lose';
    details.innerText = `AI won the match on ${state.difficulty.toUpperCase()}! Score: ${state.playerScore} - ${state.aiScore}`;
  }
  
  document.getElementById('gameOverOverlay').classList.remove('hidden');
}

export function setDifficulty(diff) {
  if (!['easy', 'hard', 'extreme'].includes(diff)) return;
  state.difficulty = diff;
  
  const buttons = document.querySelectorAll('.diff-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-difficulty') === diff) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (state.status === 'playing') {
    const config = aiConfigs[diff];
    ai.speed = config.maxSpeed;
  }
}

// Event hooks on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  setupInputs();

  // Binds
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);
  
  document.querySelectorAll('#menuBtn, #menuBtnSecondary').forEach(btn => {
    btn.addEventListener('click', () => {
      state.status = 'menu';
      document.getElementById('gameOverOverlay').classList.add('hidden');
      document.getElementById('pauseOverlay').classList.add('hidden');
      document.getElementById('menuOverlay').classList.remove('hidden');
      render();
    });
  });

  // Difficulty Selector
  const diffBtns = document.querySelectorAll('.diff-btn');
  diffBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const diff = e.target.getAttribute('data-difficulty');
      setDifficulty(diff);
    });
  });

  // HUD Controls
  document.getElementById('hudPauseBtn').addEventListener('click', () => {
    if (state.status === 'playing') pauseGame();
  });

  const soundBtn = document.getElementById('hudSoundBtn');
  soundBtn.addEventListener('click', () => {
    gameAudio.init();
    const isMuted = gameAudio.toggleMute();
    
    const soundText = document.getElementById('soundBtnText');
    const soundIcon = document.getElementById('soundIcon');
    
    if (isMuted) {
      soundText.innerText = 'Sound: Off';
      soundIcon.innerHTML = `
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM12 4L9.91 6.09 12 8.18V4zm-7.78-.22L2.8 5.2 6.6 9H3v6h4l5 5v-6.8L16.2 18l1.42-1.42L4.22 3.78z"/>
      `;
    } else {
      soundText.innerText = 'Sound: On';
      soundIcon.innerHTML = `
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.74 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      `;
    }
  });

  // Set default state
  setDifficulty('hard');

  // Trigger first render
  setTimeout(() => {
    render();
  }, 100);
});
