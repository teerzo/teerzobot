import { createSseHub } from './sse.js';

const WINS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

function emptyGame() {
    return {
        board: Array(9).fill(''),
        turn: 'X',
        x: null,
        o: null,
        winner: null,
        draw: false,
        line: null,
        lastMove: null,
    };
}

function snapshot(game) {
    return {
        board: [...game.board],
        turn: game.turn,
        x: game.x,
        o: game.o,
        winner: game.winner,
        draw: game.draw,
        line: game.line ? [...game.line] : null,
        lastMove: game.lastMove,
    };
}

function parseCell(value) {
    const n = Number(String(value ?? '').trim());
    if (!Number.isInteger(n) || n < 1 || n > 9) {
        return -1;
    }
    return n - 1;
}

function winnerOf(board) {
    for (const line of WINS) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { mark: board[a], line };
        }
    }
    return null;
}

export function createTtt() {
    const hub = createSseHub({ defaultType: 'ttt' });
    let game = emptyGame();

    function emit() {
        return hub.emit({ type: 'state', ...snapshot(game) });
    }

    function start() {
        game = emptyGame();
        emit();
        return snapshot(game);
    }

    function play({ cell, user, displayName }) {
        const index = parseCell(cell);
        if (index < 0) {
            const err = new Error('Usage: !ttt 1-9');
            err.code = 'USAGE';
            throw err;
        }
        if (game.winner || game.draw) {
            const err = new Error('Game is over. Use !ttt to start a new one.');
            err.code = 'OVER';
            throw err;
        }
        if (game.board[index]) {
            const err = new Error('That cell is taken.');
            err.code = 'TAKEN';
            throw err;
        }

        const player = { user, displayName: displayName || user };
        if (!game.x) {
            game.x = player;
        } else if (!game.o) {
            if (game.x.user === user) {
                const err = new Error('Wait for an opponent to play.');
                err.code = 'WAIT';
                throw err;
            }
            game.o = player;
        }

        const mark = game.turn;
        const current = mark === 'X' ? game.x : game.o;
        if (!current || current.user !== user) {
            const err = new Error(`It's ${current?.displayName || mark}'s turn.`);
            err.code = 'TURN';
            throw err;
        }

        game.board[index] = mark;
        game.lastMove = { index, mark, displayName: player.displayName };
        const won = winnerOf(game.board);
        if (won) {
            game.winner = mark;
            game.line = won.line;
        } else if (game.board.every(Boolean)) {
            game.draw = true;
        } else {
            game.turn = mark === 'X' ? 'O' : 'X';
        }

        emit();
        return snapshot(game);
    }

    return {
        subscribe: hub.subscribe,
        emit,
        get: () => snapshot(game),
        start,
        play,
        clear() {
            return start();
        },
        getStatus: () => ({ listeners: hub.listenerCount, inGame: Boolean(game.x) }),
    };
}
