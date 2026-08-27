import * as THREE from 'three';
import { CEIL_KINDS, FLOOR_KINDS, WALL_MATS, ceilMats, floorMats } from './dungeon-tiles.js';
import { MAKERS, SCENE_MATS, SHARED_GEOS, SHARED_MATS } from './dungeon-models.js';

const CELL = 1;
const WALL_H = 1.55;
const HALF_H = WALL_H * 0.22;
const BROKEN_H = WALL_H * 0.32;
const PROP_LIFT = 0.028;
const WALL_PUSH = 0.62;
const FULL_WALL = 1;
const HALF_WALL = 3;
const BROKEN_WALL = 4;
const HOLE_WALL = 5;
const FENCE_WALL = 6;
const FURNITURE = 7;
const WINDOW_WALL = 8;
const BREACH_WALL = 9;
const WATER_TILE = 10;
const SPIKE_TILE = 11;
const DOOR_TILE = 12;
const ANGLE_WALL = 13;
const CURVE_WALL = 14;
const VINES_TILE = 15;
const PIT_DEPTH = 0.48;
const PIT_INNER = 0.86;
const PIT_THICK = 0.08;
const DOOR_CLOSED = 0;

const WALL_DIRS = [
    { dx: 0, dz: -1 },
    { dx: 1, dz: 0 },
    { dx: 0, dz: 1 },
    { dx: -1, dz: 0 },
];

export const PALETTES = {
    stone: { fog: 0x090807, dark: 0x12100e, wall: 0xe8ddd0, floor: 0xd8cfc4, torch: 0xff8a3a, flame: 0xff6a14 },
    moss: { fog: 0x08110c, dark: 0x0c1410, wall: 0xc4d8c0, floor: 0xb0c8a8, torch: 0x8ad85a, flame: 0x3a8a28 },
    ember: { fog: 0x140a06, dark: 0x1a0e08, wall: 0xffd2a8, floor: 0xe8b078, torch: 0xff9030, flame: 0xff5010 },
    iron: { fog: 0x080a12, dark: 0x0c1018, wall: 0xc0d0e4, floor: 0xa0b4cc, torch: 0x88bbff, flame: 0x4060c0 },
    blood: { fog: 0x120606, dark: 0x180808, wall: 0xecc0b4, floor: 0xd08070, torch: 0xff5533, flame: 0xc02010 },
    crypt: { fog: 0x0c0c12, dark: 0x12141a, wall: 0xd8d4cc, floor: 0xc4c0b8, torch: 0xc8d8ff, flame: 0x6070a0 },
    sewer: { fog: 0x0c1008, dark: 0x10140c, wall: 0xb8c4a0, floor: 0x8a9a70, torch: 0x9ad060, flame: 0x4a7028 },
    gilt: { fog: 0x120e08, dark: 0x1a140c, wall: 0xf0e0b8, floor: 0xe8d090, torch: 0xffd060, flame: 0xc08020 },
    cave: { fog: 0x0a0908, dark: 0x12100e, wall: 0xd2c4b0, floor: 0xb4a48c, torch: 0xffa050, flame: 0xe06020 },
};

const ROOM_ACCENTS = {
    cell: 0xa8b0c0, pantry: 0xc8b48a, closet: 0xb8a898, bedroom: 0xe8c8c0, kitchen: 0xe0c878,
    study: 0xc0b898, dining: 0xd8b070, library: 0xb89878, barracks: 0xb0a090, shrine: 0xd8c878,
    well: 0x88a8a0, armory: 0xa8a090, forge: 0xc87840, crypt: 0xb0b8c0, sewer: 0x8a9a70,
    chapel: 0xe8d8b0, garden: 0x78a868, yard: 0x90b878, cave: 0xb8a890,
};

const WOOD_THEME = { wall: 'wood', floor: 'plank', ceil: 'wood' };
const ROOM_THEMES = {
    cell: { wall: 'cracked', floor: 'dark', ceil: 'dark' },
    pantry: WOOD_THEME,
    closet: WOOD_THEME,
    shrine: { wall: 'stone', floor: 'flag', ceil: 'dark' },
    well: { wall: 'vine', floor: 'dirt', ceil: 'vine' },
    bedroom: WOOD_THEME,
    kitchen: { wall: 'stone', floor: 'worn', ceil: 'stone' },
    study: WOOD_THEME,
    armory: { wall: 'metal', floor: 'dark', ceil: 'metal' },
    forge: { wall: 'cracked', floor: 'dark', ceil: 'metal' },
    crypt: { wall: 'cracked', floor: 'dark', ceil: 'dark' },
    sewer: { wall: 'vine', floor: 'dirt', ceil: 'vine' },
    dining: WOOD_THEME,
    library: WOOD_THEME,
    barracks: { wall: 'stone', floor: 'worn', ceil: 'stone' },
    chapel: { wall: 'stone', floor: 'flag', ceil: 'dark' },
    garden: { wall: 'vine', floor: 'dirt', ceil: 'vine' },
    yard: { wall: 'stone', floor: 'flag', ceil: 'dark' },
    cave: { wall: 'cracked', floor: 'gravel', ceil: 'stone' },
};

const PALETTE_CEIL = {
    stone: 'stone', moss: 'vine', ember: 'soot', iron: 'metal', blood: 'plaster',
    crypt: 'brick', sewer: 'grate', gilt: 'gilt', cave: 'rock',
};
const ROOM_CEIL = {
    chapel: 'vault', shrine: 'vault', cave: 'rock', sewer: 'grate', well: 'grate', forge: 'soot',
    kitchen: 'soot', garden: 'vine', armory: 'metal', barracks: 'metal', crypt: 'brick', cell: 'brick',
    bedroom: 'wood', study: 'wood', library: 'wood', dining: 'wood', pantry: 'wood', closet: 'wood',
};
const ROOM_CEIL_H = {
    cell: 1.22, closet: 1.28, pantry: 1.32, well: 1.38, sewer: 1.42, kitchen: 1.48, bedroom: 1.52,
    study: 1.58, armory: 1.62, barracks: 1.64, forge: 1.72, crypt: 1.78, garden: 1.88, cave: 1.9,
    library: 2.02, dining: 2.08, shrine: 2.14, chapel: 2.24,
};

const CARPET_ROOMS = new Set(['bedroom', 'chapel', 'dining', 'library', 'shrine']);
const CARPET_SOMETIMES = new Set(['study', 'closet']);
const MUSHROOM_PALETTES = new Set(['moss', 'iron', 'sewer', 'stone', 'cave']);
const STAINED_WINDOW_ROOMS = new Set(['chapel', 'shrine', 'library']);
const SKY_WINDOW_ROOMS = new Set(['bedroom', 'garden', 'yard']);
const OUTDOOR_ROOMS = new Set(['yard', 'garden']);

