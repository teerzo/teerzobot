import * as THREE from 'three';

const TILE = 1;
const WALL_H = 1.55;
const SLAB_H = 0.04;

function canvasToTexture(canvas, repeatX = 1, repeatY = 2) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return tex;
}

function makeStoneCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a2622';
    ctx.fillRect(0, 0, size, size);

    const palettes = [
        [118, 104, 90],
        [96, 86, 74],
        [132, 116, 98],
        [84, 76, 66],
        [108, 96, 82],
        [124, 112, 96],
        [90, 82, 70],
    ];
    const brickW = 16;
    const brickH = 8;
    const grout = 1;

    function paintBrick(x, y, pal, seed) {
        const shade = 0.82 + (seed % 8) * 0.03;
        const r = Math.min(255, pal[0] * shade);
        const g = Math.min(255, pal[1] * shade);
        const b = Math.min(255, pal[2] * shade);
        for (const ox of [0, size, -size]) {
            for (const oy of [0, size, -size]) {
                const dx = x + ox;
                const dy = y + oy;
                if (dx >= size || dy >= size || dx + brickW - grout <= 0 || dy + brickH - grout <= 0) {
                    continue;
                }
                ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
                ctx.fillRect(dx + grout, dy + grout, brickW - grout, brickH - grout);
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.fillRect(dx + grout, dy + brickH - 1, brickW - grout, 1);
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.fillRect(dx + grout, dy + grout, brickW - grout, 1);
            }
        }
    }

    let row = 0;
    for (let y = 0; y < size; y += brickH) {
        const offset = (row % 2) * (brickW / 2);
        for (let x = -offset; x < size; x += brickW) {
            const seed = Math.abs((x * 13 + y * 7 + row * 17) | 0);
            paintBrick(x, y, palettes[seed % palettes.length], seed);
        }
        row += 1;
    }

    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
        const n = ((i * 17) % 9) - 4;
        img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
        img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
        img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

function drawVines(ctx, size) {
    const stems = ['#1d4a1a', '#245820', '#2f6b28'];
    const leaves = ['#2e6e28', '#3d8a32', '#52a83e', '#6cbc4a'];

    function px(x, y, color) {
        const dx = ((x % size) + size) % size;
        if (y < 0 || y >= size) {
            return;
        }
        ctx.fillStyle = color;
        ctx.fillRect(dx, y, 1, 1);
    }

    function leaf(x, y, seed) {
        px(x, y, leaves[seed % leaves.length]);
        if (seed % 2 === 0) {
            px(x + 1, y, leaves[(seed + 1) % leaves.length]);
        }
        if (seed % 3 !== 1) {
            px(x, y + 1, leaves[(seed + 2) % leaves.length]);
        }
        if (seed % 4 === 0) {
            px(x - 1, y, '#245820');
        }
        if (seed % 5 === 0) {
            px(x + 1, y - 1, '#7ad055');
        }
    }

    const vines = [
        { x: 3, lean: 1, len: 32 },
        { x: 11, lean: -1, len: 26 },
        { x: 18, lean: 1, len: 30 },
        { x: 27, lean: -1, len: 22 },
    ];
    for (const vine of vines) {
        let x = vine.x;
        for (let y = 0; y < vine.len; y++) {
            px(x, y, stems[(x + y) % stems.length]);
            px(x, y + 1, stems[(x + y + 1) % stems.length]);
            if ((y + vine.x) % 3 === 0) {
                leaf(x + vine.lean, y, x * 5 + y);
            }
            if ((y + vine.x) % 4 === 0) {
                leaf(x - vine.lean, y + 1, y * 7 + vine.x);
            }
            if (y > 2 && (y * 3 + vine.x) % 5 === 0) {
                x += vine.lean;
            }
        }
    }

    for (let i = 0; i < 10; i++) {
        leaf(4 + ((i * 11) % 24), 2 + ((i * 5) % 8), i * 13);
    }
}

function makeVineCanvas() {
    const canvas = makeStoneCanvas();
    drawVines(canvas.getContext('2d'), canvas.width);
    return canvas;
}

