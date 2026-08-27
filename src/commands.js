import { formatDuration } from './isLive.js';
import { getSceneMap } from './obs.js';
import { formatChatLine } from './nowPlaying.js';
import { formatDvdSpeed } from './dvd.js';
import { DUNGEON_ALIASES } from './dungeon.js';

const COOLDOWN_MS = 1_000;
const ALIASES = {
    help: 'commands',
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
    'chat',
    'ttt',
    'tictactoe',
    'clear',
    'dungeon',
    'dc',
    'anarchy',
    'democracy',
    'autoplay',
    'resize',
    'phone',
    'obs',
    'up',
    'down',
    'left',
    'right',
    'fire',
    'water',
    'nature',
    'lightning',
    'chaos',
    'attack',
    'block',
    ...Object.keys(DUNGEON_ALIASES),
]);

function formatDungeonLayout(state) {
    const portrait = Number(state.canvasHeight) > Number(state.canvasWidth);
    const size = `${state.canvasWidth}×${state.canvasHeight}${portrait ? ' (phone)' : ''}`;
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

function formatDungeonMode(state) {
    if (state.mode === 'anarchy') {
        return state.changed
            ? 'Anarchy mode. Every command runs immediately.'
            : 'Already in anarchy mode.';
    }
    if (state.mode === 'democracy') {
        return state.changed
            ? 'Democracy mode. Vote with !up !down !left !right. !fire !water !nature !lightning !chaos !attack !block anytime.'
            : 'Already in democracy mode.';
    }
    if (state.mode === 'autoplay') {
        return state.changed
            ? 'Autoplay mode. Chat with !up !down !left !right to take over.'
            : 'Already in autoplay mode.';
    }
    return `Dungeon mode: ${state.mode}.`;
}

const HELP_TOPICS = {
    dc: {
        aliases: ['dungeon'],
        text: 'Dungeon: !dc / !dungeon show+reset · !dc bigger/smaller (mods) · !dc phone / !phone portrait (mods) · !dc landscape (mods) · !dc topleft/topright/bottomleft/bottomright (mods) · !dc anarchy/democracy/autoplay (mods) · !dc shh toggles floor/autoplay chat (mods) · !up !down !left !right · !fire !water !nature !lightning !chaos · !attack !block · !clear hides',
    },
    ttt: {
        aliases: ['tictactoe'],
        text: 'Tic-tac-toe: !ttt start · !ttt 1-9 play · !clear hides (mods)',
    },
    dance: {
        aliases: [],
        text: 'Dance: !dance <image url> queues a GIF · !dance remove · !dance clear · !clear hides (mods)',
    },
    dvd: {
        aliases: [],
        text: 'DVD: !dvd / !dvd add · !dvd remove · !dvd fast / !dvd slow · !clear hides (mods)',
    },
    chat: {
        aliases: [],
        text: 'Chat overlay: !chat toggles visibility (mods) · !clear empties and hides it (mods)',
    },
    obs: {
        aliases: [],
        text: 'OBS: !obs lists scenes · !obs <name> switches to that scene',
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

export function createCommandHandler(store, { getTwitch, obs, getNowPlaying, dvd, dance, ttt, dungeon, chatFeed } = {}) {
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

    function toggleDungeonShh({ say, channel, isMod, isBroadcaster }) {
        if (!dungeon) {
            return say(channel, 'Dungeon overlay is not available.');
        }
        if (!isMod && !isBroadcaster) {
            return;
        }
        const { chatQuiet } = dungeon.toggleChatQuiet();
        return say(
            channel,
            chatQuiet
                ? 'Dungeon chat muted. Floor clears and autoplay will stay quiet.'
                : 'Dungeon chat unmuted.',
        );
    }

    function setDungeonMode(mode, { say, channel, isMod, isBroadcaster }) {
        if (!dungeon) {
            return say(channel, 'Dungeon overlay is not available.');
        }
        if (!isMod && !isBroadcaster) {
            return;
        }
        const state = dungeon.setMode(mode);
        return say(channel, formatDungeonMode(state));
    }

    function runDungeonCommand({ say, channel, args, isMod, isBroadcaster }) {
        if (!dungeon) {
            return say(channel, 'Dungeon overlay is not available.');
        }
        const sub = String(args[0] ?? '').trim().toLowerCase();
        if (!sub || sub === 'reset' || sub === 'show' || sub === 'start') {
            dungeon.reset();
            return say(channel, 'Dungeon overlay is on. Reset to floor 0 and refreshing the overlay.');
        }
        if (sub === 'shh' || sub === 'quiet' || sub === 'mute') {
            return toggleDungeonShh({ say, channel, isMod, isBroadcaster });
        }
        if (sub === 'anarchy' || sub === 'democracy' || sub === 'autoplay') {
            return setDungeonMode(sub, { say, channel, isMod, isBroadcaster });
        }
        if (!isMod && !isBroadcaster) {
            return;
        }
        try {
            const state = dungeon.applyLayoutArgs(args);
            return say(channel, formatDungeonLayout(state));
        } catch (err) {
            return say(channel, err.message || 'Usage: !dc size bigger|smaller|full|phone or !dc position topleft');
        }
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
            response: 'Current game, or !game <name> to set (mods)',
            builtin: true,
            async execute({ say, channel, args, isMod, isBroadcaster }) {
                const twitch = getTwitch?.();
                if (!twitch) {
                    return say(channel, 'Bot is still connecting.');
                }
                const query = args.join(' ').trim();
                if (query) {
                    if (!isMod && !isBroadcaster) {
                        return;
                    }
                    try {
                        const result = await twitch.setGame(query);
                        return say(channel, `Set game to ${result.gameName}.`);
                    } catch (err) {
                        if (err.code === 'BROADCAST_SCOPE') {
                            return say(
                                channel,
                                'Cannot set game. Authorize the broadcaster at /oauth/streamer with channel:manage:broadcast.',
                            );
                        }
                        if (err.code === 'GAME_NOT_FOUND') {
                            return say(channel, `No Twitch category matched "${query}".`);
                        }
                        if (err.code === 'USAGE') {
                            return say(channel, 'Usage: !game <category name>');
                        }
                        console.error('!game set failed', err);
                        return say(channel, 'Could not update the game.');
                    }
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
            response: 'Current stream title, or !title <text> to set (mods)',
            builtin: true,
            async execute({ say, channel, args, isMod, isBroadcaster }) {
                const twitch = getTwitch?.();
                if (!twitch) {
                    return say(channel, 'Bot is still connecting.');
                }
                const next = args.join(' ').trim();
                if (next) {
                    if (!isMod && !isBroadcaster) {
                        return;
                    }
                    try {
                        const result = await twitch.setTitle(next);
                        return say(channel, `Title set to ${result.title}`);
                    } catch (err) {
                        if (err.code === 'BROADCAST_SCOPE') {
                            return say(
                                channel,
                                'Cannot set title. Authorize the broadcaster at /oauth/streamer with channel:manage:broadcast.',
                            );
                        }
                        if (err.code === 'USAGE') {
                            return say(channel, 'Usage: !title <stream title>');
                        }
                        console.error('!title set failed', err);
                        return say(channel, 'Could not update the title.');
                    }
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
            name: 'song',
            response: 'Currently playing song',
            builtin: true,
            execute({ say, channel }) {
                return say(channel, formatChatLine(getNowPlaying?.() ?? null));
            },
        },
        {
            name: 'dvd',
            response: 'DVD overlay: !dvd add|remove|fast|slow',
            builtin: true,
            execute({ say, channel, args }) {
                if (!dvd) {
                    return say(channel, 'DVD overlay is not available.');
                }
                const sub = String(args[0] ?? '').trim().toLowerCase();
                if (!sub || sub === 'add') {
                    dvd.addLogo();
                    return say(channel, 'Added a DVD logo.');
                }
                if (sub === 'remove' || sub === 'rm' || sub === 'del' || sub === 'delete') {
                    dvd.removeRandom();
                    return say(channel, 'Removed a random DVD logo.');
                }
                if (sub === 'fast' || sub === 'faster') {
                    const { speed, changed } = dvd.faster();
                    if (!changed) {
                        return say(channel, `DVD logo is already at max speed (${formatDvdSpeed(speed)}).`);
                    }
                    return say(channel, `DVD logo faster (${formatDvdSpeed(speed)}).`);
                }
                if (sub === 'slow' || sub === 'slower') {
                    const { speed, changed } = dvd.slower();
                    if (!changed) {
                        return say(channel, `DVD logo is already at min speed (${formatDvdSpeed(speed)}).`);
                    }
                    return say(channel, `DVD logo slower (${formatDvdSpeed(speed)}).`);
                }
                say(channel, 'Usage: !dvd add|remove|fast|slow');
                return false;
            },
        },
        {
            name: 'dance',
            response: 'Dance overlay: !dance <url> · !dance remove · !dance clear',
            builtin: true,
            async execute({ say, channel, args, user, displayName }) {
                if (!dance) {
                    return say(channel, 'Dance overlay is not available.');
                }
                const sub = String(args[0] ?? '').trim().toLowerCase();
                if (sub === 'remove' || sub === 'rm' || sub === 'del' || sub === 'delete') {
                    dance.removeRandom();
                    return say(channel, 'Removed a random dance GIF.');
                }
                if (sub === 'clear') {
                    dance.clear();
                    return say(channel, 'Cleared dance GIFs.');
                }
                const raw = String(args[0] ?? '').trim();
                if (!raw) {
                    say(channel, 'Usage: !dance <image url> · !dance remove · !dance clear');
                    return false;
                }
                try {
                    await dance.queueFromUrl({ url: raw, user, displayName });
                    return say(channel, `Dance GIF queued for approval (${displayName}).`);
                } catch (err) {
                    if (err.code === 'INVALID_URL') {
                        say(channel, 'Usage: !dance <image url> · !dance remove · !dance clear');
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
            name: 'dungeon',
            response: 'Dungeon: !dungeon · !dungeon anarchy|democracy|autoplay|shh (mods)',
            builtin: true,
            execute: runDungeonCommand,
        },
        {
            name: 'dc',
            response: 'Dungeon: !dc · !dc anarchy|democracy|autoplay|shh · !dc size bigger|smaller|full|phone',
            builtin: true,
            execute: runDungeonCommand,
        },
        {
            name: 'resize',
            response: 'Resize the dungeon canvas (mods): !resize bigger|smaller|full|phone',
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
                    return say(channel, err.message || 'Usage: !resize bigger|smaller|full|phone');
                }
            },
        },
        {
            name: 'phone',
            response: 'Switch the dungeon to a portrait phone size (mods): !phone bigger|smaller',
            builtin: true,
            modOnly: true,
            execute({ say, channel, args }) {
                if (!dungeon) {
                    return say(channel, 'Dungeon overlay is not available.');
                }
                try {
                    const state = dungeon.applyLayoutArgs(['phone', ...args]);
                    return say(channel, formatDungeonLayout(state));
                } catch (err) {
                    return say(channel, err.message || 'Usage: !phone or !phone bigger|smaller');
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
            name: 'fire',
            response: 'Dungeon: cast fire',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('fire'),
        },
        {
            name: 'water',
            response: 'Dungeon: cast water',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('water'),
        },
        {
            name: 'nature',
            response: 'Dungeon: cast nature',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('nature'),
        },
        {
            name: 'lightning',
            response: 'Dungeon: cast lightning',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('lightning'),
        },
        {
            name: 'chaos',
            response: 'Dungeon: cast chaos',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('chaos'),
        },
        {
            name: 'attack',
            response: 'Dungeon: melee attack',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('attack'),
        },
        {
            name: 'block',
            response: 'Dungeon: raise the shield',
            builtin: true,
            skipCooldown: true,
            execute: moveDungeon('block'),
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
            name: 'chat',
            response: 'Toggles the chat overlay (mods)',
            builtin: true,
            modOnly: true,
            execute({ say, channel }) {
                if (!chatFeed) {
                    return say(channel, 'Chat overlay is not available.');
                }
                const state = chatFeed.toggle();
                return say(channel, state.visible ? 'Chat overlay is on.' : 'Chat overlay is hidden.');
            },
        },
        {
            name: 'clear',
            response: 'Clears dance GIFs and DVD logos, and hides chat, tic-tac-toe, and dungeon overlays (mods)',
            builtin: true,
            modOnly: true,
            execute({ say, channel }) {
                dance?.clear();
                dvd?.clear();
                ttt?.clear();
                dungeon?.clear();
                chatFeed?.clear();
                return say(channel, 'Cleared dance, DVD, chat, tic-tac-toe, and dungeon overlays.');
            },
        },
        {
            name: 'obs',
            response: 'OBS scene switch: !obs <name>',
            builtin: true,
            execute({ say, channel, args }) {
                const scenes = getSceneMap();
                const names = Object.keys(scenes).sort();
                const key = String(args[0] ?? '')
                    .trim()
                    .toLowerCase()
                    .replace(/^!/, '');
                if (!key) {
                    if (!names.length) {
                        return say(channel, 'No OBS scenes mapped. Set OBS_SCENE_<NAME> env vars.');
                    }
                    return say(channel, `OBS scenes: ${names.map((name) => `!obs ${name}`).join(', ')}`);
                }
                if (!scenes[key]) {
                    if (!names.length) {
                        return say(channel, `Unknown OBS scene "${key}". No OBS_SCENE_* env vars are set.`);
                    }
                    return say(
                        channel,
                        `Unknown OBS scene "${key}". Try: ${names.map((name) => `!obs ${name}`).join(', ')}`,
                    );
                }
                return say(channel, `Switching OBS to ${scenes[key]}.`);
            },
        },
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
