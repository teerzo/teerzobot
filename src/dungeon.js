import { createSseHub } from './sse.js';

const FLOOR = 0;
const WALL = 1;
const EXIT = 2;
const HALF = 3;
const BROKEN = 4;
const HOLE = 5;
const FENCE = 6;
const FURNITURE = 7;

const DIRS = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
];

const MOVES = new Set(['up', 'down', 'left', 'right']);
const ANARCHY_LOCK_MS = 350;
const DEMOCRACY_MS = 8_000;
const IDLE_MS = 60_000;
const AUTOPLAY_MS = 800;
const BASE_PATH = 4;
const MIN_SIZE = 15;
const MAX_SIZE = 31;
const DEFAULT_CANVAS = { width: 640, height: 480 };
const CANVAS_STEPS = [
    { width: 480, height: 270 },
    { width: 640, height: 360 },
    { width: 640, height: 480 },
    { width: 854, height: 480 },
    { width: 960, height: 540 },
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

export const DUNGEON_ALIASES = {
    u: 'up',
    f: 'up',
    forward: 'up',
    d: 'down',
    b: 'down',
    back: 'down',
    l: 'left',
    r: 'right',
};

export function normalizeDungeonCommand(value) {
    const key = String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/^!/, '');
    const command = DUNGEON_ALIASES[key] ?? key;
    return MOVES.has(command) ? command : null;
}

function isOpen(cell) {
    return cell === FLOOR || cell === EXIT;
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

function carveLine(grid, x0, y0, x1, y1) {
    let x = x0;
    let y = y0;
    const sx = Math.sign(x1 - x0);
    const sy = Math.sign(y1 - y0);
    grid[y][x] = FLOOR;
    while (x !== x1) {
        x += sx;
        grid[y][x] = FLOOR;
    }
    while (y !== y1) {
        y += sy;
        grid[y][x] = FLOOR;
    }
}

function carveHall(grid, a, b) {
    if (Math.random() < 0.5) {
        carveLine(grid, a.x, a.y, b.x, a.y);
        carveLine(grid, b.x, a.y, b.x, b.y);
    } else {
        carveLine(grid, a.x, a.y, a.x, b.y);
        carveLine(grid, a.x, b.y, b.x, b.y);
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

function touchesRoom(x, y, rooms) {
    return rooms.some((room) =>
        x >= room.x - 1 && x < room.x + room.w + 1 && y >= room.y - 1 && y < room.y + room.h + 1
        && !(x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h));
}

function styleInteriorWalls(grid, rooms) {
    const height = grid.length;
    const width = grid[0].length;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (grid[y][x] !== WALL || !touchesRoom(x, y, rooms)) {
                continue;
            }
            const kind = Math.abs(x * 7 + y * 13) % 7;
            if (kind === 0) {
                grid[y][x] = HALF;
            } else if (kind === 1) {
                grid[y][x] = BROKEN;
            } else if (kind === 2) {
                grid[y][x] = HOLE;
            } else if (kind === 3) {
                grid[y][x] = FENCE;
            }
        }
    }
}

function pathExists(grid, ax, ay, bx, by) {
    return (distFrom(grid, ax, ay)[by]?.[bx] ?? -1) >= 0;
}

function stampFurniture(grid, cells, startX, startY, exitX, exitY) {
    for (const [x, y] of cells) {
        if (grid[y]?.[x] !== FLOOR) {
            return false;
        }
        if ((x === startX && y === startY) || (x === exitX && y === exitY)) {
            return false;
        }
    }
    for (const [x, y] of cells) {
        grid[y][x] = FURNITURE;
    }
    if (!pathExists(grid, startX, startY, exitX, exitY)) {
        for (const [x, y] of cells) {
            grid[y][x] = FLOOR;
        }
        return false;
    }
    return true;
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
                return cell === WALL || cell === HALF || cell === BROKEN || cell === HOLE || cell === FENCE;
            });
            if (against) {
                spots.push([x, y]);
            }
        }
    }
    return shuffle(spots);
}

