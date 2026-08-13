import { createSseHub } from './sse.js';

export function createAlerts() {
    const hub = createSseHub({ defaultType: 'alert' });

    return {
        emit: hub.emit,
        subscribe: hub.subscribe,
        getStatus: () => ({ listeners: hub.listenerCount }),
        getConfig: () => ({
            followImage: process.env.FOLLOW_ALERT_IMAGE?.trim() || '',
        }),
    };
}
