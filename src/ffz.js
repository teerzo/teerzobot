const REFRESH_MS = 30 * 60 * 1000;

function httpsUrl(url) {
    if (!url || typeof url !== 'string') {
        return '';
    }
    if (url.startsWith('//')) {
        return `https:${url}`;
    }
    return url;
}

function emoteUrl(emote) {
    const animated = emote.animated || {};
    const urls = emote.urls || {};
    return httpsUrl(animated['2'] || animated['1'] || urls['2'] || urls['1'] || urls['4']);
}

function addSet(map, set) {
    for (const emote of set?.emoticons ?? []) {
        const url = emoteUrl(emote);
        if (!emote.name || !url) {
            continue;
        }
        map.set(emote.name, {
            type: 'emote',
            id: `ffz-${emote.id}`,
            name: emote.name,
            url,
        });
    }
}

async function fetchJson(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'teerzobot/1.0' },
    });
    if (!res.ok) {
        throw new Error(`${url} ${res.status}`);
    }
    return res.json();
}

export function createFfzEmotes(channel) {
    let emotes = new Map();

    async function refresh() {
        const next = new Map();
        try {
            const global = await fetchJson('https://api.frankerfacez.com/v1/set/global');
            for (const id of global.default_sets ?? []) {
                addSet(next, global.sets?.[String(id)]);
            }
        } catch (err) {
            console.error('Failed to load global FrankerFaceZ emotes', err);
        }

        try {
            const room = await fetchJson(`https://api.frankerfacez.com/v1/room/${encodeURIComponent(channel)}`);
            for (const set of Object.values(room.sets ?? {})) {
                addSet(next, set);
            }
        } catch (err) {
            console.error('Failed to load channel FrankerFaceZ emotes', err);
        }

        if (next.size) {
            emotes = next;
            console.log(`Loaded ${emotes.size} FrankerFaceZ emotes`);
        }
    }

    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    if (typeof timer.unref === 'function') {
        timer.unref();
    }

    return {
        lookup(name) {
            return emotes.get(name) ?? null;
        },
    };
}
