import { promises as fs } from 'fs';
import path from 'path';
import { createSseHub } from './sse.js';

const FLOOR = 0;
const WALL = 1;
const EXIT = 2;
const HALF = 3;
const BROKEN = 4;
const HOLE = 5;
const FENCE = 6;
const FURNITURE = 7;
const WINDOW = 8;
const BREACH = 9;
const WATER = 10;
const SPIKES = 11;
const DOOR = 12;

const DIRS = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
];

const MOVES = new Set(['up', 'down', 'left', 'right']);
const ACTIONS = new Set(['fire']);
const COMMANDS = new Set([...MOVES, ...ACTIONS]);
const ANARCHY_LOCK_MS = 350;
const FIRE_LOCK_MS = 500;
const DEMOCRACY_MS = 8_000;
const IDLE_MS = 60_000;
const AUTOPLAY_MS = 1600;
const BASE_PATH = 4;
const MIN_SIZE = 15;
const MAX_SIZE = 31;
const DEFAULT_CANVAS = { width: 640, height: 480 };
const DEFAULT_ANCHOR = 'top-left';
const CANVAS_STEPS = [
    { width: 480, height: 270 },
    { width: 640, height: 360 },
    { width: 640, height: 480 },
    { width: 854, height: 480 },
    { width: 960, height: 540 },
    { width: 1280, height: 720 },
    { width: 1600, height: 900 },
    { width: 1920, height: 1080 },
];
const ANCHORS = {
    'top-left': 'top-left',
    topleft: 'top-left',
    tl: 'top-left',
    'top-right': 'top-right',
    topright: 'top-right',
    tr: 'top-right',
    'bottom-left': 'bottom-left',
    bottomleft: 'bottom-left',
    bl: 'bottom-left',
    'bottom-right': 'bottom-right',
    bottomright: 'bottom-right',
    br: 'bottom-right',
};

const PALETTE_IDS = ['stone', 'moss', 'ember', 'iron', 'blood', 'crypt', 'sewer', 'gilt', 'cave'];
const SMALL_KINDS = ['cell', 'pantry', 'closet', 'shrine', 'well'];
const MEDIUM_KINDS = ['bedroom', 'kitchen', 'study', 'armory', 'forge', 'crypt', 'sewer', 'cave'];
const LARGE_KINDS = ['dining', 'library', 'barracks', 'chapel', 'garden', 'cave'];
const WINDOW_KINDS = new Set(['chapel', 'bedroom', 'garden', 'library', 'shrine']);
const BREACH_KINDS = new Set(['forge', 'armory', 'crypt', 'barracks', 'sewer', 'cave']);
const WATER_KINDS = new Set(['garden', 'well', 'sewer', 'cave']);
const SPIKE_KINDS = new Set(['cell', 'crypt', 'armory', 'barracks']);
const RARE_BREACH_KINDS = new Set(['chapel', 'bedroom']);

export const DUNGEON_ALIASES = {
    u: 'up',
    f: 'up',
    forward: 'up',
    d: 'down',
    b: 'down',
    back: 'down',
    l: 'left',
    r: 'right',
    shoot: 'fire',
    blast: 'fire',
    bolt: 'fire',
    cast: 'fire',
};

export function normalizeDungeonCommand(value) {
    const key = String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/^!/, '');
    const command = DUNGEON_ALIASES[key] ?? key;
    return COMMANDS.has(command) ? command : null;
}

function isOpen(cell) {
    return cell === FLOOR || cell === EXIT || cell === DOOR;
}

const PLAYER_MAX_HP = 3;
const GOBLIN_HP = 1;
const GHOST_HP = 2;
const GHOST_ROOMS = new Set(['crypt', 'chapel', 'shrine']);
const GOBLIN_ROOMS = new Set(['armory', 'barracks']);

function snapshotEnemies(enemies) {
    return (enemies || []).map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
    }));
}

function enemyAt(enemies, x, y, skipId) {
    return (enemies || []).find((enemy) => enemy.x === x && enemy.y === y && enemy.id !== skipId) || null;
}

function roomKindAt(rooms, x, y) {
    const room = (rooms || []).find((item) =>
        x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h);
    return room?.kind || 'hall';
}

function canEnemyStand(maze, x, y, skipId) {
    const cell = maze.grid[y]?.[x];
    if (cell !== FLOOR && cell !== DOOR) {
        return false;
    }
    if (x === maze.player.x && y === maze.player.y) {
        return false;
    }
    if (x === maze.exit.x && y === maze.exit.y) {
        return false;
    }
    return !enemyAt(maze.enemies, x, y, skipId);
}

function manhattan(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
}

function spawnCandidates(maze) {
    const dist = distFrom(maze.grid, maze.player.x, maze.player.y);
    const spots = [];
    for (let y = 0; y < maze.height; y++) {
        for (let x = 0; x < maze.width; x++) {
            if (maze.grid[y][x] !== FLOOR) {
                continue;
            }
            if ((x === maze.player.x && y === maze.player.y) || (x === maze.exit.x && y === maze.exit.y)) {
                continue;
            }
            if ((dist[y]?.[x] ?? -1) < 4) {
                continue;
            }
            spots.push({ x, y, kind: roomKindAt(maze.rooms, x, y) });
        }
    }
    return shuffle(spots);
}

function takeSpots(spots, count, prefer) {
    const preferred = spots.filter(prefer);
    const other = spots.filter((spot) => !prefer(spot));
    const taken = [...preferred, ...other].slice(0, count);
    const used = new Set(taken.map((spot) => `${spot.x},${spot.y}`));
    return {
        taken,
        rest: spots.filter((spot) => !used.has(`${spot.x},${spot.y}`)),
    };
}

function spawnEnemies(maze, floor) {
    maze.enemies = [];
    if (floor <= 0) {
        return maze;
    }
    const goblinCount = Math.min(3, 1 + Math.floor((floor - 1) / 3));
    const ghostCount = floor < 2 ? 0 : Math.min(2, 1 + Math.floor((floor - 2) / 4));
    let spots = spawnCandidates(maze);
    let nextId = 1;
    const ghosts = takeSpots(spots, ghostCount, (spot) => GHOST_ROOMS.has(spot.kind));
    spots = ghosts.rest;
    for (const spot of ghosts.taken) {
        maze.enemies.push({ id: nextId, kind: 'ghost', x: spot.x, y: spot.y, hp: GHOST_HP });
        nextId += 1;
    }
    const goblins = takeSpots(spots, goblinCount, (spot) => GOBLIN_ROOMS.has(spot.kind) || spot.kind === 'hall');
    for (const spot of goblins.taken) {
        maze.enemies.push({ id: nextId, kind: 'goblin', x: spot.x, y: spot.y, hp: GOBLIN_HP });
        nextId += 1;
    }
    return maze;
}

