const builtins = [
    {
        name: 'ping',
        response: 'Pong!',
        builtin: true,
        execute({ say, channel }) {
            return say(channel, 'Pong!');
        },
    },
];

export function createCommandHandler(store) {
    function normalizeName(name) {
        return String(name ?? '')
            .trim()
            .replace(/^!/, '')
            .toLowerCase();
    }

    async function resolve(name) {
        const key = normalizeName(name);
        const builtin = builtins.find((command) => command.name === key);
        if (builtin) {
            return builtin;
        }

        const custom = await store.get(key);
        if (!custom) {
            return null;
        }

        return {
            ...custom,
            builtin: false,
            execute({ say, channel }) {
                return say(channel, custom.response);
            },
        };
    }

    async function handleMessage({ channel, text, say }) {
        const trimmed = text.trim();
        if (!trimmed.startsWith('!')) {
            return;
        }

        const [raw] = trimmed.split(/\s+/);
        const command = await resolve(raw);
        if (!command) {
            return;
        }

        await command.execute({ channel, say });
    }

    async function list() {
        const custom = await store.list();
        return [
            ...builtins.map(({ name, response, builtin }) => ({ name, response, builtin })),
            ...custom.map(({ name, response }) => ({ name, response, builtin: false })),
        ];
    }

    return {
        builtins,
        normalizeName,
        resolve,
        handleMessage,
        list,
    };
}