const HALL_FLOOR_MAKERS = [
    MAKERS.bucket, MAKERS.sack, MAKERS['candle-cluster'], MAKERS['floor-lantern'],
    MAKERS['bone-pile'], MAKERS['broken-stool'], MAKERS['stacked-bowls'], MAKERS['rope-coil'], MAKERS['debris-pile'],
];
const HALL_WALL_MAKERS = [MAKERS['hanging-chain'], MAKERS.banner, MAKERS.weapons];
const PALETTE_FLOOR_MAKERS = {
    gilt: [MAKERS['gold-urn'], MAKERS.candelabra, MAKERS['velvet-stool'], MAKERS.goblet],
    sewer: [MAKERS['grate-cover'], MAKERS['slime-bucket'], MAKERS['moss-tuft'], MAKERS.bucket, MAKERS['debris-pile']],
    crypt: [MAKERS['bone-pile'], MAKERS['skull-stack'], MAKERS['melted-candles'], MAKERS.urn, MAKERS['candle-cluster']],
    blood: [MAKERS['bone-pile'], MAKERS['skull-stack'], MAKERS['debris-pile'], MAKERS['candle-cluster']],
    ember: [MAKERS['floor-lantern'], MAKERS.kettle, MAKERS['coal-heap'], MAKERS.bucket, MAKERS['debris-pile']],
    iron: [MAKERS.bucket, MAKERS.helm, MAKERS.ingot, MAKERS['debris-pile'], MAKERS['rope-coil']],
    moss: [MAKERS.bucket, MAKERS['moss-tuft'], MAKERS.plant, MAKERS['rope-coil'], MAKERS.sack],
    cave: [MAKERS.stalagmite, MAKERS.boulder, MAKERS.bone, MAKERS['crystal-shard'], MAKERS.nest, MAKERS['pebble-cluster']],
};
const PALETTE_WALL_MAKERS = {
    gilt: [MAKERS.banner, MAKERS['holy-plaque']],
    sewer: [MAKERS['drip-pipe'], MAKERS['hanging-chain']],
    crypt: [MAKERS['hanging-chain'], MAKERS['holy-plaque']],
    cave: [],
};
const ROOM_FLOOR_MAKERS = {
    cell: [MAKERS['straw-pile'], MAKERS['tin-cup'], MAKERS['chained-bucket'], MAKERS.bucket],
    pantry: [MAKERS.crocks, MAKERS['grain-sack'], MAKERS['cutting-board'], MAKERS.kettle, MAKERS['overturned-pot']],
    kitchen: [MAKERS.crocks, MAKERS['cutting-board'], MAKERS.kettle, MAKERS['grain-sack'], MAKERS['overturned-pot'], MAKERS.barrel],
    closet: [MAKERS['folded-linens'], MAKERS['hat-box'], MAKERS.broom, MAKERS.boots],
    bedroom: [MAKERS['nightstand-candle'], MAKERS['chamber-pot'], MAKERS['clothes-pile'], MAKERS.washbasin],
    study: [MAKERS.lectern, MAKERS['ink-quill'], MAKERS['scroll-pile'], MAKERS['tiny-globe'], MAKERS['fallen-book']],
    library: [MAKERS.lectern, MAKERS['scroll-pile'], MAKERS['fallen-book'], MAKERS['tiny-globe'], MAKERS['ink-quill']],
    dining: [MAKERS['place-setting'], MAKERS.goblet, MAKERS.candelabra, MAKERS.platter],
    chapel: [MAKERS['kneeling-cushion'], MAKERS['offering-bowl'], MAKERS.incense],
    shrine: [MAKERS['kneeling-cushion'], MAKERS['offering-bowl'], MAKERS.incense],
    forge: [MAKERS['coal-heap'], MAKERS.tongs, MAKERS.ingot, MAKERS.bellows, MAKERS.slag],
    armory: [MAKERS.helm, MAKERS['floor-shield'], MAKERS.bedroll, MAKERS['spear-stand'], MAKERS.boots],
    barracks: [MAKERS.helm, MAKERS['floor-shield'], MAKERS.bedroll, MAKERS['spear-stand'], MAKERS.boots],
    crypt: [MAKERS['skull-stack'], MAKERS.urn, MAKERS['melted-candles'], MAKERS['coffin-fragment']],
    sewer: [MAKERS['grate-cover'], MAKERS['slime-bucket'], MAKERS['moss-tuft']],
    well: [MAKERS['grate-cover'], MAKERS['slime-bucket'], MAKERS['moss-tuft'], MAKERS.bucket],
    garden: [MAKERS.planter, MAKERS['watering-can'], MAKERS['flower-crate'], MAKERS['bird-bath'], MAKERS.plant],
    yard: [MAKERS.planter, MAKERS['bird-bath'], MAKERS['flower-crate'], MAKERS['moss-tuft'], MAKERS['pebble-cluster'], MAKERS.plant],
    cave: [MAKERS.stalagmite, MAKERS.boulder, MAKERS.bone, MAKERS['crystal-shard'], MAKERS.nest, MAKERS['pebble-cluster']],
};
const ROOM_WALL_MAKERS = {
    cell: [MAKERS.shackles, MAKERS['hanging-chain']],
    pantry: [MAKERS['hanging-ham']],
    kitchen: [MAKERS['hanging-ham']],
    chapel: [MAKERS['holy-plaque'], MAKERS.banner],
    shrine: [MAKERS['holy-plaque'], MAKERS.banner],
    sewer: [MAKERS['drip-pipe']],
    well: [MAKERS['drip-pipe']],
    armory: [MAKERS.weapons],
    barracks: [MAKERS.weapons],
    forge: [MAKERS.weapons],
    cave: [],
    garden: [],
    yard: [],
};
const ROOM_DETAIL_MAKERS = {
    chapel: [MAKERS.rug, MAKERS['offering-bowl']],
    shrine: [MAKERS.rug, MAKERS['kneeling-cushion']],
    bedroom: [MAKERS.rug, MAKERS['clothes-pile']],
    cave: [MAKERS['pebble-cluster'], MAKERS.bone, MAKERS.nest],
    crypt: [MAKERS['skull-stack'], MAKERS['melted-candles']],
    cell: [MAKERS['straw-pile'], MAKERS['tin-cup']],
    dining: [MAKERS['place-setting'], MAKERS.goblet],
    garden: [MAKERS['moss-tuft'], MAKERS['watering-can']],
    yard: [MAKERS['moss-tuft'], MAKERS['pebble-cluster'], MAKERS.plant],
};

const caveBlockGeo = new THREE.BoxGeometry(1, 1, 1);
const curveQuarterGeo = new THREE.CylinderGeometry(0.98, 0.98, 1, 16, 1, false, 0, Math.PI / 2);
const curveHalfGeo = new THREE.CylinderGeometry(0.7, 0.7, 1, 14, 1, false, 0, Math.PI);
const fencePostGeo = new THREE.BoxGeometry(0.04, 0.72, 0.04);
const fenceRailGeo = new THREE.BoxGeometry(0.98, 0.03, 0.03);
const windowPaneGeo = new THREE.PlaneGeometry(0.56, 0.78);
const windowMullionVGeo = new THREE.BoxGeometry(0.035, 0.78, 0.045);
const windowMullionHGeo = new THREE.BoxGeometry(0.56, 0.035, 0.045);
const doorJambGeo = new THREE.BoxGeometry(0.12, WALL_H, 0.16);
const doorLintelGeo = new THREE.BoxGeometry(1.02, 0.16, 0.18);
const doorLeafGeo = new THREE.BoxGeometry(0.72, WALL_H * 0.78, 0.05);
const pitBottomGeo = new THREE.BoxGeometry(PIT_INNER, 0.05, PIT_INNER);
const pitNsGeo = new THREE.BoxGeometry(PIT_INNER + PIT_THICK, PIT_DEPTH, PIT_THICK);
const pitEwGeo = new THREE.BoxGeometry(PIT_THICK, PIT_DEPTH, PIT_INNER);
const pitRimNsGeo = new THREE.BoxGeometry(1.02, 0.05, 0.12);
const pitRimEwGeo = new THREE.BoxGeometry(0.12, 0.05, 0.78);
const pitWaterGeo = new THREE.PlaneGeometry(0.78, 0.78);
const pitSpikeGeo = new THREE.ConeGeometry(0.05, 0.32, 5);
const pitMat = new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 1, metalness: 0 });
const spikeMat = new THREE.MeshStandardMaterial({ color: 0x6a6460, roughness: 0.4, metalness: 0.65 });
const skyPaneMat = new THREE.MeshBasicMaterial({ color: 0xa8c8ff, side: THREE.DoubleSide });
const stainedPaneMats = [0xff8860, 0x88a0ff, 0xffd070].map((color) =>
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
);
const windowGlassMat = new THREE.MeshBasicMaterial({
    color: 0xd8ecff, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide,
});

function cloneMat(mat) {
    const next = mat.clone();
    if (mat.map) {
        next.map = mat.map;
    }
    return next;
}

function paletteOf(id) {
    return PALETTES[id] || PALETTES.stone;
}

function roomContaining(rooms, x, z) {
    return (rooms || []).find((room) =>
        x >= room.x && x < room.x + room.w && z >= room.y && z < room.y + room.h);
}

function roomBeside(rooms, x, z) {
    return roomContaining(rooms, x, z) || (rooms || []).find((room) =>
        x >= room.x - 1 && x < room.x + room.w + 1 && z >= room.y - 1 && z < room.y + room.h + 1);
}

function isOutdoorRoom(room) {
    return OUTDOOR_ROOMS.has(room?.kind);
}

function isOutdoorAt(x, z, rooms) {
    return isOutdoorRoom(roomContaining(rooms, x, z));
}

function cellHash01(x, z, n = 0) {
    return (Math.abs(x * 13 + z * 17 + n * 31 + x * z * 7) % 1000) / 1000;
}

function pickHallWall(paletteId, roll) {
    if (paletteId === 'cave') {
        return roll === 1 ? 'stone' : 'cracked';
    }
    if ((paletteId === 'iron' || paletteId === 'gilt') && (roll === 0 || roll === 2)) {
        return 'metal';
    }
    if (paletteId === 'moss' && (roll === 0 || roll === 2 || roll === 3)) {
        return 'vine';
    }
    if ((paletteId === 'ember' || paletteId === 'blood') && (roll === 0 || roll === 1 || roll === 3)) {
        return 'cracked';
    }
    if ((paletteId === 'sewer' || paletteId === 'crypt') && roll === 0) {
        return 'vine';
    }
    if ((paletteId === 'sewer' || paletteId === 'crypt') && roll === 1) {
        return 'cracked';
    }
    if (roll === 0) {
        return 'vine';
    }
    if (roll === 1) {
        return 'cracked';
    }
    return 'stone';
}