function drawCracks(ctx, size) {
    function px(x, y, color) {
        const dx = ((x % size) + size) % size;
        if (y < 0 || y >= size) {
            return;
        }
        ctx.fillStyle = color;
        ctx.fillRect(dx, y, 1, 1);
    }

    function crack(x0, y0, x1, y1, dark, edge) {
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= steps; i++) {
            const t = i / Math.max(1, steps);
            const x = Math.round(x0 + (x1 - x0) * t);
            const y = Math.round(y0 + (y1 - y0) * t);
            const jag = (i % 3 === 0) ? 1 : 0;
            px(x + jag, y, dark);
            px(x + jag + 1, y, edge);
            if (i % 4 === 0) {
                px(x + jag, y + 1, dark);
            }
            if (i % 5 === 2) {
                px(x + jag - 1, y, edge);
            }
        }
    }

    const dark = '#14110e';
    const edge = '#3a332c';
    crack(3, 2, 10, 18, dark, edge);
    crack(10, 18, 8, 31, dark, edge);
    crack(18, 1, 28, 14, dark, edge);
    crack(22, 12, 31, 22, dark, edge);
    crack(14, 8, 20, 24, dark, edge);
    crack(1, 22, 12, 28, dark, edge);

    for (let n = 0; n < 18; n++) {
        px((n * 9 + 4) % size, (n * 5 + 11) % size, n % 2 ? dark : '#1c1814');
    }
}

function makeCrackedCanvas() {
    const canvas = makeStoneCanvas();
    drawCracks(canvas.getContext('2d'), canvas.width);
    return canvas;
}

function makeWoodCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1c140e';
    ctx.fillRect(0, 0, size, size);
    const boards = [[92, 68, 42], [78, 56, 34], [108, 80, 50], [70, 50, 30]];
    const bw = 8;
    for (let x = 0, i = 0; x < size; x += bw, i += 1) {
        const pal = boards[i % boards.length];
        const shade = 0.82 + (i % 5) * 0.04;
        ctx.fillStyle = `rgb(${(pal[0] * shade) | 0},${(pal[1] * shade) | 0},${(pal[2] * shade) | 0})`;
        ctx.fillRect(x + 1, 0, bw - 1, size);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, 0, 1, size);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x + 1, 0, 1, size);
    }
    return canvas;
}

function makeBeamCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#120e0a';
    ctx.fillRect(0, 0, size, size);
    const boards = [[70, 50, 32], [88, 64, 40], [58, 42, 28], [80, 58, 36]];
    const bh = 10;
    for (let y = 0, i = 0; y < size; y += bh, i += 1) {
        const pal = boards[i % boards.length];
        const shade = 0.78 + (i % 4) * 0.05;
        ctx.fillStyle = `rgb(${(pal[0] * shade) | 0},${(pal[1] * shade) | 0},${(pal[2] * shade) | 0})`;
        ctx.fillRect(0, y + 1, size, bh - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, y, size, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(0, y + 1, size, 1);
    }
    return canvas;
}

function makeMetalCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a3038';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 16) {
        for (let x = 0; x < size; x += 16) {
            ctx.fillStyle = (x + y) % 32 === 0 ? '#4a5560' : '#3a444e';
            ctx.fillRect(x + 1, y + 1, 14, 14);
            ctx.fillStyle = '#8a949e';
            ctx.fillRect(x + 2, y + 2, 2, 2);
            ctx.fillRect(x + 12, y + 2, 2, 2);
            ctx.fillRect(x + 2, y + 12, 2, 2);
            ctx.fillRect(x + 12, y + 12, 2, 2);
        }
    }
    return canvas;
}

function makeVaultCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(0, 0, size, size);
    const ribs = ['#3a3228', '#4a4034', '#2a241c'];
    for (let i = 0; i < size; i++) {
        ctx.fillStyle = ribs[i % 3];
        ctx.fillRect(i, i, 2, 1);
        ctx.fillRect(i, size - 1 - i, 2, 1);
        ctx.fillRect(i, 15, 1, 2);
        ctx.fillRect(15, i, 2, 1);
    }
    ctx.fillStyle = '#c4a24a';
    ctx.fillRect(14, 14, 4, 4);
    ctx.fillStyle = '#8a7038';
    ctx.fillRect(15, 15, 2, 2);
    return canvas;
}

function makeRockCeilCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const pal = ['#2a241c', '#3a3228', '#4a4034', '#1a1610', '#5a4e40'];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            ctx.fillStyle = pal[(x * 7 + y * 13) % pal.length];
            ctx.fillRect(x, y, 1, 1);
        }
    }
    for (let i = 0; i < 8; i++) {
        const cx = (i * 11 + 3) % 28;
        const cy = (i * 17 + 5) % 28;
        ctx.fillStyle = pal[i % pal.length];
        ctx.fillRect(cx, cy, 6 + (i % 4), 5 + (i % 3));
        ctx.fillStyle = '#0e0c0a';
        ctx.fillRect(cx, cy, 6 + (i % 4), 1);
    }
    return canvas;
}

function makeGrateCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a2014';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 8) {
        for (let x = 0; x < size; x += 16) {
            const ox = (y / 8) % 2 === 0 ? 0 : 8;
            ctx.fillStyle = ((x + y) / 8) % 2 === 0 ? '#3a4a28' : '#2a3820';
            ctx.fillRect(x + ox + 1, y + 1, 14, 6);
            ctx.fillStyle = '#0c1008';
            ctx.fillRect(x + ox, y, 16, 1);
            ctx.fillRect(x + ox, y, 1, 8);
        }
    }
    ctx.fillStyle = '#2a3028';
    for (let x = 4; x < size; x += 6) {
        ctx.fillRect(x, 0, 1, size);
    }
    for (let y = 4; y < size; y += 6) {
        ctx.fillRect(0, y, size, 1);
    }
    ctx.fillStyle = '#4a6a28';
    ctx.fillRect(10, 18, 3, 2);
    ctx.fillRect(20, 8, 2, 3);
    return canvas;
}

function makeSootCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#161210';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 40; i++) {
        const x = (i * 13) % size;
        const y = (i * 17) % size;
        ctx.fillStyle = i % 3 === 0 ? '#2a2018' : '#0c0a08';
        ctx.fillRect(x, y, 3 + (i % 4), 2 + (i % 3));
    }
    ctx.fillStyle = '#3a2218';
    ctx.fillRect(0, 10, size, 1);
    ctx.fillRect(0, 22, size, 1);
    return canvas;
}

function makeGiltCeilCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a2010';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 16) {
        for (let x = 0; x < size; x += 16) {
            ctx.fillStyle = '#5a4828';
            ctx.fillRect(x + 1, y + 1, 14, 14);
            ctx.fillStyle = '#c4a24a';
            ctx.fillRect(x + 2, y + 2, 12, 1);
            ctx.fillRect(x + 2, y + 13, 12, 1);
            ctx.fillRect(x + 2, y + 2, 1, 12);
            ctx.fillRect(x + 13, y + 2, 1, 12);
            ctx.fillStyle = '#e8d090';
            ctx.fillRect(x + 7, y + 7, 2, 2);
        }
    }
    return canvas;
}

function makeBrickCeilCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, size, size);
    const bricks = ['#4a382c', '#3a2c22', '#5a4434', '#2e241c'];
    for (let y = 0; y < size; y += 4) {
        const shift = (y / 4) % 2 === 0 ? 0 : 4;
        for (let x = -4; x < size; x += 8) {
            ctx.fillStyle = bricks[((x + y) / 4) % bricks.length];
            ctx.fillRect(x + shift + 1, y + 1, 6, 2);
            ctx.fillStyle = '#0e0a08';
            ctx.fillRect(x + shift, y, 8, 1);
            ctx.fillRect(x + shift, y, 1, 4);
        }
    }
    return canvas;
}

function makePlasterCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3a2e2a';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if ((x * 11 + y * 19) % 7 === 0) {
                ctx.fillStyle = '#4a3a34';
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    ctx.fillStyle = '#5a2018';
    for (let i = 0; i < 6; i++) {
        ctx.fillRect((i * 9 + 2) % 28, (i * 13 + 4) % 28, 4 + (i % 3), 3);
    }
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(6, 4, 1, 18);
    ctx.fillRect(6, 12, 14, 1);
    ctx.fillRect(18, 8, 1, 12);
    return canvas;
}

