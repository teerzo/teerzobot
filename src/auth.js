import { RefreshingAuthProvider } from '@twurple/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

export const BOT_SCOPES = ['chat:read', 'chat:edit', 'moderator:read:followers'];
export const STREAMER_SCOPES = ['channel:manage:broadcast'];

const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}

export function streamerTokenPath() {
    if (process.env.STREAMER_TOKEN_PATH?.trim()) {
        return process.env.STREAMER_TOKEN_PATH.trim();
    }
    const tokenPath = process.env.TOKEN_PATH;
    if (!tokenPath) {
        return './tokens/streamer.token.json';
    }
    return path.join(path.dirname(tokenPath), 'streamer.token.json');
}

async function persistToken(tokenPath, tokenData) {
    try {
        await fs.mkdir(path.dirname(tokenPath), { recursive: true });
        await fs.writeFile(tokenPath, JSON.stringify(tokenData, null, 4), 'utf-8');
    } catch (err) {
        console.warn(`Could not write Twitch token to ${tokenPath}: ${err.message}`);
    }
}

async function loadTokenData(tokenPath) {
    try {
        return JSON.parse(await fs.readFile(tokenPath, 'utf-8'));
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }

    const accessToken = process.env.accessToken;
    const refreshToken = process.env.refreshToken;
    if (accessToken && refreshToken) {
        const tokenData = {
            accessToken,
            refreshToken,
            expiresIn: 0,
            obtainmentTimestamp: 0,
            scope: BOT_SCOPES,
        };
        await persistToken(tokenPath, tokenData);
        console.log(`Seeded Twitch token from env to ${tokenPath}`);
        return tokenData;
    }

    throw new Error(
        `No Twitch token at ${tokenPath}. Set accessToken and refreshToken, visit /oauth/login, or provide a token file.`,
    );
}

async function loadOptionalToken(tokenPath) {
    try {
        return JSON.parse(await fs.readFile(tokenPath, 'utf-8'));
    } catch (err) {
        if (err.code === 'ENOENT') {
            return null;
        }
        throw err;
    }
}

function pruneStates() {
    const cutoff = Date.now() - STATE_TTL_MS;
    for (const [state, entry] of pendingStates) {
        const createdAt = typeof entry === 'number' ? entry : entry.createdAt;
        if (createdAt < cutoff) {
            pendingStates.delete(state);
        }
    }
}

function oauthRedirectUri(req) {
    if (process.env.TWITCH_REDIRECT_URI) {
        return process.env.TWITCH_REDIRECT_URI.replace(/\/$/, '');
    }
    const host = String(req.get('x-forwarded-host') || req.get('host') || '')
        .split(',')[0]
        .trim()
        .replace(/:443$/, '')
        .replace(/:80$/, '');
    const forwarded = String(req.get('x-forwarded-proto') || '')
        .split(',')[0]
        .trim();
    let proto = forwarded || req.protocol || 'http';
    if (host.endsWith('railway.app') || host.endsWith('railway.internal')) {
        proto = 'https';
    }
    return `${proto}://${host}/oauth/callback`;
}

function htmlPage(title, body) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font:16px/1.4 sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;color:#eee;background:#111}</style>
</head><body>${body}</body></html>`;
}

function beginOAuth(req, res, { intent, scopes, loginHint }) {
    const secret = process.env.OAUTH_SECRET;
    if (secret && req.query.key !== secret) {
        res.status(401).type('html').send(
            htmlPage('Unauthorized', `<p>Missing or invalid key. Use ${loginHint}?key=…</p>`),
        );
        return;
    }

    pruneStates();
    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, { intent, createdAt: Date.now() });

    const redirectUri = oauthRedirectUri(req);
    console.log('OAuth authorize redirect_uri', redirectUri, 'intent', intent);

    const url = new URL('https://id.twitch.tv/oauth2/authorize');
    url.searchParams.set('client_id', requireEnv('CLIENT_ID'));
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('force_verify', 'true');
    res.redirect(url.toString());
}

export function attachOAuthRoutes(app, { getAuthProvider, botUserId }) {
    app.get('/oauth/login', (req, res) => {
        beginOAuth(req, res, {
            intent: 'bot',
            scopes: BOT_SCOPES,
            loginHint: '/oauth/login',
        });
    });

    app.get('/oauth/streamer', (req, res) => {
        beginOAuth(req, res, {
            intent: 'streamer',
            scopes: STREAMER_SCOPES,
            loginHint: '/oauth/streamer',
        });
    });

    app.get('/oauth/callback', async (req, res) => {
        try {
            const { code, state, error, error_description: errorDescription } = req.query;
            if (error) {
                res.status(400).type('html').send(htmlPage('OAuth error', `<p>${error}: ${errorDescription || ''}</p>`));
                return;
            }

            pruneStates();
            const pending = pendingStates.get(String(state));
            if (!code || !state || !pending) {
                res.status(400).type('html').send(htmlPage('OAuth error', '<p>Invalid or expired state. Start again at /oauth/login.</p>'));
                return;
            }
            pendingStates.delete(String(state));
            const intent = pending.intent || 'bot';

            const redirectUri = oauthRedirectUri(req);
            const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: requireEnv('CLIENT_ID'),
                    client_secret: requireEnv('CLIENT_SECRET'),
                    code: String(code),
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri,
                }),
            });
            const tokenJson = await tokenRes.json();
            if (!tokenRes.ok || !tokenJson.access_token || !tokenJson.refresh_token) {
                throw new Error(tokenJson.message || tokenJson.status || 'Token exchange failed');
            }

            const validateRes = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: { Authorization: `OAuth ${tokenJson.access_token}` },
            });
            const identity = await validateRes.json();
            if (!validateRes.ok) {
                throw new Error(identity.message || 'Token validate failed');
            }

            if (intent === 'streamer') {
                const channel = String(process.env.TWITCH_CHANNEL || '')
                    .replace(/^#/, '')
                    .trim()
                    .toLowerCase();
                if (!channel || String(identity.login).toLowerCase() !== channel) {
                    res.status(403).type('html').send(
                        htmlPage(
                            'Wrong account',
                            `<p>Logged in as <strong>${identity.login}</strong>. Log in as <strong>${channel || 'TWITCH_CHANNEL'}</strong> (the broadcaster) and try again.</p>`,
                        ),
                    );
                    return;
                }

                const tokenData = {
                    accessToken: tokenJson.access_token,
                    refreshToken: tokenJson.refresh_token,
                    expiresIn: Number(tokenJson.expires_in) || 0,
                    obtainmentTimestamp: Date.now(),
                    scope: Array.isArray(tokenJson.scope) ? tokenJson.scope : STREAMER_SCOPES,
                    userId: String(identity.user_id),
                    login: identity.login,
                };

                const tokenPath = streamerTokenPath();
                await persistToken(tokenPath, tokenData);

                const authProvider = getAuthProvider?.();
                authProvider?.addUser(String(identity.user_id), tokenData);
                console.log(`Streamer OAuth token saved for ${identity.login}`);

                res.type('html').send(
                    htmlPage(
                        'Streamer authorized',
                        `<p>Authorized <strong>${identity.login}</strong> with scopes: ${(tokenData.scope || []).join(', ')}.</p>
