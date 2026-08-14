import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeTrack } from './nowPlaying.js';
import { attachOAuthRoutes } from './auth.js';
import { attachDiscordRoutes } from './discord.js';

function corsOrigin() {
    const frontend = process.env.FRONTEND_ORIGIN;
    return (origin, callback) => {
        if (!origin || !frontend) {
            callback(null, true);
            return;
        }
        if (origin === frontend || origin.startsWith('chrome-extension://')) {
            callback(null, true);
            return;
        }
        callback(null, false);
    };
}

function nowPlayingAuthorized(req) {
    const secret = process.env.NOW_PLAYING_SECRET;
    if (!secret) {
        return true;
    }
    const header = req.get('x-now-playing-key') || String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    return header === secret;
}

const NAME_RE = /^[a-z0-9_]+$/;
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

function attachSse(app, route, hub) {
    app.get(route, (req, res) => {
        if (!hub) {
            res.status(503).json({ error: 'Events are not available' });
            return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        req.socket.setTimeout(0);
        const unsubscribe = hub.subscribe(res);
        const heartbeat = setInterval(() => {
            res.write(': ping\n\n');
        }, 15000);

        req.on('close', () => {
            clearInterval(heartbeat);
            unsubscribe();
        });
    });
}

function normalizeGifUrl(value) {
    const url = String(value ?? '').trim();
    if (!url) {
        return null;
    }
    if (url.startsWith('/') && !url.startsWith('//')) {
        return url;
    }
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch {
        return null;
    }
    return null;
}

export function createApi({ getStatus, commands, store, obs, chatFeed, nowPlaying, alerts, dvd, dance, ttt, getAuthProvider, getTwitch }) {
    const app = express();
    app.set('trust proxy', 1);

    app.use(cors({ origin: corsOrigin() }));
    app.use(express.json());

    attachOAuthRoutes(app, {
        getAuthProvider,
        botUserId: process.env.BOT_USER_ID,
    });
    attachDiscordRoutes(app);

    app.get('/health', (_req, res) => {
        res.json({ ok: true });
    });

    app.get('/api/status', (_req, res) => {
        const status = getStatus();
        res.json({
            connected: status.connected,
            channel: status.channel,
            botUserId: process.env.BOT_USER_ID ?? null,
            botUsername: process.env.BOT_USERNAME ?? null,
            obs: status.obs ?? { webhook: false, listeners: 0 },
            chat: status.chat ?? { listeners: 0 },
            nowPlaying: status.nowPlaying ?? { listeners: 0, track: null },
            alerts: status.alerts ?? { listeners: 0 },
            dvd: status.dvd ?? { listeners: 0, speed: 1 },
            dance: status.dance ?? { listeners: 0 },
            ttt: status.ttt ?? { listeners: 0 },
            discord: status.discord ?? { connected: false },
        });
    });

    function sendManage(_req, res) {
        res.sendFile(path.join(publicDir, 'manage.html'));
    }

    app.get('/', sendManage);
    app.get('/manage', sendManage);
    app.get('/manage/overlays', (_req, res) => {
        res.sendFile(path.join(publicDir, 'overlays.html'));
    });
    app.get('/manage/dance', (_req, res) => {
        res.sendFile(path.join(publicDir, 'dance-queue.html'));
    });
    app.get('/manage/account', (_req, res) => {
        res.sendFile(path.join(publicDir, 'account.html'));
    });
    app.get('/manage/followers', (_req, res) => {
        res.sendFile(path.join(publicDir, 'followers.html'));
    });
    app.use(express.static(publicDir, { index: false }));

    app.get('/obs', (_req, res) => {
        res.sendFile(path.join(publicDir, 'obs.html'));
    });

    app.get('/chat', (_req, res) => {
        res.sendFile(path.join(publicDir, 'chat.html'));
    });

    app.get('/now-playing', (_req, res) => {
        res.sendFile(path.join(publicDir, 'now-playing.html'));
    });

    app.get('/alerts', (_req, res) => {
        res.sendFile(path.join(publicDir, 'alerts.html'));
    });

    app.get('/dvd', (_req, res) => {
        res.sendFile(path.join(publicDir, 'dvd.html'));
    });

    app.get('/dance', (_req, res) => {
        res.sendFile(path.join(publicDir, 'dance.html'));
    });

    app.get('/ttt', (_req, res) => {
        res.sendFile(path.join(publicDir, 'ttt.html'));
    });

    app.use('/gifs', express.static(dance?.getDir() || path.join(publicDir, 'gifs')));

    app.get('/api/obs/config', (_req, res) => {
        res.json(obs?.getConfig() ?? { scenes: {} });
    });

    attachSse(app, '/api/obs/events', obs);
    attachSse(app, '/api/chat/events', chatFeed);
    attachSse(app, '/api/now-playing/events', nowPlaying);
    attachSse(app, '/api/alerts/events', alerts);
    attachSse(app, '/api/dvd/events', dvd);
    attachSse(app, '/api/dance/events', dance);
    attachSse(app, '/api/ttt/events', ttt);

    app.get('/api/ttt', (_req, res) => {
        res.json(ttt?.get() ?? { board: Array(9).fill('') });
    });

    app.post('/api/ttt/clear', (_req, res) => {
        if (!ttt) {
            res.status(503).json({ error: 'Tic-tac-toe overlay is not available' });
            return;
        }
        res.json(ttt.clear());
    });

    app.post('/api/dvd/clear', (_req, res) => {
        if (!dvd) {
            res.status(503).json({ error: 'DVD overlay is not available' });
            return;
        }
        res.json(dvd.clear());
    });

    app.post('/api/dance/clear', (_req, res) => {
        if (!dance) {
            res.status(503).json({ error: 'Dance overlay is not available' });
            return;
        }
        res.json(dance.clear());
    });

    app.get('/api/dance', async (_req, res) => {
        if (!dance) {
            res.status(503).json({ error: 'Dance overlay is not available' });
            return;
        }
        res.json({ items: await dance.list() });
    });

    app.get('/api/dance/pending', async (_req, res) => {
        if (!dance) {
            res.status(503).json({ error: 'Dance overlay is not available' });
            return;
        }
        res.json({ items: await dance.listPending() });
    });

    function sendDanceError(err, res) {
        if (err.code === 'INVALID_URL') {
            res.status(400).json({ error: 'url must be http or https' });
            return true;
        }
        if (err.code === 'NOT_IMAGE') {
            res.status(400).json({ error: 'URL is not a gif, png, jpg, or webp' });
            return true;
        }
        if (err.code === 'TOO_LARGE') {
            res.status(413).json({ error: 'Image is too large' });
            return true;
        }
        if (err.code === 'FETCH_FAILED') {
            res.status(502).json({ error: 'Could not download the image' });
            return true;
        }
        if (err.code === 'ALREADY_PENDING') {
            res.status(409).json({ error: 'That GIF is already waiting for approval' });
            return true;
        }
        if (err.code === 'NOT_FOUND') {
            res.status(404).json({ error: 'Pending GIF not found' });
            return true;
        }
        return false;
    }

    app.post('/api/dance/pending/:id/approve', async (req, res) => {
        if (!dance) {
            res.status(503).json({ error: 'Dance overlay is not available' });
            return;
        }
        try {
            res.json(await dance.approve(req.params.id));
        } catch (err) {
            if (!sendDanceError(err, res)) {
                throw err;
            }
        }
    });

    app.post('/api/dance/pending/:id/reject', async (req, res) => {
        if (!dance) {
            res.status(503).json({ error: 'Dance overlay is not available' });
            return;
        }
        try {
            res.json(await dance.reject(req.params.id));
        } catch (err) {
            if (!sendDanceError(err, res)) {
                throw err;
            }
        }
    });

    app.post('/api/dance', async (req, res) => {
        if (!dance) {
            res.status(503).json({ error: 'Dance overlay is not available' });
            return;
        }

        const url = normalizeGifUrl(req.body?.url);
        if (!url) {
            res.status(400).json({ error: 'url is required' });
            return;
        }

        const duration = Number(req.body?.duration);
        const size = Number(req.body?.size);
        const x = req.body?.x == null ? undefined : Number(req.body.x);
        const y = req.body?.y == null ? undefined : Number(req.body.y);
        const extra = {
            duration: Number.isFinite(duration) ? duration : undefined,
            size: Number.isFinite(size) ? size : undefined,
            x: Number.isFinite(x) ? x : undefined,
            y: Number.isFinite(y) ? y : undefined,
        };

        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                const item = await dance.queueFromUrl({ url, ...extra });
                res.json(item);
            } catch (err) {
                if (!sendDanceError(err, res)) {
                    throw err;
                }
            }
            return;
        }

        res.json(dance.emit({
            url,
            ...extra,
        }));
    });

    app.get('/api/dvd', (_req, res) => {
        res.json({ speed: dvd?.get() ?? 1 });
    });

    app.get('/api/alerts/config', (_req, res) => {
        res.json(alerts?.getConfig() ?? { followImage: '' });
    });

    app.get('/api/account', async (_req, res) => {
        const twitch = getTwitch?.();
        if (!twitch) {
            res.status(503).json({ error: 'Twitch is not connected' });
            return;
        }
        try {
            const user = await twitch.getBotUser();
            let scopes = [];
            try {
                const token = await getAuthProvider?.()?.getAccessTokenForUser(String(process.env.BOT_USER_ID || ''));
                scopes = token?.scope ?? [];
            } catch {
                scopes = [];
            }
            res.json({
                id: user.id,
                login: user.name,
                displayName: user.displayName,
                profileImage: user.profilePictureUrl,
                scopes,
            });
        } catch (err) {
            console.error('GET /api/account failed', err);
            res.status(502).json({ error: 'Could not load bot account' });
        }
    });

    app.get('/api/followers', async (req, res) => {
        const twitch = getTwitch?.();
        if (!twitch) {
            res.status(503).json({ error: 'Twitch is not connected' });
            return;
        }
        const after = typeof req.query.after === 'string' ? req.query.after.trim() : '';
        try {
            const page = await twitch.getFollowers({ after: after || undefined });
            res.json({
                items: (page.data || []).map((follower) => ({
                    userId: follower.userId,
                    user: follower.userName,
                    displayName: follower.userDisplayName,
                    followedAt: follower.followDate ? follower.followDate.toISOString() : null,
                })),
                cursor: page.cursor || null,
            });
        } catch (err) {
            if (err.code === 'FOLLOWAGE_SCOPE') {
                res.status(403).json({
                    error: 'Followers are unavailable. The bot needs moderator:read:followers and to be a channel mod.',
                });
                return;
            }
            console.error('GET /api/followers failed', err);
            res.status(502).json({ error: 'Could not load followers' });
        }
    });

    app.get('/api/now-playing', (_req, res) => {
        res.json({ track: nowPlaying?.get() ?? null });
    });

    app.post('/api/now-playing', (req, res) => {
        if (!nowPlaying) {
            res.status(503).json({ error: 'Now playing is not available' });
            return;
        }
        if (!nowPlayingAuthorized(req)) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const track = normalizeTrack(req.body);
        if (!track) {
            res.status(400).json({ error: 'title or artist is required' });
            return;
        }

        res.json({ track: nowPlaying.set(track) });
    });

    app.delete('/api/now-playing', (req, res) => {
        if (!nowPlaying) {
            res.status(503).json({ error: 'Now playing is not available' });
            return;
        }
        if (!nowPlayingAuthorized(req)) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        nowPlaying.clear();
        res.status(204).end();
    });

    app.get('/api/commands', async (_req, res) => {
        res.json({ commands: await commands.list() });
    });

    app.post('/api/commands', async (req, res) => {
        const name = commands.normalizeName(req.body?.name);
        const response = typeof req.body?.response === 'string' ? req.body.response.trim() : '';

        if (!NAME_RE.test(name) || !response) {
            res.status(400).json({
                error: 'name and response are required; name must be letters, numbers, or underscore',
            });
            return;
        }

        if (commands.builtins.some((command) => command.name === name)) {
            res.status(409).json({ error: 'Cannot override a built-in command' });
            return;
        }

        try {
            const created = await store.create({ name, response });
            res.status(201).json(created);
        } catch (err) {
            if (err.code === 'CONFLICT') {
                res.status(409).json({ error: 'Command already exists' });
                return;
            }
            throw err;
        }
    });

    app.patch('/api/commands/:name', async (req, res) => {
        const name = commands.normalizeName(req.params.name);

        if (commands.builtins.some((command) => command.name === name)) {
            res.status(403).json({ error: 'Cannot modify a built-in command' });
            return;
        }

        const response = typeof req.body?.response === 'string' ? req.body.response.trim() : '';
        if (!response) {
            res.status(400).json({ error: 'response is required' });
            return;
        }

        const updated = await store.update(name, { response });
        if (!updated) {
            res.status(404).json({ error: 'Command not found' });
            return;
        }

        res.json(updated);
    });

    app.delete('/api/commands/:name', async (req, res) => {
        const name = commands.normalizeName(req.params.name);

        if (commands.builtins.some((command) => command.name === name)) {
            res.status(403).json({ error: 'Cannot delete a built-in command' });
            return;
        }

        const removed = await store.remove(name);
        if (!removed) {
            res.status(404).json({ error: 'Command not found' });
            return;
        }

        res.status(204).end();
    });

    app.use((err, _req, res, _next) => {
        if (err.status === 400 && err.type === 'entity.parse.failed') {
            res.status(400).json({ error: 'Invalid JSON' });
            return;
        }

        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    });

    return app;
}
