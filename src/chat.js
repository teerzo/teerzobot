import { ChatClient, buildEmoteImageUrl, parseChatMessage } from '@twurple/chat';

function applyThirdPartyEmotes(text, lookup) {
    if (!text) {
        return [];
    }
    if (!lookup) {
        return [{ type: 'text', text }];
    }

    return text.split(/(\s+)/).flatMap((token) => {
        if (!token) {
            return [];
        }
        const emote = lookup(token);
        return emote ? [emote] : [{ type: 'text', text: token }];
    });
}

function serializeMessageParts(text, emoteOffsets, lookup) {
    return parseChatMessage(text, emoteOffsets ?? new Map()).flatMap((part) => {
        if (part.type === 'emote') {
            return [
                {
                    type: 'emote',
                    id: part.id,
                    name: part.name,
                    url: buildEmoteImageUrl(part.id, {
                        animationSettings: 'default',
                        backgroundType: 'dark',
                        size: '2.0',
                    }),
                },
            ];
        }
        if (part.type === 'cheer') {
            return [{ type: 'text', text: `${part.name}${part.amount}` }];
        }
        return applyThirdPartyEmotes(part.text, lookup);
    });
}

export function createChatClient(authProvider, {
    channel,
    onMessage,
    onBotMessage,
    onMessageRemove,
    onUserClear,
    onChatClear,
    getThirdPartyEmote,
}) {
    const state = {
        connected: false,
        channel,
    };

    const chatClient = new ChatClient({
        authProvider,
        channels: [channel],
    });

    const botName = (process.env.BOT_USERNAME || 'teerzobot').toLowerCase();

    function emitBotMessage(text) {
        onBotMessage?.({
            type: 'chat',
            user: botName,
            displayName: process.env.BOT_USERNAME || 'teerzobot',
            text,
            parts: serializeMessageParts(text, new Map(), getThirdPartyEmote),
            isBot: true,
            isMod: true,
            isBroadcaster: false,
        });
    }

    function say(chan, text, ...rest) {
        emitBotMessage(text);
        return chatClient.say(chan, text, ...rest);
    }

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
        say(joinedChannel, 'Connected').catch((err) => {
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
                messageId: msg.id,
                isMod: msg.userInfo.isMod,
                isBroadcaster: msg.userInfo.isBroadcaster,
                text,
                parts: serializeMessageParts(text, msg.emoteOffsets, getThirdPartyEmote),
                msg,
                say,
            });
        } catch (err) {
            console.error('Error handling chat message', err);
        }
    });

    chatClient.onMessageRemove((_chan, messageId) => {
        try {
            onMessageRemove?.({ messageId });
        } catch (err) {
            console.error('Error handling chat message remove', err);
        }
    });

    chatClient.onTimeout((_chan, user) => {
        try {
            onUserClear?.({ user });
        } catch (err) {
            console.error('Error handling chat timeout', err);
        }
    });

    chatClient.onBan((_chan, user) => {
        try {
            onUserClear?.({ user });
        } catch (err) {
            console.error('Error handling chat ban', err);
        }
    });

    chatClient.onChatClear(() => {
        try {
            onChatClear?.();
        } catch (err) {
            console.error('Error handling chat clear', err);
        }
    });

    return {
        getStatus: () => ({ ...state }),
        connect: () => chatClient.connect(),
        say: (text) => say(channel, text),
    };
}
