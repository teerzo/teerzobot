import { RefreshingAuthProvider } from '@twurple/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

export const BOT_SCOPES = ['chat:read', 'chat:edit', 'moderator:read:followers'];

const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
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

function pruneStates() {
    const cutoff = Date.now() - STATE_TTL_MS;
    for (const [state, createdAt] of pendingStates) {
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

export function attachOAuthRoutes(app, { getAuthProvider, botUserId }) {
    app.get('/oauth/login', (req, res) => {
        const secret = process.env.OAUTH_SECRET;
        if (secret && req.query.key !== secret) {
            res.status(401).type('html').send(htmlPage('Unauthorized', '<p>Missing or invalid key. Use /oauth/login?key=…</p>'));
            return;
        }

        pruneStates();
        const state = randomBytes(16).toString('hex');
        pendingStates.set(state, Date.now());

        const redirectUri = oauthRedirectUri(req);
        console.log('OAuth authorize redirect_uri', redirectUri);

        const url = new URL('https://id.twitch.tv/oauth2/authorize');
        url.searchParams.set('client_id', requireEnv('CLIENT_ID'));
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope', BOT_SCOPES.join(' '));
        url.searchParams.set('state', state);
        url.searchParams.set('force_verify', 'true');
        res.redirect(url.toString());
    });

    app.get('/oauth/callback', async (req, res) => {
        try {
            const { code, state, error, error_description: errorDescription } = req.query;
            if (error) {
                res.status(400).type('html').send(htmlPage('OAuth error', `<p>${error}: ${errorDescription || ''}</p>`));
                return;
            }

            pruneStates();
            if (!code || !state || !pendingStates.has(String(state))) {
                res.status(400).type('html').send(htmlPage('OAuth error', '<p>Invalid or expired state. Start again at /oauth/login.</p>'));
                return;
            }
            pendingStates.delete(String(state));

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

    const tokenData = await loadTokenData(tokenPath);
    const authProvider = new RefreshingAuthProvider({ clientId, clientSecret });

    authProvider.onRefresh(async (_userId, newTokenData) => {
        await persistToken(tokenPath, newTokenData);
        console.log('Twitch token refreshed');
    });

    authProvider.onRefreshFailure((userId, error) => {
        console.error('Twitch token refresh failed', userId, error);
    });

    authProvider.addUser(botUserId, tokenData, ['chat']);

    return { authProvider, userId: botUserId };
}