function castFire(maze) {
    const { x, y, dir } = maze.player;
    const { dx, dy } = DIRS[dir];
    const limit = maze.width + maze.height;
    let cx = x;
    let cy = y;
    for (let i = 0; i < limit; i += 1) {
        const nx = cx + dx;
        const ny = cy + dy;
        const foe = enemyAt(maze.enemies, nx, ny);
        if (foe) {
            return {
                from: { x, y },
                dir,
                hit: { x: nx, y: ny },
                hitKind: 'enemy',
                enemyId: foe.id,
            };
        }
        if (!isOpen(maze.grid[ny]?.[nx])) {
            return {
                from: { x, y },
                dir,
                hit: { x: nx, y: ny },
                hitKind: 'wall',
            };
        }
        cx = nx;
        cy = ny;
    }
    return {
        from: { x, y },
        dir,
        hit: { x: cx + dx, y: cy + dy },
        hitKind: 'wall',
    };
}

function applyFireHit(maze, shot) {
    const hits = [];
    const killed = [];
    if (shot?.hitKind !== 'enemy') {
        return { hits, killed };
    }
    const enemy = (maze.enemies || []).find((item) => item.id === shot.enemyId);
    if (!enemy) {
        return { hits, killed };
    }
    enemy.hp -= 1;
    hits.push({ id: enemy.id, kind: enemy.kind, x: enemy.x, y: enemy.y, hp: enemy.hp });
    if (enemy.hp <= 0) {
        killed.push({ id: enemy.id, kind: enemy.kind, x: enemy.x, y: enemy.y });
        maze.enemies = maze.enemies.filter((item) => item.id !== enemy.id);
    }
    return { hits, killed };
}

function stepTowardOpen(maze, enemy) {
    const dir = bestDirToward(maze.grid, enemy.x, enemy.y, maze.player.x, maze.player.y, 0);
    if (dir == null) {
        return;
    }
    const nx = enemy.x + DIRS[dir].dx;
    const ny = enemy.y + DIRS[dir].dy;
    if (canEnemyStand(maze, nx, ny, enemy.id)) {
        enemy.x = nx;
        enemy.y = ny;
    }
}

function stepGhost(maze, enemy) {
    let best = null;
    let bestDist = manhattan(enemy.x, enemy.y, maze.player.x, maze.player.y);
    for (const { dx, dy } of DIRS) {
        const mx = enemy.x + dx;
        const my = enemy.y + dy;
        const nx = enemy.x + dx * 2;
        const ny = enemy.y + dy * 2;
        if (!isWallish(maze.grid[my]?.[mx])) {
            continue;
        }
        if (!canEnemyStand(maze, nx, ny, enemy.id)) {
            continue;
        }
        const dist = manhattan(nx, ny, maze.player.x, maze.player.y);
        if (dist < bestDist) {
            bestDist = dist;
            best = { x: nx, y: ny };
        }
    }
    if (best) {
        enemy.x = best.x;
        enemy.y = best.y;
        return;
    }
    stepTowardOpen(maze, enemy);
}

function stepEnemies(maze) {
    for (const enemy of maze.enemies || []) {
        if (enemy.kind === 'ghost') {
            stepGhost(maze, enemy);
        } else {
            stepTowardOpen(maze, enemy);
        }
    }
}

function enemyMelee(maze) {
    return (maze.enemies || []).some((enemy) =>
        manhattan(enemy.x, enemy.y, maze.player.x, maze.player.y) === 1);
}

function enemyInFront(maze) {
    return castFire(maze).hitKind === 'enemy';
}

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function sizeForFloor(floor) {
    const n = MIN_SIZE + 2 * Math.max(0, floor - 1);
    const odd = n % 2 === 0 ? n + 1 : n;
    return Math.min(MAX_SIZE, odd);
}

function distFrom(grid, ox, oy) {
    const height = grid.length;
    const width = grid[0].length;
    const dist = Array.from({ length: height }, () => Array(width).fill(-1));
    if (!isOpen(grid[oy]?.[ox])) {
        return dist;
    }
    dist[oy][ox] = 0;
    const queue = [[ox, oy]];
    for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i];
        for (const { dx, dy } of DIRS) {
            const nx = x + dx;
            const ny = y + dy;
            if (ny < 0 || nx < 0 || ny >= height || nx >= width) {
                continue;
            }
            if (dist[ny][nx] >= 0 || !isOpen(grid[ny][nx])) {
                continue;
            }
            dist[ny][nx] = dist[y][x] + 1;
            queue.push([nx, ny]);
        }
    }
    return dist;
}

function pickExit(grid, startX, startY, minDist) {
    const dist = distFrom(grid, startX, startY);
    const height = grid.length;
    const width = grid[0].length;
    let best = null;
    let bestDist = -1;
    let fallback = null;
    let fallbackDist = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!isOpen(grid[y][x]) || (x === startX && y === startY)) {
                continue;
            }
            const d = dist[y][x];
            if (d < 0) {
                continue;
            }
            if (d > fallbackDist) {
                fallbackDist = d;
                fallback = { x, y };
            }
            if (d >= minDist && d > bestDist) {
                bestDist = d;
                best = { x, y };
            }
        }
    }
    return best || fallback;
}

function paletteForFloor(floor) {
    const n = PALETTE_IDS.length;
    const i = (((Number(floor) * 4) % n) + n) % n;
    return PALETTE_IDS[i];
}

function assignRoomKinds(rooms) {
    const small = shuffle(SMALL_KINDS.slice());
    const medium = shuffle(MEDIUM_KINDS.slice());
    const large = shuffle(LARGE_KINDS.slice());
    let si = 0;
    let mi = 0;
    let li = 0;
    for (const room of rooms) {
        const area = room.w * room.h;
        if (area <= 15) {
            room.kind = small[si % small.length];
            si += 1;
        } else if (area <= 30) {
            room.kind = medium[mi % medium.length];
            mi += 1;
        } else {
            room.kind = large[li % large.length];
            li += 1;
        }
    }
    return rooms;
}

