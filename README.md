# teerzo-bot

Twitch chat bot and JSON API for [teerzo](https://www.twitch.tv/teerzo). The React frontend lives in a separate project and talks to this API.

Requires **Node.js 20.6+**.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in `CLIENT_ID` / `CLIENT_SECRET`. Keep the existing teerzobot token file at `tokens/token.536204553.json`, or open `/oauth/login` while logged in as teerzobot.

## Twitch OAuth

In the Twitch developer console, add these **OAuth Redirect URLs** (exact match):

```
http://localhost:3000/oauth/callback
https://<your-app>.up.railway.app/oauth/callback
```

Set `TWITCH_REDIRECT_URI` to the URL you are using. Then visit:

- Local: `http://localhost:3000/oauth/login`
- Railway: `https://<your-app>.up.railway.app/oauth/login?key=YOUR_OAUTH_SECRET`

Log in as **teerzobot**. That saves a token with `chat:read`, `chat:edit`, and `moderator:read:followers`. Restart the service afterward so follow alerts reconnect.

On Railway, set `OAUTH_SECRET` and `TWITCH_REDIRECT_URI`, and keep `TOKEN_PATH` on a volume so the new token survives restarts.

## Discord

Optional. If `DISCORD_TOKEN` is unset, Twitch still runs.

Copy the bot token, application ID, and server ID into `.env` (or Railway):

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
```

### Custom install URL

In the [Discord Developer Portal](https://discord.com/developers/applications) → **Installation** → **Install Link**, choose **Custom URL** and paste the Discord authorize URL (replace `YOUR_APP_ID` with `DISCORD_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&permissions=68608&integration_type=0&scope=bot+applications.commands
```

Or paste your public install redirect (Railway):

```
https://<your-app>.up.railway.app/discord/install
```

Local testing: `http://localhost:3000/discord/install` (same as `/discord/invite`). That uses scopes `bot` and `applications.commands`, guild install (`integration_type=0`), and asks for View Channel, Send Messages, and Read Message History so it can post in `#general` / `#twitch-chat` and load images from `#artwork`. Enable **Message Content Intent** on the Bot page so the chat bridge can read Discord messages.

`GET /api/status` includes `discord.installUrl` with the same authorize URL.

### OAuth redirect (optional)

If you also use Discord’s OAuth2 **Redirects**, add:

```
http://localhost:3000/discord/callback
https://<your-app>.up.railway.app/discord/callback
```

On ready the bot goes online (Watching `TWITCH_CHANNEL`), registers guild-scoped `/ping` and `/hello`, and reports connection state on `GET /api/status` as `discord`. When it is added to a server it posts in `#general` if it can send messages there (otherwise the system channel or another text channel). Restarting does not re-post.

### Twitch chat bridge

Twitch chat and Discord `#twitch-chat` are mirrored both ways. Discord channel names cannot contain spaces, so a channel called **twitch chat** is `#twitch-chat`. Override with `DISCORD_BRIDGE_CHANNEL`.

- Twitch → Discord: `[Twitch] displayName: message`
- Discord → Twitch: `[Discord] displayName: message`

The bot’s own messages are not relayed, so the two sides do not echo each other. In the Developer Portal → **Bot** → **Privileged Gateway Intents**, turn on **Message Content Intent**, then restart.

### Discord dance queue

Images posted in Discord `#stream-dance` (override with `DISCORD_DANCE_CHANNEL`) are downloaded and added to the same approval queue as `!dance`. Accept or reject them at `/manage/dance`. The bot replies in that channel when a GIF is queued.

### Discord dungeon artwork

Images posted in Discord `#artwork` are downloaded to `data/artwork` and used as random painting textures in the dungeon overlay. On startup the bot reads that channel’s history (needs **Read Message History**). New posts are picked up immediately but only appear on paintings after the next floor is built.

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
DANCE_PATH=/data/gifs
```

The first boot writes the env token onto the volume. After that, Twitch refreshes persist across deploys. Without a volume, a refresh can invalidate the env token on the next restart.

## Chat commands

| Command | Who | What it does |
| --- | --- | --- |
| `!ping` | everyone | Replies `Pong!` |
| `!commands` / `!help` | everyone | Lists built-in and custom commands |
| `!commands dc` | everyone | Dungeon command help (`ttt`, `dance`, `dvd` also work) |
| `!lurk` | everyone | Thanks the chatter for lurking |
| `!so <user>` | everyone | Chat shoutout with a Twitch link |
| `!game` | everyone | Current game |
| `!title` | everyone | Current stream title |
| `!uptime` | everyone | How long the stream has been live |
| `!followage` | everyone | How long that chatter has followed |
| `!currentsong` / `!song` | everyone | Currently playing song from the Chrome plugin |
| `!dvdfast` | everyone | Speeds up the DVD overlay (`0.25x`–`8x`) |
| `!dvdslow` | everyone | Slows down the DVD overlay (`0.25x`–`8x`) |
| `!dvd` | everyone | Adds another bouncing DVD logo |
| `!undvd` | everyone | Removes a random bouncing DVD logo |
| `!dance <url>` | everyone | Queues an image/GIF for approval, then shows it on `/dance` after you accept it |
| `!undance` | everyone | Removes a random GIF from the dance overlay |
| `!ttt` | everyone | Show the tic-tac-toe overlay and start a new game |
| `!ttt 1-9` | everyone | Places X or O in that cell (first player X, second O) |
| `!up` / `!u` / `!f` / `!forward` | everyone | Dungeon: step forward |
| `!down` / `!d` / `!b` / `!back` | everyone | Dungeon: step backward |
| `!left` / `!l` | everyone | Dungeon: turn 90° left |
| `!right` / `!r` | everyone | Dungeon: turn 90° right |
| `!dungeon` | everyone | Show the dungeon overlay and reset to floor 0 |
| `!dc` | everyone | Same as `!dungeon` |
| `!dc bigger` / `!dc smaller` | mods | Step the dungeon canvas through size breakpoints |
| `!dc topleft` / `topright` / `bottomleft` / `bottomright` | mods | Snap the dungeon canvas to a corner |
| `!resize bigger` / `!resize smaller` | mods | Alias of `!dc size bigger` / `smaller` |
| `!anarchy` | mods | Dungeon anarchy mode (every command runs immediately) |
| `!democracy` | mods | Dungeon democracy mode (chat votes for 8 seconds) |
| `!autoplay` | mods | Dungeon autoplay (bot walks the maze until chat takes over) |
| `!clear` | everyone | Clears dance GIFs and DVD logos, and hides tic-tac-toe and dungeon overlays |
| `!<name>` | everyone | Any custom command created via the API |

Commands have a 10 second cooldown.

### !followage

`!followage` and follow thank-yous need `moderator:read:followers`. Make teerzobot a channel mod, then authorize at `/oauth/login` while logged in as teerzobot.

## OBS

The bot on Railway cannot open OBS on your PC. Instead it exposes events. Open **`/`** (also `/manage`) for bot status and Twitch chat. Overlay previews and copyable Browser Source URLs are at **`/manage/overlays`**. Dance approval queue: `/manage/dance`. Account: `/manage/account`. Followers: `/manage/followers`.

1. **Chat overlay:** add a Browser Source pointed at `https://<your-app>/chat` (locally `http://localhost:3000/chat`). Display-only; Control Level can stay at the default.
2. **Follow alerts:** add a Browser Source pointed at `https://<your-app>/alerts` (preview: `/alerts?preview=1`). Keep it on every scene you want alerts on. When someone follows, chat posts `Thanks for the follow, {name}!` and this overlay shows a graphic. Optional custom image: `FOLLOW_ALERT_IMAGE`.
3. **Now playing:** add a Browser Source pointed at `https://<your-app>.up.railway.app/now-playing`. The Chrome extension should `POST` track changes to the Railway `/api/now-playing` endpoint.
4. **DVD logo:** add a Browser Source pointed at `https://<your-app>/dvd` (locally `http://localhost:3000/dvd`). `!dvdfast` and `!dvdslow` change bounce speed. `!dvd` adds another logo; `!undvd` removes one at random.
5. **Dance GIFs:** add a Browser Source pointed at `https://<your-app>/dance` (locally `http://localhost:3000/dance`). Chat `!dance <image url>` queues the file; accept it at `/manage/dance` to show it on the overlay.
6. **Tic-tac-toe:** add a Browser Source pointed at `https://<your-app>/ttt` (locally `http://localhost:3000/ttt`). `!ttt` shows the overlay and starts a game; `!ttt 1-9` places a mark. `!clear` hides it until `!ttt` is used again.
7. **Dungeon:** add a Browser Source pointed at `https://<your-app>/dungeon` (locally `http://localhost:3000/dungeon`) at **1920×1080**. The canvas starts at **640×480** in the top-left; unused area is transparent. Mods: `!dc bigger` / `!dc smaller` step 480×270 → 640×360 → 640×480 → 854×480 → 960×540 → 1280×720 → 1600×900 → 1920×1080. `!dc topleft` `!dc topright` `!dc bottomleft` `!dc bottomright` snap the canvas. Chat moves with `!up` `!down` `!left` `!right`. Starts on floor 0. Mods can switch `!anarchy` / `!democracy` / `!autoplay`. After 1 minute with no chat movement, it autoplays. `!clear` hides it; `!dungeon` or `!dc` shows it again. Test walk: `/dungeon?preview=1`.
8. **Scene control:** add a Browser Source pointed at `https://<your-app>/obs`. Set **Control Level** to **Advanced**. The page listens to `/api/obs/events` and can switch scenes via `window.obsstudio`.
9. **Webhook:** set `OBS_WEBHOOK_URL` to a public URL (Cloudflare Tunnel, ngrok, Streamer.bot). The bot `POST`s JSON on each successful command.

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
| `GET` | `/oauth/login` | Start Twitch OAuth (optional `?key=` if `OAUTH_SECRET` is set) |
| `GET` | `/oauth/callback` | Twitch OAuth redirect |
| `GET` | `/discord/install` | Discord bot install (`bot` + `applications.commands`, guild) |
| `GET` | `/discord/invite` | Alias of `/discord/install` |
| `GET` | `/discord/callback` | Discord OAuth redirect |
| `GET` | `/api/status` | `{ connected, channel, botUserId, obs, chat, nowPlaying, alerts, dvd, dance, ttt, dungeon, discord }` |
| `GET` | `/` / `/manage` | Dashboard (bot status + Twitch chat) |
| `GET` | `/manage/overlays` | Overlay previews and copyable Browser Source URLs |
| `GET` | `/manage/dance` | Dance GIF approval queue |
| `GET` | `/manage/account` | Bot profile and re-authorize |
| `GET` | `/manage/followers` | Channel follower list |
| `GET` | `/api/account` | Bot profile (`{ id, login, displayName, profileImage, scopes }`) |
| `GET` | `/api/followers` | Paginated followers (`{ items, cursor }`) |
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
| `GET` | `/alerts` | Follow-alert Browser Source page |
| `GET` | `/api/alerts/config` | `{ followImage }` |
| `GET` | `/api/alerts/events` | Server-sent follow alerts |
| `GET` | `/dvd` | Bouncing DVD overlay Browser Source page |
| `GET` | `/api/dvd` | Current DVD speed (`{ speed }`) |
| `GET` | `/api/dvd/events` | Server-sent DVD speed changes |
| `GET` | `/dance` | Dance GIF overlay Browser Source page |
| `GET` | `/api/dance` | Saved dance GIFs (`{ items }`) |
| `GET` | `/api/dance/pending` | Pending dance GIFs waiting for approval |
| `POST` | `/api/dance` | Queue a GIF (`{ "url": "https://…" }`) or show a local `/gifs/…` file |
| `POST` | `/api/dance/pending/:id/approve` | Accept a queued GIF and show it on `/dance` |
| `POST` | `/api/dance/pending/:id/reject` | Reject a queued GIF |
| `GET` | `/api/dance/events` | Server-sent dance GIF events |
| `GET` | `/ttt` | Tic-tac-toe overlay Browser Source page |
| `GET` | `/api/ttt` | Current tic-tac-toe game state |
| `GET` | `/api/ttt/events` | Server-sent tic-tac-toe updates |
| `POST` | `/api/ttt/clear` | Hide the overlay and end the current game |
| `GET` | `/dungeon` | First-person dungeon overlay Browser Source page |
| `GET` | `/api/dungeon` | Current dungeon game state |
| `GET` | `/api/dungeon/events` | Server-sent dungeon updates |
| `POST` | `/api/dungeon/reset` | Show the overlay and reset to floor 0 |
| `POST` | `/api/dungeon/clear` | Pause autoplay and hide the overlay |
| `POST` | `/api/dungeon/size` | Set canvas size (`{ "width": 640, "height": 480 }`), step (`{ "step": 1 }`), or corner (`{ "anchor": "top-right" }`) |
| `POST` | `/api/dungeon/input` | Apply a move (`{ "command": "up" }`) |

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
