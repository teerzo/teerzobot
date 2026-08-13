# teerzo-bot

Twitch chat bot and JSON API for [teerzo](https://www.twitch.tv/teerzo). The React frontend lives in a separate project and talks to this API.

Requires **Node.js 20.6+**.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in `CLIENT_ID` / `CLIENT_SECRET`. Keep the existing teerzobot token file at `tokens/token.536204553.json`.

## Run locally

```bash
npm run dev
```

This loads `.env` and starts `src/index.js` with Node's file watcher. Saving anything under `src/` restarts the process. The API listens on **http://localhost:3000**. When the bot joins chat it posts `Connected` in the channel.

On Railway, set the same variables in the service dashboard and use `npm start` (no `.env` file). Attach a volume and point `TOKEN_PATH` (and `COMMANDS_PATH`) at it so refreshed tokens and custom commands survive restarts.

## Chat commands

| Command | What it does |
| --- | --- |
| `!ping` | Replies `Pong!` |
| `!<name>` | Replies with any custom command created via the API |

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | `{ ok: true }` |
| `GET` | `/api/status` | `{ connected, channel, botUserId }` |
| `GET` | `/api/commands` | Built-in and custom commands |
| `POST` | `/api/commands` | `{ "name": "discord", "response": "..." }` |
| `PATCH` | `/api/commands/:name` | `{ "response": "..." }` |
| `DELETE` | `/api/commands/:name` | Remove a custom command |

Set `FRONTEND_ORIGIN` to the React app origin for CORS.
