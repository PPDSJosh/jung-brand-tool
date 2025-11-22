// Simple 2D Perlin Noise implementation
// Adapted from various open source implementations

class Noise {
    constructor() {
        this.grad3 = [
            [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
            [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
            [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
        ];
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        // To remove the need for index wrapping, double the permutation table length
        this.perm = [];
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }

    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }

    mix(a, b, t) {
        return (1 - t) * a + t * b;
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // 2D Perlin Noise
    noise(x, y) {
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        let u = this.fade(x);
        let v = this.fade(y);

        let A = this.perm[X] + Y;
        let AA = this.perm[A];
        let AB = this.perm[A + 1];
        let B = this.perm[X + 1] + Y;
        let BA = this.perm[B];
        let BB = this.perm[B + 1];

        return this.mix(
            this.mix(
                this.dot(this.grad3[AA % 12], x, y),
                this.dot(this.grad3[BA % 12], x - 1, y),
                u
            ),
            this.mix(
                this.dot(this.grad3[AB % 12], x, y - 1),
                this.dot(this.grad3[BB % 12], x - 1, y - 1),
                u
            ),
            v
        );
    }
}

export const noise = new Noise();

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function lerpColor(a, b, amount) {
    const ar = a >> 16,
          ag = a >> 8 & 0xff,
          ab = a & 0xff;
    const br = b >> 16,
          bg = b >> 8 & 0xff,
          bb = b & 0xff;
    const rr = ar + amount * (br - ar),
          rg = ag + amount * (bg - ag),
          rb = ab + amount * (bb - ab);
    return (rr << 16) + (rg << 8) + (rb | 0);
}

