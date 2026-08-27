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
    if (status === 401 || status === 403) {
        return true;
    }
    const message = String(err?.message || err || '').toLowerCase();
    return message.includes('not added to the provider') || message.includes('no user access token');
}

function scopedError(code) {
    const err = new Error(code);
    err.code = code;
    return err;
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
                    throw scopedError('FOLLOWAGE_SCOPE');
                }
                throw err;
            }
        },
        async getFollowers({ after } = {}) {
            const broadcasterId = await getBroadcasterId();
            try {
                return await api.asUser(botUserId, (ctx) =>
                    ctx.channels.getChannelFollowers(broadcasterId, undefined, {
                        after: after || undefined,
                        limit: 50,
                    }),
                );
            } catch (err) {
                if (isAuthError(err)) {
                    throw scopedError('FOLLOWAGE_SCOPE');
                }
                throw err;
            }
        },
        async setGame(name) {
            const query = String(name ?? '').trim();
            if (!query) {
                throw scopedError('USAGE');
            }
            const broadcasterId = await getBroadcasterId();
            try {
                const result = await api.asUser(broadcasterId, (ctx) =>
                    ctx.search.searchCategories(query, { limit: 20 }),
                );
                const games = result?.data ?? [];
                if (!games.length) {
                    throw scopedError('GAME_NOT_FOUND');
                }
                const needle = query.toLowerCase();
                const exact = games.find((game) => String(game.name).toLowerCase() === needle);
                const game = exact || games[0];
                await api.asUser(broadcasterId, (ctx) =>
                    ctx.channels.updateChannelInfo(broadcasterId, { gameId: game.id }),
                );
                return { gameName: game.name, gameId: game.id };
            } catch (err) {
                if (err.code === 'GAME_NOT_FOUND' || err.code === 'USAGE') {
                    throw err;
                }
                if (isAuthError(err)) {
                    throw scopedError('BROADCAST_SCOPE');
                }
                throw err;
            }
        },
        async setTitle(title) {
            const next = String(title ?? '').trim();
            if (!next) {
                throw scopedError('USAGE');
            }
            const broadcasterId = await getBroadcasterId();
            try {
                await api.asUser(broadcasterId, (ctx) =>
                    ctx.channels.updateChannelInfo(broadcasterId, { title: next }),
                );
                return { title: next };
            } catch (err) {
                if (err.code === 'USAGE') {
                    throw err;
                }
                if (isAuthError(err)) {
                    throw scopedError('BROADCAST_SCOPE');
                }
                throw err;
            }
        },
        async getBotUser() {
            const user = await api.users.getUserById(botUserId);
            if (!user) {
                throw new Error('Bot user not found');
            }
            return user;
        },
        getBroadcasterId,
    };
}
