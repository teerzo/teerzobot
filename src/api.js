import express from 'express';
import cors from 'cors';

const NAME_RE = /^[a-z0-9_]+$/;

export function createApi({ getStatus, commands, store }) {
    const app = express();
    const origin = process.env.FRONTEND_ORIGIN || true;

    app.use(cors({ origin }));
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.json({ ok: true });
    });

    app.get('/api/status', (_req, res) => {
        const status = getStatus();
        res.json({
            connected: status.connected,
            channel: status.channel,
            botUserId: process.env.BOT_USER_ID ?? null,
        });
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