function pickWallKind(room, paletteId, roll) {
    const kind = room?.kind;
    const theme = ROOM_THEMES[kind];
    if (!theme) {
        return pickHallWall(paletteId, roll);
    }
    if (kind === 'forge') {
        return roll === 0 ? 'metal' : 'cracked';
    }
    if (kind === 'sewer') {
        return roll === 1 ? 'cracked' : 'vine';
    }
    if (kind === 'armory') {
        return roll === 1 ? 'stone' : 'metal';
    }
    if (kind === 'chapel' || kind === 'shrine') {
        return roll === 1 ? 'cracked' : 'stone';
    }
    if (kind === 'cave') {
        return roll === 0 ? 'stone' : 'cracked';
    }
    return theme.wall;
}

function isCaveLook(x, z, rooms, paletteId) {
    if (paletteId === 'cave') {
        return true;
    }
    return roomContaining(rooms, x, z)?.kind === 'cave' || roomBeside(rooms, x, z)?.kind === 'cave';
}

function pickFloorKind(x, z, rooms, paletteId) {
    const room = roomContaining(rooms, x, z);
    const hash = Math.abs(x * 11 + z * 29);
    const theme = ROOM_THEMES[room?.kind];
    if (paletteId === 'cave' || room?.kind === 'cave') {
        return ['gravel', 'gravel', 'dirt', 'dark', 'moss'][hash % 5];
    }
    if (room?.kind === 'yard') {
        return ['flag', 'flag', 'gravel', 'dirt', 'worn'][hash % 5];
    }
    if (theme) {
        if (theme.floor !== 'dirt' && MUSHROOM_PALETTES.has(paletteId) && hash % 11 === 2) {
            return 'dirt';
        }
        return theme.floor;
    }
    return FLOOR_KINDS[hash % 5];
}

function pickCeilKind(x, z, rooms, paletteId) {
    const room = roomContaining(rooms, x, z);
    if (room?.kind && ROOM_CEIL[room.kind]) {
        return ROOM_CEIL[room.kind];
    }
    return PALETTE_CEIL[paletteId] || 'dark';
}

function outdoorOpeningHeight(room) {
    const span = Math.min(room?.w || 5, room?.h || 5);
    return Math.max(2.35, Math.min(3.55, 0.52 + 0.4 * span));
}

function pickCeilHeight(x, z, rooms) {
    const room = roomContaining(rooms, x, z);
    if (isOutdoorRoom(room)) {
        return outdoorOpeningHeight(room);
    }
    if (!room) {
        return WALL_H;
    }
    if (room.kind === 'cave') {
        return 1.62 + cellHash01(x, z, 41) * 0.52;
    }
    return ROOM_CEIL_H[room.kind] || WALL_H;
}

function isWalkable(cell) {
    return cell === 0 || cell === 2 || cell === DOOR_TILE;
}

function isFloorTile(cell) {
    return cell === 0 || cell === 2 || cell === FURNITURE || cell === DOOR_TILE || cell === VINES_TILE;
}

function isCeilTile(cell) {
    return isFloorTile(cell) || cell === WATER_TILE || cell === SPIKE_TILE
        || cell === ANGLE_WALL || cell === CURVE_WALL;
}

function isWallLike(cell) {
    return cell === FULL_WALL || cell === HALF_WALL || cell === BROKEN_WALL
        || cell === HOLE_WALL || cell === FENCE_WALL || cell === WINDOW_WALL || cell === BREACH_WALL
        || cell === ANGLE_WALL || cell === CURVE_WALL;
}

function wallHeightAt(x, z, rooms, grid) {
    let h = WALL_H;
    for (const { dx, dz } of WALL_DIRS) {
        const nx = x + dx;
        const nz = z + dz;
        if (!isCeilTile(grid?.[nz]?.[nx])) {
            continue;
        }
        h = Math.max(h, pickCeilHeight(nx, nz, rooms));
    }
    return h;
}

function floorFamily(kind) {
    if (kind === 'dirt') {
        return 'dirt';
    }
    if (kind === 'plank') {
        return 'plank';
    }
    return 'stone';
}

function seamOther(me, families) {
    if (me === 'stone') {
        if (families.has('dirt')) {
            return 'dirt';
        }
        if (families.has('plank')) {
            return 'plank';
        }
    } else if (families.has('stone')) {
        return 'stone';
    } else if (me === 'dirt' && families.has('plank')) {
        return 'plank';
    } else if (me === 'plank' && families.has('dirt')) {
        return 'dirt';
    }
    return null;
}

function resolveFloorSeam(kind, bits, other, x, z) {
    const rotFallback = (x + z) % 4;
    if (!bits || !other || other === floorFamily(kind)) {
        return { kind, rot: rotFallback };
    }
    const prefix = `${floorFamily(kind)}-${other}`;
    const singles = { 1: 0, 2: 3, 4: 2, 8: 1 };
    if (singles[bits] != null) {
        return { kind: `${prefix}-edge`, rot: singles[bits] };
    }
    const corners = { 3: 0, 6: 3, 12: 2, 9: 1 };
    if (corners[bits] != null) {
        return { kind: `${prefix}-corner`, rot: corners[bits] };
    }
    if (bits === 5) {
        return { kind: `${prefix}-end`, rot: 0 };
    }
    if (bits === 10) {
        return { kind: `${prefix}-end`, rot: 1 };
    }
    if ((bits & 3) === 3) {
        return { kind: `${prefix}-corner`, rot: 0 };
    }
    if ((bits & 6) === 6) {
        return { kind: `${prefix}-corner`, rot: 3 };
    }
    if ((bits & 12) === 12) {
        return { kind: `${prefix}-corner`, rot: 2 };
    }
    if ((bits & 9) === 9) {
        return { kind: `${prefix}-corner`, rot: 1 };
    }
    return { kind, rot: rotFallback };
}

function accentColor(color, room, shade) {
    color.setRGB(shade, shade, shade);
    if (room && ROOM_ACCENTS[room.kind]) {
        color.lerp(new THREE.Color(ROOM_ACCENTS[room.kind]), 0.28);
    }
    return color;
}

function facingOpen(grid, x, z) {
    for (const { dx, dz } of WALL_DIRS) {
        if (isWalkable(grid[z + dz]?.[x + dx])) {
            return Math.atan2(dx, dz);
        }
    }
    return 0;
}

function facingHall(grid, x, z, rooms) {
    const room = roomContaining(rooms, x, z);
    for (const { dx, dz } of WALL_DIRS) {
        const nx = x + dx;
        const nz = z + dz;
        if (!isWalkable(grid[nz]?.[nx])) {
            continue;
        }
        if (!room || nx < room.x || nx >= room.x + room.w || nz < room.y || nz >= room.y + room.h) {
            return Math.atan2(dx, dz);
        }
    }
    return facingOpen(grid, x, z);
}

function makeWallBoxGeo(widthX, height, widthZ) {
    const geo = new THREE.BoxGeometry(widthX, height, widthZ);
    const uv = geo.attributes.uv;
    const scaleY = height / WALL_H;
    if (scaleY < 0.999) {
        for (let face = 0; face < 6; face++) {
            if (face === 2 || face === 3) {
                continue;
            }
            const base = face * 4;
            for (let i = 0; i < 4; i++) {
                uv.setY(base + i, uv.getY(base + i) * scaleY);
            }
        }
        uv.needsUpdate = true;
    }
    return geo;
}

function faceKey(wx, wz, dx, dz) {
    return `${wx},${wz},${dx},${dz}`;
}

function collectFaces(grid, width, height) {
    const faces = [];
    for (let z = 0; z < height; z++) {
        for (let x = 0; x < width; x++) {
            const cell = grid[z][x];
            if (!isWalkable(cell) || cell === DOOR_TILE) {
                continue;
            }
            for (let d = 0; d < 4; d++) {
                const { dx, dz } = WALL_DIRS[d];
                const wx = x + dx;
                const wz = z + dz;
                if (grid[wz]?.[wx] !== FULL_WALL) {
                    continue;
                }
                faces.push({
                    x, z, wx, wz, dx, dz,
                    hash: Math.abs(x * 17 + z * 23 + d * 41),
                    propHash: Math.abs(x * 19 + z * 31 + d * 43),
                });
            }
        }
    }
    return faces;
}

function isReservedCell(x, z, player, exit) {
    if (player && player.x === x && player.y === z) {
        return true;
    }
    if (exit && exit.x === x && exit.y === z) {
        return true;
    }
    return false;
}