function snapshotRooms(rooms) {
    return (rooms || []).map((room) => ({
        x: room.x,
        y: room.y,
        w: room.w,
        h: room.h,
        kind: room.kind || 'closet',
    }));
}

function roomsOverlap(a, b, gap) {
    return !(a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y);
}

function roomCenter(room) {
    return {
        x: room.x + Math.floor(room.w / 2),
        y: room.y + Math.floor(room.h / 2),
    };
}

function carveRoom(grid, room) {
    for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
            grid[y][x] = FLOOR;
        }
    }
}

function carveLine(grid, x0, y0, x1, y1, wide = false) {
    let x = x0;
    let y = y0;
    const sx = Math.sign(x1 - x0);
    const sy = Math.sign(y1 - y0);
    const paint = (px, py) => {
        if (grid[py]?.[px] === WALL) {
            grid[py][px] = FLOOR;
        }
        if (wide) {
            const ox = sx !== 0 ? 0 : 1;
            const oy = sy !== 0 ? 0 : 1;
            if (grid[py + oy]?.[px + ox] === WALL) {
                grid[py + oy][px + ox] = FLOOR;
            }
        }
    };
    paint(x, y);
    while (x !== x1) {
        x += sx;
        paint(x, y);
    }
    while (y !== y1) {
        y += sy;
        paint(x, y);
    }
}

function carveHall(grid, a, b) {
    const wide = Math.random() < 0.25;
    if (Math.random() < 0.5) {
        carveLine(grid, a.x, a.y, b.x, a.y, wide);
        carveLine(grid, b.x, a.y, b.x, b.y, wide);
    } else {
        carveLine(grid, a.x, a.y, a.x, b.y, wide);
        carveLine(grid, a.x, b.y, b.x, b.y, wide);
    }
}

function generateRooms(size) {
    const grid = Array.from({ length: size }, () => Array(size).fill(WALL));
    const rooms = [];
    const want = Math.min(8, 3 + Math.floor(size / 6));
    for (let t = 0; t < 90 && rooms.length < want; t++) {
        const w = 3 + Math.floor(Math.random() * 5);
        const h = 3 + Math.floor(Math.random() * 5);
        const x = 1 + Math.floor(Math.random() * Math.max(1, size - w - 2));
        const y = 1 + Math.floor(Math.random() * Math.max(1, size - h - 2));
        const room = { x, y, w, h };
        if (x + w >= size - 1 || y + h >= size - 1) {
            continue;
        }
        if (rooms.some((other) => roomsOverlap(room, other, 1))) {
            continue;
        }
        rooms.push(room);
        carveRoom(grid, room);
    }
    if (!rooms.length) {
        const room = { x: 1, y: 1, w: Math.min(7, size - 4), h: Math.min(5, size - 4) };
        rooms.push(room);
        carveRoom(grid, room);
    }
    const order = shuffle(rooms.slice());
    for (let i = 1; i < order.length; i++) {
        carveHall(grid, roomCenter(order[i - 1]), roomCenter(order[i]));
    }
    const start = roomCenter(rooms[0]);
    return { grid, startX: start.x, startY: start.y, rooms };
}

function touchesOneRoom(x, y, room) {
    return x >= room.x - 1 && x < room.x + room.w + 1 && y >= room.y - 1 && y < room.y + room.h + 1
        && !(x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h);
}

function touchesRoom(x, y, rooms) {
    return rooms.some((room) => touchesOneRoom(x, y, room));
}

function touchingRooms(x, y, rooms) {
    return rooms.filter((room) => touchesOneRoom(x, y, room));
}

function primaryKind(x, y, rooms) {
    const hit = touchingRooms(x, y, rooms);
    return hit[0]?.kind || '';
}

function hasOppositeFloors(grid, x, y) {
    const n = isOpen(grid[y - 1]?.[x]);
    const s = isOpen(grid[y + 1]?.[x]);
    const e = isOpen(grid[y]?.[x + 1]);
    const w = isOpen(grid[y]?.[x - 1]);
    return (n && s) || (e && w);
}

function isExteriorFacing(grid, x, y) {
    for (const { dx, dy } of DIRS) {
        if (!isOpen(grid[y + dy]?.[x + dx])) {
            continue;
        }
        const ox = grid[y - dy]?.[x - dx];
        if (ox === undefined || (!isOpen(ox) && ox !== FENCE && ox !== WINDOW && ox !== BREACH)) {
            return true;
        }
    }
    return false;
}

function wallStyleForKind(kind, roll) {
    if (kind === 'cell') {
        return roll % 5 === 0 ? HOLE : FENCE;
    }
    if (kind === 'chapel' || kind === 'library' || kind === 'shrine') {
        return roll % 8 === 0 ? HALF : WALL;
    }
    if (kind === 'forge' || kind === 'armory') {
        if (roll % 3 === 0) {
            return BROKEN;
        }
        if (roll % 3 === 1) {
            return HOLE;
        }
        return WALL;
    }
    if (kind === 'garden' || kind === 'well') {
        if (roll % 3 === 0) {
            return FENCE;
        }
        if (roll % 7 === 0) {
            return HALF;
        }
        return WALL;
    }
    if (kind === 'cave') {
        if (roll % 3 === 0) {
            return BROKEN;
        }
        if (roll % 3 === 1) {
            return HALF;
        }
        if (roll % 5 === 0) {
            return HOLE;
        }
        return WALL;
    }
    if (kind === 'crypt' || kind === 'sewer') {
        if (roll % 3 === 0) {
            return HOLE;
        }
        if (roll % 3 === 1) {
            return BROKEN;
        }
        return WALL;
    }
    if (roll % 7 === 0) {
        return HALF;
    }
    if (roll % 7 === 1) {
        return BROKEN;
    }
    if (roll % 7 === 2) {
        return HOLE;
    }
    if (roll % 7 === 3) {
        return FENCE;
    }
    return WALL;
}

function isWallish(cell) {
    return cell === WALL || cell === HALF || cell === BROKEN || cell === HOLE || cell === FENCE;
}

