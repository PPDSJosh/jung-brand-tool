import { noise } from './utils.js';
import { BRAND_COLORS } from './constants.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 1080;
        this.height = 1080;
        this.time = 0;
        
        // Animation State for smoothing
        this.animVals = {
            amplitude: 0.3,
            frequency: 1.0,
            speed: 3.0,
            spread: 0.5,
            rotation: 0,
            centerX: 0.5,
            centerY: 0.5,
            autoPanXMin: 0,
            autoPanXMax: 1,
            autoPanXSpeed: 1,
            autoPanYMin: 0,
            autoPanYMax: 1,
            autoPanYSpeed: 1
        };
        
        this.raindrops = [];
        
        // Breath Cycle State
        this.breathVal = 0;
        this.breathTween = null;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    // Called before render to smooth parameters
    update(state) {
        if (!state.animation.enabled) return;

        // Check if GSAP is loaded
        if (typeof gsap === 'undefined') return;

        // Build target object conditionally based on loop flags
        const tweenTargets = {
            amplitude: state.animation.amplitude,
            frequency: state.animation.frequency,
            speed: state.animation.speed,
            spread: state.animation.spread,
            rotation: state.animation.rotation,
            autoPanXMin: state.animation.autoPanXMin,
            autoPanXMax: state.animation.autoPanXMax,
            autoPanXSpeed: state.animation.autoPanXSpeed,
            autoPanYMin: state.animation.autoPanYMin,
            autoPanYMax: state.animation.autoPanYMax,
            autoPanYSpeed: state.animation.autoPanYSpeed,
            duration: 0.5, // Smooth lag
            ease: "power2.out",
            overwrite: "auto"
        };

        if (!state.animation.autoPanX) {
            tweenTargets.centerX = state.animation.centerX;
        }
        if (!state.animation.autoPanY) {
            tweenTargets.centerY = state.animation.centerY;
        }

        // Smoothly interpolate physics parameters when user slides controls
        gsap.to(this.animVals, tweenTargets);

        // Manage Breathe Cycle if active
        if (state.animation.pattern === 'breathe') {
            if (!this.breathTween || this.breathTween.duration() !== (2 / (this.animVals.speed || 1))) { 
                if (this.breathTween) this.breathTween.kill();
                
                const duration = Math.max(0.2, 5 / (this.animVals.speed || 1));
                
                this.breathTween = gsap.to(this, {
                    breathVal: 1,
                    duration: duration,
                    yoyo: true,
                    repeat: -1,
                    ease: state.animation.ease !== 'none' ? state.animation.ease : "sine.inOut"
                });
            }
        } else {
            if (this.breathTween) {
                this.breathTween.kill();
                this.breathTween = null;
                this.breathVal = 0;
            }
        }
    }

    render(state) {
        if (state.animation.enabled && typeof gsap !== 'undefined') {
            // Increment time based on smoothed speed
            const speedFactor = this.animVals.speed / 1000; 
            this.time += speedFactor;
            
            // Handle Auto-Pan Loop (Sine Wave Oscillation)
            if (state.animation.autoPanX) {
                const min = this.animVals.autoPanXMin;
                const max = this.animVals.autoPanXMax;
                const loopSpeed = this.animVals.autoPanXSpeed;
                
                // Oscillate 0 to 1
                // Use this.time * loopSpeed * baseMultiplier
                // Increased base multiplier from 0.5 to 4.0 to match animation ripple speed
                const osc = 0.5 + 0.5 * Math.sin(this.time * 4.0 * loopSpeed);
                
                // Map 0-1 to min-max
                this.animVals.centerX = min + osc * (max - min);
            }
            
            if (state.animation.autoPanY) {
                const min = this.animVals.autoPanYMin;
                const max = this.animVals.autoPanYMax;
                const loopSpeed = this.animVals.autoPanYSpeed;

                const phase = state.animation.autoPanX ? (Math.PI / 2) : 0;
                const osc = 0.5 + 0.5 * Math.sin(this.time * 4.0 * loopSpeed + phase);
                
                this.animVals.centerY = min + osc * (max - min);
            }

            // Update Raindrops logic
            if (state.animation.pattern === 'rain') {
                // Probability based on Frequency and Speed
                const spawnProb = 0.01 * this.animVals.frequency * (this.animVals.speed / 3);
                
                if (Math.random() < spawnProb) {
                    const drop = {
                        x: Math.random() * this.width,
                        y: Math.random() * this.height,
                        radius: 0,
                        alpha: 1,
                        maxRadius: 100 + Math.random() * 200 // Variation
                    };
                    this.raindrops.push(drop);
                    
                    // Animate drop using GSAP
                    const duration = 2 + Math.random();
                    const ease = state.animation.ease !== 'none' ? state.animation.ease : "power2.out";
                    
                    gsap.to(drop, {
                        radius: drop.maxRadius,
                        alpha: 0,
                        duration: duration,
                        ease: ease,
                        onComplete: () => {
                            const idx = this.raindrops.indexOf(drop);
                            if (idx > -1) this.raindrops.splice(idx, 1);
                        }
                    });
                }
            } else {
                if (this.raindrops.length > 0 && state.animation.pattern !== 'rain') {
                     this.raindrops = []; 
                }
            }
        } else if (state.animation.enabled) {
            // Fallback if GSAP missing
            this.time += 0.005;
        }

        const { ctx, width, height } = this;
        ctx.clearRect(0, 0, width, height);

        // --- LAYER 1: Background ---
        ctx.globalCompositeOperation = 'source-over';
        this.drawBackground(state);

        // --- LAYER 2: Halftones ---
        if (state.halftone1.enabled) {
            ctx.globalCompositeOperation = state.halftone1.blendMode || 'color-dodge';
            this.drawHalftone(state.halftone1, state.animation);
        }
        // halftone2 removed

        // --- LAYER 3: Dark Overlay ---
        if (state.darkOverlay && state.darkOverlay.enabled) {
            ctx.globalCompositeOperation = state.darkOverlay.blendMode || 'soft-light';
            this.drawDarkOverlay(state.darkOverlay);
        }

        // --- LAYER 4: Glitch (Removed) ---
        // if (state.glitch.enabled) {
        //     ctx.globalCompositeOperation = 'source-over'; 
        //     this.drawGlitch(state.glitch);
        // }

        // --- LAYER 5: Border ---
        if (state.border && state.border.enabled) {
            this.drawBorder(state.border);
        }
        
        ctx.globalCompositeOperation = 'source-over';
    }

    drawBackground(state) {
        const { ctx, width, height } = this;
        
        if (state.backgroundMode === 'flat') {
            ctx.fillStyle = state.flatColor || '#013443';
            ctx.fillRect(0, 0, width, height);
        } else {
            const colors = state.gradient.colors;
            const type = state.gradient.type || 'linear';
            
            let gradient;
            const cx = width / 2;
            const cy = height / 2;

            if (type === 'linear') {
                gradient = ctx.createLinearGradient(0, 0, 0, height);
                colors.forEach(stop => {
                    const pos = Math.max(0, Math.min(1, stop.position / 100));
                    gradient.addColorStop(pos, stop.color);
                });
            } 
            else if (type === 'radial') {
                const maxDim = Math.max(width, height);
                gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.6); 
                colors.forEach(stop => {
                    const pos = Math.max(0, Math.min(1, stop.position / 100));
                    gradient.addColorStop(pos, stop.color);
                });
            }
            else if (type === 'angle') {
                gradient = ctx.createConicGradient(-Math.PI / 2, cx, cy);
                colors.forEach(stop => {
                    const pos = Math.max(0, Math.min(1, stop.position / 100));
                    gradient.addColorStop(pos, stop.color);
                });
            }
            else if (type === 'reflected') {
                gradient = ctx.createLinearGradient(0, 0, 0, height);
                const sorted = [...colors].sort((a, b) => a.position - b.position);
                
                sorted.forEach(stop => {
                    const pos = 0.5 - (stop.position / 100 * 0.5);
                    gradient.addColorStop(pos, stop.color);
                });
                
                sorted.forEach(stop => {
                    const pos = 0.5 + (stop.position / 100 * 0.5);
                    gradient.addColorStop(pos, stop.color);
                });
            }
            else {
                gradient = ctx.createLinearGradient(0, 0, width, height);
                colors.forEach(stop => {
                    const pos = Math.max(0, Math.min(1, stop.position / 100));
                    gradient.addColorStop(pos, stop.color);
                });
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }
    }

    drawHalftone(config, animConfig) {
        const { ctx, width, height, time } = this;
        const density = config.density || 30;
        const cellSize = width / density;
        const opacity = config.opacity !== undefined ? config.opacity : 1.0;
        const allowOverlap = config.allowOverlap || false;
        
        const minSize = config.minSize || 1;
        const maxSize = config.maxSize || (cellSize / 2) * 1.4;
        const sizeMode = config.sizeMode || 'radial';
        
        const animPattern = animConfig ? animConfig.pattern : 'none';
        
        const amp = this.animVals.amplitude;
        const freq = this.animVals.frequency;
        const spread = this.animVals.spread; 
        const rotation = this.animVals.rotation; 
        const rotRad = (rotation * Math.PI) / 180;
        
        // Use GSAP smoothed center or default to center
        const centerX = this.animVals.centerX !== undefined ? this.animVals.centerX : 0.5;
        const centerY = this.animVals.centerY !== undefined ? this.animVals.centerY : 0.5;

        const cx = width * centerX;
        const cy = height * centerY;
        
        // Calculate max distance from this new center to any corner
        // dist to corners: (0,0), (w,0), (0,h), (w,h)
        const d1 = Math.sqrt(cx*cx + cy*cy);
        const d2 = Math.sqrt((width-cx)**2 + cy*cy);
        const d3 = Math.sqrt(cx*cx + (height-cy)**2);
        const d4 = Math.sqrt((width-cx)**2 + (height-cy)**2);
        const maxDist = Math.max(d1, d2, d3, d4);

        for (let x = 0; x <= width + cellSize; x += cellSize) {
            for (let y = 0; y <= height + cellSize; y += cellSize) {
                
                let n = 0.5; 

                // 1. Determine Base Shape
                if (sizeMode === 'noise') {
                    const noiseVal = noise.noise(x * 0.002, y * 0.002);
                    n = (noiseVal + 1) / 2;
                } else if (sizeMode === 'radial') {
                    const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                    // Adjusted to not go to 0.1 minimum to avoid complete disappearance
                    n = 1 - Math.min(d / maxDist, 1);
                    // Apply curve but keep floor
                    n = Math.pow(n, 1.5); 
                    // Ensure a minimum visibility of 0.1 so edges aren't totally empty
                    n = 0.1 + (n * 0.9);
                } else if (sizeMode === 'uniform') {
                    n = 0.5; // Flat field
                } else if (sizeMode === 'linear') {
                    // Linear gradient top to bottom
                    n = 1 - (y / height);
                } else {
                    n = 0.5;
                }

                // 2. Apply Animation Modulation
                let mod = 0;
                const t = time * 2.0; 

                const fx = x * 0.002 * freq; 
                const fy = y * 0.002 * freq;
                const fd = (Math.sqrt((x - cx)**2 + (y - cy)**2)) * 0.01 * freq;

                if (animPattern === 'flow') {
                    const flowVal = noise.noise(fx, fy + t);
                    mod = flowVal * amp; 
                } 
                else if (animPattern === 'ripple' || animPattern === 'radial') {
                    mod = Math.sin(fd - t * 5) * amp;
                }
                else if (animPattern === 'ocean') {
                    const dx = Math.cos(rotRad);
                    const dy = Math.sin(rotRad);
                    const proj = x * dx + y * dy;
                    mod = Math.sin(proj * 0.005 * freq - t * 3) * amp;
                }
                else if (animPattern === 'breathe') {
                    mod = (this.breathVal - 0.5) * 2 * amp; 
                }
                else if (animPattern === 'dual-reverb') {
                    const offset = (width * 0.5) * spread;
                    const cx1 = (width * 0.5) - offset;
                    const cx2 = (width * 0.5) + offset;
                    const cyFocus = height * 0.5; // Should this follow centerY too?
                    // For dual, maybe keep vertical center fixed or follow centerY?
                    // Let's follow centerY for consistency
                    const cyDual = height * centerY;

                    const d1 = Math.sqrt((x - cx1)**2 + (y - cyDual)**2) * 0.01 * freq;
                    const d2 = Math.sqrt((x - cx2)**2 + (y - cyDual)**2) * 0.01 * freq;
                    
                    const wave1 = Math.sin(d1 - t * 4);
                    const wave2 = Math.sin(d2 - t * 4);
                    
                    mod = (wave1 + wave2) * amp;
                }
                else if (animPattern === 'dual-ripple') {
                    const offset = (width * 0.5) * spread;
                    const cx1 = (width * 0.5) - offset;
                    const cx2 = (width * 0.5) + offset;
                    const cyDual = height * centerY;

                    const d1 = Math.sqrt((x - cx1)**2 + (y - cyDual)**2) * 0.01 * freq;
                    const d2 = Math.sqrt((x - cx2)**2 + (y - cyDual)**2) * 0.01 * freq;
                    
                    const wave1 = Math.sin(d1 - t * 5);
                    const wave2 = Math.sin(d2 - t * 5);
                    
                    mod = Math.max(wave1, wave2) * amp;
                }
                else if (animPattern === 'rain') {
                    // Sum influence of all active drops
                    for (const drop of this.raindrops) {
                        const dx = x - drop.x;
                        const dy = y - drop.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        
                        const thickness = 40 + (60 * amp); 
                        const halfThick = thickness / 2;
                        
                        if (dist > drop.radius - halfThick && dist < drop.radius + halfThick) {
                            const dFromStroke = Math.abs(dist - drop.radius);
                            const strokeInt = 1 - (dFromStroke / halfThick);
                            mod += strokeInt * drop.alpha * amp * 3.0; 
                        }
                    }
                }
                else if (animPattern === 'aurora') {
                    const flow = Math.sin(y * 0.005 * freq + t) + Math.sin(y * 0.01 * freq - t * 0.5);
                    mod = Math.sin(x * 0.005 * freq + flow * 2) * amp;
                }
                else if (animPattern === 'matrix') {
                    const col = Math.floor(x / (cellSize * 4)); 
                    const colSpeed = (noise.noise(col, 0) + 2) * 2; 
                    mod = Math.sin(y * 0.01 * freq + t * colSpeed) * amp;
                }

                let targetN = n + mod;
                targetN = Math.max(0, Math.min(1, targetN));
                
                const hardMaxRadius = (cellSize / 2) * 0.9; 
                // Use config value directly if overlap allowed, else clamp
                const absoluteMax = allowOverlap ? maxSize : Math.min(maxSize, hardMaxRadius);
                
                const radius = minSize + targetN * (absoluteMax - minSize);

                // Smoothstep brightness
                const smoothN = targetN * targetN * (3 - 2 * targetN);
                const brightness = Math.floor(smoothN * 255);
                
                ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${opacity})`;
                
                ctx.beginPath();
                ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawDarkOverlay(config) {
        const { ctx, width, height } = this;
        const intensity = config.intensity || 0.5; 
        const fadeSize = config.fadeHeight || 0.4; // Used as ratio 0-1
        
        const top = config.top !== undefined ? config.top : true;
        // Backwards compatibility if top/bottom/left/right not set
        const legacyMode = config.top === undefined && config.bottom === undefined && config.left === undefined && config.right === undefined;
        
        // If legacy, default to top only
        if (legacyMode) {
             const gradient = ctx.createLinearGradient(0, 0, 0, height * fadeSize);
             gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
             gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
             ctx.fillStyle = gradient;
             ctx.fillRect(0, 0, width, height); 
             return;
        }

        // Top
        if (top) {
            const h = height * fadeSize;
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, h);
        }

        // Bottom
        if (config.bottom) {
            const h = height * fadeSize;
            const gradient = ctx.createLinearGradient(0, height, 0, height - h);
            gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, height - h, width, h);
        }

        // Left
        if (config.left) {
            const w = width * fadeSize;
            const gradient = ctx.createLinearGradient(0, 0, w, 0);
            gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, height);
        }

        // Right
        if (config.right) {
            const w = width * fadeSize;
            const gradient = ctx.createLinearGradient(width, 0, width - w, 0);
            gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(width - w, 0, w, height);
        }
    }

    drawBorder(config) {
        const { ctx, width, height } = this;
        const thickness = config.thickness || 20;
        const color = config.color || BRAND_COLORS.primary.maritimeTeal;
        const opacity = config.opacity !== undefined ? config.opacity : 1.0;
        
        ctx.globalCompositeOperation = config.blendMode || 'normal';
        ctx.globalAlpha = opacity;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        
        const inset = thickness / 2;
        ctx.strokeRect(inset, inset, width - thickness, height - thickness);
        
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // Generate a static SVG representation of the current frame
    getSVG(state) {
        const { width, height } = this;
        
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
        
        // 1. Background
        // SVG gradients need definitions
        let bgRect = '';
        if (state.backgroundMode === 'flat') {
            bgRect = `<rect width="100%" height="100%" fill="${state.flatColor || '#013443'}" />`;
        } else {
            // Approximate gradient as Linear for now, supporting multi-stop
            const colors = state.gradient.colors;
            const id = 'bgGrad';
            let stops = '';
            colors.forEach(stop => {
                stops += `<stop offset="${stop.position}%" stop-color="${stop.color}" />`;
            });
            
            let gradDef = '';
            if (state.gradient.type === 'linear' || !state.gradient.type) {
                gradDef = `<linearGradient id="${id}" x1="0%" y1="0%" x2="0%" y2="100%">${stops}</linearGradient>`;
            } else if (state.gradient.type === 'radial') {
                gradDef = `<radialGradient id="${id}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">${stops}</radialGradient>`;
            } else {
                // Fallback to linear for others
                 gradDef = `<linearGradient id="${id}" x1="0%" y1="0%" x2="0%" y2="100%">${stops}</linearGradient>`;
            }
            
            svg += `<defs>${gradDef}</defs>`;
            bgRect = `<rect width="100%" height="100%" fill="url(#${id})" />`;
        }
        svg += bgRect;

        // 2. Halftones
        // We need to iterate like drawHalftone but append <circle> elements
        // This is computationally heavy for large density, but standard for SVG export
        if (state.halftone1.enabled) {
            // Create a group for mix-blend-mode
            // SVG CSS mix-blend-mode support is decent in modern browsers
            const blend = state.halftone1.blendMode || 'color-dodge';
            svg += `<g style="mix-blend-mode: ${blend}; opacity: ${state.halftone1.opacity || 1}">`;
            
            const config = state.halftone1;
            const animConfig = state.animation;
            const density = config.density || 30;
            const cellSize = width / density;
            const minSize = config.minSize || 1;
            const maxSize = config.maxSize || (cellSize / 2) * 1.4;
            const sizeMode = config.sizeMode || 'radial';
            const centerX = this.animVals.centerX !== undefined ? this.animVals.centerX : 0.5;
            const centerY = this.animVals.centerY !== undefined ? this.animVals.centerY : 0.5;
            const cx = width * centerX;
            const cy = height * centerY;
            
            // Recalculate distances for sizing
            const d1 = Math.sqrt(cx*cx + cy*cy);
            const d2 = Math.sqrt((width-cx)**2 + cy*cy);
            const d3 = Math.sqrt(cx*cx + (height-cy)**2);
            const d4 = Math.sqrt((width-cx)**2 + (height-cy)**2);
            const maxDist = Math.max(d1, d2, d3, d4);

            // We can't replicate perlin noise efficiently here without including the library logic or duplicating it
            // For this simplified SVG export, we'll capture the static state or just use the basic math
            // Ideally we'd use the exact same logic. 
            // Let's try to reuse the logic by copy-pasting the loop body essentially
            // Note: Animation state (time) is used. We should use this.time
            
            const amp = this.animVals.amplitude;
            const freq = this.animVals.frequency;
            const time = this.time;

            for (let x = 0; x <= width + cellSize; x += cellSize) {
                for (let y = 0; y <= height + cellSize; y += cellSize) {
                    
                    let n = 0.5; 
                    if (sizeMode === 'radial') {
                        const d = Math.sqrt((x - cx)**2 + (y - cy)**2);
                        n = 1 - Math.min(d / maxDist, 1);
                        n = Math.pow(n, 1.5); 
                        n = 0.1 + (n * 0.9);
                    } else if (sizeMode === 'linear') {
                        n = 1 - (y / height);
                    } else if (sizeMode === 'uniform') {
                        n = 0.5;
                    }
                    
                    // Basic Animation Mod (simplified for SVG static export)
                    let mod = 0;
                    const fd = (Math.sqrt((x - cx)**2 + (y - cy)**2)) * 0.01 * freq;
                    const t = time * 2.0;
                    
                    if (animConfig.pattern === 'ripple' || animConfig.pattern === 'radial') {
                        mod = Math.sin(fd - t * 5) * amp;
                    }
                    
                    let targetN = n + mod;
                    targetN = Math.max(0, Math.min(1, targetN));
                    const hardMaxRadius = (cellSize / 2) * 0.9; 
                    const absoluteMax = Math.min(maxSize, hardMaxRadius);
                    const radius = minSize + targetN * (absoluteMax - minSize);
                    
                    // Color
                    const smoothN = targetN * targetN * (3 - 2 * targetN);
                    const brightness = Math.floor(smoothN * 255);
                    const fill = `rgb(${brightness},${brightness},${brightness})`;
                    
                    if (radius > 0.5) {
                        svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" />`;
                    }
                }
            }
            svg += `</g>`;
        }

        // 3. Dark Overlay
        if (state.darkOverlay && state.darkOverlay.enabled) {
            const blend = state.darkOverlay.blendMode || 'soft-light';
            svg += `<g style="mix-blend-mode: ${blend}">`;
            
            const intensity = state.darkOverlay.intensity || 0.5;
            const fadeSize = state.darkOverlay.fadeHeight || 0.4;
            
            // Defs for gradients
            svg += `<defs>`;
            svg += `<linearGradient id="gradTop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="black" stop-opacity="${intensity}"/>
                        <stop offset="100%" stop-color="black" stop-opacity="0"/>
                    </linearGradient>`;
            svg += `<linearGradient id="gradBottom" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stop-color="black" stop-opacity="${intensity}"/>
                        <stop offset="100%" stop-color="black" stop-opacity="0"/>
                    </linearGradient>`;
            svg += `<linearGradient id="gradLeft" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="black" stop-opacity="${intensity}"/>
                        <stop offset="100%" stop-color="black" stop-opacity="0"/>
                    </linearGradient>`;
            svg += `<linearGradient id="gradRight" x1="1" y1="0" x2="0" y2="0">
                        <stop offset="0%" stop-color="black" stop-opacity="${intensity}"/>
                        <stop offset="100%" stop-color="black" stop-opacity="0"/>
                    </linearGradient>`;
            svg += `</defs>`;

            if (state.darkOverlay.top) {
                svg += `<rect width="100%" height="${fadeSize * 100}%" fill="url(#gradTop)" />`;
            }
            if (state.darkOverlay.bottom) {
                svg += `<rect y="${(1-fadeSize)*100}%" width="100%" height="${fadeSize * 100}%" fill="url(#gradBottom)" />`;
            }
            if (state.darkOverlay.left) {
                svg += `<rect width="${fadeSize * 100}%" height="100%" fill="url(#gradLeft)" />`;
            }
            if (state.darkOverlay.right) {
                svg += `<rect x="${(1-fadeSize)*100}%" width="${fadeSize * 100}%" height="100%" fill="url(#gradRight)" />`;
            }
            
            svg += `</g>`;
        }

        // 4. Border
        if (state.border && state.border.enabled) {
            const blend = state.border.blendMode || 'normal';
            const opacity = state.border.opacity !== undefined ? state.border.opacity : 1.0;
            const color = state.border.color || '#000000';
            const thickness = state.border.thickness || 20;
            const inset = thickness / 2;
            
            svg += `<rect x="${inset}" y="${inset}" width="${width - thickness}" height="${height - thickness}" 
                    fill="none" stroke="${color}" stroke-width="${thickness}" stroke-opacity="${opacity}" 
                    style="mix-blend-mode: ${blend}" />`;
        }

        svg += `</svg>`;
        return svg;
    }
}