# trueStory STT Proxy

Tiny WebSocket proxy that lets the trueStory browser app reach Alibaba
DashScope's realtime ASR (`qwen3-asr-flash-realtime-2026-02-10`).

## Why it exists

DashScope WS rejects browser-style subprotocol auth (returns
`401 InvalidApiKey: No API-key provided`). It only accepts the standard
`Authorization: Bearer <key>` HTTP header. Browser native `WebSocket` cannot
set custom headers — so the only way to use DashScope WS from a web app is to
go through a server that holds the API key and injects the header.

## How it works

```
Browser ─wss──> stt-proxy ─wss + Authorization: Bearer ──> DashScope
        │                │
        └── frames ─────┴── frames (binary PCM + text JSON, both directions)
```

The proxy is transparent: it does not parse or rewrite DashScope's
`run-task` / `continue-task` / `finish-task` protocol; the browser still
drives the conversation.

## Deploy — Railway (recommended)

1. Push this folder to a GitHub repo (or fork the trueStory monorepo).
2. New Railway project → "Deploy from GitHub" → pick the repo.
3. Settings → **Root Directory**: `stt-proxy`.
4. Variables → add `DASHSCOPE_API_KEY=<your-key>` (same key as the main app).
5. Settings → **Networking** → Generate Domain. You'll get something like
   `truestory-stt-proxy.up.railway.app`.
6. The browser-facing endpoint is `wss://truestory-stt-proxy.up.railway.app/ws`.
7. Set this URL as the `STT_PROXY_URL` env var on Vercel (production) for the
   trueStory Next.js app, then redeploy.

## Deploy — Render (alt)

1. New Web Service → from this repo, Root Directory `stt-proxy`.
2. Runtime: Node, build `npm install`, start `npm start`.
3. Env: `DASHSCOPE_API_KEY`.
4. After deploy: `wss://<service>.onrender.com/ws` → set as Vercel `STT_PROXY_URL`.

## Deploy — Fly.io (alt, has Hong Kong region for CN latency)

```bash
cd stt-proxy
fly launch --no-deploy
fly secrets set DASHSCOPE_API_KEY=<your-key>
fly deploy
```

The proxy listens on `PORT` (Railway/Render/Fly set this automatically) and
exposes `/ws` for the WebSocket and `/health` for liveness checks.

## Local dev

```bash
cd stt-proxy
npm install
DASHSCOPE_API_KEY=<your-key> npm run dev
# proxy on ws://localhost:8080/ws
```

Then set `STT_PROXY_URL=ws://localhost:8080/ws` in `trisign/.env.local`.