function pickClutterMaker(list, hash) {
    const usable = (list || []).filter(Boolean);
    if (!usable.length) {
        return null;
    }
    return usable[hash % usable.length];
}

function floorMakersFor(kind, paletteId) {
    if (kind && ROOM_FLOOR_MAKERS[kind]) {
        return ROOM_FLOOR_MAKERS[kind];
    }
    return PALETTE_FLOOR_MAKERS[paletteId] || HALL_FLOOR_MAKERS;
}

function wallMakersFor(kind, paletteId) {
    if (kind && ROOM_WALL_MAKERS[kind]) {
        return ROOM_WALL_MAKERS[kind];
    }
    if (PALETTE_WALL_MAKERS[paletteId]) {
        return PALETTE_WALL_MAKERS[paletteId];
    }
    return HALL_WALL_MAKERS;
}

function detailMakersFor(kind, paletteId) {
    if (kind && ROOM_DETAIL_MAKERS[kind]) {
        return ROOM_DETAIL_MAKERS[kind];
    }
    if (kind === 'cave' || paletteId === 'cave') {
        return [MAKERS['pebble-cluster'], MAKERS.bone, MAKERS.nest];
    }
    if (paletteId === 'gilt') {
        return [MAKERS.rug, MAKERS.goblet];
    }
    return [MAKERS.rug, MAKERS['debris-pile'], MAKERS['bone-pile']];
}

function furnitureGroups(grid, width, height) {
    const seen = new Set();
    const groups = [];
    for (let z = 0; z < height; z++) {
        for (let x = 0; x < width; x++) {
            if (grid[z][x] !== FURNITURE || seen.has(`${x},${z}`)) {
                continue;
            }
            const cells = [];
            const queue = [[x, z]];
            seen.add(`${x},${z}`);
            for (let i = 0; i < queue.length; i++) {
                const [cx, cz] = queue[i];
                cells.push({ x: cx, z: cz });
                for (const dir of WALL_DIRS) {
                    const nx = cx + dir.dx;
                    const nz = cz + dir.dz;
                    const key = `${nx},${nz}`;
                    if (grid[nz]?.[nx] !== FURNITURE || seen.has(key)) {
                        continue;
                    }
                    seen.add(key);
                    queue.push([nx, nz]);
                }
            }
            let minx = cells[0].x;
            let maxx = cells[0].x;
            let minz = cells[0].z;
            let maxz = cells[0].z;
            for (const cell of cells) {
                minx = Math.min(minx, cell.x);
                maxx = Math.max(maxx, cell.x);
                minz = Math.min(minz, cell.z);
                maxz = Math.max(maxz, cell.z);
            }
            groups.push({
                cells, minx, maxx, minz, maxz,
                hash: Math.abs(minx * 31 + minz * 47 + cells.length * 13),
            });
        }
    }
    return groups;
}

function facingFromWalls(grid, cells) {
    for (const cell of cells) {
        for (const dir of WALL_DIRS) {
            if (isWallLike(grid[cell.z + dir.dz]?.[cell.x + dir.dx])) {
                return Math.atan2(-dir.dx, -dir.dz);
            }
        }
    }
    return 0;
}

function tintWallMats(wall, palette, id) {
    wall.stone.color.setHex(palette.wall);
    wall.vine.color.setHex(palette.wall);
    wall.cracked.color.setHex(palette.wall);
    wall.wood.color.setHex(palette.wall);
    if (id === 'moss') {
        wall.wood.color.lerp(new THREE.Color(0x88aa70), 0.22);
    } else if (id === 'gilt') {
        wall.wood.color.lerp(new THREE.Color(0xe8c878), 0.28);
    } else if (id === 'cave') {
        wall.wood.color.lerp(new THREE.Color(0x8a7a68), 0.18);
    }
    wall.metal.color.setHex(palette.wall);
}

function tintCeilMats(clonedCeil, palette) {
    for (let i = 0; i < clonedCeil.length; i++) {
        const kind = CEIL_KINDS[i];
        const mat = clonedCeil[i];
        mat.color.setHex(palette.dark);
        if (kind === 'gilt') {
            mat.color.lerp(new THREE.Color(0xe8c878), 0.55);
            mat.color.lerp(new THREE.Color(palette.wall), 0.12);
        } else if (kind === 'vine') {
            mat.color.lerp(new THREE.Color(0x6a9a58), 0.4);
            mat.color.lerp(new THREE.Color(palette.wall), 0.15);
        } else if (kind === 'soot') {
            mat.color.lerp(new THREE.Color(0x1a1210), 0.55);
        } else if (kind === 'rock') {
            mat.color.lerp(new THREE.Color(0xb8a890), 0.35);
            mat.color.lerp(new THREE.Color(palette.wall), 0.2);
        } else if (kind === 'grate') {
            mat.color.lerp(new THREE.Color(0x6a7a50), 0.28);
            mat.color.lerp(new THREE.Color(palette.wall), 0.2);
        } else if (kind === 'vault') {
            mat.color.lerp(new THREE.Color(0xd8c8a0), 0.32);
            mat.color.lerp(new THREE.Color(palette.wall), 0.18);
        } else if (kind === 'brick') {
            mat.color.lerp(new THREE.Color(0x8a7060), 0.3);
            mat.color.lerp(new THREE.Color(palette.wall), 0.18);
        } else if (kind === 'plaster') {
            mat.color.lerp(new THREE.Color(0xc07068), 0.28);
            mat.color.lerp(new THREE.Color(palette.wall), 0.2);
        } else if (kind === 'metal') {
            mat.color.lerp(new THREE.Color(0x8898a8), 0.35);
            mat.color.lerp(new THREE.Color(palette.wall), 0.2);
        } else if (kind === 'wood') {
            mat.color.lerp(new THREE.Color(0x8a6a48), 0.3);
            mat.color.lerp(new THREE.Color(palette.wall), 0.18);
        } else {
            mat.color.lerp(new THREE.Color(palette.wall), 0.28);
        }
    }
}

const SCENE_SHARED_GEOS = new Set([
    caveBlockGeo, curveQuarterGeo, curveHalfGeo, fencePostGeo, fenceRailGeo,
    windowPaneGeo, windowMullionVGeo, windowMullionHGeo, doorJambGeo, doorLintelGeo,
    doorLeafGeo, pitBottomGeo, pitNsGeo, pitEwGeo, pitRimNsGeo, pitRimEwGeo,
    pitWaterGeo, pitSpikeGeo,
]);
const SCENE_SHARED_MATS = new Set([
    pitMat, spikeMat, skyPaneMat, windowGlassMat, ...stainedPaneMats,
]);

function collectDisposable(root, extraMats, extraGeos) {
    root.traverse((obj) => {
        if (obj.geometry
            && !SHARED_GEOS.has(obj.geometry)
            && !SCENE_SHARED_GEOS.has(obj.geometry)
            && !extraGeos.has(obj.geometry)) {
            extraGeos.add(obj.geometry);
        }
        const mats = obj.material
            ? (Array.isArray(obj.material) ? obj.material : [obj.material])
            : [];
        for (const mat of mats) {
            if (mat && !SHARED_MATS.has(mat) && !SCENE_SHARED_MATS.has(mat) && !extraMats.has(mat)) {
                extraMats.add(mat);
            }
        }
    });
}

