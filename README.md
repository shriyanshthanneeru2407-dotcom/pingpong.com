# pingpong.com 🏓

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-supported-orange.svg)](https://developer.mozilla.org/en-US/docs/Glossary/HTML5)
[![CSS3](https://img.shields.io/badge/CSS3-supported-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JS](https://img.shields.io/badge/JavaScript-ES6-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio%20API-synthesized-brightgreen.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

A premium, responsive, retro-neon **2D Table Tennis Game** (Player vs. AI) built completely with vanilla HTML5, CSS3, and JavaScript. 

This game features three distinct levels of smart AI difficulty, a dynamic neon collision particle system, and high-fidelity sound effects programmatically synthesized using the **Web Audio API** (avoiding any external media file dependency).

---

## 🚀 Live Demo

You can access the live web deployment here:
**👉 [https://shriyanshthanneeru2407-dotcom.github.io/pingpong.com/](https://shriyanshthanneeru2407-dotcom.github.io/pingpong.com/)**

---

## ✨ Features

- **⚡ Real-time Sound Synthesis**: Sound effects are programmatically generated using oscillator waves and envelope gains (paddle hits sound soft and rubbery, table bounces sound like hard celluloid on wood, scores trigger chiptune arpeggios, and wins/losses play retro fanfares).
- **🕹️ Smart AI Modes**:
  - **Easy**: Smooth tracker with a low reaction rate and high tracking error margin.
  - **Hard**: Faster tracking with reduced latency and smaller error tolerance.
  - **Extreme**: Uses predictive physics calculations to calculate wall-bounce trajectories, moving perfectly to intercept the ball.
- **🌌 Neon-Synthwave Aesthetics**: Cyberpunk color palettes, CSS keyframe animations, glassmorphic menus (`backdrop-filter`), and dynamic trailing canvas refreshes.
- **✨ Particle Explosions**: Generates glowing neon sparks on paddle and boundary collisions.
- **📱 Responsive Layout**: Built with a static physical grid (`800x500`) that translates and scales automatically to match any mobile or desktop screen size.

---

## 🛠️ Tech Stack

- **Markup**: Semantic HTML5 & SVG Vector Icons
- **Styles**: Vanilla CSS3 (CSS Variables, Flexbox, Keyframes, Backdrop Filters)
- **Engine**: Client-side JavaScript (ES6 Modules, Canvas 2D API, Web Audio API)

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/shriyanshthanneeru2407-dotcom/pingpong.com.git
cd pingpong.com
```

### 2. Run a local web server
Since the project uses ES6 Modules, files must be served over HTTP rather than opened as a local file (`file://`).

You can use any light web server. For example:

**Using Python:**
```bash
python3 -m http.server 8080
```

**Using Node.js:**
```bash
npx http-server -p 8080
```

### 3. Open in Browser
Visit [http://localhost:8080](http://localhost:8080) to play!

---

## 🎮 How to Play

- **Mouse / Touch**: Move your cursor up and down or drag your finger on a touch screen to slide the **Left Paddle**.
- **Keyboard**: Move the paddle using the **Up/Down Arrow keys** or **W/S keys**.
- **Pause/Resume**: Press the **Spacebar** or click the Pause button on the HUD.
- **First to 11 points wins!**

---

## 📂 File Structure

```
pingpong.com/
│
├── index.html       # Game structure, overlay menus & SEO meta tag configurations
├── styles.css       # Neon glow styles, layout & glassmorphic menu designs
├── audio.js         # Web Audio API sound wave synthesis engine
├── game.js          # Main 60FPS loop, physics & AI intersection prediction
├── vercel.json      # Vercel deployment routing configurations
└── .gitignore       # Ignore system-specific files
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
