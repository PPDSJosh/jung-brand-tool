# CG Jung Institute - Brand Asset Generator

A browser-based tool to generate animated brand assets with specific visual systems and colors.

## How to Run

Because this project uses ES Modules (`import`/`export`), you need to run it through a local web server. Opening `index.html` directly in the browser via file system usually won't work due to CORS security policies.

### Option 1: Python (Pre-installed on macOS)
1. Open a terminal in this folder.
2. Run: `python3 -m http.server`
3. Open your browser to `http://localhost:8000`

### Option 2: VS Code / Cursor Live Server
1. Install the "Live Server" extension.
2. Right-click `index.html` and select "Open with Live Server".

## Features
- **Halftone Pattern**: Organic circles driven by Perlin noise.
- **Brand Colors**: Strict adherence to the provided palette.
- **Effects**: Glitch, Geometric overlays.
- **Export**: Download high-res PNGs for Instagram.

## Customization
- Edit `js/constants.js` to update brand colors or add new presets.
- Edit `js/renderer.js` to tweak the visual effects.

