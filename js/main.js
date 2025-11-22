import { Renderer } from './renderer.js';
import { BRAND_COLORS, DIMENSIONS, PRESETS, ALL_COLORS, ANIMATION_PRESETS } from './constants.js';

const canvas = document.getElementById('mainCanvas');
const renderer = new Renderer(canvas);

// Initial State
const state = {
    dimension: {
        preset: 'landscape4K', 
        width: 3840,
        height: 2160
    },
    backgroundMode: 'gradient', 
    flatColor: BRAND_COLORS.primary.maritimeTeal,
    gradient: JSON.parse(JSON.stringify(PRESETS[0])), 
    
    animation: {
        enabled: true,
        speed: 3,
        pattern: 'radial', 
        amplitude: 0.3,
        frequency: 1.0,
        spread: 0.5,
        rotation: 0,
        centerX: 0.5,
        centerY: 0.5,
        autoPanX: false,
        autoPanXMin: 0,
        autoPanXMax: 1,
        autoPanXSpeed: 1.0,
        autoPanY: false,
        autoPanYMin: 0,
        autoPanYMax: 1,
        autoPanYSpeed: 1.0,
        ease: 'none'
    },

    halftone1: {
        enabled: true,
        density: 100, 
        minSize: 2, 
        maxSize: 15, 
        sizeMode: 'radial', 
        opacity: 0.9, 
        blendMode: 'overlay',
        allowOverlap: false
    },

    darkOverlay: {
        enabled: true,
        intensity: 0.85, 
        fadeHeight: 0.45, 
        blendMode: 'soft-light',
        top: true,
        bottom: false,
        left: false,
        right: false
    },
    
    border: {
        enabled: true,
        thickness: 40,
        color: BRAND_COLORS.warm.moltenOrange,
        blendMode: 'overlay', 
        opacity: 0.4 
    }
};

// Undo Stack
const undoStack = [];
const MAX_HISTORY = 50;

function saveState() {
    if (undoStack.length >= MAX_HISTORY) {
        undoStack.shift();
    }
    undoStack.push(JSON.parse(JSON.stringify(state)));
}

