import { formatDuration } from './isLive.js';
import { getSceneMap } from './obs.js';
import { formatChatLine } from './nowPlaying.js';
import { formatDvdSpeed } from './dvd.js';
import { DUNGEON_ALIASES } from './dungeon.js';

const COOLDOWN_MS = 1_000;
const ALIASES = {
    help: 'commands',
    song: 'currentsong',
    tictactoe: 'ttt',
    ...DUNGEON_ALIASES,
};
const RESERVED = new Set([
    'ping',
    'commands',
    'help',
    'lurk',
    'so',
    'game',
    'title',
    'uptime',
    'followage',
    'currentsong',
    'song',
    'dvdfast',
    'dvdslow',
    'dvd',
    'undvd',
    'dance',
    'undance',
    'ttt',
    'tictactoe',
    'clear',
    'dungeon',
    'dc',
    'anarchy',
    'democracy',
    'autoplay',
    'resize',
    'up',
    'down',
    'left',
    'right',
    ...Object.keys(DUNGEON_ALIASES),
]);

function formatDungeonLayout(state) {
    const size = `${state.canvasWidth}×${state.canvasHeight}`;
    const corner = String(state.anchor || 'top-left').replace('-', ' ');
    if (state.action === 'anchor') {
        if (!state.changed) {
            return `Dungeon is already ${corner}.`;
        }
        return `Dungeon ${corner}.`;
    }
    if (state.atLimit) {
        return `Dungeon is already ${size}.`;
    }
    if (state.action === 'status' || !state.changed) {
        return `Dungeon ${size}, ${corner}.`;
    }
    return `Dungeon ${size}, ${corner}.`;
}

const HELP_TOPICS = {
    dc: {
        aliases: ['dungeon'],
        text: 'Dungeon: !dc / !dungeon show+reset · !dc bigger/smaller (mods) · !dc topleft/topright/bottomleft/bottomright (mods) · !up !down !left !right · !anarchy !democracy !autoplay (mods) · !clear hides',
    },
    ttt: {
        aliases: ['tictactoe'],
        text: 'Tic-tac-toe: !ttt start · !ttt 1-9 play · !clear hides',
    },
    dance: {
        aliases: [],
        text: 'Dance: !dance <image url> queues a GIF · !undance removes one · !clear hides',
    },
    dvd: {
        aliases: [],
        text: 'DVD: !dvd add logo · !undvd remove · !dvdfast / !dvdslow speed · !clear hides',
    },
};

function helpTopicNames() {
    return Object.keys(HELP_TOPICS);
}

function resolveHelpTopic(raw) {
    const key = String(raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/^!/, '');
    if (!key) {
        return null;
    }
    if (HELP_TOPICS[key]) {
        return HELP_TOPICS[key];
    }
    return Object.values(HELP_TOPICS).find((topic) => topic.aliases.includes(key)) ?? null;
}

function sceneBuiltins() {
    return Object.entries(getSceneMap())
        .filter(([name]) => !RESERVED.has(name))
        .map(([name, scene]) => ({
            name,
            response: `OBS scene ${scene}`,
            builtin: true,
            execute() {
                return true;
            },
        }));
}