function makeFloorCanvas(kind) {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const seam = String(kind).match(/^(dirt|plank|stone)-(stone|dirt|plank)-(edge|corner|end)$/);
    const paintKind = seam ? (seam[1] === 'stone' ? 'flag' : seam[1]) : kind;

    function px(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(((x % size) + size) % size, ((y % size) + size) % size, 1, 1);
    }

    function paintFamily(ix, iy, family) {
        if (family === 'dirt') {
            const dirt = ['#3a2a1c', '#4a3624', '#2e2218', '#5a4030', '#241810'];
            px(ix, iy, dirt[(ix * 11 + iy * 17) % dirt.length]);
            return;
        }
        if (family === 'plank') {
            const boards = [[86, 62, 38], [102, 74, 46], [74, 54, 34], [94, 68, 42]];
            const pal = boards[Math.floor(iy / 8) % boards.length];
            const shade = 0.88 + (Math.floor(iy / 8) % 4) * 0.04;
            ctx.fillStyle = `rgb(${(pal[0] * shade) | 0},${(pal[1] * shade) | 0},${(pal[2] * shade) | 0})`;
            ctx.fillRect(ix, iy, 1, 1);
            return;
        }
        const pal = [[92, 82, 70], [108, 96, 82], [80, 72, 62], [118, 104, 88]];
        const onGrout = ix % 16 === 0 || iy % 16 === 0 || ix % 16 === 15 || iy % 16 === 15;
        if (onGrout) {
            px(ix, iy, '#1a1613');
            return;
        }
        const p = pal[(ix + iy * 3) % pal.length];
        const shade = 0.86 + ((ix * 9 + iy * 5) % 7) * 0.03;
        px(ix, iy, `rgb(${(p[0] * shade) | 0},${(p[1] * shade) | 0},${(p[2] * shade) | 0})`);
    }

    function blendEdge(side, family) {
        for (let i = 0; i < size; i++) {
            const depth = 4 + ((i * 13 + side * 7) % 6);
            for (let d = 0; d < depth; d++) {
                if (d > 2 && ((i * 9 + d * 5 + side) % 4) === 0) {
                    continue;
                }
                let ix = i;
                let iy = d;
                if (side === 1) {
                    ix = size - 1 - d;
                    iy = i;
                } else if (side === 2) {
                    ix = i;
                    iy = size - 1 - d;
                } else if (side === 3) {
                    ix = d;
                    iy = i;
                }
                paintFamily(ix, iy, family);
            }
        }
    }

    if (paintKind === 'dirt') {
        ctx.fillStyle = '#2a2016';
        ctx.fillRect(0, 0, size, size);
        const dirt = ['#3a2a1c', '#4a3624', '#2e2218', '#5a4030', '#241810'];
        for (let n = 0; n < 220; n++) {
            px((n * 11 + 3) % size, (n * 17 + 7) % size, dirt[n % dirt.length]);
        }
    } else if (paintKind === 'plank') {
        ctx.fillStyle = '#1a120c';
        ctx.fillRect(0, 0, size, size);
        const boards = [
            [86, 62, 38], [102, 74, 46], [74, 54, 34], [94, 68, 42],
        ];
        const bh = 8;
        for (let y = 0, i = 0; y < size; y += bh, i += 1) {
            const pal = boards[i % boards.length];
            const shade = 0.88 + (i % 4) * 0.04;
            ctx.fillStyle = `rgb(${(pal[0] * shade) | 0},${(pal[1] * shade) | 0},${(pal[2] * shade) | 0})`;
            ctx.fillRect(0, y + 1, size, bh - 1);
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.fillRect(0, y, size, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(0, y + 1, size, 1);
        }
    } else {
        const grout = paintKind === 'moss' ? '#1c2a18' : '#1a1613';
        ctx.fillStyle = grout;
        ctx.fillRect(0, 0, size, size);

        const palettes = {
            flag: [[92, 82, 70], [108, 96, 82], [80, 72, 62], [118, 104, 88]],
            worn: [[86, 76, 64], [100, 88, 74], [72, 64, 54], [94, 84, 70]],
            moss: [[78, 80, 62], [90, 86, 68], [70, 76, 58], [102, 94, 72]],
            dark: [[58, 52, 46], [70, 62, 54], [48, 44, 40], [64, 58, 50]],
            gravel: [[84, 74, 62], [96, 86, 72], [74, 66, 56], [108, 96, 80]],
        }[paintKind] || [[92, 82, 70], [108, 96, 82], [80, 72, 62], [118, 104, 88]];

        const tile = paintKind === 'gravel' ? 8 : 16;
        const gap = 1;
        let i = 0;
        for (let y = 0; y < size; y += tile) {
            for (let x = 0; x < size; x += tile) {
                const pal = palettes[(x / tile + (y / tile) * 3 + i) % palettes.length];
                const shade = 0.86 + ((x * 9 + y * 5 + i * 13) % 7) * 0.03;
                ctx.fillStyle = `rgb(${(pal[0] * shade) | 0},${(pal[1] * shade) | 0},${(pal[2] * shade) | 0})`;
                ctx.fillRect(x + gap, y + gap, tile - gap, tile - gap);
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(x + gap, y + gap, tile - gap, 1);
                ctx.fillStyle = 'rgba(0,0,0,0.16)';
                ctx.fillRect(x + gap, y + tile - 1, tile - gap, 1);
                i += 1;
            }
        }

        if (paintKind === 'worn') {
            const cracks = [
                [4, 6], [5, 7], [6, 8], [7, 9], [8, 11],
                [18, 3], [19, 4], [20, 6], [21, 8],
                [10, 20], [11, 21], [12, 22], [13, 24], [14, 25],
            ];
            for (const [x, y] of cracks) {
                px(x, y, '#151210');
                px(x + 1, y, '#2a241e');
            }
        }

        if (paintKind === 'moss') {
            const moss = ['#2a5c24', '#3d7a32', '#4a8f38', '#1e4a1c'];
            for (let n = 0; n < 70; n++) {
                const x = (n * 11 + 3) % size;
                const y = (n * 17 + 5) % size;
                const onGrout = x % 16 === 0 || y % 16 === 0 || x % 16 === 15 || y % 16 === 15;
                if (onGrout || n % 4 === 0) {
                    px(x, y, moss[n % moss.length]);
                    if (n % 3 === 0) {
                        px(x + 1, y, moss[(n + 1) % moss.length]);
                    }
                }
            }
        }

        if (paintKind === 'gravel') {
            for (let n = 0; n < 40; n++) {
                px((n * 7) % size, (n * 13) % size, n % 2 ? '#5a4e42' : '#3a322c');
            }
        }
    }

    if (seam) {
        const other = seam[2];
        const shape = seam[3];
        blendEdge(0, other);
        if (shape === 'corner') {
            blendEdge(1, other);
        } else if (shape === 'end') {
            blendEdge(2, other);
        }
    }

    const img = ctx.getImageData(0, 0, size, size);
    for (let p = 0; p < img.data.length; p += 4) {
        const n = ((p * 13) % 7) - 3;
        img.data[p] = Math.max(0, Math.min(255, img.data[p] + n));
        img.data[p + 1] = Math.max(0, Math.min(255, img.data[p + 1] + n));
        img.data[p + 2] = Math.max(0, Math.min(255, img.data[p + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

function canvasToAtlasTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

function setAtlasPlaneUVs(geo, kindIndex, cols, rows, tilePx) {
    const col = kindIndex % cols;
    const row = Math.floor(kindIndex / cols);
    const atlasW = cols * tilePx;
    const atlasH = rows * tilePx;
    const u0 = (col * tilePx + 0.5) / atlasW;
    const u1 = ((col + 1) * tilePx - 0.5) / atlasW;
    const v1 = 1 - (row * tilePx + 0.5) / atlasH;
    const v0 = 1 - ((row + 1) * tilePx - 0.5) / atlasH;
    const uv = geo.attributes.uv;
    uv.setXY(0, u0, v1);
    uv.setXY(1, u1, v1);
    uv.setXY(2, u0, v0);
    uv.setXY(3, u1, v0);
    uv.needsUpdate = true;
    return geo;
}

function atlasSliceTexture(atlasTex, kindIndex, cols, rows, { wrap = false } = {}) {
    const col = kindIndex % cols;
    const row = Math.floor(kindIndex / cols);
    const tex = atlasTex.clone();
    tex.wrapS = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    tex.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    tex.repeat.set(1 / cols, 1 / rows);
    tex.offset.set(col / cols, (rows - row - 1) / rows);
    tex.needsUpdate = true;
    return tex;
}

const WALL_KIND_IDS = ['stone', 'vine', 'cracked', 'wood', 'metal'];
const WALL_TILE_PX = 32;
const WALL_ATLAS_COLS = WALL_KIND_IDS.length;
const WALL_ATLAS_ROWS = 1;
const WALL_ATLAS_MAKERS = [
    makeStoneCanvas, makeVineCanvas, makeCrackedCanvas, makeWoodCanvas, makeMetalCanvas,
];
const WALL_MAT_PROPS = [
    { roughness: 0.92, metalness: 0.04 },
    { roughness: 0.92, metalness: 0.04 },
    { roughness: 0.94, metalness: 0.03 },
    { roughness: 0.88, metalness: 0.04 },
    { roughness: 0.42, metalness: 0.72 },
];

function makeWallAtlasCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = WALL_ATLAS_COLS * WALL_TILE_PX;
    canvas.height = WALL_ATLAS_ROWS * WALL_TILE_PX;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < WALL_ATLAS_MAKERS.length; i += 1) {
        ctx.drawImage(WALL_ATLAS_MAKERS[i](), i * WALL_TILE_PX, 0);
    }
    return canvas;
}

const wallAtlasTex = canvasToAtlasTexture(makeWallAtlasCanvas());
const WALL_KINDS = WALL_KIND_IDS.map((id, i) => ({
    id,
    mat: new THREE.MeshStandardMaterial({
        map: atlasSliceTexture(wallAtlasTex, i, WALL_ATLAS_COLS, WALL_ATLAS_ROWS, { wrap: true }),
        ...WALL_MAT_PROPS[i],
    }),
}));

const FLOOR_KINDS = [
    'flag', 'worn', 'moss', 'dark', 'gravel', 'plank', 'dirt',
    'dirt-stone-edge', 'dirt-stone-corner', 'dirt-stone-end',
    'plank-stone-edge', 'plank-stone-corner', 'plank-stone-end',
    'stone-dirt-edge', 'stone-dirt-corner', 'stone-dirt-end',
    'stone-plank-edge', 'stone-plank-corner', 'stone-plank-end',
    'dirt-plank-edge', 'dirt-plank-corner', 'dirt-plank-end',
    'plank-dirt-edge', 'plank-dirt-corner', 'plank-dirt-end',
];

const FLOOR_TILE_PX = 32;
const FLOOR_ATLAS_COLS = 8;
const FLOOR_ATLAS_ROWS = Math.ceil(FLOOR_KINDS.length / FLOOR_ATLAS_COLS);

function makeFloorAtlasCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = FLOOR_ATLAS_COLS * FLOOR_TILE_PX;
    canvas.height = FLOOR_ATLAS_ROWS * FLOOR_TILE_PX;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < FLOOR_KINDS.length; i += 1) {
        const tile = makeFloorCanvas(FLOOR_KINDS[i]);
        const col = i % FLOOR_ATLAS_COLS;
        const row = Math.floor(i / FLOOR_ATLAS_COLS);
        ctx.drawImage(tile, col * FLOOR_TILE_PX, row * FLOOR_TILE_PX);
    }
    return canvas;
}

function setFloorAtlasUVs(geo, kindIndex) {
    return setAtlasPlaneUVs(geo, kindIndex, FLOOR_ATLAS_COLS, FLOOR_ATLAS_ROWS, FLOOR_TILE_PX);
}

function floorAtlasSliceTexture(kindIndex) {
    return atlasSliceTexture(floorAtlasTex, kindIndex, FLOOR_ATLAS_COLS, FLOOR_ATLAS_ROWS);
}

const floorAtlasTex = canvasToAtlasTexture(makeFloorAtlasCanvas());
const floorMat = new THREE.MeshStandardMaterial({
    map: floorAtlasTex,
    roughness: 0.96,
    metalness: 0,
});
const floorMats = FLOOR_KINDS.map((_, i) => new THREE.MeshStandardMaterial({
    map: floorAtlasSliceTexture(i),
    roughness: 0.96,
    metalness: 0,
}));

const CEIL_KINDS = ['dark', 'stone', 'wood', 'metal', 'vine', 'vault', 'rock', 'grate', 'soot', 'gilt', 'brick', 'plaster'];
const CEIL_TILE_PX = 32;
const CEIL_ATLAS_COLS = 4;
const CEIL_ATLAS_ROWS = Math.ceil(CEIL_KINDS.length / CEIL_ATLAS_COLS);
const CEIL_ATLAS_MAKERS = [
    makeStoneCanvas, makeStoneCanvas, makeBeamCanvas, makeMetalCanvas,
    makeVineCanvas, makeVaultCanvas, makeRockCeilCanvas, makeGrateCanvas,
    makeSootCanvas, makeGiltCeilCanvas, makeBrickCeilCanvas, makePlasterCanvas,
];
const CEIL_MAT_PROPS = [
    { color: 0x2a2622, roughness: 0.98, metalness: 0 },
    { roughness: 0.96, metalness: 0.02 },
    { roughness: 0.9, metalness: 0.04 },
    { roughness: 0.45, metalness: 0.62 },
    { roughness: 0.96, metalness: 0.02 },
    { roughness: 0.88, metalness: 0.08 },
    { roughness: 0.98, metalness: 0.02 },
    { roughness: 0.7, metalness: 0.18 },
    { roughness: 0.98, metalness: 0 },
    { roughness: 0.55, metalness: 0.28 },
    { roughness: 0.94, metalness: 0.03 },
    { roughness: 0.96, metalness: 0.02 },
];

function makeCeilAtlasCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = CEIL_ATLAS_COLS * CEIL_TILE_PX;
    canvas.height = CEIL_ATLAS_ROWS * CEIL_TILE_PX;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < CEIL_ATLAS_MAKERS.length; i += 1) {
        const col = i % CEIL_ATLAS_COLS;
        const row = Math.floor(i / CEIL_ATLAS_COLS);
        ctx.drawImage(CEIL_ATLAS_MAKERS[i](), col * CEIL_TILE_PX, row * CEIL_TILE_PX);
    }
    return canvas;
}

