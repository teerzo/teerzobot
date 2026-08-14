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
let twitchApi = null;
let authProviderRef = null;

const commands = createCommandHandler(store, {
    getTwitch: () => twitchApi,
    obs,
    getNowPlaying: () => nowPlaying.get(),
    dvd,
    dance,
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
    }),
    commands,
    store,
    obs,
    chatFeed,
    nowPlaying,
    alerts,
    dvd,
    dance,
    getAuthProvider: () => authProviderRef,
});

app.listen(port, '0.0.0.0', async () => {
    console.log(`API listening on port ${port}`);

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
                    isMod: ctx.isMod,
                    isBroadcaster: ctx.isBroadcaster,
                });
                return commands.handleMessage(ctx);
            },
            onBotMessage: (event) => chatFeed.emit(event),
            getThirdPartyEmote: (name) => ffz.lookup(name),
        });
        await chat.connect();
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
