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

function parseClock(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.floor(value));
    }
    const text = trimString(value);
    if (!text) {
        return null;
    }
    const parts = text.split(':');
    if (parts.length < 1 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
        return null;
    }
    const nums = parts.map(Number);
    if (nums.length === 1) {
        return nums[0];
    }
    if (nums.length === 2) {
        return nums[0] * 60 + nums[1];
    }
    return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

function formatClock(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const mm = hours ? String(minutes).padStart(2, '0') : String(minutes);
    const ss = String(secs).padStart(2, '0');
    return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function currentElapsedSeconds(track, now = Date.now()) {
    let seconds = parseClock(track.elapsed) ?? 0;
    if (track.isPlaying !== false) {
        const updated = Date.parse(track.playedAt || track.at || '');
        if (Number.isFinite(updated)) {
            seconds += Math.max(0, (now - updated) / 1000);
        }
    }
    const duration = parseClock(track.total);
    if (duration != null) {
        seconds = Math.min(seconds, duration);
    }
    return Math.floor(seconds);
}

function isYoutubeHost(hostname) {
    const host = String(hostname || '').replace(/^www\./, '');
    return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com'
        || host === 'music.youtube.com' || host === 'youtube-nocookie.com';
}

function youtubeUrlAtTime(track, seconds) {
    if (track.videoId) {
        const url = new URL('https://www.youtube.com/watch');
        url.searchParams.set('v', track.videoId);
        if (seconds > 0) {
            url.searchParams.set('t', String(seconds));
        }
        return url.toString();
    }

    const raw = track.url;
    if (!raw) {
        return '';
    }

    try {
        const parsed = new URL(raw);
        if (!isYoutubeHost(parsed.hostname)) {
            return raw;
        }
        if (seconds > 0) {
            parsed.searchParams.set('t', String(seconds));
        } else {
            parsed.searchParams.delete('t');
        }
        return parsed.toString();
    } catch {
        return raw;
    }
}

export function formatChatLine(track) {
    if (!track || (!track.track && !track.artist)) {
        return 'No song is playing right now.';
    }

    const elapsedSeconds = currentElapsedSeconds(track);
    const title = track.track || 'Unknown track';
    const by = track.artist ? ` by ${track.artist}` : '';
    const elapsedLabel = track.elapsed || elapsedSeconds ? formatClock(elapsedSeconds) : '';
    const time = elapsedLabel && track.total ? ` (${elapsedLabel}/${track.total})` : elapsedLabel ? ` (${elapsedLabel})` : '';
    const paused = track.isPlaying === false ? ' (paused)' : '';
    const link = youtubeUrlAtTime(track, elapsedSeconds);
    return `Now playing: ${title}${by}${time}${paused}${link ? ` ${link}` : ''}`;
}
