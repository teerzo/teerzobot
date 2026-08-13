import { RefreshingAuthProvider } from '@twurple/auth';
import { promises as fs } from 'fs';
import path from 'path';

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
            scope: ['chat:edit', 'chat:read'],
        };
        await persistToken(tokenPath, tokenData);
        console.log(`Seeded Twitch token from env to ${tokenPath}`);
        return tokenData;
    }

    throw new Error(
        `No Twitch token at ${tokenPath}. Set accessToken and refreshToken, or provide a token file.`,
    );
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
