import { createSseHub } from './sse.js';

const FLOOR = 0;
const WALL = 1;
const EXIT = 2;

const DIRS = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
];

const MOVES = new Set(['up', 'down', 'left', 'right']);
const ANARCHY_LOCK_MS = 350;
const DEMOCRACY_MS = 8_000;
const MIN_SIZE = 11;
const MAX_SIZE = 21;

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

function sizeForFloor(floor) {
    const n = MIN_SIZE + 2 * Math.max(0, floor - 1);
    const odd = n % 2 === 0 ? n + 1 : n;
    return Math.min(MAX_SIZE, odd);
}

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function generateMaze(size) {
    const grid = Array.from({ length: size }, () => Array(size).fill(WALL));
    const startX = 1;
    const startY = 1;
    grid[startY][startX] = FLOOR;

    const stack = [[startX, startY]];
    const steps = [
        [0, -2],
        [2, 0],
        [0, 2],
        [-2, 0],
    ];

    while (stack.length) {
        const [x, y] = stack[stack.length - 1];
        const neighbors = shuffle(
            steps
                .map(([dx, dy]) => [x + dx, y + dy, dx, dy])
                .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && grid[ny][nx] === WALL),
        );
        if (!neighbors.length) {
            stack.pop();
            continue;
        }
        const [nx, ny, dx, dy] = neighbors[0];
        grid[y + dy / 2][x + dx / 2] = FLOOR;
        grid[ny][nx] = FLOOR;
        stack.push([nx, ny]);
    }

    return { grid, startX, startY };
}

function farthestCell(grid, startX, startY) {
    const height = grid.length;
    const width = grid[0].length;
    const dist = Array.from({ length: height }, () => Array(width).fill(-1));
    const queue = [[startX, startY]];
    dist[startY][startX] = 0;
    let best = [startX, startY];
    let bestDist = 0;

    while (queue.length) {
        const [x, y] = queue.shift();
        for (const { dx, dy } of DIRS) {
            const nx = x + dx;
            const ny = y + dy;
            if (ny < 0 || nx < 0 || ny >= height || nx >= width) {
                continue;
            }
            if (grid[ny][nx] === WALL || dist[ny][nx] >= 0) {
                continue;
            }
            dist[ny][nx] = dist[y][x] + 1;
            queue.push([nx, ny]);
            if (dist[ny][nx] > bestDist) {
                bestDist = dist[ny][nx];
                best = [nx, ny];
            }
        }
    }

    return { x: best[0], y: best[1] };
}

function openDir(grid, x, y) {
    for (let dir = 0; dir < 4; dir++) {
        const nx = x + DIRS[dir].dx;
        const ny = y + DIRS[dir].dy;
        const cell = grid[ny]?.[nx];
        if (cell === FLOOR || cell === EXIT) {
            return dir;
        }
    }
    return 0;
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
    const size = sizeForFloor(floor);
    const { grid, startX, startY } = generateMaze(size);
    const exit = farthestCell(grid, startX, startY);
    grid[exit.y][exit.x] = EXIT;
    return {
        width: size,
        height: size,
        grid,
        player: { x: startX, y: startY, dir: openDir(grid, startX, startY) },
        exit,
    };
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

    function snapshot() {
        return {
            floor,
            mode,
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

    function reset() {
        clearVotes();
        floor = 0;
        maze = buildFloor(floor);
        lastAction = null;
        lockedUntil = 0;
        emit();
        return snapshot();
    }

    function setMode(next) {
        const value = String(next ?? '').trim().toLowerCase();
        if (value !== 'anarchy' && value !== 'democracy') {
            const err = new Error('Mode must be anarchy or democracy');
            err.code = 'USAGE';
            throw err;
        }
        if (mode === value) {
            return { ...snapshot(), changed: false };
        }
        clearVotes();
        mode = value;
        lockedUntil = 0;
        emit();
        return { ...snapshot(), changed: true };
    }

    return {
        subscribe: hub.subscribe,
        emit,
        get: () => snapshot(),
        input,
        reset,
        setMode,
        setOnFloorClear(fn) {
            onFloorClear = typeof fn === 'function' ? fn : null;
        },
        getStatus: () => ({
            listeners: hub.listenerCount,
            floor,
            mode,
        }),
    };
}
