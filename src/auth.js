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

export async function createAuthProvider() {
    const clientId = requireEnv('CLIENT_ID');
    const clientSecret = requireEnv('CLIENT_SECRET');
    const botUserId = requireEnv('BOT_USER_ID');
    const tokenPath = requireEnv('TOKEN_PATH');

    const tokenData = JSON.parse(await fs.readFile(tokenPath, 'utf-8'));
    const authProvider = new RefreshingAuthProvider({ clientId, clientSecret });

    authProvider.onRefresh(async (_userId, newTokenData) => {
        await fs.mkdir(path.dirname(tokenPath), { recursive: true });
        await fs.writeFile(tokenPath, JSON.stringify(newTokenData, null, 4), 'utf-8');
        console.log('Twitch token refreshed');
    });

    authProvider.onRefreshFailure((userId, error) => {
        console.error('Twitch token refresh failed', userId, error);
    });

    authProvider.addUser(botUserId, tokenData, ['chat']);

    return { authProvider, userId: botUserId };
}
