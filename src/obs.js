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
    let visible = true;

    function get() {
        return { visible };
    }

    function emit(event) {
        return hub.emit(event);
    }

    function setVisible(next) {
        visible = Boolean(next);
        emit({ type: 'chat-visibility', visible });
        return get();
    }

    function hide() {
        emit({ type: 'chat-clear' });
        return setVisible(false);
    }

    function toggle() {
        return setVisible(!visible);
    }

    return {
        emit,
        subscribe: hub.subscribe,
        get,
        hide,
        clear: hide,
        toggle,
        setVisible,
        getStatus: () => ({ listeners: hub.listenerCount, visible }),
    };
}
