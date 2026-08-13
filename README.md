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

On Railway, set the same variables in the service dashboard (no `.env` file). The token file is gitignored, so seed it with:

- `accessToken`
- `refreshToken`

Attach a volume (for example at `/data`) and set:

```
TOKEN_PATH=/data/token.536204553.json
COMMANDS_PATH=/data/commands.json
```

The first boot writes the env token onto the volume. After that, Twitch refreshes persist across deploys. Without a volume, a refresh can invalidate the env token on the next restart.

## Chat commands

| Command | Who | What it does |
| --- | --- | --- |
| `!ping` | everyone | Replies `Pong!` |
| `!commands` / `!help` | everyone | Lists built-in and custom commands |
| `!lurk` | everyone | Thanks the chatter for lurking |
| `!so <user>` | everyone | Chat shoutout with a Twitch link |
| `!game` | everyone | Current game |
| `!title` | everyone | Current stream title |
| `!uptime` | everyone | How long the stream has been live |
| `!followage` | everyone | How long that chatter has followed |
| `!currentsong` / `!song` | everyone | Currently playing song from the Chrome plugin |
| `!<name>` | everyone | Any custom command created via the API |

Commands have a 10 second cooldown.

### !followage

`!followage` needs the Helix scope `moderator:read:followers`. Make **teerzobot** a moderator in the channel, then re-authorize the bot token with that scope and update `accessToken` / `refreshToken` (or the token file). Without that, the bot replies that followage is unavailable.

## OBS

The bot on Railway cannot open OBS on your PC. Instead it exposes events:

1. **Chat overlay:** add a Browser Source pointed at `https://<your-app>/chat` (locally `http://localhost:3000/chat`). Display-only; Control Level can stay at the default.
2. **Now playing:** add a Browser Source pointed at `https://<your-app>.up.railway.app/now-playing`. The Chrome extension should `POST` track changes to the Railway `/api/now-playing` endpoint.
3. **Scene control:** add a Browser Source pointed at `https://<your-app>/obs`. Set **Control Level** to **Advanced**. The page listens to `/api/obs/events` and can switch scenes via `window.obsstudio`.
4. **Webhook:** set `OBS_WEBHOOK_URL` to a public URL (Cloudflare Tunnel, ngrok, Streamer.bot). The bot `POST`s JSON on each successful command.

Map chat commands to OBS scene names with env vars:

```
OBS_SCENE_BRB=BRB
OBS_SCENE_LIVE=Live
```

That creates `!brb` and `!live`. The overlay switches to those scene names when the commands fire.

Example webhook payload:

```json
{
  "type": "command",
  "command": "so",
  "user": "viewer",
  "displayName": "Viewer",
  "args": ["somechannel"],
  "text": "!so somechannel",
  "at": "2026-08-13T16:00:00.000Z"
}
```

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | `{ ok: true }` |
| `GET` | `/api/status` | `{ connected, channel, botUserId, obs, chat, nowPlaying }` |
| `GET` | `/api/commands` | Built-in and custom commands |
| `POST` | `/api/commands` | `{ "name": "discord", "response": "..." }` |
| `PATCH` | `/api/commands/:name` | `{ "response": "..." }` |
| `DELETE` | `/api/commands/:name` | Remove a custom command |
| `GET` | `/obs` | OBS scene-control Browser Source page |
| `GET` | `/api/obs/config` | Scene map from `OBS_SCENE_*` |
| `GET` | `/api/obs/events` | Server-sent command events |
| `GET` | `/chat` | Chat overlay Browser Source page |
| `GET` | `/api/chat/events` | Server-sent chat messages |
| `GET` | `/now-playing` | Now-playing overlay Browser Source page |
| `GET` | `/api/now-playing` | Current track (`{ track }` or `{ track: null }`) |
| `POST` | `/api/now-playing` | Set current track from a Chrome extension |
| `DELETE` | `/api/now-playing` | Clear current track |
| `GET` | `/api/now-playing/events` | Server-sent now-playing updates |

Set `FRONTEND_ORIGIN` to the React app origin for CORS. Chrome extension origins (`chrome-extension://…`) are also allowed.

### Chrome extension now playing

Point the extension at the **Railway** API (not localhost). When the side panel track changes, `POST` JSON to:

`https://<your-app>.up.railway.app/api/now-playing`

```json
{
  "source": "youtube",
  "track": "Song Title",
  "artist": "Artist Name",
  "album": "",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "image": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "videoId": "dQw4w9WgXcQ",
  "elapsed": "0:12",
  "total": "3:45",
  "isPlaying": true,
  "playedAt": "2026-08-13T16:45:00.000Z"
}
```

`track` or `artist` is required. In the extension `host_permissions`, add `https://<your-app>.up.railway.app/*`. If `NOW_PLAYING_SECRET` is set on the Railway service, send it as `x-now-playing-key` or `Authorization: Bearer …`.

```js
await fetch('https://<your-app>.up.railway.app/api/now-playing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

OBS overlay: `https://<your-app>.up.railway.app/now-playing`.