function placeRoomFurniture(grid, rooms, startX, startY, exitX, exitY) {
    for (const room of rooms) {
        const area = room.w * room.h;
        if (area < 9) {
            continue;
        }
        const hash = Math.abs(room.x * 31 + room.y * 47);
        const spots = wallSideCells(room, grid);
        if (area <= 15) {
            const cell = spots[0];
            if (cell) {
                stampFurniture(grid, [cell], startX, startY, exitX, exitY);
            }
            continue;
        }
        if (area <= 30) {
            const origin = spots[0];
            if (!origin) {
                continue;
            }
            const [x, y] = origin;
            const pair = hash % 2 === 0 ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]];
            if (!stampFurniture(grid, pair, startX, startY, exitX, exitY) && spots[1]) {
                stampFurniture(grid, [spots[1]], startX, startY, exitX, exitY);
            }
            continue;
        }
        const cx = room.x + Math.floor(room.w / 2) - 1;
        const cy = room.y + Math.floor(room.h / 2) - 1;
        const block = [
            [cx, cy],
            [cx + 1, cy],
            [cx, cy + 1],
            [cx + 1, cy + 1],
        ];
        if (!stampFurniture(grid, block, startX, startY, exitX, exitY)) {
            const cell = spots[0];
            if (cell) {
                stampFurniture(grid, [cell], startX, startY, exitX, exitY);
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
    };
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
        const exit = pickExit(grid, startX, startY, targetPath);
        if (!exit) {
            if (size < MAX_SIZE) {
                size = Math.min(MAX_SIZE, size + 2);
            }
            continue;
        }
        grid[exit.y][exit.x] = EXIT;
        styleInteriorWalls(grid, rooms);
        placeRoomFurniture(grid, rooms, startX, startY, exit.x, exit.y);
        last = {
            width: size,
            height: size,
            grid,
            player: { x: startX, y: startY, dir: openDir(grid, startX, startY) },
            exit,
        };
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

export function createDungeon() {
    const hub = createSseHub({ defaultType: 'dungeon' });
    let floor = 0;
    let mode = 'anarchy';
    let maze = buildFloor(floor);
    let lastAction = null;
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
    let anchor = 'top-left';

    function snapshot() {
        return {
            floor,
            mode,
            visible,
            canvasWidth,
            canvasHeight,
            anchor,
            width: maze.width,
            height: maze.height,
            grid: cloneGrid(maze.grid),
            player: { ...maze.player },
            exit: { ...maze.exit },
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

        if (command === 'left') {
            player.dir = (player.dir + 3) % 4;
        } else if (command === 'right') {
            player.dir = (player.dir + 1) % 4;
        } else {
            const facing = command === 'up' ? player.dir : (player.dir + 2) % 4;
            const nx = player.x + DIRS[facing].dx;
            const ny = player.y + DIRS[facing].dy;
            const cell = maze.grid[ny]?.[nx];
            if (cell === FLOOR || cell === EXIT) {
                player.x = nx;
                player.y = ny;
            } else {
                bumped = true;
            }
        }

        lastAction = {
            command,
            user: actor.user,
            displayName: actor.displayName || actor.user,
            bumped,
            from,
            to: { x: player.x, y: player.y, dir: player.dir },
        };

        const onExit = maze.grid[player.y][player.x] === EXIT;
        let floorCleared = false;
        const previousFloor = floor;
        if (onExit) {
            floorCleared = true;
            floor += 1;
            maze = buildFloor(floor);
            lastAction.to = { ...maze.player };
            try {
                onFloorClear?.({ previousFloor, floor });
            } catch (err) {
                console.error('Dungeon floor-clear announce failed', err);
            }
        }

        return { floorCleared, previousFloor, bumped };
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

        if (command === 'left' || command === 'right') {
            return 'up';
        }

        const randomTurn = () => (Math.random() < 0.5 ? 'left' : 'right');
        const seekTurn = (chance) => {
            if (goal == null || Math.random() > chance) {
                return randomTurn();
            }
            const next = turnToward(player.dir, goal);
            return next === 'up' ? randomTurn() : next;
        };

        if (bumped) {
            return seekTurn(0.85);
        }
        if (goal != null && goal !== player.dir && Math.random() < 0.42) {
            return turnToward(player.dir, goal);
        }
        if (Math.random() < 0.08) {
            return seekTurn(0.55);
        }
        return 'up';
    }

    function autoplayStep() {
        if (!visible || mode !== 'autoplay' || Date.now() < lockedUntil) {
            return;
        }
        const moved = applyCommand(nextAutoCommand, { user: 'autoplay', displayName: 'Autoplay' });
        lockedUntil = Date.now() + ANARCHY_LOCK_MS;
        nextAutoCommand = pickNextAuto(moved.bumped, nextAutoCommand);
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
            const err = new Error('Usage: !up !down !left !right');
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

        if (mode === 'democracy') {
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
        lockedUntil = Date.now() + ANARCHY_LOCK_MS;
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
        floor = 0;
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

    function setSize(rawWidth, rawHeight) {
        const nextWidth = Math.round(Number(rawWidth));
        const nextHeight = Math.round(Number(rawHeight));
        if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth < 1 || nextHeight < 1) {
            const err = new Error('Usage: !dc size bigger|smaller|full');
            err.code = 'USAGE';
            throw err;
        }
        const width = Math.min(1920, Math.max(160, nextWidth));
        const height = Math.min(1080, Math.max(90, nextHeight));
        if (canvasWidth === width && canvasHeight === height) {
            return { ...snapshot(), changed: false, action: 'size' };
        }
        canvasWidth = width;
        canvasHeight = height;
        emit();
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
