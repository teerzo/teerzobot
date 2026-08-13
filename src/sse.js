export function createSseHub({ defaultType } = {}) {
    const listeners = new Set();

    function subscribe(res) {
        listeners.add(res);
        res.write(': connected\n\n');
        return () => listeners.delete(res);
    }

    function emit(event) {
        const payload = {
            type: defaultType,
            at: new Date().toISOString(),
            ...event,
        };
        const frame = `data: ${JSON.stringify(payload)}\n\n`;

        for (const res of listeners) {
            res.write(frame);
        }

        return payload;
    }

    return {
        subscribe,
        emit,
        get listenerCount() {
            return listeners.size;
        },
    };
}
