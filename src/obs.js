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
    const listeners = new Set();

    function getStatus() {
        return {
            webhook: Boolean(webhookUrl),
            listeners: listeners.size,
        };
    }

    function subscribe(res) {
        listeners.add(res);
        res.write(': connected\n\n');
        return () => listeners.delete(res);
    }

    function emit(event) {
        const payload = {
            type: 'command',
            at: new Date().toISOString(),
            ...event,
        };
        const frame = `data: ${JSON.stringify(payload)}\n\n`;

        for (const res of listeners) {
            res.write(frame);
        }

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
        subscribe,
        getStatus,
        getConfig: () => ({ scenes: getSceneMap() }),
    };
}