function undo() {
    if (undoStack.length === 0) return;
    const previousState = undoStack.pop();
    
    // Deep merge/copy back to state
    // Since state is const, we modify its properties
    // Helper to clear and assign
    const updateObject = (target, source) => {
        Object.keys(target).forEach(key => {
            if (!(key in source)) delete target[key];
        });
        Object.keys(source).forEach(key => {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                updateObject(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        });
    };
    
    // Replace state content
    // We can just use Object.assign for top level if structure is flat enough, 
    // but we have nested objects.
    // Simplest way given our structure:
    state.dimension = previousState.dimension;
    state.backgroundMode = previousState.backgroundMode;
    state.flatColor = previousState.flatColor;
    state.gradient = previousState.gradient;
    state.animation = previousState.animation;
    state.halftone1 = previousState.halftone1;
    state.darkOverlay = previousState.darkOverlay;
    state.border = previousState.border;

    // Refresh UI
    updateAllUI();
}

function updateAllUI() {
    // Dimensions
    const dimSelect = document.getElementById('dimensionSelect');
    if (dimSelect) dimSelect.value = state.dimension.preset;
    if (document.getElementById('dimWidth')) document.getElementById('dimWidth').value = state.dimension.width;
    if (document.getElementById('dimHeight')) document.getElementById('dimHeight').value = state.dimension.height;
    
    // Background
    const radios = document.getElementsByName('bgMode');
    radios.forEach(r => r.checked = (r.value === state.backgroundMode));
    // Trigger change to update visibility
    const event = new Event('change');
    radios.forEach(r => { if(r.checked) r.dispatchEvent(event); }); // This might re-trigger saveState if not careful? 
    // Actually dispatching event might trigger listeners which might save state. 
    // We should just update visibility manually or have a flag `isUndoing`.
    
    const gradientControls = document.getElementById('gradientControls');
    const flatControls = document.getElementById('flatControls');
    if (state.backgroundMode === 'gradient') {
        if (gradientControls) gradientControls.style.display = 'block';
        if (flatControls) flatControls.style.display = 'none';
    } else {
        if (gradientControls) gradientControls.style.display = 'none';
        if (flatControls) flatControls.style.display = 'block';
    }

    if (document.getElementById('gradientType')) document.getElementById('gradientType').value = state.gradient.type;
    renderColorList();
    
    if (document.getElementById('flatColorSelect')) document.getElementById('flatColorSelect').value = state.flatColor;
    if (flatPicker) flatPicker.setColor(state.flatColor);

    // Animation
    const animEnabled = document.getElementById('animEnabled');
    if (animEnabled) animEnabled.checked = state.animation.enabled;
    updateAnimationUI();

    // Halftone
    const h1Enabled = document.getElementById('h1Enabled');
    if (h1Enabled) h1Enabled.checked = state.halftone1.enabled;
    updateRangeDisplay('h1Density', state.halftone1.density);
    updateRangeDisplay('h1Opacity', state.halftone1.opacity);
    updateRangeDisplay('h1MinSize', state.halftone1.minSize);
    updateRangeDisplay('h1MaxSize', state.halftone1.maxSize);
    if (document.getElementById('h1BlendMode')) document.getElementById('h1BlendMode').value = state.halftone1.blendMode;
    if (document.getElementById('h1SizeMode')) document.getElementById('h1SizeMode').value = state.halftone1.sizeMode;
    const h1Overlap = document.getElementById('h1AllowOverlap');
    if (h1Overlap) h1Overlap.checked = state.halftone1.allowOverlap;

    // Dark Overlay
    const ovEnabled = document.getElementById('overlayEnabled');
    if (ovEnabled) ovEnabled.checked = state.darkOverlay.enabled;
    updateRangeDisplay('overlayIntensity', state.darkOverlay.intensity);
    updateRangeDisplay('overlayHeight', state.darkOverlay.fadeHeight);
    if (document.getElementById('overlayBlendMode')) document.getElementById('overlayBlendMode').value = state.darkOverlay.blendMode;
    if (document.getElementById('overlayTop')) document.getElementById('overlayTop').checked = state.darkOverlay.top;
    if (document.getElementById('overlayBottom')) document.getElementById('overlayBottom').checked = state.darkOverlay.bottom;
    if (document.getElementById('overlayLeft')) document.getElementById('overlayLeft').checked = state.darkOverlay.left;
    if (document.getElementById('overlayRight')) document.getElementById('overlayRight').checked = state.darkOverlay.right;

    // Border
    const bEnabled = document.getElementById('borderEnabled');
    if (bEnabled) bEnabled.checked = state.border.enabled;
    updateRangeDisplay('borderThickness', state.border.thickness);
    updateRangeDisplay('borderOpacity', state.border.opacity);
    if (document.getElementById('borderBlendMode')) document.getElementById('borderBlendMode').value = state.border.blendMode;
    if (borderPicker) borderPicker.setColor(state.border.color);

    renderer.render(state);
}

// Initialize Pickr instance helper
function createPickr(el, defaultColor, onChange) {
    // Safety check
    if (!el) return null;

    const pickr = Pickr.create({
        el: el,
        theme: 'monolith',
        default: defaultColor,
        swatches: [
            ...Object.values(BRAND_COLORS.primary),
            ...Object.values(BRAND_COLORS.warm),
            ...Object.values(BRAND_COLORS.dark)
        ],
        components: {
            preview: true,
            opacity: false,
            hue: true,
            interaction: {
                hex: true,
                rgba: false,
                hsla: false,
                hsva: false,
                cmyk: false,
                input: true,
                save: true
            }
        }
    });

    // Save state on show (start of interaction)
    pickr.on('show', () => {
        saveState();
    });

    pickr.on('save', (color, instance) => {
        const hex = color.toHEXA().toString();
        onChange(hex);
        pickr.hide();
    });

    pickr.on('change', (color, source, instance) => {
        const hex = color.toHEXA().toString();
        onChange(hex);
        // Force update the pickr button color/preview while dragging
        pickr.applyColor();
    });

    return pickr;
}

let gradientPickers = [];
let flatPicker = null;
let borderPicker = null;

// UI Initialization
function initUI() {
    console.log("Initializing UI...");
    
    try {
        // Check for GSAP
        if (typeof gsap === 'undefined') {
            console.error("GSAP library not found! Check internet connection or script tags.");
            alert("GSAP Animation Library failed to load. Animations will not work.");
        }

        // Keyboard Listener for Undo
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            }
        });

        // Initialize Collapsible Groups
        document.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Don't trigger collapse if clicking the checkbox directly
                if (e.target.type === 'checkbox') return;
                
                const group = header.parentElement;
                group.classList.toggle('collapsed');
            });
        });

        // Collapse All / Expand All
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        const expandAllBtn = document.getElementById('expandAllBtn');
        
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => {
                document.querySelectorAll('.control-group').forEach(g => g.classList.add('collapsed'));
            });
        }
        
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => {
                document.querySelectorAll('.control-group').forEach(g => g.classList.remove('collapsed'));
            });
        }

        // Animation Advanced Toggle
        const advToggle = document.getElementById('animAdvancedToggle');
        const advContent = document.getElementById('animAdvancedContent');
        if (advToggle && advContent) {
            advToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isHidden = advContent.style.display === 'none';
                advContent.style.display = isHidden ? 'block' : 'none';
                advToggle.textContent = isHidden ? 'Hide Advanced Settings ▲' : 'Show Advanced Settings ▼';
            });
        }

        // Initial State: Collapse specific groups
        const groupsToCollapse = ['group-h1', 'group-overlay', 'group-border', 'group-export'];
        groupsToCollapse.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('collapsed');
        });

        // --- Dimensions ---
        const dimensionSelect = document.getElementById('dimensionSelect');
        const widthInput = document.getElementById('dimWidth');
        const heightInput = document.getElementById('dimHeight');

        if (dimensionSelect) {
            Object.keys(DIMENSIONS).forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = DIMENSIONS[key].label;
                dimensionSelect.appendChild(option);
            });
            dimensionSelect.value = state.dimension.preset;
            
            // Save state on focus/click
            dimensionSelect.addEventListener('mousedown', saveState);

            dimensionSelect.addEventListener('change', (e) => {
                const oldWidth = state.dimension.width;
                const preset = DIMENSIONS[e.target.value];
                
                state.dimension.preset = e.target.value;
                state.dimension.width = preset.width;
                state.dimension.height = preset.height;
                
                const scaleFactor = state.dimension.width / oldWidth;
                
                state.halftone1.density = Math.round(state.halftone1.density * scaleFactor);
                state.halftone1.minSize = Math.round(state.halftone1.minSize * scaleFactor);
                state.halftone1.maxSize = Math.round(state.halftone1.maxSize * scaleFactor);
                updateRangeDisplay('h1Density', state.halftone1.density);
                updateRangeDisplay('h1MinSize', state.halftone1.minSize);
                updateRangeDisplay('h1MaxSize', state.halftone1.maxSize);

                state.border.thickness = Math.round(state.border.thickness * scaleFactor);
                updateRangeDisplay('borderThickness', state.border.thickness);

                updateDimInputs();
                renderer.resize(state.dimension.width, state.dimension.height);
            });
        }

        function updateDimInputs() {
            if (widthInput) widthInput.value = state.dimension.width;
            if (heightInput) heightInput.value = state.dimension.height;
            updateExportResolutionDisplay();
        }

        [widthInput, heightInput].forEach(input => {
            if (input) {
                input.addEventListener('focus', saveState);
                input.addEventListener('change', () => {
                    state.dimension.width = parseInt(widthInput.value) || 1080;
                    state.dimension.height = parseInt(heightInput.value) || 1080;
                    state.dimension.preset = 'custom';
                    if (dimensionSelect) dimensionSelect.value = ''; 
                    updateExportResolutionDisplay();
                    renderer.resize(state.dimension.width, state.dimension.height);
                });
            }
        });

        updateDimInputs(); 

        // --- Background ---
        const modeRadios = document.getElementsByName('bgMode');
        const gradientControls = document.getElementById('gradientControls');
        const flatControls = document.getElementById('flatControls');

        modeRadios.forEach(radio => {
            radio.addEventListener('mousedown', saveState);
            radio.addEventListener('change', (e) => {
                state.backgroundMode = e.target.value;
                if (state.backgroundMode === 'gradient') {
                    if(gradientControls) gradientControls.style.display = 'block';
                    if(flatControls) flatControls.style.display = 'none';
                } else {
                    if(gradientControls) gradientControls.style.display = 'none';
                    if(flatControls) flatControls.style.display = 'block';
                }
            });
        });

        // Gradient Presets
        const presetSelect = document.getElementById('presetSelect');
        if (presetSelect) {
            PRESETS.forEach((preset, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = preset.name;
                presetSelect.appendChild(option);
            });
            presetSelect.value = 0; 

            presetSelect.addEventListener('mousedown', saveState);
            presetSelect.addEventListener('change', (e) => {
                state.gradient = JSON.parse(JSON.stringify(PRESETS[e.target.value]));
                // Automatically update border color to match the first gradient color
                if (state.gradient.colors.length > 0) {
                    const primaryColor = state.gradient.colors[0].color;
                    state.border.color = primaryColor;
                    if (borderPicker) {
                        borderPicker.setColor(primaryColor);
                    }
                }
                renderColorList();
            });
        }

        const addColorBtn = document.getElementById('addColorBtn');
        if (addColorBtn) {
            addColorBtn.addEventListener('click', () => {
                saveState();
                if (state.gradient.colors.length < 5) {
                    const lastColor = state.gradient.colors[state.gradient.colors.length - 1];
                    state.gradient.colors.push({
                        color: lastColor ? lastColor.color : '#ffffff',
                        position: 100
                    });
                    renderColorList();
                }
            });
        }

        const reverseGradientBtn = document.getElementById('reverseGradientBtn');
        if (reverseGradientBtn) {
            reverseGradientBtn.addEventListener('click', () => {
                saveState();
                state.gradient.colors.forEach(stop => {
                    stop.position = 100 - stop.position;
                });
                state.gradient.colors.sort((a, b) => a.position - b.position);
                renderColorList();
            });
        }

        // Gradient Type
        const gradientTypeSelect = document.getElementById('gradientType');
        state.gradient.type = 'linear'; 
        
        if (gradientTypeSelect) {
            gradientTypeSelect.addEventListener('mousedown', saveState);
            gradientTypeSelect.addEventListener('change', (e) => {
                state.gradient.type = e.target.value;
            });
        }

        renderColorList();

        // Flat Color
        const flatColorSelect = document.getElementById('flatColorSelect');
        if (flatColorSelect && ALL_COLORS) {
            ALL_COLORS.forEach(color => {
                const option = document.createElement('option');
                option.value = color.value;
                option.textContent = color.name;
                option.style.color = color.value; 
                flatColorSelect.appendChild(option);
            });
            
            flatColorSelect.addEventListener('mousedown', saveState);
            flatColorSelect.addEventListener('change', (e) => {
                state.flatColor = e.target.value;
                if (flatPicker) flatPicker.setColor(state.flatColor);
            });
        }

        const flatPickerEl = document.getElementById('flatColorPicker');
        if (flatPickerEl) {
            flatPicker = createPickr(flatPickerEl, state.flatColor, (hex) => {
                state.flatColor = hex;
            });
        }

        // --- Animation Engine ---
        bindCheckbox('animEnabled', state.animation, 'enabled');

        // Animation Presets
        const animPresetSelect = document.getElementById('animPresetSelect');
        if (animPresetSelect) {
            ANIMATION_PRESETS.forEach((preset, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = preset.name;
                animPresetSelect.appendChild(option);
            });

            animPresetSelect.addEventListener('mousedown', saveState);
            animPresetSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') return;
                const preset = ANIMATION_PRESETS[parseInt(e.target.value)];
                Object.assign(state.animation, preset.settings);
                updateAnimationUI();
            });
        }

        function updateAnimationUI() {
            updateRangeDisplay('animSpeed', state.animation.speed);
            updateRangeDisplay('animAmp', state.animation.amplitude);
            updateRangeDisplay('animFreq', state.animation.frequency);
            updateRangeDisplay('animSpread', state.animation.spread);
            updateRangeDisplay('animRotation', state.animation.rotation);
            updateRangeDisplay('animCenterX', state.animation.centerX);
            updateRangeDisplay('animCenterY', state.animation.centerY);
            
            const pat = document.getElementById('animPattern');
            if(pat) pat.value = state.animation.pattern;
            
            const ease = document.getElementById('animEase');
            if(ease) ease.value = state.animation.ease;
            
            // Update Loop Controls
            const loopX = document.getElementById('animLoopX');
            if (loopX) {
                loopX.checked = state.animation.autoPanX;
                loopX.dispatchEvent(new Event('change')); 
            }
            
            updateRangeDisplay('animLoopXMin', state.animation.autoPanXMin);
            updateRangeDisplay('animLoopXMax', state.animation.autoPanXMax);
            updateRangeDisplay('animLoopXSpeed', state.animation.autoPanXSpeed);

            const loopY = document.getElementById('animLoopY');
            if (loopY) {
                loopY.checked = state.animation.autoPanY;
                loopY.dispatchEvent(new Event('change')); 
            }

            updateRangeDisplay('animLoopYMin', state.animation.autoPanYMin);
            updateRangeDisplay('animLoopYMax', state.animation.autoPanYMax);
            updateRangeDisplay('animLoopYSpeed', state.animation.autoPanYSpeed);
        }

        bindRange('animSpeed', state.animation, 'speed');
        bindRange('animAmp', state.animation, 'amplitude');
        bindRange('animFreq', state.animation, 'frequency');
        bindRange('animSpread', state.animation, 'spread');
        bindRange('animRotation', state.animation, 'rotation');
        bindRange('animCenterX', state.animation, 'centerX');
        bindRange('animCenterY', state.animation, 'centerY'); 
        
        // Loop X Controls
        const animLoopX = document.getElementById('animLoopX');
        const animLoopXControls = document.getElementById('animLoopXControls');
        if (animLoopX && animLoopXControls) {
            animLoopX.addEventListener('mousedown', saveState); // Checkbox click
            animLoopX.addEventListener('change', (e) => {
                state.animation.autoPanX = e.target.checked;
                animLoopXControls.style.display = e.target.checked ? 'block' : 'none';
                const cx = document.getElementById('animCenterX');
                if(cx) cx.disabled = e.target.checked;
            });
        }
        bindRange('animLoopXMin', state.animation, 'autoPanXMin');
        bindRange('animLoopXMax', state.animation, 'autoPanXMax');
        bindRange('animLoopXSpeed', state.animation, 'autoPanXSpeed');

        // Loop Y Controls
        const animLoopY = document.getElementById('animLoopY');
        const animLoopYControls = document.getElementById('animLoopYControls');
        if (animLoopY && animLoopYControls) {
            animLoopY.addEventListener('mousedown', saveState);
            animLoopY.addEventListener('change', (e) => {
                state.animation.autoPanY = e.target.checked;
                animLoopYControls.style.display = e.target.checked ? 'block' : 'none';
                const cy = document.getElementById('animCenterY');
                if(cy) cy.disabled = e.target.checked;
            });
        }
        bindRange('animLoopYMin', state.animation, 'autoPanYMin');
        bindRange('animLoopYMax', state.animation, 'autoPanYMax');
        bindRange('animLoopYSpeed', state.animation, 'autoPanYSpeed');


        const animPatternSelect = document.getElementById('animPattern');
        if (animPatternSelect) {
            const initialPattern = state.animation.pattern === 'radial' ? 'ripple' : state.animation.pattern;
            animPatternSelect.value = initialPattern;
            animPatternSelect.addEventListener('mousedown', saveState);
            animPatternSelect.addEventListener('change', (e) => {
                state.animation.pattern = e.target.value;
            });
        }

        const animEaseSelect = document.getElementById('animEase');
        if (animEaseSelect) {
            animEaseSelect.addEventListener('mousedown', saveState);
            animEaseSelect.addEventListener('change', (e) => {
                state.animation.ease = e.target.value;
            });
        }

        // --- Halftone Layer 1 ---
        initHalftoneControls('h1', state.halftone1);

        // --- Dark Overlay ---
        bindCheckbox('overlayEnabled', state.darkOverlay, 'enabled');
        bindRange('overlayIntensity', state.darkOverlay, 'intensity');
        bindRange('overlayHeight', state.darkOverlay, 'fadeHeight');
        bindCheckbox('overlayTop', state.darkOverlay, 'top');
        bindCheckbox('overlayBottom', state.darkOverlay, 'bottom');
        bindCheckbox('overlayLeft', state.darkOverlay, 'left');
        bindCheckbox('overlayRight', state.darkOverlay, 'right');
        
        const overlayBlend = document.getElementById('overlayBlendMode');
        if (overlayBlend) {
            overlayBlend.value = state.darkOverlay.blendMode;
            overlayBlend.addEventListener('mousedown', saveState);
            overlayBlend.addEventListener('change', (e) => {
                state.darkOverlay.blendMode = e.target.value;
            });
        }

        // --- Border ---
        bindCheckbox('borderEnabled', state.border, 'enabled');
        bindRange('borderThickness', state.border, 'thickness');
        bindRange('borderOpacity', state.border, 'opacity'); 
        
        const borderBlendSelect = document.getElementById('borderBlendMode');
        if (borderBlendSelect) {
            borderBlendSelect.value = state.border.blendMode; 
            borderBlendSelect.addEventListener('mousedown', saveState);
            borderBlendSelect.addEventListener('change', (e) => {
                state.border.blendMode = e.target.value;
            });
        }

        const borderPickerEl = document.getElementById('borderColorPicker');
        if (borderPickerEl) {
            borderPicker = createPickr(borderPickerEl, state.border.color, (hex) => {
                state.border.color = hex;
            });
        }

        // Initial Border Color Sync
        if (state.gradient.colors.length > 0) {
            const primaryColor = state.gradient.colors[0].color;
            state.border.color = primaryColor;
            if (borderPicker) borderPicker.setColor(primaryColor);
        }

        // Export
        const downloadPngBtn = document.getElementById('downloadPngBtn');
        if (downloadPngBtn) {
            downloadPngBtn.addEventListener('click', () => {
                const formatEl = document.getElementById('exportFormat');
                const format = formatEl ? formatEl.value : 'png';
                if (format === 'svg') {
                    downloadSVG();
                } else {
                    const scaleEl = document.getElementById('exportScale');
                    const scale = scaleEl ? parseInt(scaleEl.value) : 1;
                    downloadImage(scale);
                }
            });
        }

        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.addEventListener('click', toggleRecording);
        }

        const exportFormat = document.getElementById('exportFormat');
        if (exportFormat) {
            exportFormat.addEventListener('change', (e) => {
                const format = e.target.value;
                const pngControls = document.getElementById('pngControls');
                const videoControls = document.getElementById('videoControls');
                const btn = document.getElementById('downloadPngBtn');

                if (format === 'webm') {
                    if(pngControls) pngControls.style.display = 'none';
                    if(videoControls) videoControls.style.display = 'block';
                    if (btn) btn.style.display = 'none';
                } else if (format === 'svg') {
                    if(pngControls) pngControls.style.display = 'none';
                    if(videoControls) videoControls.style.display = 'none';
                    if (btn) {
                        btn.style.display = 'block';
                        btn.textContent = 'Download SVG';
                    }
                } else {
                    // PNG
                    if(pngControls) pngControls.style.display = 'block';
                    if(videoControls) videoControls.style.display = 'none';
                    if (btn) {
                        btn.style.display = 'block';
                        btn.textContent = 'Download PNG';
                    }
                }
            });
        }
        
        // Export Resolution Display
        const exportScale = document.getElementById('exportScale');
        if (exportScale) {
            exportScale.addEventListener('change', updateExportResolutionDisplay);
        }

        function updateExportResolutionDisplay() {
            const exportScale = document.getElementById('exportScale');
            if (!exportScale) return;
            const scale = parseInt(exportScale.value);
            const w = state.dimension.width * scale;
            const h = state.dimension.height * scale;
            const resEl = document.getElementById('exportRes');
            if(resEl) resEl.textContent = `${w} x ${h}`;
        }

        // Init Canvas
        renderer.resize(state.dimension.width, state.dimension.height);
        
        // Start Animation Loop
        if (typeof gsap !== 'undefined') {
            gsap.ticker.add(() => {
                if (renderer.update) renderer.update(state);
                renderer.render(state);
            });
        } else {
            // Fallback loop if GSAP missing
            function animate() {
                renderer.render(state);
                requestAnimationFrame(animate);
            }
            animate();
        }
    } catch (err) {
        console.error("Critical error during init:", err);
        alert("Application failed to initialize: " + err.message);
    }
}