function styleInteriorWalls(grid, rooms) {
    const height = grid.length;
    const width = grid[0].length;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (grid[y][x] !== WALL || !touchesRoom(x, y, rooms)) {
                continue;
            }
            const kind = primaryKind(x, y, rooms);
            const roll = Math.abs(x * 7 + y * 13);
            grid[y][x] = wallStyleForKind(kind, roll);
        }
    }
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (!isWallish(grid[y][x]) || !touchesRoom(x, y, rooms)) {
                continue;
            }
            const kind = primaryKind(x, y, rooms);
            const roll = Math.abs(x * 11 + y * 19);
            if (WINDOW_KINDS.has(kind) && isExteriorFacing(grid, x, y) && roll % 3 === 0) {
                grid[y][x] = WINDOW;
                continue;
            }
            if (BREACH_KINDS.has(kind) && hasOppositeFloors(grid, x, y) && roll % 4 === 0) {
                grid[y][x] = BREACH;
                continue;
            }
            if (RARE_BREACH_KINDS.has(kind) && hasOppositeFloors(grid, x, y) && roll % 19 === 0) {
                grid[y][x] = BREACH;
            }
        }
    }
}

function openingSide(room, x, y) {
    if (y === room.y) {
        return 'n';
    }
    if (y === room.y + room.h - 1) {
        return 's';
    }
    if (x === room.x) {
        return 'w';
    }
    if (x === room.x + room.w - 1) {
        return 'e';
    }
    return null;
}

function roomOpenings(room, grid, startX, startY, exitX, exitY) {
    const bySide = { n: [], s: [], e: [], w: [] };
    for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
            if (grid[y][x] !== FLOOR) {
                continue;
            }
            if ((x === startX && y === startY) || (x === exitX && y === exitY)) {
                continue;
            }
            if (!isDoorwayCell(room, x, y, grid)) {
                continue;
            }
            const side = openingSide(room, x, y);
            if (!side) {
                continue;
            }
            bySide[side].push([x, y]);
        }
    }
    for (const side of Object.keys(bySide)) {
        bySide[side].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    }
    return bySide;
}

function placeDoorways(grid, rooms, startX, startY, exitX, exitY) {
    for (const room of rooms) {
        const bySide = roomOpenings(room, grid, startX, startY, exitX, exitY);
        const keepCount = room.w * room.h > 30 ? 2 : 1;
        for (const openings of Object.values(bySide)) {
            if (!openings.length) {
                continue;
            }
            const keep = openings.slice(0, keepCount);
            const extras = openings.slice(keepCount);
            for (const [x, y] of extras) {
                grid[y][x] = WALL;
                if (!pathExists(grid, startX, startY, exitX, exitY)) {
                    grid[y][x] = FLOOR;
                    keep.push([x, y]);
                }
            }
            for (const [x, y] of keep) {
                if (grid[y][x] === FLOOR) {
                    grid[y][x] = DOOR;
                }
            }
        }
    }
}

function pathExists(grid, ax, ay, bx, by) {
    return (distFrom(grid, ax, ay)[by]?.[bx] ?? -1) >= 0;
}

function stampCells(grid, cells, value, startX, startY, exitX, exitY) {
    for (const [x, y] of cells) {
        if (grid[y]?.[x] !== FLOOR) {
            return false;
        }
        if ((x === startX && y === startY) || (x === exitX && y === exitY)) {
            return false;
        }
    }
    for (const [x, y] of cells) {
        grid[y][x] = value;
    }
    if (!pathExists(grid, startX, startY, exitX, exitY)) {
        for (const [x, y] of cells) {
            grid[y][x] = FLOOR;
        }
        return false;
    }
    return true;
}

function stampFurniture(grid, cells, startX, startY, exitX, exitY) {
    return stampCells(grid, cells, FURNITURE, startX, startY, exitX, exitY);
}

function wallSideCells(room, grid) {
    const spots = [];
    for (let x = room.x; x < room.x + room.w; x++) {
        for (let y = room.y; y < room.y + room.h; y++) {
            if (grid[y][x] !== FLOOR) {
                continue;
            }
            const against = DIRS.some(({ dx, dy }) => {
                const cell = grid[y + dy]?.[x + dx];
                return cell === WALL || cell === HALF || cell === BROKEN || cell === HOLE
                    || cell === FENCE || cell === WINDOW || cell === BREACH;
            });
            if (against) {
                spots.push([x, y]);
            }
        }
    }
    return shuffle(spots);
}

function centerBlock(room) {
    const cx = room.x + Math.floor(room.w / 2) - 1;
    const cy = room.y + Math.floor(room.h / 2) - 1;
    return [
        [cx, cy],
        [cx + 1, cy],
        [cx, cy + 1],
        [cx + 1, cy + 1],
    ];
}

function wallPair(origin, hash) {
    const [x, y] = origin;
    return hash % 2 === 0 ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]];
}

function placeRoomFurniture(grid, rooms, startX, startY, exitX, exitY) {
    for (const room of rooms) {
        const area = room.w * room.h;
        if (area < 9) {
            continue;
        }
        const hash = Math.abs(room.x * 31 + room.y * 47);
        const spots = wallSideCells(room, grid);
        const one = spots[0] ? [spots[0]] : [];
        const pair = spots[0] ? wallPair(spots[0], hash) : [];
        const kind = room.kind || 'closet';
        let stamped = false;
        if (kind === 'chapel' || kind === 'shrine' || kind === 'dining' || kind === 'barracks'
            || (kind === 'bedroom' && area >= 31)) {
            stamped = stampFurniture(grid, centerBlock(room), startX, startY, exitX, exitY);
        } else if (kind === 'forge' || kind === 'armory' || kind === 'bedroom' || kind === 'kitchen'
            || kind === 'study' || kind === 'library') {
            stamped = pair.length ? stampFurniture(grid, pair, startX, startY, exitX, exitY) : false;
        } else if (kind === 'crypt') {
            const origin = spots[0] || [room.x + 1, room.y + 1];
            stamped = stampFurniture(grid, wallPair(origin, hash + 1), startX, startY, exitX, exitY);
        } else if (kind === 'garden') {
            stamped = one.length ? stampFurniture(grid, one, startX, startY, exitX, exitY) : false;
            if (spots[1]) {
                stampFurniture(grid, [spots[1]], startX, startY, exitX, exitY);
            }
        } else if (kind === 'well') {
            const c = roomCenter(room);
            stamped = stampFurniture(grid, [[c.x, c.y]], startX, startY, exitX, exitY);
        } else if (kind === 'cave') {
            stamped = true;
        }
        if (kind !== 'cave') {
            if (!stamped && one.length) {
                stampFurniture(grid, one, startX, startY, exitX, exitY);
            }
            if (area > 30 && spots[2]) {
                stampFurniture(grid, [spots[2]], startX, startY, exitX, exitY);
            }
            if (area > 30 && hash % 5 === 0) {
                const c = roomCenter(room);
                const px = c.x + (hash % 2);
                const py = c.y + ((hash >> 1) % 2);
                stampFurniture(grid, [[px, py]], startX, startY, exitX, exitY);
            }
        }
    }
}