export function createCommandHandler(store, { getTwitch, obs, getNowPlaying, dvd, dance, ttt, dungeon } = {}) {
    const cooldowns = new Map();

    function moveDungeon(command) {
        return ({ user, displayName }) => {
            if (!dungeon) {
                return false;
            }
            try {
                const result = dungeon.input({ command, user, displayName });
                return result.ignored ? false : true;
            } catch {
                return false;
            }
        };
    }

    const builtins = [
        {
            name: 'ping',
            response: 'Pong!',
            builtin: true,
            execute({ say, channel }) {
                return say(channel, 'Pong!');
            },
        },
        {
            name: 'commands',
            response: 'Lists available commands, or !commands dc for dungeon help',
            builtin: true,
            async execute({ say, channel, args }) {
                const topic = resolveHelpTopic(args[0]);
                if (args[0]) {
                    if (!topic) {
                        return say(
                            channel,
                            `Unknown topic. Try: ${helpTopicNames().map((name) => `!commands ${name}`).join(', ')}`,
                        );
                    }
                    return say(channel, topic.text);
                }
                const all = await list();
                const names = [...new Set(all.map((command) => command.name))].sort();
                return say(
                    channel,
                    `Commands: ${names.map((name) => `!${name}`).join(', ')} · details: !commands dc`,
                );
            },
        },
        {
            name: 'help',
            response: 'Lists available commands',
            builtin: true,
            async execute(ctx) {
                const commands = builtins.find((command) => command.name === 'commands');
                return commands.execute(ctx);
            },
        },
        {
            name: 'lurk',
            response: 'Thanks for the lurk',
            builtin: true,
            execute({ say, channel, displayName }) {
                return say(channel, `Thanks for the lurk, ${displayName}!`);
            },
        },
        {
            name: 'so',
            response: 'Shout out a user',
            builtin: true,
            execute({ say, channel, args }) {
                const target = String(args[0] ?? '')
                    .replace(/^@/, '')
                    .trim();
                if (!target) {
                    say(channel, 'Usage: !so <user>');
                    return false;
                }
                return say(channel, `Go check out ${target} at https://twitch.tv/${target.toLowerCase()}`);
            },
        },
        {
            name: 'game',
            response: 'Current game',
            builtin: true,
            async execute({ say, channel }) {
                const twitch = getTwitch?.();
                if (!twitch) {
                    return say(channel, 'Bot is still connecting.');
                }
                try {
                    const stream = await twitch.getStream();
                    const info = stream ?? (await twitch.getChannel());
                    const game = info?.gameName?.trim();
                    if (!game) {
                        return say(channel, 'No game is set.');
                    }
                    return say(channel, `Currently playing: ${game}`);
                } catch (err) {
                    console.error('!game failed', err);
                    return say(channel, 'Could not look up the current game.');
                }
            },
        },
        {
            name: 'title',
            response: 'Current stream title',
            builtin: true,
            async execute({ say, channel }) {
                const twitch = getTwitch?.();
                if (!twitch) {
                    return say(channel, 'Bot is still connecting.');
                }
                try {
                    const stream = await twitch.getStream();
                    const info = stream ?? (await twitch.getChannel());
                    const title = info?.title?.trim();
                    if (!title) {
                        return say(channel, 'No title is set.');
                    }
                    return say(channel, title);
                } catch (err) {
                    console.error('!title failed', err);
                    return say(channel, 'Could not look up the stream title.');
                }
            },
        },
        {
            name: 'uptime',
            response: 'How long the stream has been live',
            builtin: true,
            async execute({ say, channel }) {
                const twitch = getTwitch?.();
                if (!twitch) {
                    return say(channel, 'Bot is still connecting.');
                }
                try {
                    const stream = await twitch.getStream();
                    if (!stream) {
                        return say(channel, 'Stream is offline.');
                    }
                    return say(channel, `Live for ${formatDuration(Date.now() - stream.startDate.getTime())}`);
                } catch (err) {
                    console.error('!uptime failed', err);
                    return say(channel, 'Could not look up uptime.');
                }
            },
        },
        {
            name: 'followage',
            response: 'How long the chatter has followed',
            builtin: true,
            async execute({ say, channel, displayName, userId }) {
                const twitch = getTwitch?.();
                if (!twitch) {
                    return say(channel, 'Bot is still connecting.');
                }
                try {
                    const followedAt = await twitch.getFollowage(userId);
                    if (!followedAt) {
                        return say(channel, `${displayName} is not following.`);
                    }
                    return say(
                        channel,
                        `${displayName} has been following for ${formatDuration(Date.now() - followedAt.getTime())}.`,
                    );
                } catch (err) {
                    if (err.code === 'FOLLOWAGE_SCOPE') {
                        return say(channel, 'Followage is unavailable. The bot needs moderator:read:followers and to be a channel mod.');
                    }
                    console.error('!followage failed', err);
                    return say(channel, 'Could not look up followage.');
                }
            },
        },
        {
            name: 'currentsong',
            response: 'Currently playing song',
            builtin: true,
            execute({ say, channel }) {
                return say(channel, formatChatLine(getNowPlaying?.() ?? null));
            },
        },
        {
            name: 'song',
            response: 'Currently playing song',
            builtin: true,
            execute({ say, channel }) {
                return say(channel, formatChatLine(getNowPlaying?.() ?? null));
            },
        },
        {
            name: 'dvdfast',
            response: 'Speeds up the DVD overlay',
            builtin: true,
            execute({ say, channel }) {
                if (!dvd) {
                    return say(channel, 'DVD overlay is not available.');
                }
                const { speed, changed } = dvd.faster();
                if (!changed) {
                    return say(channel, `DVD logo is already at max speed (${formatDvdSpeed(speed)}).`);
                }
                return say(channel, `DVD logo faster (${formatDvdSpeed(speed)}).`);
            },
        },
        {
            name: 'dvdslow',
            response: 'Slows down the DVD overlay',
            builtin: true,
            execute({ say, channel }) {
                if (!dvd) {
                    return say(channel, 'DVD overlay is not available.');
                }
                const { speed, changed } = dvd.slower();
                if (!changed) {
                    return say(channel, `DVD logo is already at min speed (${formatDvdSpeed(speed)}).`);
                }
                return say(channel, `DVD logo slower (${formatDvdSpeed(speed)}).`);
            },
        },
        {
            name: 'dvd',
            response: 'Adds another bouncing DVD logo',
            builtin: true,
            execute({ say, channel }) {
                if (!dvd) {
                    return say(channel, 'DVD overlay is not available.');
                }
                dvd.addLogo();
                return say(channel, 'Added a DVD logo.');
            },
        },
        {
            name: 'undvd',
            response: 'Removes a random bouncing DVD logo',
            builtin: true,
            execute({ say, channel }) {
                if (!dvd) {
                    return say(channel, 'DVD overlay is not available.');
                }
                dvd.removeRandom();
                return say(channel, 'Removed a random DVD logo.');
            },
        },
        {
            name: 'dance',
            response: 'Queues an image URL for dance overlay approval',
            builtin: true,
            async execute({ say, channel, args, user, displayName }) {
                if (!dance) {
                    return say(channel, 'Dance overlay is not available.');
                }
                const raw = String(args[0] ?? '').trim();
                if (!raw) {
                    say(channel, 'Usage: !dance <image url>');
                    return false;
                }
                try {
                    await dance.queueFromUrl({ url: raw, user, displayName });
                    return say(channel, `Dance GIF queued for approval (${displayName}).`);
                } catch (err) {
                    if (err.code === 'INVALID_URL') {
                        say(channel, 'Usage: !dance <image url>');
                        return false;
                    }
                    if (err.code === 'ALREADY_PENDING') {
                        return say(channel, 'That GIF is already waiting for approval.');
                    }
                    if (err.code === 'NOT_IMAGE') {
                        return say(channel, 'That URL is not a gif, png, jpg, or webp.');
                    }
                    if (err.code === 'TOO_LARGE') {
                        return say(channel, 'That image is too large (max 8MB).');
                    }
                    console.error('!dance failed', err);
                    return say(channel, 'Could not download that image.');
                }
            },
        },
        {
            name: 'undance',
            response: 'Removes a random GIF from the dance overlay',
            builtin: true,
            execute({ say, channel }) {
                if (!dance) {
                    return say(channel, 'Dance overlay is not available.');
                }
                dance.removeRandom();
                return say(channel, 'Removed a random dance GIF.');
            },
        },
        {
            name: 'dungeon',
            response: 'Shows and resets the dungeon crawler overlay to floor 0',
            builtin: true,
            execute({ say, channel }) {
                if (!dungeon) {
                    return say(channel, 'Dungeon overlay is not available.');
                }
                dungeon.reset();
                return say(channel, 'Dungeon overlay is on. Reset to floor 0 and refreshing the overlay.');
            },
        },
        {
            name: 'dc',
            response: 'Dungeon layout: !dc size bigger|smaller|full · !dc position topleft',
            builtin: true,
            execute({ say, channel, args, isMod, isBroadcaster }) {
                if (!dungeon) {
                    return say(channel, 'Dungeon overlay is not available.');
                }
                const sub = String(args[0] ?? '').trim().toLowerCase();
                if (!sub || sub === 'reset' || sub === 'show' || sub === 'start') {
                    dungeon.reset();
                    return say(channel, 'Dungeon overlay is on. Reset to floor 0 and refreshing the overlay.');
                }
                if (!isMod && !isBroadcaster) {
                    return;
                }
                try {
                    const state = dungeon.applyLayoutArgs(args);
                    return say(channel, formatDungeonLayout(state));
                } catch (err) {
                    return say(channel, err.message || 'Usage: !dc size bigger|smaller|full or !dc position topleft');
                }
            },
        },
        {
            name: 'anarchy',
            response: 'Switch the dungeon to anarchy mode (mods)',
            builtin: true,
            modOnly: true,
            execute({ say, channel }) {
                if (!dungeon) {
                    return say(channel, 'Dungeon overlay is not available.');
                }
                const state = dungeon.setMode('anarchy');
                if (!state.changed) {
                    return say(channel, 'Already in anarchy mode.');
                }
                return say(channel, 'Anarchy mode. Every command runs immediately.');
            },
        },
        {
            name: 'democracy',
            response: 'Switch the dungeon to democracy mode (mods)',
            builtin: true,
            modOnly: true,
            execute({ say, channel }) {
                if (!dungeon) {
                    return say(channel, 'Dungeon overlay is not available.');
                }
                const state = dungeon.setMode('democracy');
                if (!state.changed) {
                    return say(channel, 'Already in democracy mode.');
                }
                return say(channel, 'Democracy mode. Vote with !up !down !left !right.');
            },
        },
        {
            name: 'autoplay',
            response: 'Switch the dungeon to autoplay mode (mods)',
            builtin: true,
            modOnly: true,
            execute({ say, channel }) {
                if (!dungeon) {
                    return say(channel, 'Dungeon overlay is not available.');
                }
                const state = dungeon.setMode('autoplay');
                if (!state.changed) {
                    return say(channel, 'Already in autoplay mode.');
                }
                return say(channel, 'Autoplay mode. Chat with !up !down !left !right to take over.');
            },
        },
        {
            name: 'resize',
            response: 'Resize the dungeon canvas (mods): !resize bigger|smaller|full',
            builtin: true,
            modOnly: true,
            execute({ say, channel, args }) {
                if (!dungeon) {
                    return say(channel, 'Dungeon overlay is not available.');
                }
                try {
                    const state = dungeon.applyLayoutArgs(['size', ...args]);
                    return say(channel, formatDungeonLayout(state));
                } catch (err) {
                    return say(channel, err.message || 'Usage: !resize bigger|smaller|full');
                }
            },
        },
        {
            name: 'up',
            response: 'Dungeon: step forward',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('up'),
        },
        {
            name: 'down',
            response: 'Dungeon: step backward',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('down'),
        },
        {
            name: 'left',
            response: 'Dungeon: turn left',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('left'),
        },
        {
            name: 'right',
            response: 'Dungeon: turn right',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('right'),
        },
        {
            name: 'ttt',
            response: 'Play tic-tac-toe on the overlay (!ttt 1-9)',
            builtin: true,
            execute({ say, channel, args, user, displayName }) {
                if (!ttt) {
                    return say(channel, 'Tic-tac-toe overlay is not available.');
                }
                const cell = String(args[0] ?? '').trim();
                if (!cell || cell === 'start' || cell === 'new') {
                    ttt.start();
                    return say(channel, 'Tic-tac-toe overlay is on. First player is X, second is O. Play with !ttt 1-9.');
                }
                try {
                    const state = ttt.play({ cell, user, displayName });
                    const mark = state.lastMove?.mark;
                    const who = state.lastMove?.displayName || displayName;
                    if (state.winner) {
                        return say(channel, `${who} wins tic-tac-toe!`);
                    }
                    if (state.draw) {
                        return say(channel, 'Tic-tac-toe is a draw!');
                    }
                    const next = state.turn === 'X' ? state.x?.displayName : state.o?.displayName;
                    if (!state.o) {
                        return say(channel, `${who} played ${mark}. Next unique chatter is O. !ttt 1-9`);
                    }
                    return say(channel, `${who} played ${mark}. ${next}'s turn.`);
                } catch (err) {
                    return say(channel, err.message || 'Could not play that move.');
                }
            },
        },
        {
            name: 'clear',
            response: 'Clears dance GIFs and DVD logos, and hides tic-tac-toe and dungeon overlays',
            builtin: true,
            execute({ say, channel }) {
                dance?.clear();
                dvd?.clear();
                ttt?.clear();
                dungeon?.clear();
                return say(channel, 'Cleared dance, DVD, tic-tac-toe, and dungeon overlays.');
            },
        },
        ...sceneBuiltins(),
    ];

    function normalizeName(name) {
        return String(name ?? '')
            .trim()
            .replace(/^!/, '')
            .toLowerCase();
    }

    function onCooldown(name) {
        const last = cooldowns.get(name) ?? 0;
        return Date.now() - last < COOLDOWN_MS;
    }

    async function resolve(name) {
        const key = ALIASES[normalizeName(name)] ?? normalizeName(name);
        const builtin = builtins.find((command) => command.name === key);
        if (builtin) {
            return builtin;
        }

        const custom = await store.get(key);
        if (!custom) {
            return null;
        }

        return {
            ...custom,
            builtin: false,
            execute({ say, channel }) {
                return say(channel, custom.response);
            },
        };
    }

    async function handleMessage(ctx) {
        const trimmed = ctx.text.trim();
        if (!trimmed.startsWith('!')) {
            return;
        }

        const [raw, ...args] = trimmed.split(/\s+/);
        const command = await resolve(raw);
        if (!command) {
            return;
        }

        if (command.modOnly && !ctx.isMod && !ctx.isBroadcaster) {
            return;
        }

        if (!command.skipCooldown) {
            if (onCooldown(command.name)) {
                return;
            }
            cooldowns.set(command.name, Date.now());
        }

        const result = await command.execute({ ...ctx, args });
        if (result === false) {
            return;
        }

        obs?.emit({
            type: 'command',
            command: command.name,
            user: ctx.user,
            displayName: ctx.displayName,
            args,
            text: trimmed,
        });
    }

    async function list() {
        const custom = await store.list();
        return [
            ...builtins.map(({ name, response, builtin }) => ({ name, response, builtin })),
            ...custom.map(({ name, response }) => ({ name, response, builtin: false })),
        ];
    }

    return {
        builtins,
        normalizeName,
        resolve,
        handleMessage,
        list,
    };
}