function updateRangeDisplay(id, value) {
    const el = document.getElementById(id);
    const valDisplay = document.getElementById(id + 'Val');
    if (el) el.value = value;
    if (valDisplay) valDisplay.textContent = value;
}

function initHalftoneControls(prefix, dataObj) {
    bindCheckbox(prefix + 'Enabled', dataObj, 'enabled');
    bindRange(prefix + 'Density', dataObj, 'density');
    bindRange(prefix + 'Opacity', dataObj, 'opacity');
    bindRange(prefix + 'MinSize', dataObj, 'minSize');
    bindRange(prefix + 'MaxSize', dataObj, 'maxSize');
    bindCheckbox(prefix + 'AllowOverlap', dataObj, 'allowOverlap');
    
    const blendSelect = document.getElementById(prefix + 'BlendMode');
    if (blendSelect) {
        blendSelect.value = dataObj.blendMode;
        blendSelect.addEventListener('mousedown', saveState);
        blendSelect.addEventListener('change', (e) => dataObj.blendMode = e.target.value);
    }

    const sizeModeSelect = document.getElementById(prefix + 'SizeMode');
    if (sizeModeSelect) {
        sizeModeSelect.value = dataObj.sizeMode;
        sizeModeSelect.addEventListener('mousedown', saveState);
        sizeModeSelect.addEventListener('change', (e) => dataObj.sizeMode = e.target.value);
    }
}

