import { createSseHub } from './sse.js';

const MAX_LEN = 300;

function trimString(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().slice(0, MAX_LEN);
}

function httpUrl(value) {
    const url = trimString(value);
    if (!url) {
        return '';
    }
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.toString();
        }
    } catch {
        return '';
    }
    return '';
}

export function normalizeTrack(body = {}) {
    const title = trimString(body.title ?? body.track ?? body.song);
    const artist = trimString(body.artist ?? body.artists);
    const album = trimString(body.album);
    const artwork = httpUrl(body.artwork ?? body.albumArt ?? body.image);
    const url = httpUrl(body.url ?? body.link);
    const source = trimString(body.source);
    const playing = body.playing !== false && body.isPlaying !== false;

    if (!title && !artist) {
        return null;
    }

    return {
        title,
        artist,
        album,
        artwork,
        url,
        source,
        playing,
    };
}

export function createNowPlaying() {
    let current = null;
    const hub = createSseHub({ defaultType: 'now-playing' });

    function snapshot() {
        return current;
    }

    function set(track) {
        current = { ...track, at: new Date().toISOString() };
        hub.emit({ type: 'now-playing', track: current });
        return current;
    }

    function clear() {
        current = null;
        hub.emit({ type: 'now-playing', track: null });
        return null;
    }

    return {
        get: snapshot,
        set,
        clear,
        subscribe: hub.subscribe,
        getStatus: () => ({ listeners: hub.listenerCount, track: current }),
    };
}
