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
    PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
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

export function createDiscordClient() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID;
    const channel = (process.env.TWITCH_CHANNEL || 'teerzo').replace(/^#/, '');

    const state = {
        connected: false,
        user: null,
        guildId: guildId || null,
        guild: null,
    };

    async function connect() {
        if (!token) {
            console.log('DISCORD_TOKEN not set; skipping Discord');
            return;
        }

        const client = new Client({
            intents: [GatewayIntentBits.Guilds],
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
        getStatus: () => ({ ...state, installUrl: buildDiscordInstallUrl() }),
    };
}