function renderColorList() {
    gradientPickers.forEach(p => p.destroyAndRemove());
    gradientPickers = [];

    const container = document.getElementById('colorList');
    if (!container) return;
    container.innerHTML = '';

    state.gradient.colors.forEach((stop, index) => {
        const row = document.createElement('div');
        row.className = 'color-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';
        row.style.marginBottom = '8px';

        const pickerContainer = document.createElement('div');
        pickerContainer.className = `gradient-picker-${index}`;
        row.appendChild(pickerContainer);

        const posSlider = document.createElement('input');
        posSlider.type = 'range';
        posSlider.min = 0;
        posSlider.max = 100;
        posSlider.value = stop.position;
        posSlider.style.flex = '1';
        // Save state on slider start
        posSlider.addEventListener('mousedown', saveState);
        posSlider.addEventListener('input', (e) => stop.position = parseInt(e.target.value));
        row.appendChild(posSlider);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.style.background = 'rgba(255,0,0,0.2)';
        removeBtn.style.border = 'none';
        removeBtn.style.color = 'white';
        
        if (state.gradient.colors.length <= 2) {
            removeBtn.disabled = true;
            removeBtn.style.opacity = '0.3';
        } else {
            removeBtn.addEventListener('click', () => {
                saveState();
                state.gradient.colors.splice(index, 1);
                renderColorList();
            });
        }
        row.appendChild(removeBtn);

        container.appendChild(row);

        const pickr = createPickr(pickerContainer, stop.color, (hex) => {
            stop.color = hex;
            // If this is the first color, update border too
            if (index === 0) {
                state.border.color = hex;
                if (borderPicker) {
                    borderPicker.setColor(hex);
                }
            }
        });
        if (pickr) gradientPickers.push(pickr);
    });
}