function isDoorwayCell(room, x, y, grid) {
    return DIRS.some(({ dx, dy }) => {
        const nx = x + dx;
        const ny = y + dy;
        const outside = nx < room.x || nx >= room.x + room.w || ny < room.y || ny >= room.y + room.h;
        return outside && isOpen(grid[ny]?.[nx]);
    });
}

function interiorFloorCells(room, grid, startX, startY, exitX, exitY) {
    const cells = [];
    for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
            if (grid[y][x] !== FLOOR) {
                continue;
            }
            if ((x === startX && y === startY) || (x === exitX && y === exitY)) {
                continue;
            }
            cells.push([x, y]);
        }
    }
    return shuffle(cells);
}

function twoByTwo(origin) {
    const [x, y] = origin;
    return [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
}

function placeHazards(grid, rooms, startX, startY, exitX, exitY) {
    for (const room of rooms) {
        const kind = room.kind || '';
        const cells = interiorFloorCells(room, grid, startX, startY, exitX, exitY)
            .filter(([x, y]) => !isDoorwayCell(room, x, y, grid));
        if (!cells.length) {
            continue;
        }
        if (WATER_KINDS.has(kind)) {
            let placed = false;
            if (room.w * room.h >= 16) {
                for (const origin of cells) {
                    const block = twoByTwo(origin);
                    if (block.every(([x, y]) => x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h)
                        && stampCells(grid, block, WATER, startX, startY, exitX, exitY)) {
                        placed = true;
                        break;
                    }
                }
            }
            if (!placed) {
                const againstWall = cells.find(([x, y]) => DIRS.some(({ dx, dy }) => {
                    const cell = grid[y + dy]?.[x + dx];
                    return cell === WALL || cell === HALF || cell === BROKEN || cell === HOLE
                        || cell === FENCE || cell === WINDOW || cell === BREACH;
                }));
                stampCells(grid, [againstWall || cells[0]], WATER, startX, startY, exitX, exitY);
            }
            continue;
        }
        if (SPIKE_KINDS.has(kind)) {
            stampCells(grid, [cells[0]], SPIKES, startX, startY, exitX, exitY);
            if (cells[1] && room.w * room.h >= 12) {
                stampCells(grid, [cells[1]], SPIKES, startX, startY, exitX, exitY);
            }
        }
    }
}

function openDir(grid, x, y) {
    for (let dir = 0; dir < 4; dir++) {
        const nx = x + DIRS[dir].dx;
        const ny = y + DIRS[dir].dy;
        if (isOpen(grid[ny]?.[nx])) {
            return dir;
        }
    }
    return 0;
}

function bestDirToward(grid, x, y, tx, ty, facing) {
    const dist = distFrom(grid, tx, ty);
    if ((dist[y]?.[x] ?? -1) < 0) {
        return null;
    }
    let bestDir = null;
    let best = Infinity;
    for (let dir = 0; dir < 4; dir++) {
        const nx = x + DIRS[dir].dx;
        const ny = y + DIRS[dir].dy;
        const d = dist[ny]?.[nx];
        if (d == null || d < 0) {
            continue;
        }
        if (d < best || (d === best && dir === facing)) {
            best = d;
            bestDir = dir;
        }
    }
    return bestDir;
}

function turnToward(facing, targetDir) {
    const delta = (targetDir - facing + 4) % 4;
    if (delta === 0) {
        return 'up';
    }
    if (delta === 1) {
        return 'right';
    }
    if (delta === 3) {
        return 'left';
    }
    return Math.random() < 0.5 ? 'left' : 'right';
}

function cloneGrid(grid) {
    return grid.map((row) => [...row]);
}

function emptyVotes() {
    return { up: 0, down: 0, left: 0, right: 0 };
}

function generateCorridor() {
    const width = 7;
    const height = 5;
    const grid = Array.from({ length: height }, () => Array(width).fill(WALL));
    const y = 2;
    for (let x = 1; x <= 5; x++) {
        grid[y][x] = FLOOR;
    }
    const startX = 1;
    const startY = y;
    const exit = { x: 5, y };
    grid[exit.y][exit.x] = EXIT;
    return {
        width,
        height,
        grid,
        player: { x: startX, y: startY, dir: 1 },
        exit,
        palette: paletteForFloor(0),
        rooms: [],
        enemies: [],
    };
}

function mazePayload(size, grid, startX, startY, exit, rooms, floor) {
    const maze = {
        width: size,
        height: size,
        grid,
        player: { x: startX, y: startY, dir: openDir(grid, startX, startY) },
        exit,
        palette: paletteForFloor(floor),
        rooms: snapshotRooms(rooms),
        enemies: [],
    };
    spawnEnemies(maze, floor);
    return maze;
}

function buildFloor(floor) {
    if (floor <= 0) {
        return generateCorridor();
    }
    const targetPath = BASE_PATH + floor;
    let size = sizeForFloor(floor);
    let last = null;
    for (let attempt = 0; attempt < 14; attempt++) {
        const { grid, startX, startY, rooms } = generateRooms(size);
        assignRoomKinds(rooms);
        const exit = pickExit(grid, startX, startY, targetPath);
        if (!exit) {
            if (size < MAX_SIZE) {
                size = Math.min(MAX_SIZE, size + 2);
            }
            continue;
        }
        grid[exit.y][exit.x] = EXIT;
        styleInteriorWalls(grid, rooms);
        placeDoorways(grid, rooms, startX, startY, exit.x, exit.y);
        placeRoomFurniture(grid, rooms, startX, startY, exit.x, exit.y);
        placeHazards(grid, rooms, startX, startY, exit.x, exit.y);
        last = mazePayload(size, grid, startX, startY, exit, rooms, floor);
        const dist = distFrom(grid, startX, startY)[exit.y][exit.x];
        if (dist >= targetPath) {
            return last;
        }
        if (size < MAX_SIZE) {
            size = Math.min(MAX_SIZE, size + 2);
        }
    }
    return last || generateCorridor();
}

function layoutFilePath() {
    return process.env.DUNGEON_PATH || './data/dungeon.json';
}

function clampCanvas(rawWidth, rawHeight) {
    const nextWidth = Math.round(Number(rawWidth));
    const nextHeight = Math.round(Number(rawHeight));
    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth < 1 || nextHeight < 1) {
        return null;
    }
    return {
        width: Math.min(1920, Math.max(160, nextWidth)),
        height: Math.min(1080, Math.max(90, nextHeight)),
    };
}

