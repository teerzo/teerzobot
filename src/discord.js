import {
    ActivityType,
    ChannelType,
    Client,
    Events,
    GatewayIntentBits,
    PermissionFlagsBits,
    REST,
    Routes,
    SlashCommandBuilder,
} from 'discord.js';

const DEFAULT_BOT_PERMISSIONS = String(
    PermissionFlagsBits.ViewChannel
    | PermissionFlagsBits.SendMessages
    | PermissionFlagsBits.ReadMessageHistory,
);

const slashCommands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!').toJSON(),
    new SlashCommandBuilder().setName('hello').setDescription('Says hello from teerzobot').toJSON(),
];

const slashReplies = {
    ping: 'Pong!',
    hello: 'Hello! teerzobot is online.',
};

function htmlPage(title, body) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font:16px/1.4 sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;color:#eee;background:#111}</style>
</head><body>${body}</body></html>`;
}

export function buildDiscordInstallUrl() {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
        return null;
    }

    const url = new URL('https://discord.com/oauth2/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('scope', 'bot applications.commands');
    url.searchParams.set('permissions', process.env.DISCORD_BOT_PERMISSIONS || DEFAULT_BOT_PERMISSIONS);
    url.searchParams.set('integration_type', '0');
    return url.toString();
}

function redirectToInstall(_req, res) {
    const installUrl = buildDiscordInstallUrl();
    if (!installUrl) {
        res.status(500).type('html').send(htmlPage('Discord', '<p>DISCORD_CLIENT_ID is not set.</p>'));
        return;
    }
    res.redirect(installUrl);
}

export function attachDiscordRoutes(app) {
    app.get('/discord/install', redirectToInstall);
    app.get('/discord/invite', redirectToInstall);

    app.get('/discord/callback', (req, res) => {
        const error = req.query.error;
        if (error) {
            const description = req.query.error_description || '';
            res.status(400).type('html').send(htmlPage('Discord OAuth error', `<p>${error}: ${description}</p>`));
            return;
        }
        res.type('html').send(
            htmlPage('Discord', '<p>Bot authorized. You can close this tab. Restart the service if it was already running so it joins the server.</p>'),
        );
    });
}

async function registerCommands(token, clientId, guildId) {
    const rest = new REST({ version: '10' }).setToken(token);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: slashCommands,
    });
    console.log(`Registered Discord slash commands /ping /hello in ${guildId}`);
}

function normalizeChannelName(name) {
    return String(name || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-');
}

function bridgeChannelName() {
    return normalizeChannelName(process.env.DISCORD_BRIDGE_CHANNEL || 'twitch-chat');
}

function isBridgeChannelName(name) {
    return normalizeChannelName(name) === bridgeChannelName();
}

function danceChannelName() {
    return normalizeChannelName(process.env.DISCORD_DANCE_CHANNEL || 'stream-dance');
}

function isDanceChannelName(name) {
    return normalizeChannelName(name) === danceChannelName();
}

function artworkChannelName() {
    return 'artwork';
}

function isArtworkChannelName(name) {
    return normalizeChannelName(name) === artworkChannelName();
}

function isImageAttachment(attachment) {
    const type = String(attachment.contentType || '').toLowerCase();
    if (type.startsWith('image/')) {
        return true;
    }
    return /\.(gif|png|jpe?g|webp)(\?|$)/i.test(attachment.name || attachment.url || '');
}

function imageUrlsFromMessage(message) {
    const urls = [];
    for (const attachment of message.attachments.values()) {
        if (isImageAttachment(attachment) && attachment.url) {
            urls.push(attachment.url);
        }
    }
    for (const embed of message.embeds) {
        const url = embed.image?.url || embed.thumbnail?.url;
        if (url) {
            urls.push(url);
        }
    }
    return [...new Set(urls)];
}

function canSend(channel) {
    const me = channel.guild?.members.me;
    return Boolean(
        channel?.isTextBased()
        && channel.type === ChannelType.GuildText
        && me
        && channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages),
    );
}

function findGeneralChannel(guild) {
    const textChannels = guild.channels.cache.filter(canSend);
    return textChannels.find((channel) => channel.name.toLowerCase() === 'general')
        ?? textChannels.find((channel) => channel.name.toLowerCase().includes('general'))
        ?? (canSend(guild.systemChannel) ? guild.systemChannel : null)
        ?? textChannels.first()
        ?? null;
}

async function postJoinMessage(guild) {
    if (Date.now() - (guild.joinedTimestamp ?? 0) > 60_000) {
        return;
    }

    try {
        await guild.channels.fetch();
    } catch (err) {
        console.error(`Failed to fetch channels for ${guild.name}`, err);
    }

    const channel = findGeneralChannel(guild);
    if (!channel) {
        console.log(`Joined ${guild.name} but could not find a channel to post in`);
        return;
    }

    try {
        await channel.send('Hey! teerzobot just joined. Try `/ping` or `/hello`.');
        console.log(`Posted join message in #${channel.name} (${guild.name})`);
    } catch (err) {
        console.error(`Failed to post join message in ${guild.name}`, err);
    }
}

