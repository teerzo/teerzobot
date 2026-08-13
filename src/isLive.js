export function formatDuration(ms) {
    const elapsed = Math.max(0, ms);
    const totalMinutes = Math.floor(elapsed / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) {
        parts.push(`${days}d`);
    }
    if (hours || days) {
        parts.push(`${hours}h`);
    }
    parts.push(`${minutes}m`);
    return parts.join(' ');
}

function isAuthError(err) {
    const status = err?.status ?? err?.statusCode;
    return status === 401 || status === 403;
}

export function createTwitchApi(api, { channel, botUserId }) {
    let broadcasterIdPromise;

    async function getBroadcasterId() {
        if (!broadcasterIdPromise) {
            broadcasterIdPromise = api.users.getUserByName(channel).then((user) => {
                if (!user) {
                    throw new Error(`Twitch user not found: ${channel}`);
                }
                return user.id;
            });
        }
        return broadcasterIdPromise;
    }

    return {
        async getStream() {
            return api.streams.getStreamByUserName(channel);
        },
        async getChannel() {
            const broadcasterId = await getBroadcasterId();
            return api.channels.getChannelInfoById(broadcasterId);
        },
        async getFollowage(viewerId) {
            const broadcasterId = await getBroadcasterId();
            try {
                const result = await api.asUser(botUserId, (ctx) =>
                    ctx.channels.getChannelFollowers(broadcasterId, viewerId),
                );
                return result.data[0]?.followDate ?? null;
            } catch (err) {
                if (isAuthError(err)) {
                    const scoped = new Error('FOLLOWAGE_SCOPE');
                    scoped.code = 'FOLLOWAGE_SCOPE';
                    throw scoped;
                }
                throw err;
            }
        },
    };
}