function setCeilAtlasUVs(geo, kindIndex) {
    return setAtlasPlaneUVs(geo, kindIndex, CEIL_ATLAS_COLS, CEIL_ATLAS_ROWS, CEIL_TILE_PX);
}

const ceilAtlasTex = canvasToAtlasTexture(makeCeilAtlasCanvas());
const ceilMats = CEIL_MAT_PROPS.map((props) => new THREE.MeshStandardMaterial({
    map: ceilAtlasTex,
    ...props,
}));
const ceilPreviewMats = CEIL_KINDS.map((_, i) => new THREE.MeshStandardMaterial({
    map: atlasSliceTexture(ceilAtlasTex, i, CEIL_ATLAS_COLS, CEIL_ATLAS_ROWS),
    ...CEIL_MAT_PROPS[i],
}));

const wallTileGeo = new THREE.BoxGeometry(TILE, WALL_H, TILE);
const slabTileGeo = new THREE.BoxGeometry(TILE, SLAB_H, TILE);
const texturePlaneGeo = new THREE.PlaneGeometry(2, 2);
texturePlaneGeo.rotateX(-Math.PI / 2);

function pretty(kind) {
    return String(kind).replace(/-/g, ' ');
}

function makeWallTile(mat) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(wallTileGeo, mat);
    mesh.position.y = WALL_H / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
}

