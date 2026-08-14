import { formatDuration } from './isLive.js';
import { getSceneMap } from './obs.js';
import { formatChatLine } from './nowPlaying.js';
import { formatDvdSpeed } from './dvd.js';

const COOLDOWN_MS = 1_000;
const ALIASES = { help: 'commands', song: 'currentsong' };
const RESERVED = new Set(['ping', 'commands', 'help', 'lurk', 'so', 'game', 'title', 'uptime', 'followage', 'currentsong', 'song', 'dvdfast', 'dvdslow', 'dvd', 'undvd', 'dance', 'undance']);

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

export function createCommandHandler(store, { getTwitch, obs, getNowPlaying, dvd, dance } = {}) {
    const cooldowns = new Map();

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
            response: 'Lists available commands',
            builtin: true,
            async execute({ say, channel }) {
                const all = await list();
                const names = [...new Set(all.map((command) => command.name))].sort();
                return say(channel, `Commands: ${names.map((name) => `!${name}`).join(', ')}`);
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

        if (onCooldown(command.name)) {
            return;
        }

        cooldowns.set(command.name, Date.now());

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
