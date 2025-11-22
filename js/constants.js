export const BRAND_COLORS = {
    primary: {
        maritimeTeal: '#025467',
        oceanBlue: '#03488D',
        lightTeal: '#00AFD8',
        skyBlue: '#4BB4FF',
        lightBlue: '#0586E3',
        depthBlue: '#01246D',
        midnightBlue: '#001341'
    },
    warm: {
        swissCrimson: '#AA2424',
        moltenOrange: '#C95627',
        sunshine: '#FFBA08',
        brightRed: '#FD0F16',
        depthOrange: '#843602',
        burntOrange: '#4B1A00',
        depthCrimson: '#681213',
        midnightCrimson: '#350707'
    },
    dark: {
        depthTeal: '#003041',
        twilightTeal: '#014F58',
        black: '#000000'
    },
    neutral: {
        white: '#FFFFFF'
    }
};

// Flattened list for dropdowns - Safe Construction
const p = Object.entries(BRAND_COLORS.primary).map(function(e) { return { name: e[0], value: e[1] }; });
const w = Object.entries(BRAND_COLORS.warm).map(function(e) { return { name: e[0], value: e[1] }; });
const d = Object.entries(BRAND_COLORS.dark).map(function(e) { return { name: e[0], value: e[1] }; });
const n = Object.entries(BRAND_COLORS.neutral).map(function(e) { return { name: e[0], value: e[1] }; });

export const ALL_COLORS = p.concat(w, d, n);

export const DIMENSIONS = {
    square: { width: 1080, height: 1080, label: 'Instagram Square (1080x1080)' },
    squareLarge: { width: 1920, height: 1920, label: 'Instagram Square Large (1920x1920)' },
    portrait: { width: 1080, height: 1350, label: 'Instagram Portrait (1080x1350)' },
    story: { width: 1080, height: 1920, label: 'Instagram Story/Reel (1080x1920)' },
    fbSquare: { width: 1200, height: 1200, label: 'Facebook Square (1200x1200)' },
    squareHD: { width: 1280, height: 1280, label: 'Square HD (1280x1280)' },
    square2K: { width: 2048, height: 2048, label: 'Square 2K (2048x2048)' },
    squareStd: { width: 1024, height: 1024, label: 'Square Standard (1024x1024)' },
    landscape4K: { width: 3840, height: 2160, label: '4K Landscape (3840x2160)' },
    portrait4K: { width: 2160, height: 3840, label: '4K Portrait (2160x3840)' }
};

export const PRESETS = [
    {
        name: 'Midnight Depth',
        colors: [
            { color: BRAND_COLORS.primary.midnightBlue, position: 0 },
            { color: BRAND_COLORS.dark.depthTeal, position: 100 }
        ]
    },
    {
        name: 'Crimson Gradient',
        colors: [
            { color: BRAND_COLORS.warm.swissCrimson, position: 0 },
            { color: BRAND_COLORS.warm.midnightCrimson, position: 100 }
        ]
    },
    {
        name: 'Orange Gradient',
        colors: [
            { color: BRAND_COLORS.warm.moltenOrange, position: 0 },
            { color: BRAND_COLORS.warm.depthOrange, position: 100 }
        ]
    },
    {
        name: 'Teal Gradient',
        colors: [
            { color: BRAND_COLORS.primary.maritimeTeal, position: 0 },
            { color: BRAND_COLORS.dark.depthTeal, position: 100 }
        ]
    },
    {
        name: 'Blue Gradient',
        colors: [
            { color: BRAND_COLORS.primary.oceanBlue, position: 0 },
            { color: BRAND_COLORS.primary.midnightBlue, position: 100 }
        ]
    }
];

export const ANIMATION_PRESETS = [
    {
        name: "Calm Ripple",
        settings: {
            pattern: 'ripple',
            speed: 2.0,
            amplitude: 0.2,
            frequency: 1.0,
            spread: 0.5,
            rotation: 0,
            centerX: 0.5,
            centerY: 0.5,
            autoPanX: false,
            autoPanY: false,
            ease: 'none'
        }
    },
    {
        name: "Stormy Seas",
        settings: {
            pattern: 'ocean',
            speed: 4.0,
            amplitude: 0.6,
            frequency: 1.5,
            spread: 0.5,
            rotation: 45,
            centerX: 0.5,
            centerY: 0.5,
            autoPanX: true,
            autoPanXMin: 0.2,
            autoPanXMax: 0.8,
            autoPanXSpeed: 0.8,
            autoPanY: false,
            ease: 'power2.inOut'
        }
    },
    {
        name: "Twin Tides",
        settings: {
            pattern: 'dual-reverb',
            speed: 2.5,
            amplitude: 0.35,
            frequency: 1.2,
            spread: 0.6,
            rotation: 0,
            centerX: 0.5,
            centerY: 0.5,
            autoPanX: false,
            autoPanY: false,
            ease: 'none'
        }
    },
    {
        name: "Cosmic Flow",
        settings: {
            pattern: 'flow',
            speed: 1.5,
            amplitude: 0.4,
            frequency: 0.8,
            spread: 0.5,
            rotation: 0,
            centerX: 0.5,
            centerY: 0.5,
            autoPanX: false,
            autoPanY: false,
            ease: 'sine.inOut'
        }
    },
    {
        name: "Rainstorm",
        settings: {
            pattern: 'rain',
            speed: 4.0,
            amplitude: 0.4,
            frequency: 3.0,
            spread: 0.5,
            rotation: 0,
            centerX: 0.5,
            centerY: 0.5,
            autoPanX: false,
            autoPanY: false,
            ease: 'power2.out'
        }
    }
];