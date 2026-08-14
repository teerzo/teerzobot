import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createSseHub } from './sse.js';

const MAX_BYTES = 8 * 1024 * 1024;
const FETCH_MS = 10_000;
const INDEX_NAME = 'gifs.json';
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
    let itemsPromise;
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

    async function addFromUrl({ url, user, displayName, duration, size, x, y } = {}) {
        const sourceUrl = parseImageUrl(url);
        if (!sourceUrl) {
            throw fail('INVALID_URL', 'url must be http or https');
        }

        const existing = await withIndex(async (items) => items.find((item) => item.sourceUrl === sourceUrl));
        if (existing) {
            emitGif({
                url: existing.url,
                duration,
                size,
                x,
                y,
            });
            return existing;
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

        const item = {
            id,
            filename,
            url: `${PUBLIC_PREFIX}/${filename}`,
            sourceUrl,
            user: user || null,
            displayName: displayName || null,
            at: new Date().toISOString(),
        };

        await withIndex(async (items) => {
            items.push(item);
            await writeIndex(items);
        });

        emitGif({
            url: item.url,
            duration,
            size,
            x,
            y,
        });
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
        addFromUrl,
    };
}
