import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeTrack } from './nowPlaying.js';
import { attachOAuthRoutes } from './auth.js';

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

export function createApi({ getStatus, commands, store, obs, chatFeed, nowPlaying, alerts, dvd, getAuthProvider }) {
    const app = express();
    app.set('trust proxy', 1);

    app.use(cors({ origin: corsOrigin() }));
    app.use(express.json());

    attachOAuthRoutes(app, {
        getAuthProvider,
        botUserId: process.env.BOT_USER_ID,
    });

    app.get('/health', (_req, res) => {
        res.json({ ok: true });
    });

    app.get('/api/status', (_req, res) => {
        const status = getStatus();
        res.json({
            connected: status.connected,
            channel: status.channel,
            botUserId: process.env.BOT_USER_ID ?? null,
            obs: status.obs ?? { webhook: false, listeners: 0 },
            chat: status.chat ?? { listeners: 0 },
            nowPlaying: status.nowPlaying ?? { listeners: 0, track: null },
            alerts: status.alerts ?? { listeners: 0 },
            dvd: status.dvd ?? { listeners: 0, speed: 1 },
        });
    });

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

    app.get('/api/obs/config', (_req, res) => {
        res.json(obs?.getConfig() ?? { scenes: {} });
    });

    attachSse(app, '/api/obs/events', obs);
    attachSse(app, '/api/chat/events', chatFeed);
    attachSse(app, '/api/now-playing/events', nowPlaying);
    attachSse(app, '/api/alerts/events', alerts);
    attachSse(app, '/api/dvd/events', dvd);

    app.get('/api/dvd', (_req, res) => {
        res.json({ speed: dvd?.get() ?? 1 });
    });

    app.get('/api/alerts/config', (_req, res) => {
        res.json(alerts?.getConfig() ?? { followImage: '' });
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
