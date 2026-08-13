import { createAuthProvider } from './auth.js';
import { createChatClient } from './chat.js';
import { createStore } from './store.js';
import { createCommandHandler } from './commands.js';
import { createApi } from './api.js';

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
const commands = createCommandHandler(store);

let chat = {
    getStatus: () => ({ connected: false, channel }),
};

const app = createApi({
    getStatus: () => chat.getStatus(),
    commands,
    store,
});

app.listen(port, '0.0.0.0', async () => {
    console.log(`API listening on port ${port}`);

    try {
        const { authProvider } = await createAuthProvider();
        chat = createChatClient(authProvider, {
            channel,
            onMessage: (ctx) => commands.handleMessage(ctx),
        });
        await chat.connect();
    } catch (err) {
        console.error('Failed to connect to Twitch chat', err);
    }
});
