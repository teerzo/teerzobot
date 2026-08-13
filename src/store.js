import { promises as fs } from 'fs';
import path from 'path';

export function createStore(filePath = process.env.COMMANDS_PATH || './data/commands.json') {
    async function read() {
        try {
            const raw = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        } catch (err) {
            if (err.code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    }

    async function write(commands) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, `${JSON.stringify(commands, null, 2)}\n`, 'utf-8');
    }

    return {
        list: read,
        async get(name) {
            const all = await read();
            return all.find((command) => command.name === name) ?? null;
        },
        async create(command) {
            const all = await read();
            if (all.some((existing) => existing.name === command.name)) {
                const err = new Error('Command already exists');
                err.code = 'CONFLICT';
                throw err;
            }
            all.push(command);
            await write(all);
            return command;
        },
        async update(name, patch) {
            const all = await read();
            const index = all.findIndex((command) => command.name === name);
            if (index === -1) {
                return null;
            }
            all[index] = { ...all[index], ...patch, name };
            await write(all);
            return all[index];
        },
        async remove(name) {
            const all = await read();
            const next = all.filter((command) => command.name !== name);
            if (next.length === all.length) {
                return false;
            }
            await write(next);
            return true;
        },
    };
}
