import { ApiClient } from '@twurple/api';
import { createAuthProvider } from './auth.js';
import { createChatClient } from './chat.js';
import { createStore } from './store.js';
import { createCommandHandler } from './commands.js';
import { createApi } from './api.js';
import { createTwitchApi } from './isLive.js';
import { createChatFeed, createObs } from './obs.js';
import { createNowPlaying } from './nowPlaying.js';

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
let twitchApi = null;

const commands = createCommandHandler(store, {
    getTwitch: () => twitchApi,
    obs,
    getNowPlaying: () => nowPlaying.get(),
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
    }),
    commands,
    store,
    obs,
    chatFeed,
    nowPlaying,
});

app.listen(port, '0.0.0.0', async () => {
    console.log(`API listening on port ${port}`);

    try {
        const { authProvider, userId } = await createAuthProvider();
        twitchApi = createTwitchApi(new ApiClient({ authProvider }), {
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
                    isMod: ctx.isMod,
                    isBroadcaster: ctx.isBroadcaster,
                });
                return commands.handleMessage(ctx);
            },
        });
        await chat.connect();
    } catch (err) {
        console.error('Failed to connect to Twitch chat', err);
    }
});