export function createDiscordClient({ onBridgeMessage, onDanceImage, onArtworkImage, onArtworkReady } = {}) {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID;
    const channel = (process.env.TWITCH_CHANNEL || 'teerzo').replace(/^#/, '');
    let client = null;
    let bridgeChannelId = null;

    const state = {
        connected: false,
        user: null,
        guildId: guildId || null,
        guild: null,
    };

    function guildsToSearch() {
        if (!client) {
            return [];
        }
        if (guildId && client.guilds.cache.has(guildId)) {
            return [client.guilds.cache.get(guildId)];
        }
        return [...client.guilds.cache.values()];
    }

    async function resolveBridgeChannel() {
        if (!client?.isReady()) {
            return null;
        }
        if (bridgeChannelId) {
            const cached = client.channels.cache.get(bridgeChannelId);
            if (cached?.isTextBased()) {
                return cached;
            }
            bridgeChannelId = null;
        }

        for (const guild of guildsToSearch()) {
            try {
                await guild.channels.fetch();
            } catch (err) {
                console.error(`Failed to fetch channels for ${guild.name}`, err);
            }
            const found = guild.channels.cache.find((ch) => (
                ch.isTextBased()
                && ch.type === ChannelType.GuildText
                && isBridgeChannelName(ch.name)
            ));
            if (found) {
                bridgeChannelId = found.id;
                return found;
            }
        }
        return null;
    }

    async function resolveNamedTextChannel(matchName) {
        if (!client?.isReady()) {
            return null;
        }
        for (const guild of guildsToSearch()) {
            try {
                await guild.channels.fetch();
            } catch (err) {
                console.error(`Failed to fetch channels for ${guild.name}`, err);
            }
            const found = guild.channels.cache.find((ch) => (
                ch.isTextBased()
                && ch.type === ChannelType.GuildText
                && matchName(ch.name)
            ));
            if (found) {
                return found;
            }
        }
        return null;
    }

    async function ingestArtworkUrls(urls, { silent = false } = {}) {
        if (!urls.length) {
            return 0;
        }
        if (!onArtworkImage) {
            console.log('Discord artwork image ignored; dungeon artwork is not wired up');
            return 0;
        }
        let added = 0;
        for (const url of urls) {
            try {
                await onArtworkImage({ url, silent });
                added += 1;
            } catch (err) {
                console.error('Failed to save Discord artwork image', err);
            }
        }
        return added;
    }

    async function loadArtworkHistory() {
        const target = await resolveNamedTextChannel(isArtworkChannelName);
        if (!target) {
            console.log(`Discord artwork channel: no #${artworkChannelName()} channel found`);
            return;
        }
        console.log(`Discord artwork channel: #${target.name}`);
        if (!onArtworkImage) {
            return;
        }

        const messages = [];
        let before;
        try {
            for (let page = 0; page < 20; page++) {
                const batch = await target.messages.fetch(before ? { limit: 100, before } : { limit: 100 });
                if (!batch.size) {
                    break;
                }
                messages.push(...batch.values());
                before = batch.last()?.id;
                if (batch.size < 100) {
                    break;
                }
            }
        } catch (err) {
            console.error(`Failed to read #${target.name} history`, err);
            return;
        }

        messages.reverse();
        const seen = new Set();
        const urls = [];
        for (const message of messages) {
            for (const url of imageUrlsFromMessage(message)) {
                if (seen.has(url)) {
                    continue;
                }
                seen.add(url);
                urls.push(url);
            }
        }

        const added = await ingestArtworkUrls(urls, { silent: true });
        try {
            await onArtworkReady?.();
        } catch (err) {
            console.error('Failed to apply Discord artwork', err);
        }
        console.log(`Discord artwork: loaded ${added} image${added === 1 ? '' : 's'} from #${target.name}`);
    }

    async function relayChat({ displayName, text } = {}) {
        const target = await resolveBridgeChannel();
        if (!target) {
            return;
        }
        const name = String(displayName || 'twitch').replace(/[\r\n*_`]/g, '').slice(0, 80);
        const body = String(text || '').replace(/\s+/g, ' ').trim();
        if (!body) {
            return;
        }
        const line = `[Twitch] ${name}: ${body}`.slice(0, 2000);
        try {
            await target.send(line);
        } catch (err) {
            console.error('Failed to relay Twitch chat to Discord', err);
        }
    }

    async function connect() {
        if (!token) {
            console.log('DISCORD_TOKEN not set; skipping Discord');
            return;
        }

        client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        client.once(Events.ClientReady, async (readyClient) => {
            state.connected = true;
            state.user = readyClient.user.username;

            const guild = guildId
                ? readyClient.guilds.cache.get(guildId)
                : readyClient.guilds.cache.first();
            if (guild) {
                state.guildId = guild.id;
                state.guild = guild.name;
            }

            readyClient.user.setPresence({
                status: 'online',
                activities: [{ name: channel, type: ActivityType.Watching }],
            });

            console.log(`Discord connected as ${readyClient.user.tag}${state.guild ? ` in ${state.guild}` : ''}`);

            const bridge = await resolveBridgeChannel();
            if (bridge) {
                console.log(`Discord Twitch chat bridge: #${bridge.name}`);
            } else {
                console.log(`Discord Twitch chat bridge: no #${bridgeChannelName()} channel found`);
            }
            console.log(`Discord dance queue channel: #${danceChannelName()}`);
            await loadArtworkHistory();

            if (!clientId) {
                console.log('DISCORD_CLIENT_ID missing; skipping slash command registration');
                return;
            }

            const guildIds = guildId
                ? [guildId]
                : [...readyClient.guilds.cache.keys()];

            for (const id of guildIds) {
                try {
                    await registerCommands(token, clientId, id);
                } catch (err) {
                    console.error('Failed to register Discord slash commands', err);
                }
            }
        });

        client.on(Events.GuildCreate, async (guild) => {
            state.guildId = state.guildId || guild.id;
            state.guild = state.guild || guild.name;

            if (clientId) {
                try {
                    await registerCommands(token, clientId, guild.id);
                } catch (err) {
                    console.error('Failed to register Discord slash commands', err);
                }
            }

            await postJoinMessage(guild);
            const bridge = await resolveBridgeChannel();
            if (bridge) {
                console.log(`Discord Twitch chat bridge: #${bridge.name}`);
            }
        });

        client.on(Events.ChannelCreate, (created) => {
            if (created.isTextBased() && created.type === ChannelType.GuildText && isBridgeChannelName(created.name)) {
                bridgeChannelId = created.id;
                console.log(`Discord Twitch chat bridge: #${created.name}`);
            }
        });

        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot || message.system) {
                return;
            }

            const displayName = message.member?.displayName || message.author.globalName || message.author.username;
            const user = message.author.username;

            if (isDanceChannelName(message.channel?.name)) {
                const urls = imageUrlsFromMessage(message);
                if (!urls.length) {
                    return;
                }
                if (!onDanceImage) {
                    console.log('Discord dance image ignored; dance queue is not wired up');
                    return;
                }

                const queued = [];
                const errors = [];
                for (const url of urls) {
                    try {
                        await onDanceImage({ url, user, displayName });
                        queued.push(url);
                    } catch (err) {
                        console.error('Failed to queue Discord dance image', err);
                        errors.push(err.message || 'Could not queue that image');
                    }
                }

                const parts = [];
                if (queued.length) {
                    parts.push(queued.length === 1
                        ? 'Queued for dance approval at /manage/dance.'
                        : `Queued ${queued.length} images for dance approval at /manage/dance.`);
                }
                if (errors.length) {
                    parts.push(errors[0]);
                }
                if (parts.length) {
                    try {
                        await message.reply(parts.join(' '));
                    } catch (err) {
                        console.error('Failed to reply in #stream-dance', err);
                    }
                }
                return;
            }

            if (isArtworkChannelName(message.channel?.name)) {
                const urls = imageUrlsFromMessage(message);
                await ingestArtworkUrls(urls);
                return;
            }

            const inBridge = message.channelId === bridgeChannelId
                || isBridgeChannelName(message.channel?.name);
            if (!inBridge) {
                return;
            }
            if (!bridgeChannelId && message.channelId) {
                bridgeChannelId = message.channelId;
            }

            const attachments = [...message.attachments.values()].map((file) => file.url);
            const text = [message.content, ...attachments].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
            if (!text) {
                console.log('Discord bridge skipped an empty message (enable Message Content Intent in the Developer Portal)');
                return;
            }

            try {
                await onBridgeMessage?.({ displayName, text });
            } catch (err) {
                console.error('Failed to relay Discord chat to Twitch', err);
            }
        });

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) {
                return;
            }
            const reply = slashReplies[interaction.commandName];
            if (!reply) {
                return;
            }
            try {
                await interaction.reply(reply);
            } catch (err) {
                console.error(`Discord /${interaction.commandName} failed`, err);
            }
        });

        client.on(Events.ShardDisconnect, () => {
            state.connected = false;
        });

        client.on(Events.ShardResume, () => {
            state.connected = true;
        });

        await client.login(token);
    }

    return {
        connect,
        relayChat,
        getStatus: () => ({
            ...state,
            installUrl: buildDiscordInstallUrl(),
            bridge: {
                channel: bridgeChannelName(),
                ready: Boolean(bridgeChannelId),
            },
            danceChannel: danceChannelName(),
        }),
    };
}