function makeFloorTile(mat) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(slabTileGeo, mat);
    mesh.position.y = SLAB_H / 2;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
}

function makeRoofTile(mat) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(slabTileGeo, mat);
    mesh.position.y = WALL_H;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
}

function makeTexturePlane(mat, aspect = 1) {
    const group = new THREE.Group();
    const width = 2;
    const height = 2 / Math.max(aspect, 0.01);
    const geo = aspect === 1 ? texturePlaneGeo : new THREE.PlaneGeometry(width, height);
    if (aspect !== 1) {
        geo.rotateX(-Math.PI / 2);
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.002;
    group.add(mesh);
    return group;
}

/** Crop one atlas cell into a standalone 32×32 texture for the Texture picker. */
function extractAtlasTileTexture(atlasCanvas, kindIndex, cols, tilePx) {
    const col = kindIndex % cols;
    const row = Math.floor(kindIndex / cols);
    const canvas = document.createElement('canvas');
    canvas.width = tilePx;
    canvas.height = tilePx;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
        atlasCanvas,
        col * tilePx,
        row * tilePx,
        tilePx,
        tilePx,
        0,
        0,
        tilePx,
        tilePx,
    );
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

function atlasSheetPreviewTexture(atlasTex) {
    const tex = atlasTex.clone();
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
    tex.needsUpdate = true;
    return tex;
}

function previewMaterial(map) {
    return new THREE.MeshBasicMaterial({
        map,
        side: THREE.DoubleSide,
    });
}

const wallAtlasCanvas = wallAtlasTex.image;
const floorAtlasCanvas = floorAtlasTex.image;
const ceilAtlasCanvas = ceilAtlasTex.image;

const textureSpecs = [
    {
        id: 'wall-atlas',
        label: 'wall atlas',
        map: atlasSheetPreviewTexture(wallAtlasTex),
        aspect: WALL_ATLAS_COLS / WALL_ATLAS_ROWS,
    },
    {
        id: 'floor-atlas',
        label: 'floor atlas',
        map: atlasSheetPreviewTexture(floorAtlasTex),
        aspect: FLOOR_ATLAS_COLS / FLOOR_ATLAS_ROWS,
    },
    {
        id: 'roof-atlas',
        label: 'roof atlas',
        map: atlasSheetPreviewTexture(ceilAtlasTex),
        aspect: CEIL_ATLAS_COLS / CEIL_ATLAS_ROWS,
    },
    ...WALL_KIND_IDS.map((id, i) => ({
        id: `wall-${id}`,
        label: `${pretty(id)} wall`,
        map: extractAtlasTileTexture(wallAtlasCanvas, i, WALL_ATLAS_COLS, WALL_TILE_PX),
    })),
    ...FLOOR_KINDS.map((kind, i) => ({
        id: `floor-${kind}`,
        label: `${pretty(kind)} floor`,
        map: extractAtlasTileTexture(floorAtlasCanvas, i, FLOOR_ATLAS_COLS, FLOOR_TILE_PX),
    })),
    ...CEIL_KINDS.map((kind, i) => ({
        id: `roof-${kind}`,
        label: `${pretty(kind)} roof`,
        map: extractAtlasTileTexture(ceilAtlasCanvas, i, CEIL_ATLAS_COLS, CEIL_TILE_PX),
    })),
];

const texturePreviewMats = textureSpecs.map((spec) => previewMaterial(spec.map));

export const wallAssets = WALL_KINDS.map(({ id, mat }) => ({
    id: `wall-${id}`,
    label: `${pretty(id)} wall`,
    build: () => makeWallTile(mat),
}));

export const floorAssets = FLOOR_KINDS.map((kind, i) => ({
    id: `floor-${kind}`,
    label: `${pretty(kind)} floor`,
    build: () => makeFloorTile(floorMats[i]),
}));

export const roofAssets = CEIL_KINDS.map((kind, i) => ({
    id: `roof-${kind}`,
    label: `${pretty(kind)} roof`,
    build: () => makeRoofTile(ceilPreviewMats[i]),
}));

export const textureAssets = textureSpecs.map((spec, i) => ({
    id: `tex-${spec.id}`,
    label: spec.label,
    build: () => makeTexturePlane(texturePreviewMats[i], spec.aspect || 1),
}));

export const TILE_SHARED_GEOS = new Set([wallTileGeo, slabTileGeo, texturePlaneGeo]);
export const TILE_SHARED_MATS = new Set([
    ...WALL_KINDS.map((kind) => kind.mat),
    floorMat,
    ...floorMats,
    ...ceilMats,
    ...ceilPreviewMats,
    ...texturePreviewMats,
]);

export {
    FLOOR_KINDS,
    CEIL_KINDS,
    floorMat,
    floorMats,
    ceilMats,
    floorAtlasTex,
    wallAtlasTex,
    ceilAtlasTex,
    setFloorAtlasUVs,
    setCeilAtlasUVs,
};
export const WALL_MATS = Object.fromEntries(WALL_KINDS.map((kind) => [kind.id, kind.mat]));