<p>Mods can now use <code>!game</code> and <code>!title</code> with arguments to update the stream.</p>`,
                    ),
                );
                return;
            }

            const expectedId = String(botUserId || process.env.BOT_USER_ID);
            if (String(identity.user_id) !== expectedId) {
                res.status(403).type('html').send(
                    htmlPage(
                        'Wrong account',
                        `<p>Logged in as <strong>${identity.login}</strong> (id ${identity.user_id}). Log in as teerzobot (id ${expectedId}) and try again.</p>`,
                    ),
                );
                return;
            }

            const tokenData = {
                accessToken: tokenJson.access_token,
                refreshToken: tokenJson.refresh_token,
                expiresIn: Number(tokenJson.expires_in) || 0,
                obtainmentTimestamp: Date.now(),
                scope: Array.isArray(tokenJson.scope) ? tokenJson.scope : BOT_SCOPES,
            };

            const tokenPath = requireEnv('TOKEN_PATH');
            await persistToken(tokenPath, tokenData);

            const authProvider = getAuthProvider?.();
            authProvider?.addUser(expectedId, tokenData, ['chat']);
            console.log(`OAuth token saved for ${identity.login}; restart so follow alerts pick up new scopes`);

            res.type('html').send(
                htmlPage(
                    'Bot authorized',
                    `<p>Authorized <strong>${identity.login}</strong> with scopes: ${(tokenData.scope || []).join(', ')}.</p>
<p>Restart the bot so follow alerts reconnect with the new token.</p>`,
                ),
            );
        } catch (err) {
            console.error('OAuth callback failed', err);
            res.status(500).type('html').send(htmlPage('OAuth error', `<p>${err.message || 'Authorization failed'}</p>`));
        }
    });
}

export async function createAuthProvider() {
    const clientId = requireEnv('CLIENT_ID');
    const clientSecret = requireEnv('CLIENT_SECRET');
    const botUserId = requireEnv('BOT_USER_ID');
    const tokenPath = requireEnv('TOKEN_PATH');
    const streamerPath = streamerTokenPath();

    const tokenData = await loadTokenData(tokenPath);
    const streamerData = await loadOptionalToken(streamerPath);
    const authProvider = new RefreshingAuthProvider({ clientId, clientSecret });

    let streamerUserId = streamerData?.userId ? String(streamerData.userId) : null;

    authProvider.onRefresh(async (userId, newTokenData) => {
        if (String(userId) === String(botUserId)) {
            await persistToken(tokenPath, newTokenData);
            console.log('Twitch bot token refreshed');
            return;
        }
        if (streamerUserId && String(userId) === streamerUserId) {
            await persistToken(streamerPath, {
                ...newTokenData,
                userId: streamerUserId,
                login: streamerData?.login,
            });
            console.log('Twitch streamer token refreshed');
            return;
        }
        console.log(`Twitch token refreshed for unknown user ${userId}`);
    });

    authProvider.onRefreshFailure((userId, error) => {
        console.error('Twitch token refresh failed', userId, error);
    });

    authProvider.addUser(botUserId, tokenData, ['chat']);

    if (streamerData?.accessToken && streamerData?.refreshToken) {
        streamerUserId = streamerUserId || String(streamerData.userId || '');
        if (streamerUserId) {
            authProvider.addUser(streamerUserId, streamerData);
            console.log(`Loaded streamer token for user ${streamerUserId}`);
        } else {
            console.warn('Streamer token file is missing userId; re-auth at /oauth/streamer');
        }
    }

    return { authProvider, userId: botUserId, streamerUserId };
}
