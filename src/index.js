import { ApiClient } from '@twurple/api';
import { createAuthProvider } from './auth.js';
import { createChatClient } from './chat.js';
import { createStore } from './store.js';
import { createCommandHandler } from './commands.js';
import { createApi } from './api.js';
import { createTwitchApi } from './isLive.js';
import { createChatFeed, createObs } from './obs.js';
import { createNowPlaying } from './nowPlaying.js';
import { createFfzEmotes } from './ffz.js';
import { createAlerts } from './alerts.js';
import { createDvd } from './dvd.js';
import { createDance } from './dance.js';
import { createTtt } from './ttt.js';
import { createDungeon } from './dungeon.js';
import { createArtwork } from './artwork.js';
import { createDiscordClient } from './discord.js';
import { startFollowAlerts } from './follows.js';

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}

const port = Number(process.env.PORT) || 3000;
const channel = requireEnv('TWITCH_CHANNEL').replace(/^#/, '');

const store = createStore();
const obs = createObs();
const chatFeed = createChatFeed();
const nowPlaying = createNowPlaying();
const ffz = createFfzEmotes(channel);
const alerts = createAlerts();
const dvd = createDvd();
const dance = createDance();
const ttt = createTtt();
const dungeon = createDungeon();
const artwork = createArtwork();
artwork.setOnChange((urls) => dungeon.setArtwork(urls));
artwork.listUrls().then((urls) => dungeon.setArtwork(urls)).catch((err) => {
    console.error('Failed to load dungeon artwork', err);
});
const discord = createDiscordClient({
    onBridgeMessage: ({ displayName, text }) => {
        if (typeof chat.say !== 'function') {
            return;
        }
        const name = String(displayName || 'discord').replace(/[\r\n]/g, ' ').slice(0, 80);
        const body = String(text || '').replace(/\s+/g, ' ').trim();
        if (!body) {
            return;
        }
        return chat.say(`[Discord] ${name}: ${body}`.slice(0, 500)).catch((err) => {
            console.error('Failed to relay Discord chat to Twitch', err);
        });
    },
    onDanceImage: ({ url, user, displayName }) => dance.queueFromUrl({ url, user, displayName }),
    onArtworkImage: ({ url, silent }) => artwork.addFromUrl(url, { silent }),
    onArtworkReady: () => artwork.flush(),
});
let twitchApi = null;
let authProviderRef = null;

const commands = createCommandHandler(store, {
    getTwitch: () => twitchApi,
    obs,
    getNowPlaying: () => nowPlaying.get(),
    dvd,
    dance,
    ttt,
    dungeon,
    chatFeed,
});

let chat = {
    getStatus: () => ({ connected: false, channel }),
};

const app = createApi({
    getStatus: () => ({
        ...chat.getStatus(),
        obs: obs.getStatus(),
        chat: chatFeed.getStatus(),
        nowPlaying: nowPlaying.getStatus(),
        alerts: alerts.getStatus(),
        dvd: dvd.getStatus(),
        dance: dance.getStatus(),
        ttt: ttt.getStatus(),
        dungeon: dungeon.getStatus(),
        discord: discord.getStatus(),
    }),
    commands,
    store,
    obs,
    chatFeed,
    nowPlaying,
    alerts,
    dvd,
    dance,
    ttt,
    dungeon,
    artwork,
    getAuthProvider: () => authProviderRef,
    getTwitch: () => twitchApi,
});

app.listen(port, '0.0.0.0', async () => {
    console.log(`API listening on port ${port}`);

    try {
        await discord.connect();
    } catch (err) {
        console.error('Failed to connect to Discord', err);
    }

    try {
        const { authProvider, userId } = await createAuthProvider();
        authProviderRef = authProvider;
        const apiClient = new ApiClient({ authProvider });
        twitchApi = createTwitchApi(apiClient, {
            channel,
            botUserId: userId,
        });
        chat = createChatClient(authProvider, {
            channel,
            onMessage: (ctx) => {
                chatFeed.emit({
                    type: 'chat',
                    user: ctx.user,
                    displayName: ctx.displayName,
                    text: ctx.text,
                    parts: ctx.parts,
                    messageId: ctx.messageId,
                    isMod: ctx.isMod,
                    isBroadcaster: ctx.isBroadcaster,
                });
                const botName = (process.env.BOT_USERNAME || 'teerzobot').toLowerCase();
                if (ctx.user.toLowerCase() !== botName) {
                    discord.relayChat({
                        displayName: ctx.displayName || ctx.user,
                        text: ctx.text,
                    }).catch((err) => {
                        console.error('Failed to relay Twitch chat to Discord', err);
                    });
                }
                return commands.handleMessage(ctx);
            },
            onBotMessage: (event) => chatFeed.emit(event),
            onMessageRemove: ({ messageId }) => {
                chatFeed.emit({ type: 'chat-delete', messageId });
            },
            onUserClear: ({ user }) => {
                chatFeed.emit({ type: 'chat-user-clear', user });
            },
            onChatClear: () => {
                chatFeed.emit({ type: 'chat-clear' });
            },
            getThirdPartyEmote: (name) => ffz.lookup(name),
        });
        await chat.connect();
        dungeon.setOnFloorClear(({ previousFloor, floor }) => {
            chat.say(`Floor ${previousFloor} cleared! Entering floor ${floor}.`).catch((err) => {
                console.error('Dungeon floor announce failed', err);
            });
        });
        dungeon.setOnAutoplay(() => {
            chat.say('Dungeon is autoplaying. Chat with !up !down !left !right to take over.').catch((err) => {
                console.error('Dungeon autoplay announce failed', err);
            });
        });
        try {
            await startFollowAlerts({
                apiClient,
                twitchApi,
                botUserId: userId,
                onFollow: ({ displayName, user, userId: followerId }) => {
                    console.log(`New follower: ${displayName}`);
                    alerts.emit({
                        type: 'follow',
                        displayName,
                        user,
                        userId: followerId,
                    });
                    chat.say(`Thanks for the follow, ${displayName}!`).catch((err) => {
                        console.error('Follow thank you failed', err);
                    });
                },
            });
        } catch (err) {
            console.error('Failed to start follow alerts', err);
        }
    } catch (err) {
        console.error('Failed to connect to Twitch chat', err);
    }
});