export function buildDungeonRoom(state) {
    const extraMats = new Set();
    const extraGeos = new Set();
    const paletteId = state.palette || 'stone';
    const palette = paletteOf(paletteId);
    const wall = {
        stone: cloneMat(WALL_MATS.stone),
        vine: cloneMat(WALL_MATS.vine),
        cracked: cloneMat(WALL_MATS.cracked),
        wood: cloneMat(WALL_MATS.wood),
        metal: cloneMat(WALL_MATS.metal),
    };
    tintWallMats(wall, palette, paletteId);
    const clonedFloor = floorMats.map((mat) => {
        const next = cloneMat(mat);
        next.color.setHex(palette.floor);
        extraMats.add(next);
        return next;
    });
    const clonedCeil = ceilMats.map((mat) => {
        const next = cloneMat(mat);
        extraMats.add(next);
        return next;
    });
    tintCeilMats(clonedCeil, palette);
    for (const mat of Object.values(wall)) {
        extraMats.add(mat);
    }
    const waterMat = cloneMat(SCENE_MATS.waterMat);
    waterMat.color.setHex(paletteId === 'sewer' ? 0x2a4a18 : 0x1a4858);
    waterMat.emissive.setHex(paletteId === 'sewer' ? 0x14280c : 0x0a2838);
    extraMats.add(waterMat);
    const floorBaseMat = new THREE.MeshStandardMaterial({ color: palette.dark, roughness: 1, metalness: 0 });
    extraMats.add(floorBaseMat);
    const doorWoodMat = cloneMat(wall.wood);
    doorWoodMat.color.setHex(0xc4a07a);
    extraMats.add(doorWoodMat);
    const doorIronMat = cloneMat(wall.metal);
    doorIronMat.color.setHex(0x8a9098);
    extraMats.add(doorIronMat);

    const root = new THREE.Group();
    const w = state.width;
    const h = state.height;
    const rooms = state.rooms || [];

    const floorGeo = new THREE.PlaneGeometry(w * CELL, h * CELL);
    floorGeo.rotateX(-Math.PI / 2);
    extraGeos.add(floorGeo);
    const floorBase = new THREE.Mesh(floorGeo, floorBaseMat);
    floorBase.position.set((w - 1) / 2, -0.55, (h - 1) / 2);
    root.add(floorBase);

    const stoneWalls = [];
    const vineWalls = [];
    const crackedWalls = [];
    const woodWalls = [];
    const metalWalls = [];
    const halfWalls = [];
    const brokenWalls = [];
    const holeWalls = [];
    const fenceWalls = [];
    const windowWalls = [];
    const breachWalls = [];
    const waterTiles = [];
    const spikeTiles = [];
    const doorTiles = [];
    const angleTiles = [];
    const curveTiles = [];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const cell = state.grid[y][x];
            if (cell === FULL_WALL) {
                const room = roomBeside(rooms, x, y);
                const roll = (x * 7 + y * 13) % 5;
                const wallKind = pickWallKind(room, paletteId, roll);
                if (wallKind === 'wood') {
                    woodWalls.push(x, y);
                } else if (wallKind === 'metal') {
                    metalWalls.push(x, y);
                } else if (wallKind === 'vine') {
                    vineWalls.push(x, y);
                } else if (wallKind === 'cracked') {
                    crackedWalls.push(x, y);
                } else {
                    stoneWalls.push(x, y);
                }
            } else if (cell === HALF_WALL) {
                halfWalls.push(x, y);
            } else if (cell === BROKEN_WALL) {
                brokenWalls.push(x, y);
            } else if (cell === HOLE_WALL) {
                holeWalls.push(x, y);
            } else if (cell === FENCE_WALL) {
                fenceWalls.push(x, y);
            } else if (cell === WINDOW_WALL) {
                windowWalls.push(x, y);
            } else if (cell === BREACH_WALL) {
                breachWalls.push(x, y);
            } else if (cell === WATER_TILE) {
                waterTiles.push(x, y);
            } else if (cell === SPIKE_TILE) {
                spikeTiles.push(x, y);
            } else if (cell === DOOR_TILE) {
                doorTiles.push(x, y);
            } else if (cell === ANGLE_WALL) {
                angleTiles.push(x, y);
            } else if (cell === CURVE_WALL) {
                curveTiles.push(x, y);
            }
        }
    }

    function splitCaveWalls(positions) {
        const cave = [];
        const rest = [];
        for (let i = 0; i < positions.length; i += 2) {
            if (isCaveLook(positions[i], positions[i + 1], rooms, paletteId)) {
                cave.push(positions[i], positions[i + 1]);
            } else {
                rest.push(positions[i], positions[i + 1]);
            }
        }
        return [cave, rest];
    }

    function buildBlockyWalls(positions, material, maxH = WALL_H) {
        if (!positions.length) {
            return;
        }
        const chunks = [];
        const chunkColors = [];
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const vary = maxH === WALL_H;
        for (let i = 0; i < positions.length; i += 2) {
            const x = positions[i];
            const z = positions[i + 1];
            const tileH = vary ? wallHeightAt(x, z, rooms, state.grid) : maxH;
            const room = roomBeside(rooms, x, z);
            let y = 0;
            const layers = 3 + (Math.abs(x + z * 3) % 2);
            for (let layer = 0; layer < layers && y < tileH - 0.06; layer++) {
                const hh = Math.min(tileH - y, 0.24 + cellHash01(x, z, layer) * 0.36);
                const ww = 0.74 + cellHash01(x, z, layer + 3) * 0.32;
                const dd = 0.74 + cellHash01(x, z, layer + 6) * 0.32;
                chunks.push(
                    x + (cellHash01(x, z, layer + 9) - 0.5) * 0.16,
                    y + hh / 2,
                    z + (cellHash01(x, z, layer + 12) - 0.5) * 0.16,
                    ww, hh, dd,
                    (cellHash01(x, z, layer + 15) - 0.5) * 0.2,
                );
                accentColor(color, room, 0.8 + cellHash01(x, z, layer + 18) * 0.22);
                chunkColors.push(color.r, color.g, color.b);
                y += hh * 0.88;
            }
        }
        const mesh = new THREE.InstancedMesh(caveBlockGeo, material, Math.max(1, chunks.length / 7));
        for (let i = 0, index = 0; i < chunks.length; i += 7, index += 1) {
            dummy.position.set(chunks[i], chunks[i + 1], chunks[i + 2]);
            dummy.rotation.set(0, chunks[i + 6], 0);
            dummy.scale.set(chunks[i + 3], chunks[i + 4], chunks[i + 5]);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
            color.setRGB(chunkColors[index * 3], chunkColors[index * 3 + 1], chunkColors[index * 3 + 2]);
            mesh.setColorAt(index, color);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
        root.add(mesh);
    }

    function buildWalls(positions, material, height, widthX = 1.02, widthZ = 1.02) {
        const geo = makeWallBoxGeo(widthX, height, widthZ);
        extraGeos.add(geo);
        const count = positions.length / 2 || 1;
        const mesh = new THREE.InstancedMesh(geo, material, count);
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        for (let i = 0; i < positions.length; i += 2) {
            const index = i / 2;
            const x = positions[i];
            const z = positions[i + 1];
            const hh = height === WALL_H ? wallHeightAt(x, z, rooms, state.grid) : height;
            dummy.position.set(x, hh / 2, z);
            dummy.scale.set(1, hh / height, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
            const shade = 0.88 + ((positions[i] * 13 + positions[i + 1] * 7) % 9) * 0.015;
            accentColor(color, roomBeside(rooms, positions[i], positions[i + 1]), shade);
            mesh.setColorAt(index, color);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
        root.add(mesh);
        return mesh;
    }

    const [caveStone, restStone] = splitCaveWalls(stoneWalls);
    const [caveVine, restVine] = splitCaveWalls(vineWalls);
    const [caveCracked, restCracked] = splitCaveWalls(crackedWalls);
    const [caveWood, restWood] = splitCaveWalls(woodWalls);
    const [caveMetal, restMetal] = splitCaveWalls(metalWalls);
    const [caveHalf, restHalf] = splitCaveWalls(halfWalls);
    const [caveBroken, restBroken] = splitCaveWalls(brokenWalls);

    if (restStone.length) {
        buildWalls(restStone, wall.stone, WALL_H);
    }
    if (restVine.length) {
        buildWalls(restVine, wall.vine, WALL_H);
    }
    if (restCracked.length) {
        buildWalls(restCracked, wall.cracked, WALL_H);
    }
    if (restWood.length) {
        buildWalls(restWood, wall.wood, WALL_H);
    }
    if (restMetal.length) {
        buildWalls(restMetal, wall.metal, WALL_H);
    }
    if (restHalf.length) {
        buildWalls(restHalf, wall.stone, HALF_H);
    }
    if (restBroken.length) {
        buildWalls(restBroken, wall.cracked, BROKEN_H, 0.94, 0.88);
    }
    buildBlockyWalls(caveStone, wall.stone, WALL_H);
    buildBlockyWalls(caveVine, wall.vine, WALL_H);
    buildBlockyWalls(caveCracked, wall.cracked, WALL_H);
    buildBlockyWalls(caveWood, wall.wood, WALL_H);
    buildBlockyWalls(caveMetal, wall.metal, WALL_H);
    buildBlockyWalls(caveHalf, wall.stone, HALF_H);
    buildBlockyWalls(caveBroken, wall.cracked, BROKEN_H);

    function doorFrameMat(kind) {
        const themeWall = ROOM_THEMES[kind]?.wall;
        if (themeWall === 'wood') {
            return wall.wood;
        }
        if (themeWall === 'metal') {
            return wall.metal;
        }
        if (themeWall === 'vine') {
            return wall.vine;
        }
        if (themeWall === 'cracked') {
            return wall.cracked;
        }
        return wall.stone;
    }

    function makeFenceWall() {
        const group = new THREE.Group();
        for (const x of [-0.46, 0, 0.46]) {
            const post = new THREE.Mesh(fencePostGeo, SCENE_MATS.woodMat);
            post.position.set(x, 0.36, 0);
            group.add(post);
        }
        for (const y of [0.2, 0.38, 0.56]) {
            const rail = new THREE.Mesh(fenceRailGeo, SCENE_MATS.woodMat);
            rail.position.y = y;
            group.add(rail);
        }
        return group;
    }

    function makeWindowWall(stained, variant) {
        const group = new THREE.Group();
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.22, WALL_H, 1.02), wall.stone);
        left.position.set(-0.4, WALL_H / 2, 0);
        const right = new THREE.Mesh(new THREE.BoxGeometry(0.22, WALL_H, 1.02), wall.stone);
        right.position.set(0.4, WALL_H / 2, 0);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 1.02), wall.stone);
        sill.position.set(0, 0.42, 0);
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 1.02), wall.stone);
        lintel.position.set(0, WALL_H - 0.12, 0);
        const pane = new THREE.Mesh(windowPaneGeo, stained
            ? stainedPaneMats[Math.abs(variant) % stainedPaneMats.length]
            : skyPaneMat);
        pane.position.set(0, 0.91, -0.48);
        const glass = new THREE.Mesh(windowPaneGeo, windowGlassMat);
        glass.position.set(0, 0.91, -0.42);
        const mullionV = new THREE.Mesh(windowMullionVGeo, SCENE_MATS.ironMat);
        mullionV.position.set(0, 0.91, -0.45);
        const mullionH = new THREE.Mesh(windowMullionHGeo, SCENE_MATS.ironMat);
        mullionH.position.set(0, 0.91, -0.45);
        group.add(left, right, sill, lintel, pane, mullionV, mullionH, glass);
        const lightColor = stained
            ? [0xff8860, 0x88a0ff, 0xffd070][Math.abs(variant) % 3]
            : 0xa8c8ff;
        const light = new THREE.PointLight(lightColor, stained ? 0.7 : 0.55, 3.4, 2);
        light.position.set(0, 0.88, 0.12);
        group.add(light);
        return group;
    }

    function makeBreachWall() {
        const group = new THREE.Group();
        const sill = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.26, 1.02), wall.cracked);
        sill.position.y = 0.13;
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.18, WALL_H, 1.02), wall.stone);
        left.position.set(-0.42, WALL_H / 2, 0);
        const right = new THREE.Mesh(new THREE.BoxGeometry(0.18, WALL_H, 1.02), wall.stone);
        right.position.set(0.42, WALL_H / 2, 0);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 1.02), wall.cracked);
        top.position.y = WALL_H - 0.08;
        const rubble = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.22), wall.cracked);
        rubble.position.set(0.12, 0.32, 0.2);
        group.add(sill, left, right, top, rubble);
        return group;
    }

    function makeDoorway(kind) {
        const group = new THREE.Group();
        const frameMat = doorFrameMat(kind);
        const left = new THREE.Mesh(doorJambGeo, frameMat);
        left.position.set(-0.44, WALL_H / 2, 0);
        const right = new THREE.Mesh(doorJambGeo, frameMat);
        right.position.set(0.44, WALL_H / 2, 0);
        const lintel = new THREE.Mesh(doorLintelGeo, frameMat);
        lintel.position.set(0, WALL_H - 0.08, 0);
        group.add(left, right, lintel);
        if (kind !== 'cave') {
            const hinge = new THREE.Group();
            hinge.position.set(-0.38, 0, 0);
            hinge.rotation.y = DOOR_CLOSED;
            const leafMat = (kind === 'cell' || kind === 'armory' || kind === 'barracks'
                || kind === 'forge' || kind === 'crypt') ? doorIronMat : doorWoodMat;
            const door = new THREE.Mesh(doorLeafGeo, leafMat);
            door.position.set(0.36, WALL_H * 0.42, 0);
            hinge.add(door);
            group.add(hinge);
        }
        return group;
    }

    function addPitWell(group) {
        const bottom = new THREE.Mesh(pitBottomGeo, pitMat);
        bottom.position.y = -PIT_DEPTH;
        const north = new THREE.Mesh(pitNsGeo, wall.stone);
        north.position.set(0, -PIT_DEPTH / 2, -(PIT_INNER / 2));
        const south = north.clone();
        south.position.z = PIT_INNER / 2;
        const west = new THREE.Mesh(pitEwGeo, wall.stone);
        west.position.set(-(PIT_INNER / 2), -PIT_DEPTH / 2, 0);
        const east = west.clone();
        east.position.x = PIT_INNER / 2;
        const rimN = new THREE.Mesh(pitRimNsGeo, wall.stone);
        rimN.position.set(0, 0.034, -0.45);
        const rimS = rimN.clone();
        rimS.position.z = 0.45;
        const rimW = new THREE.Mesh(pitRimEwGeo, wall.stone);
        rimW.position.set(-0.45, 0.034, 0);
        const rimE = rimW.clone();
        rimE.position.x = 0.45;
        group.add(bottom, north, south, west, east, rimN, rimS, rimW, rimE);
    }

    function makeWaterTile() {
        const group = new THREE.Group();
        addPitWell(group);
        const water = new THREE.Mesh(pitWaterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -0.32;
        group.add(water);
        return group;
    }

    function makeSpikeTile() {
        const group = new THREE.Group();
        addPitWell(group);
        for (let i = 0; i < 7; i++) {
            const spike = new THREE.Mesh(pitSpikeGeo, spikeMat);
            spike.position.set(((i % 3) - 1) * 0.2, -PIT_DEPTH + 0.185, (Math.floor(i / 3) - 1) * 0.2);
            group.add(spike);
        }
        return group;
    }

    function makeAnglePartition(x, z) {
        const n = isWallLike(state.grid[z - 1]?.[x]);
        const s = isWallLike(state.grid[z + 1]?.[x]);
        const e = isWallLike(state.grid[z]?.[x + 1]);
        const ww = isWallLike(state.grid[z]?.[x - 1]);
        let yaw = Math.PI / 4;
        if ((n && e) || (s && ww)) {
            yaw = -Math.PI / 4;
        } else if ((n && ww) || (s && e)) {
            yaw = Math.PI / 4;
        } else if (e || ww) {
            yaw = Math.PI / 2 + ((x + z) % 2 === 0 ? 0.4 : -0.4);
        } else {
            yaw = (x + z) % 2 === 0 ? 0.4 : -0.4;
        }
        const hh = pickCeilHeight(x, z, rooms);
        const mesh = new THREE.Mesh(caveBlockGeo, doorFrameMat(roomContaining(rooms, x, z)?.kind));
        mesh.position.set(x, hh / 2, z);
        mesh.scale.set(1.38, hh, 0.2);
        mesh.rotation.y = yaw;
        return mesh;
    }

    function makeCurvePartition(x, z) {
        const n = isWallLike(state.grid[z - 1]?.[x]);
        const s = isWallLike(state.grid[z + 1]?.[x]);
        const e = isWallLike(state.grid[z]?.[x + 1]);
        const ww = isWallLike(state.grid[z]?.[x - 1]);
        const hh = pickCeilHeight(x, z, rooms);
        const mat = doorFrameMat(roomContaining(rooms, x, z)?.kind);
        const mesh = new THREE.Mesh(
            (n && e) || (n && ww) || (s && e) || (s && ww) ? curveQuarterGeo : curveHalfGeo,
            mat,
        );
        let ox = 0;
        let oz = 0;
        let yaw = 0;
        if (n && ww) {
            ox = -0.5;
            oz = -0.5;
        } else if (n && e) {
            ox = 0.5;
            oz = -0.5;
            yaw = Math.PI / 2;
        } else if (s && e) {
            ox = 0.5;
            oz = 0.5;
            yaw = Math.PI;
        } else if (s && ww) {
            ox = -0.5;
            oz = 0.5;
            yaw = -Math.PI / 2;
        } else {
            ox = e ? 0.28 : ww ? -0.28 : 0;
            oz = s ? 0.28 : n ? -0.28 : 0;
            yaw = n ? 0 : s ? Math.PI : e ? Math.PI / 2 : -Math.PI / 2;
        }
        mesh.position.set(x + ox, hh / 2, z + oz);
        mesh.scale.set(1, hh, 1);
        mesh.rotation.y = yaw;
        return mesh;
    }

    const extraWallRoot = new THREE.Group();
    function addRoofCap(x, z, baseH = WALL_H) {
        const top = wallHeightAt(x, z, rooms, state.grid);
        if (top <= baseH + 0.05) {
            return;
        }
        const cap = new THREE.Mesh(caveBlockGeo, wall.stone);
        cap.position.set(x, (baseH + top) / 2, z);
        cap.scale.set(1.02, top - baseH, 1.02);
        extraWallRoot.add(cap);
    }

    const windowTiles = [...holeWalls, ...windowWalls];
    for (let i = 0; i < windowTiles.length; i += 2) {
        const wx = windowTiles[i];
        const wz = windowTiles[i + 1];
        const room = roomBeside(rooms, wx, wz);
        const stained = STAINED_WINDOW_ROOMS.has(room?.kind)
            || (!SKY_WINDOW_ROOMS.has(room?.kind) && room?.kind !== 'cave'
                && ((wx * 7 + wz * 13) & 1) === 0);
        const win = makeWindowWall(stained, wx + wz * 3);
        win.position.set(wx, 0, wz);
        win.rotation.y = facingOpen(state.grid, wx, wz);
        extraWallRoot.add(win);
        addRoofCap(wx, wz);
    }
    for (let i = 0; i < fenceWalls.length; i += 2) {
        const fence = makeFenceWall();
        fence.position.set(fenceWalls[i], 0, fenceWalls[i + 1]);
        fence.rotation.y = facingOpen(state.grid, fenceWalls[i], fenceWalls[i + 1]);
        extraWallRoot.add(fence);
    }
    for (let i = 0; i < breachWalls.length; i += 2) {
        const breach = makeBreachWall();
        breach.position.set(breachWalls[i], 0, breachWalls[i + 1]);
        extraWallRoot.add(breach);
        addRoofCap(breachWalls[i], breachWalls[i + 1]);
    }
    for (let i = 0; i < doorTiles.length; i += 2) {
        const dx = doorTiles[i];
        const dz = doorTiles[i + 1];
        const room = roomContaining(rooms, dx, dz) || roomBeside(rooms, dx, dz);
        const door = makeDoorway(room?.kind);
        const yaw = facingHall(state.grid, dx, dz, rooms);
        door.rotation.y = yaw;
        door.position.set(dx + Math.sin(yaw) * 0.5, 0, dz + Math.cos(yaw) * 0.5);
        extraWallRoot.add(door);
        addRoofCap(dx, dz);
    }
    for (let i = 0; i < angleTiles.length; i += 2) {
        extraWallRoot.add(makeAnglePartition(angleTiles[i], angleTiles[i + 1]));
    }
    for (let i = 0; i < curveTiles.length; i += 2) {
        extraWallRoot.add(makeCurvePartition(curveTiles[i], curveTiles[i + 1]));
    }
    root.add(extraWallRoot);

    const hazardRoot = new THREE.Group();
    for (let i = 0; i < waterTiles.length; i += 2) {
        const tile = makeWaterTile();
        tile.position.set(waterTiles[i], 0, waterTiles[i + 1]);
        hazardRoot.add(tile);
    }
    for (let i = 0; i < spikeTiles.length; i += 2) {
        const tile = makeSpikeTile();
        tile.position.set(spikeTiles[i], 0, spikeTiles[i + 1]);
        hazardRoot.add(tile);
    }
    root.add(hazardRoot);

    const floorMap = Array.from({ length: h }, () => Array(w).fill(null));
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!isFloorTile(state.grid[y][x])) {
                continue;
            }
            floorMap[y][x] = pickFloorKind(x, y, rooms, paletteId);
        }
    }
    const floorBuckets = FLOOR_KINDS.map(() => []);
    const seamDirs = [
        { dx: 0, dy: -1, bit: 1 },
        { dx: 1, dy: 0, bit: 2 },
        { dx: 0, dy: 1, bit: 4 },
        { dx: -1, dy: 0, bit: 8 },
    ];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const base = floorMap[y][x];
            if (!base) {
                continue;
            }
            const me = floorFamily(base);
            let bits = 0;
            const others = new Set();
            for (const { dx, dy, bit } of seamDirs) {
                const nKind = floorMap[y + dy]?.[x + dx];
                if (!nKind) {
                    continue;
                }
                const fam = floorFamily(nKind);
                if (fam === me) {
                    continue;
                }
                bits |= bit;
                others.add(fam);
            }
            const resolved = resolveFloorSeam(base, bits, seamOther(me, others), x, y);
            let kind = FLOOR_KINDS.indexOf(resolved.kind);
            if (kind < 0) {
                kind = FLOOR_KINDS.indexOf(base);
            }
            if (kind < 0) {
                kind = 0;
            }
            floorBuckets[kind].push(x, y, resolved.rot);
        }
    }

    const tileGeo = new THREE.PlaneGeometry(1, 1);
    tileGeo.rotateX(-Math.PI / 2);
    extraGeos.add(tileGeo);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let k = 0; k < floorBuckets.length; k++) {
        const positions = floorBuckets[k];
        if (!positions.length) {
            continue;
        }
        const geo = tileGeo.clone();
        extraGeos.add(geo);
        const mesh = new THREE.InstancedMesh(geo, clonedFloor[k], positions.length / 3);
        mesh.receiveShadow = true;
        for (let i = 0; i < positions.length; i += 3) {
            const index = i / 3;
            dummy.position.set(positions[i], 0.002, positions[i + 1]);
            dummy.rotation.set(0, positions[i + 2] * (Math.PI / 2), 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
            const shade = 0.9 + ((positions[i] * 5 + positions[i + 1] * 11) % 6) * 0.02;
            accentColor(color, roomContaining(rooms, positions[i], positions[i + 1]), shade);
            mesh.setColorAt(index, color);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
        root.add(mesh);
    }

    const ceilBuckets = CEIL_KINDS.map(() => []);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!isCeilTile(state.grid[y][x]) || isOutdoorAt(x, y, rooms)) {
                continue;
            }
            const kindName = pickCeilKind(x, y, rooms, paletteId);
            const kind = Math.max(0, CEIL_KINDS.indexOf(kindName));
            ceilBuckets[kind].push(x, y);
        }
    }
    const ceilTileGeo = new THREE.PlaneGeometry(1, 1);
    ceilTileGeo.rotateX(Math.PI / 2);
    extraGeos.add(ceilTileGeo);
    for (let k = 0; k < ceilBuckets.length; k++) {
        const positions = ceilBuckets[k];
        if (!positions.length) {
            continue;
        }
        const geo = ceilTileGeo.clone();
        extraGeos.add(geo);
        const mesh = new THREE.InstancedMesh(geo, clonedCeil[k], positions.length / 2);
        for (let i = 0; i < positions.length; i += 2) {
            const index = i / 2;
            dummy.scale.set(1, 1, 1);
            dummy.position.set(positions[i], pickCeilHeight(positions[i], positions[i + 1], rooms) - 0.002, positions[i + 1]);
            dummy.rotation.set(0, ((positions[i] + positions[i + 1]) % 4) * (Math.PI / 2), 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
            const shade = 0.82 + ((positions[i] * 5 + positions[i + 1] * 11) % 6) * 0.02;
            accentColor(color, roomContaining(rooms, positions[i], positions[i + 1]), shade);
            mesh.setColorAt(index, color);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
        root.add(mesh);
    }

    const faces = collectFaces(state.grid, w, h);
    const torchSpots = faces.filter((face) => face.hash % 5 === 0).sort((a, b) => a.hash - b.hash).slice(0, 8);
    const torchFaces = new Set();
    const torchRoot = new THREE.Group();
    for (const spot of torchSpots) {
        torchFaces.add(faceKey(spot.wx, spot.wz, spot.dx, spot.dz));
        const px = spot.wx - spot.dx * WALL_PUSH;
        const pz = spot.wz - spot.dz * WALL_PUSH;
        const py = 0.5;
        const torch = MAKERS.torch();
        torch.position.set(px, py, pz);
        torch.rotation.y = Math.atan2(-spot.dx, -spot.dz);
        torchRoot.add(torch);
        const light = new THREE.PointLight(palette.torch, 2.1, 5.2, 1.7);
        light.position.set(px - spot.dx * 0.08, py + 0.18, pz - spot.dz * 0.08);
        torchRoot.add(light);
    }
    root.add(torchRoot);

    const propRoot = new THREE.Group();
    const openFaces = faces.filter((face) => !torchFaces.has(faceKey(face.wx, face.wz, face.dx, face.dz)));
    const paintingSpots = openFaces
        .filter((face) => face.propHash % 2 === 0)
        .filter((face) => {
            const kind = roomContaining(rooms, face.x, face.z)?.kind;
            return kind !== 'cave' && !OUTDOOR_ROOMS.has(kind);
        })
        .sort((a, b) => a.propHash - b.propHash)
        .slice(0, 12);
    const paintingFaces = new Set(paintingSpots.map((face) => faceKey(face.wx, face.wz, face.dx, face.dz)));
    const usedCells = new Set();
    for (const spot of paintingSpots) {
        const prop = MAKERS.painting(spot.propHash);
        prop.position.set(spot.wx - spot.dx * WALL_PUSH, 1.1, spot.wz - spot.dz * WALL_PUSH);
        prop.rotation.y = Math.atan2(-spot.dx, -spot.dz);
        propRoot.add(prop);
        usedCells.add(`${spot.x},${spot.z}`);
    }
    const wallSpots = openFaces
        .filter((face) => !paintingFaces.has(faceKey(face.wx, face.wz, face.dx, face.dz)))
        .filter((face) => face.propHash % 5 === 0)
        .sort((a, b) => a.propHash - b.propHash)
        .slice(0, 12);
    for (const spot of wallSpots) {
        const room = roomContaining(rooms, spot.x, spot.z);
        const maker = pickClutterMaker(wallMakersFor(room?.kind, paletteId), spot.propHash);
        if (!maker) {
            continue;
        }
        const prop = maker(spot.propHash);
        const heights = [0.72, 0.92, 0.78, 0.95];
        prop.position.set(
            spot.wx - spot.dx * WALL_PUSH,
            prop.userData.wallY || heights[spot.propHash % heights.length],
            spot.wz - spot.dz * WALL_PUSH,
        );
        prop.rotation.y = Math.atan2(-spot.dx, -spot.dz);
        propRoot.add(prop);
        usedCells.add(`${spot.x},${spot.z}`);
    }

    const floorCells = [];
    for (let z = 0; z < h; z++) {
        for (let x = 0; x < w; x++) {
            const cell = state.grid[z][x];
            if (cell !== 0 && cell !== 2) {
                continue;
            }
            if (isReservedCell(x, z, state.player, state.exit) || usedCells.has(`${x},${z}`)) {
                continue;
            }
            floorCells.push({ x, z, hash: Math.abs(x * 37 + z * 53) });
        }
    }
    floorCells.sort((a, b) => a.hash - b.hash);
    const nearWall = floorCells.filter((cell) =>
        WALL_DIRS.some((dir) => isWallLike(state.grid[cell.z + dir.dz]?.[cell.x + dir.dx])));
    const scatterPool = nearWall.length ? nearWall : floorCells;
    const furniture = scatterPool.filter((cell) => cell.hash % 6 === 0).slice(0, 16);
    const furnitureCells = new Set(furniture.map((cell) => `${cell.x},${cell.z}`));
    for (const cell of furniture) {
        const walls = WALL_DIRS.filter((dir) => isWallLike(state.grid[cell.z + dir.dz]?.[cell.x + dir.dx]));
        const dir = walls[cell.hash % Math.max(1, walls.length)] || { dx: 0, dz: 1 };
        const room = roomContaining(rooms, cell.x, cell.z);
        const maker = pickClutterMaker(floorMakersFor(room?.kind, paletteId), cell.hash);
        if (!maker) {
            continue;
        }
        const prop = maker(cell.hash);
        prop.position.set(cell.x + dir.dx * 0.32, PROP_LIFT, cell.z + dir.dz * 0.32);
        prop.rotation.y = Math.atan2(-dir.dx, -dir.dz);
        propRoot.add(prop);
    }
    const details = scatterPool
        .filter((cell) => !furnitureCells.has(`${cell.x},${cell.z}`) && cell.hash % 11 === 0)
        .slice(0, 12);
    for (const cell of details) {
        const room = roomContaining(rooms, cell.x, cell.z);
        const maker = pickClutterMaker(detailMakersFor(room?.kind, paletteId), cell.hash);
        if (!maker) {
            continue;
        }
        const walls = WALL_DIRS.filter((dir) => isWallLike(state.grid[cell.z + dir.dz]?.[cell.x + dir.dx]));
        const dir = walls[cell.hash % Math.max(1, walls.length)] || { dx: 0, dz: 0 };
        const prop = maker(cell.hash);
        prop.position.set(cell.x + dir.dx * 0.32, PROP_LIFT, cell.z + dir.dz * 0.32);
        prop.rotation.y = Math.atan2(-dir.dx, -dir.dz) || (cell.hash % 4) * (Math.PI / 2);
        propRoot.add(prop);
    }

    for (const room of rooms) {
        const hash = Math.abs(room.x * 13 + room.y * 17);
        const yes = CARPET_ROOMS.has(room.kind) || (CARPET_SOMETIMES.has(room.kind) && hash % 2 === 0);
        if (!yes) {
            continue;
        }
        let hazard = false;
        for (let y = room.y; y < room.y + room.h && !hazard; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                const cell = state.grid[y]?.[x];
                if (cell === WATER_TILE || cell === SPIKE_TILE || cell === VINES_TILE) {
                    hazard = true;
                    break;
                }
            }
        }
        if (hazard) {
            continue;
        }
        const carpet = MAKERS.rug(hash);
        carpet.scale.set(Math.max(1.4, room.w * 0.9), 1, Math.max(1.2, room.h * 0.85));
        carpet.position.set(room.x + (room.w - 1) / 2, PROP_LIFT, room.y + (room.h - 1) / 2);
        propRoot.add(carpet);
    }

    for (const group of furnitureGroups(state.grid, w, h)) {
        const n = group.cells.length;
        const cx = (group.minx + group.maxx) / 2;
        const cz = (group.minz + group.maxz) / 2;
        const alongX = group.maxx - group.minx >= group.maxz - group.minz;
        const room = roomContaining(rooms, Math.round(cx), Math.round(cz));
        const kind = room?.kind;
        let prop;
        if (kind === 'bedroom') {
            prop = n >= 2 ? MAKERS.bed() : MAKERS.cabinet();
        } else if (kind === 'kitchen') {
            prop = MAKERS.stove();
        } else if (kind === 'study') {
            prop = MAKERS.desk();
        } else if (kind === 'library') {
            prop = n >= 2 ? MAKERS.bookshelf() : MAKERS.cabinet();
        } else if (kind === 'dining') {
            prop = n >= 4 ? MAKERS['dining-table']() : MAKERS.table(1.55, 0.7);
        } else if (kind === 'barracks') {
            prop = MAKERS.bunk(n >= 2);
        } else if (kind === 'chapel' || kind === 'shrine') {
            prop = n >= 2 ? MAKERS.altar() : MAKERS.pew();
        } else if (kind === 'forge') {
            prop = MAKERS.anvil();
        } else if (kind === 'armory') {
            prop = MAKERS['weapon-rack']();
        } else if (kind === 'crypt') {
            prop = MAKERS.sarcophagus();
        } else if (kind === 'garden' || kind === 'yard') {
            prop = MAKERS.planter();
        } else if (kind === 'well') {
            prop = MAKERS.well();
        } else if (kind === 'sewer') {
            prop = MAKERS.cistern();
        } else if (kind === 'cave') {
            prop = n >= 2 ? MAKERS.boulder(group.hash) : MAKERS.stalagmite(group.hash);
        } else if (kind === 'cell') {
            prop = MAKERS.bunk(false);
        } else if (kind === 'pantry') {
            prop = MAKERS.shelf();
        } else if (kind === 'closet') {
            prop = MAKERS.cabinet();
        } else if (n >= 4) {
            prop = group.hash % 3 === 0 ? MAKERS.bed() : MAKERS['dining-table']();
        } else if (n >= 2) {
            prop = group.hash % 2 === 0 ? MAKERS.table(1.55, 0.7) : MAKERS.bookshelf();
        } else if (group.hash % 3 === 0) {
            prop = MAKERS.cabinet();
        } else if (group.hash % 3 === 1) {
            prop = MAKERS.table();
        } else {
            prop = MAKERS.crate();
            prop.scale.set(1.7, 1.7, 1.7);
        }
        prop.position.set(cx, PROP_LIFT, cz);
        if (kind === 'study' || kind === 'library' || kind === 'closet' || kind === 'pantry'
            || kind === 'cell' || kind === 'kitchen' || kind === 'sewer' || kind === 'barracks' || n === 1) {
            prop.rotation.y = facingFromWalls(state.grid, group.cells);
        } else {
            prop.rotation.y = alongX ? 0 : Math.PI / 2;
        }
        propRoot.add(prop);
    }
    root.add(propRoot);

    collectDisposable(root, extraMats, extraGeos);

    return {
        group: root,
        palette,
        dispose() {
            for (const geo of extraGeos) {
                if (!SHARED_GEOS.has(geo)) {
                    geo.dispose();
                }
            }
            for (const mat of extraMats) {
                if (!SHARED_MATS.has(mat)) {
                    mat.dispose();
                }
            }
        },
    };
}
