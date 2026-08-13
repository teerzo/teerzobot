import { ChatClient } from '@twurple/chat';

export function createChatClient(authProvider, { channel, onMessage }) {
    const state = {
        connected: false,
        channel,
    };

    const chatClient = new ChatClient({
        authProvider,
        channels: [channel],
    });

    const botName = (process.env.BOT_USERNAME || 'teerzobot').toLowerCase();

    chatClient.onConnect(() => {
        state.connected = true;
        console.log(`Connected to Twitch chat #${channel}`);
    });

    chatClient.onJoin((joinedChannel, user) => {
        const joined = joinedChannel.replace(/^#/, '').toLowerCase();
        if (joined !== channel.toLowerCase() || user.toLowerCase() !== botName) {
            return;
        }

        console.log(`Joined #${channel} as ${user}`);
        chatClient.say(joinedChannel, 'Connected').catch((err) => {
            console.error('Failed to announce connection', err);
        });
    });

    chatClient.onDisconnect((manually, reason) => {
        state.connected = false;
        console.log('Disconnected from Twitch chat', { manually, reason: reason?.message ?? reason });
    });

    chatClient.onAuthenticationFailure((text, retryCount) => {
        console.error('Twitch chat auth failed', text, retryCount);
    });

    chatClient.onMessage(async (chan, user, text, msg) => {
        try {
            await onMessage({
                channel: chan,
                user,
                displayName: msg.userInfo.displayName || user,
                userId: msg.userInfo.userId,
                isMod: msg.userInfo.isMod,
                isBroadcaster: msg.userInfo.isBroadcaster,
                text,
                msg,
                say: chatClient.say.bind(chatClient),
            });
        } catch (err) {
            console.error('Error handling chat message', err);
        }
    });

    return {
        getStatus: () => ({ ...state }),
        connect: () => chatClient.connect(),
    };
}
