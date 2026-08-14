import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createSseHub } from './sse.js';

const MAX_BYTES = 8 * 1024 * 1024;
const FETCH_MS = 10_000;
const INDEX_NAME = 'gifs.json';
const PENDING_NAME = 'pending.json';
const PUBLIC_PREFIX = '/gifs';

const CONTENT_TYPES = {
    'image/gif': 'gif',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
};

function fail(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
}

function defaultDir() {
    return process.env.DANCE_PATH || './data/gifs';
}

function parseImageUrl(value) {
    const raw = String(value ?? '')
        .trim()
        .replace(/^<|>$/g, '');
    let parsed;
    try {
        parsed = new URL(raw);
    } catch {
        return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
    }

    const host = parsed.hostname.toLowerCase();
    if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.endsWith('.local') ||
        host === '169.254.169.254' ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
        return null;
    }

    return parsed.href;
}

function extensionFromType(contentType) {
    const type = String(contentType || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
    return CONTENT_TYPES[type] || null;
}

function extensionFromBytes(bytes) {
    if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return 'gif';
    }
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        return 'png';
    }
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'jpg';
    }
    if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    ) {
        return 'webp';
    }
    return null;
}

async function readBody(res) {
    const length = Number(res.headers.get('content-length'));
    if (Number.isFinite(length) && length > MAX_BYTES) {
        throw fail('TOO_LARGE', 'Image is too large');
    }

    if (!res.body) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > MAX_BYTES) {
            throw fail('TOO_LARGE', 'Image is too large');
        }
        return buffer;
    }

    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        total += value.byteLength;
        if (total > MAX_BYTES) {
            await reader.cancel();
            throw fail('TOO_LARGE', 'Image is too large');
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

export function createDance(dirPath = defaultDir()) {
    const hub = createSseHub({ defaultType: 'dance' });
    const dir = path.resolve(dirPath);
    const indexPath = path.join(dir, INDEX_NAME);
    const pendingPath = path.join(dir, PENDING_NAME);
    let itemsPromise;
    let pendingPromise;
    fs.mkdir(dir, { recursive: true }).catch((err) => {
        console.error('Failed to create dance GIF folder', err);
    });

    async function readIndex() {
        try {
            const raw = await fs.readFile(indexPath, 'utf-8');
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        } catch (err) {
            if (err.code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    }

    async function writeIndex(items) {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(indexPath, `${JSON.stringify(items, null, 2)}\n`, 'utf-8');
    }

    async function withIndex(mutator) {
        if (!itemsPromise) {
            itemsPromise = readIndex();
        }
        const items = await itemsPromise;
        const result = await mutator(items);
        itemsPromise = Promise.resolve(items);
        return result;
    }

    async function readPending() {
        try {
            const raw = await fs.readFile(pendingPath, 'utf-8');
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        } catch (err) {
            if (err.code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    }

    async function writePending(items) {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(pendingPath, `${JSON.stringify(items, null, 2)}\n`, 'utf-8');
    }

    async function withPending(mutator) {
        if (!pendingPromise) {
            pendingPromise = readPending();
        }
        const items = await pendingPromise;
        const result = await mutator(items);
        pendingPromise = Promise.resolve(items);
        return result;
    }

    function emitGif(event) {
        return hub.emit({
            type: 'gif',
            url: event.url,
            duration: event.duration,
            size: event.size,
            x: event.x,
            y: event.y,
        });
    }

    async function emitQueue() {
        const pending = await withPending(async (items) => [...items]);
        return hub.emit({ type: 'queue', pending });
    }

    async function saveImage(sourceUrl, { user, displayName } = {}) {
        const approved = await withIndex(async (items) => items.find((item) => item.sourceUrl === sourceUrl));
        if (approved) {
            return { ...approved };
        }

        let res;
        try {
            res = await fetch(sourceUrl, {
                redirect: 'follow',
                signal: AbortSignal.timeout(FETCH_MS),
                headers: { 'user-agent': 'teerzobot-dance' },
            });
        } catch {
            throw fail('FETCH_FAILED', 'Could not download the image');
        }

        if (!res.ok) {
            throw fail('FETCH_FAILED', 'Could not download the image');
        }

        const bytes = await readBody(res);
        const ext = extensionFromBytes(bytes) || extensionFromType(res.headers.get('content-type'));
        if (!ext) {
            throw fail('NOT_IMAGE', 'URL is not a gif, png, jpg, or webp');
        }

        const id = randomUUID();
        const filename = `${id}.${ext}`;
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, filename), bytes);

        return {
            id,
            filename,
            url: `${PUBLIC_PREFIX}/${filename}`,
            sourceUrl,
            user: user || null,
            displayName: displayName || null,
            at: new Date().toISOString(),
        };
    }

    async function queueFromUrl({ url, user, displayName } = {}) {
        const sourceUrl = parseImageUrl(url);
        if (!sourceUrl) {
            throw fail('INVALID_URL', 'url must be http or https');
        }

        const already = await withPending(async (items) => items.find((item) => item.sourceUrl === sourceUrl));
        if (already) {
            throw fail('ALREADY_PENDING', 'That GIF is already waiting for approval');
        }

        const item = await saveImage(sourceUrl, { user, displayName });
        await withPending(async (items) => {
            items.push(item);
            await writePending(items);
        });
        await emitQueue();
        return item;
    }

    async function approve(id) {
        const item = await withPending(async (items) => {
            const index = items.findIndex((entry) => entry.id === id);
            if (index === -1) {
                return null;
            }
            const [pending] = items.splice(index, 1);
            await writePending(items);
            return pending;
        });
        if (!item) {
            throw fail('NOT_FOUND', 'Pending GIF not found');
        }

        await withIndex(async (items) => {
            if (!items.some((entry) => entry.id === item.id || entry.sourceUrl === item.sourceUrl)) {
                items.push(item);
                await writeIndex(items);
            }
        });
        emitGif({ url: item.url });
        await emitQueue();
        return item;
    }

    async function reject(id) {
        const item = await withPending(async (items) => {
            const index = items.findIndex((entry) => entry.id === id);
            if (index === -1) {
                return null;
            }
            const [pending] = items.splice(index, 1);
            await writePending(items);
            return pending;
        });
        if (!item) {
            throw fail('NOT_FOUND', 'Pending GIF not found');
        }

        const kept = await withIndex(async (items) =>
            items.some((entry) => entry.filename === item.filename),
        );
        if (!kept && item.filename) {
            await fs.unlink(path.join(dir, item.filename)).catch(() => {});
        }
        await emitQueue();
        return item;
    }

    return {
        emit: emitGif,
        subscribe: hub.subscribe,
        getDir: () => dir,
        getStatus: () => ({ listeners: hub.listenerCount }),
        async list() {
            return withIndex(async (items) => [...items]);
        },
        async listPending() {
            return withPending(async (items) => [...items]);
        },
        queueFromUrl,
        addFromUrl: queueFromUrl,
        approve,
        reject,
        removeRandom() {
            return hub.emit({ type: 'remove-random' });
        },
    };
}