export function createDungeon() {
    const hub = createSseHub({ defaultType: 'dungeon' });
    let floor = 0;
    let mode = 'anarchy';
    let maze = buildFloor(floor);
    let lastAction = null;
    let shotSeq = 0;
    let lockedUntil = 0;
    let ballots = new Map();
    let voteEndsAt = null;
    let voteTimer = null;
    let onFloorClear = null;
    let onAutoplay = null;
    let resumeMode = 'anarchy';
    let idleTimer = null;
    let autoplayTimer = null;
    let nextAutoCommand = 'up';
    let visible = true;
    let canvasWidth = DEFAULT_CANVAS.width;
    let canvasHeight = DEFAULT_CANVAS.height;
    let anchor = DEFAULT_ANCHOR;
    let artwork = [];
    let worldId = 0;
    let hp = PLAYER_MAX_HP;

    function snapshot() {
        return {
            floor,
            mode,
            visible,
            canvasWidth,
            canvasHeight,
            anchor,
            worldId,
            artwork: [...artwork],
            palette: maze.palette || 'stone',
            rooms: snapshotRooms(maze.rooms),
            width: maze.width,
            height: maze.height,
            grid: cloneGrid(maze.grid),
            player: { ...maze.player },
            exit: { ...maze.exit },
            enemies: snapshotEnemies(maze.enemies),
            hp,
            maxHp: PLAYER_MAX_HP,
            lastAction: lastAction ? { ...lastAction } : null,
            votes: mode === 'democracy' && voteEndsAt ? tally() : null,
            voteEndsAt: voteEndsAt ? new Date(voteEndsAt).toISOString() : null,
        };
    }

    function emit() {
        return hub.emit({ type: 'state', ...snapshot() });
    }

    function tally() {
        const votes = emptyVotes();
        for (const command of ballots.values()) {
            votes[command] += 1;
        }
        return votes;
    }

    function clearVotes() {
        ballots = new Map();
        voteEndsAt = null;
        if (voteTimer) {
            clearTimeout(voteTimer);
            voteTimer = null;
        }
    }

    function applyCommand(command, actor) {
        const player = maze.player;
        const from = { x: player.x, y: player.y, dir: player.dir };
        let bumped = false;

        if (command === 'fire') {
            const shot = castFire(maze);
            const { hits, killed } = applyFireHit(maze, shot);
            lastAction = {
                command,
                user: actor.user,
                displayName: actor.displayName || actor.user,
                bumped: false,
                from,
                to: { ...from },
                shot,
                shotId: (shotSeq += 1),
                hits,
                killed,
            };
            return { floorCleared: false, previousFloor: floor, bumped: false, died: false, hurt: false };
        }

        if (command === 'left') {
            player.dir = (player.dir + 3) % 4;
        } else if (command === 'right') {
            player.dir = (player.dir + 1) % 4;
        } else {
            const facing = command === 'up' ? player.dir : (player.dir + 2) % 4;
            const nx = player.x + DIRS[facing].dx;
            const ny = player.y + DIRS[facing].dy;
            const cell = maze.grid[ny]?.[nx];
            if (isOpen(cell) && !enemyAt(maze.enemies, nx, ny)) {
                player.x = nx;
                player.y = ny;
            } else {
                bumped = true;
            }
        }

        const onExit = maze.grid[player.y][player.x] === EXIT;
        let floorCleared = false;
        const previousFloor = floor;
        let hurt = false;
        let died = false;
        if (onExit) {
            floorCleared = true;
            floor += 1;
            maze = buildFloor(floor);
            lastAction = {
                command,
                user: actor.user,
                displayName: actor.displayName || actor.user,
                bumped,
                from,
                to: { ...maze.player },
            };
            try {
                onFloorClear?.({ previousFloor, floor });
            } catch (err) {
                console.error('Dungeon floor-clear announce failed', err);
            }
            return { floorCleared, previousFloor, bumped, died: false, hurt: false };
        }

        stepEnemies(maze);
        if (enemyMelee(maze)) {
            hp = Math.max(0, hp - 1);
            hurt = true;
        }
        if (hp <= 0) {
            died = true;
            hp = PLAYER_MAX_HP;
            worldId += 1;
            maze = buildFloor(floor);
            lastAction = {
                command,
                user: actor.user,
                displayName: actor.displayName || actor.user,
                bumped,
                from,
                to: { ...maze.player },
                hurt: true,
                died: true,
            };
            return { floorCleared: false, previousFloor: floor, bumped, died: true, hurt: true };
        }

        lastAction = {
            command,
            user: actor.user,
            displayName: actor.displayName || actor.user,
            bumped,
            from,
            to: { x: player.x, y: player.y, dir: player.dir },
            hurt,
            died: false,
        };

        return { floorCleared, previousFloor, bumped, died, hurt };
    }

    function isSyntheticUser(user) {
        const name = String(user ?? '').toLowerCase();
        return name === 'preview' || name === 'autoplay';
    }

    function stopAutoplayLoop() {
        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    }

    function clearIdle() {
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
    }

    function scheduleIdle() {
        clearIdle();
        if (!visible || mode === 'autoplay') {
            return;
        }
        idleTimer = setTimeout(() => {
            startAutoplay({ idle: true });
        }, IDLE_MS);
    }

    function pickNextAuto(bumped, command) {
        const { player, exit, grid } = maze;
        const goal = bestDirToward(grid, player.x, player.y, exit.x, exit.y, player.dir);

        const randomTurn = () => (Math.random() < 0.5 ? 'left' : 'right');
        const seekTurn = (chance) => {
            if (goal == null || Math.random() > chance) {
                return randomTurn();
            }
            const next = turnToward(player.dir, goal);
            return next === 'up' ? randomTurn() : next;
        };

        if (enemyInFront(maze)) {
            return 'fire';
        }

        if (command === 'fire') {
            const { dx, dy } = DIRS[player.dir];
            if (!isOpen(grid[player.y + dy]?.[player.x + dx]) || enemyAt(maze.enemies, player.x + dx, player.y + dy)) {
                return seekTurn(0.85);
            }
            return 'up';
        }

        if (command === 'left' || command === 'right') {
            return Math.random() < 0.22 ? 'fire' : 'up';
        }

        if (bumped) {
            return Math.random() < 0.28 ? 'fire' : seekTurn(0.85);
        }
        if (goal != null && goal !== player.dir && Math.random() < 0.42) {
            return turnToward(player.dir, goal);
        }
        if (Math.random() < 0.08) {
            return seekTurn(0.55);
        }
        return Math.random() < 0.16 ? 'fire' : 'up';
    }

    function autoplayStep() {
        if (!visible || mode !== 'autoplay' || Date.now() < lockedUntil) {
            return;
        }
        const command = nextAutoCommand;
        const moved = applyCommand(command, { user: 'autoplay', displayName: 'Autoplay' });
        lockedUntil = Date.now() + (command === 'fire' ? FIRE_LOCK_MS : ANARCHY_LOCK_MS);
        nextAutoCommand = pickNextAuto(moved.bumped, command);
        emit();
    }

    function startAutoplay({ idle = false } = {}) {
        const already = mode === 'autoplay' && autoplayTimer;
        if (mode !== 'autoplay') {
            resumeMode = mode === 'democracy' ? 'democracy' : 'anarchy';
        }
        clearVotes();
        clearIdle();
        mode = 'autoplay';
        lockedUntil = 0;
        if (visible && !autoplayTimer) {
            nextAutoCommand = 'up';
            autoplayTimer = setInterval(autoplayStep, AUTOPLAY_MS);
            autoplayStep();
        } else {
            emit();
        }
        if (idle && !already && visible) {
            try {
                onAutoplay?.();
            } catch (err) {
                console.error('Dungeon autoplay announce failed', err);
            }
        }
        return { ...snapshot(), changed: !already };
    }

    function leaveAutoplay(nextMode) {
        stopAutoplayLoop();
        const restored = nextMode === 'democracy' ? 'democracy' : 'anarchy';
        resumeMode = restored;
        mode = restored;
        lockedUntil = 0;
        scheduleIdle();
    }

    function resolveWinner() {
        const votes = tally();
        const max = Math.max(...Object.values(votes));
        if (max <= 0) {
            return null;
        }
        const tied = Object.keys(votes).filter((command) => votes[command] === max);
        return tied[Math.floor(Math.random() * tied.length)];
    }

    function finishVote() {
        voteTimer = null;
        const command = resolveWinner();
        const votes = tally();
        clearVotes();
        if (!command) {
            emit();
            return;
        }
        applyCommand(command, { user: 'chat', displayName: 'chat' });
        lastAction.votes = votes;
        lockedUntil = Date.now() + ANARCHY_LOCK_MS;
        emit();
    }

    function startVoteWindow() {
        voteEndsAt = Date.now() + DEMOCRACY_MS;
        voteTimer = setTimeout(finishVote, DEMOCRACY_MS);
    }

    function input({ command: raw, user, displayName } = {}) {
        const command = normalizeDungeonCommand(raw);
        if (!command) {
            const err = new Error('Usage: !up !down !left !right !fire');
            err.code = 'USAGE';
            throw err;
        }

        const actor = { user: user || 'anon', displayName: displayName || user || 'anon' };
        if (!visible) {
            return {
                ...snapshot(),
                applied: false,
                ignored: true,
                bumped: false,
                floorCleared: false,
                voted: false,
            };
        }
        const synthetic = isSyntheticUser(actor.user);

        if (synthetic && mode === 'autoplay') {
            return {
                ...snapshot(),
                applied: false,
                ignored: true,
                bumped: false,
                floorCleared: false,
                voted: false,
            };
        }

        if (!synthetic) {
            if (mode === 'autoplay') {
                leaveAutoplay(resumeMode);
            } else {
                scheduleIdle();
            }
        }

        if (mode === 'democracy' && command !== 'fire') {
            const isFirst = ballots.size === 0 && !voteTimer;
            ballots.set(actor.user, command);
            if (isFirst) {
                startVoteWindow();
            }
            lastAction = {
                command,
                user: actor.user,
                displayName: actor.displayName,
                vote: true,
            };
            emit();
            return {
                ...snapshot(),
                applied: false,
                ignored: false,
                bumped: false,
                floorCleared: false,
                voted: true,
            };
        }

        if (Date.now() < lockedUntil) {
            return {
                ...snapshot(),
                applied: false,
                ignored: true,
                bumped: false,
                floorCleared: false,
                voted: false,
            };
        }

        const moved = applyCommand(command, actor);
        lockedUntil = Date.now() + (command === 'fire' ? FIRE_LOCK_MS : ANARCHY_LOCK_MS);
        emit();
        return {
            ...snapshot(),
            applied: true,
            ignored: false,
            voted: false,
            ...moved,
        };
    }

    function hide() {
        stopAutoplayLoop();
        clearIdle();
        clearVotes();
        visible = false;
        emit();
        return snapshot();
    }

    function reset() {
        const wasHidden = !visible;
        visible = true;
        clearVotes();
        worldId += 1;
        floor = 0;
        hp = PLAYER_MAX_HP;
        maze = buildFloor(floor);
        lastAction = null;
        lockedUntil = 0;
        nextAutoCommand = 'up';
        if (mode === 'autoplay') {
            stopAutoplayLoop();
            autoplayTimer = setInterval(autoplayStep, AUTOPLAY_MS);
            autoplayStep();
        } else {
            scheduleIdle();
        }
        emit();
        return { ...snapshot(), changed: wasHidden };
    }

    function setMode(next) {
        const value = String(next ?? '').trim().toLowerCase();
        if (value !== 'anarchy' && value !== 'democracy' && value !== 'autoplay') {
            const err = new Error('Mode must be anarchy, democracy, or autoplay');
            err.code = 'USAGE';
            throw err;
        }
        if (value === 'autoplay') {
            return startAutoplay({ idle: false });
        }
        if (mode === value && !autoplayTimer) {
            return { ...snapshot(), changed: false };
        }
        const changed = mode !== value;
        leaveAutoplay(value);
        clearVotes();
        emit();
        return { ...snapshot(), changed };
    }

    function persistLayout() {
        const filePath = layoutFilePath();
        const body = `${JSON.stringify({ canvasWidth, canvasHeight, anchor }, null, 2)}\n`;
        fs.mkdir(path.dirname(path.resolve(filePath)), { recursive: true })
            .then(() => fs.writeFile(filePath, body))
            .catch((err) => {
                console.error('Failed to save dungeon layout', err);
            });
    }

    async function loadLayout() {
        try {
            const raw = await fs.readFile(layoutFilePath(), 'utf-8');
            const data = JSON.parse(raw);
            const size = clampCanvas(data?.canvasWidth, data?.canvasHeight);
            if (size) {
                canvasWidth = size.width;
                canvasHeight = size.height;
            }
            const nextAnchor = ANCHORS[String(data?.anchor ?? '')
                .trim()
                .toLowerCase()
                .replace(/[\s_]+/g, '')];
            if (nextAnchor) {
                anchor = nextAnchor;
            }
            emit();
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.error('Failed to load dungeon layout', err);
            }
        }
    }

    function setSize(rawWidth, rawHeight) {
        const size = clampCanvas(rawWidth, rawHeight);
        if (!size) {
            const err = new Error('Usage: !dc size bigger|smaller|full');
            err.code = 'USAGE';
            throw err;
        }
        if (canvasWidth === size.width && canvasHeight === size.height) {
            return { ...snapshot(), changed: false, action: 'size' };
        }
        canvasWidth = size.width;
        canvasHeight = size.height;
        emit();
        persistLayout();
        return { ...snapshot(), changed: true, action: 'size' };
    }

    function currentStepIndex() {
        return CANVAS_STEPS.findIndex((step) => step.width === canvasWidth && step.height === canvasHeight);
    }

    function nearestStepIndex() {
        const area = (canvasWidth || DEFAULT_CANVAS.width) * (canvasHeight || DEFAULT_CANVAS.height);
        let best = 0;
        let bestDelta = Infinity;
        for (let i = 0; i < CANVAS_STEPS.length; i++) {
            const delta = Math.abs(CANVAS_STEPS[i].width * CANVAS_STEPS[i].height - area);
            if (delta < bestDelta) {
                best = i;
                bestDelta = delta;
            }
        }
        return best;
    }

    function stepSize(delta) {
        let index = currentStepIndex();
        if (index < 0) {
            index = nearestStepIndex();
        }
        const next = index + delta;
        if (next < 0 || next >= CANVAS_STEPS.length) {
            return { ...snapshot(), changed: false, atLimit: true, action: 'size' };
        }
        return setSize(CANVAS_STEPS[next].width, CANVAS_STEPS[next].height);
    }

    function setAnchor(name) {
        const key = String(name ?? '')
            .trim()
            .toLowerCase()
            .replace(/[\s_]+/g, '');
        const next = ANCHORS[key];
        if (!next) {
            const err = new Error('Usage: !dc position topleft|topright|bottomleft|bottomright');
            err.code = 'USAGE';
            throw err;
        }
        if (anchor === next) {
            return { ...snapshot(), changed: false, action: 'anchor' };
        }
        anchor = next;
        emit();
        persistLayout();
        return { ...snapshot(), changed: true, action: 'anchor' };
    }

    function applyLayoutArgs(args) {
        const parts = (Array.isArray(args) ? args : [args])
            .map((part) => String(part ?? '').trim().toLowerCase())
            .filter(Boolean);
        if (!parts.length) {
            return { ...snapshot(), changed: false, action: 'status' };
        }

        const joined = parts.join('');
        if (ANCHORS[joined] || ANCHORS[parts[0]]) {
            return setAnchor(joined || parts[0]);
        }

        const head = parts[0];
        const rest = parts.slice(1);

        if (head === 'bigger' || head === 'larger') {
            return stepSize(1);
        }
        if (head === 'smaller') {
            return stepSize(-1);
        }
        if (head === 'full' || head === 'fill') {
            return setSize(1920, 1080);
        }

        if (head === 'size') {
            const spec = rest.join(' ');
            if (!spec) {
                return { ...snapshot(), changed: false, action: 'status' };
            }
            if (spec === 'bigger' || spec === 'larger' || spec === 'up') {
                return stepSize(1);
            }
            if (spec === 'smaller' || spec === 'down') {
                return stepSize(-1);
            }
            if (spec === 'full' || spec === 'fill') {
                return setSize(1920, 1080);
            }
            return setSizeFromArgs(rest);
        }

        if (head === 'position' || head === 'pos' || head === 'anchor') {
            return setAnchor(rest.join('') || rest[0]);
        }

        const err = new Error('Usage: !dc size bigger|smaller|full or !dc position topleft');
        err.code = 'USAGE';
        throw err;
    }

    function setSizeFromArgs(args) {
        const text = (Array.isArray(args) ? args : [args])
            .map((part) => String(part ?? '').trim())
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        if (!text || text === 'full' || text === 'fill') {
            return setSize(1920, 1080);
        }
        if (text === 'bigger' || text === 'smaller' || text === 'larger' || ANCHORS[text.replace(/\s+/g, '')]) {
            return applyLayoutArgs(Array.isArray(args) ? args : [text]);
        }
        const compact = text.replace(/\s+/g, '');
        const preset = CANVAS_STEPS.find((step) => `${step.width}x${step.height}` === compact);
        if (preset) {
            return setSize(preset.width, preset.height);
        }
        const match = text.match(/^(\d+)\s*[x×,]\s*(\d+)$/) || text.match(/^(\d+)\s+(\d+)$/);
        if (!match) {
            const err = new Error('Usage: !dc size bigger|smaller|full');
            err.code = 'USAGE';
            throw err;
        }
        return setSize(match[1], match[2]);
    }

    scheduleIdle();
    loadLayout().catch((err) => {
        console.error('Failed to load dungeon layout', err);
    });

    return {
        subscribe: hub.subscribe,
        emit,
        get: () => snapshot(),
        input,
        reset,
        hide,
        clear: hide,
        setMode,
        setSize,
        setSizeFromArgs,
        setAnchor,
        stepSize,
        applyLayoutArgs,
        setArtwork(urls) {
            artwork = (Array.isArray(urls) ? urls : [])
                .map((url) => String(url || '').trim())
                .filter(Boolean);
            emit();
        },
        setOnFloorClear(fn) {
            onFloorClear = typeof fn === 'function' ? fn : null;
        },
        setOnAutoplay(fn) {
            onAutoplay = typeof fn === 'function' ? fn : null;
        },
        getStatus: () => ({
            listeners: hub.listenerCount,
            floor,
            mode,
            visible,
            canvasWidth,
            canvasHeight,
            anchor,
        }),
    };
}
