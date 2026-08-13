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
    const track = trimString(body.track ?? body.title ?? body.song);
    const artist = trimString(body.artist ?? body.artists);
    const album = trimString(body.album);
    const image = httpUrl(body.image ?? body.artwork ?? body.albumArt);
    const url = httpUrl(body.url ?? body.link);
    const source = trimString(body.source);
    const videoId = trimString(body.videoId);
    const elapsed = trimString(body.elapsed);
    const total = trimString(body.total);
    const playedAt = trimString(body.playedAt);
    const isPlaying = body.isPlaying !== false && body.playing !== false;

    if (!track && !artist) {
        return null;
    }

    return {
        source,
        track,
        artist,
        album,
        url,
        image,
        videoId,
        elapsed,
        total,
        isPlaying,
        playedAt,
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

export function formatChatLine(track) {
    if (!track || (!track.track && !track.artist)) {
        return 'No song is playing right now.';
    }

    const title = track.track || 'Unknown track';
    const by = track.artist ? ` by ${track.artist}` : '';
    const time = track.elapsed && track.total ? ` (${track.elapsed}/${track.total})` : '';
    const paused = track.isPlaying === false ? ' (paused)' : '';
    const link = track.url ? ` ${track.url}` : '';
    return `Now playing: ${title}${by}${time}${paused}${link}`;
}
