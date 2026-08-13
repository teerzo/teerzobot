import { createSseHub } from './sse.js';

export function getSceneMap() {
    const scenes = {};
    for (const [key, value] of Object.entries(process.env)) {
        const match = /^OBS_SCENE_(.+)$/.exec(key);
        if (match && value?.trim()) {
            scenes[match[1].toLowerCase()] = value.trim();
        }
    }
    return scenes;
}

export function createObs() {
    const webhookUrl = process.env.OBS_WEBHOOK_URL?.trim() || '';
    const hub = createSseHub({ defaultType: 'command' });

    function getStatus() {
        return {
            webhook: Boolean(webhookUrl),
            listeners: hub.listenerCount,
        };
    }

    function emit(event) {
        const payload = hub.emit(event);

        if (!webhookUrl) {
            return;
        }

        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).catch((err) => {
            console.error('OBS webhook failed', err);
        });
    }

    return {
        emit,
        subscribe: hub.subscribe,
        getStatus,
        getConfig: () => ({ scenes: getSceneMap() }),
    };
}

export function createChatFeed() {
    const hub = createSseHub({ defaultType: 'chat' });

    return {
        emit: hub.emit,
        subscribe: hub.subscribe,
        getStatus: () => ({ listeners: hub.listenerCount }),
    };
}
