import { createSseHub } from './sse.js';

const SPEED_STEPS = [0.25, 0.5, 1, 2, 4, 8];
const DEFAULT_SPEED = 1;

function nearestIndex(value) {
    let best = 0;
    let dist = Infinity;
    for (let i = 0; i < SPEED_STEPS.length; i++) {
        const d = Math.abs(SPEED_STEPS[i] - value);
        if (d < dist) {
            dist = d;
            best = i;
        }
    }
    return best;
}

export function formatDvdSpeed(value) {
    return `${value}x`;
}

export function createDvd() {
    const hub = createSseHub({ defaultType: 'dvd' });
    let speed = DEFAULT_SPEED;

    function nudge(delta) {
        const next = SPEED_STEPS[Math.min(SPEED_STEPS.length - 1, Math.max(0, nearestIndex(speed) + delta))];
        const changed = next !== speed;
        speed = next;
        hub.emit({
            action: delta > 0 ? 'faster' : 'slower',
            speed,
        });
        return { speed, changed };
    }

    return {
        emit: hub.emit,
        subscribe: hub.subscribe,
        getStatus: () => ({ listeners: hub.listenerCount, speed }),
        get: () => speed,
        faster: () => nudge(1),
        slower: () => nudge(-1),
    };
}
