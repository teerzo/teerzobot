import {
    ActivityType,
    Client,
    Events,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
} from 'discord.js';

const pingCommand = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')
    .toJSON();

async function registerCommands(token, clientId, guildId) {
    const rest = new REST({ version: '10' }).setToken(token);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [pingCommand],
    });
    console.log('Registered Discord slash command /ping');
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

            if (!clientId || !guildId) {
                console.log('DISCORD_CLIENT_ID or DISCORD_GUILD_ID missing; skipping slash command registration');
                return;
            }

            try {
                await registerCommands(token, clientId, guildId);
            } catch (err) {
                console.error('Failed to register Discord slash commands', err);
            }
        });

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand() || interaction.commandName !== 'ping') {
                return;
            }
            try {
                await interaction.reply('Pong!');
            } catch (err) {
                console.error('Discord /ping failed', err);
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
        getStatus: () => ({ ...state }),
    };
}