function bindCheckbox(id, targetObj, key) {
    const el = document.getElementById(id);
    if (el) {
        el.checked = targetObj[key];
        el.addEventListener('mousedown', saveState); // Save state on interaction
        el.addEventListener('change', (e) => {
            targetObj[key] = e.target.checked;
        });
    }
}

function bindRange(id, targetObj, key) {
    const el = document.getElementById(id);
    if (el) {
        el.value = targetObj[key];
        const valDisplay = document.getElementById(id + 'Val');
        if (valDisplay) valDisplay.textContent = targetObj[key];

        el.addEventListener('mousedown', saveState); // Save state before dragging
        el.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            targetObj[key] = val;
            if (valDisplay) valDisplay.textContent = val;
        });
    }
}

function downloadImage(scale = 1) {
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;

    // Temporarily scale up
    if (scale > 1) {
        renderer.resize(originalWidth * scale, originalHeight * scale);
        renderer.render(state);
    }

    const link = document.createElement('a');
    link.download = `cg-jung-brand-asset-@${scale}x.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Restore original size
    if (scale > 1) {
        renderer.resize(originalWidth, originalHeight);
        renderer.render(state); // Re-render to ensure visual state is correct immediately
    }
}

function downloadSVG() {
    if (renderer.getSVG) {
        const svgString = renderer.getSVG(state);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cg-jung-brand-asset.svg`;
        link.click();
    } else {
        alert("SVG Export not available.");
    }
}

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

function toggleRecording() {
    const btn = document.getElementById('recordBtn');
    const status = document.getElementById('recordStatus');
    const durationEl = document.getElementById('exportDuration');
    const duration = durationEl ? (parseInt(durationEl.value) || 5) : 5;

    if (isRecording) return; // Prevent double click

    isRecording = true;
    if (btn) {
        btn.disabled = true;
        btn.textContent = `Recording (${duration}s)...`;
    }
    if (status) {
        status.style.display = 'block';
        status.textContent = "Capturing frames...";
    }

    const stream = canvas.captureStream(60); // 60 FPS
    // Prefer H.264 (mp4 compatible) if available, else VP9 (webm)
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8'; // Fallback
    }

    const qualityEl = document.getElementById('exportQuality');
    mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: qualityEl ? (parseInt(qualityEl.value) || 25000000) : 25000000
    });

    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cg-jung-brand-asset.webm';
        link.click();
        
        // Reset UI
        isRecording = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Start Recording';
        }
        if (status) status.style.display = 'none';
    };

    mediaRecorder.start();

    // Stop after duration
    setTimeout(() => {
        mediaRecorder.stop();
    }, duration * 1000);
}

document.addEventListener('DOMContentLoaded', initUI);