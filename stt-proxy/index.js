import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

const PORT = Number(process.env.PORT) || 8080
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY
const DASHSCOPE_WS = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference'

if (!DASHSCOPE_API_KEY) {
  console.error('[fatal] DASHSCOPE_API_KEY env var is required')
  process.exit(1)
}

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

wss.on('connection', (client, req) => {
  const remote = req.socket.remoteAddress
  console.log(`[conn] client=${remote}`)

  const upstream = new WebSocket(DASHSCOPE_WS, {
    headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
  })

  let upstreamOpen = false
  const buffer = []

  upstream.on('open', () => {
    upstreamOpen = true
    for (const { data, isBinary } of buffer) {
      upstream.send(data, { binary: isBinary })
    }
    buffer.length = 0
  })

  upstream.on('message', (data, isBinary) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data, { binary: isBinary })
    }
  })

  upstream.on('close', (code, reason) => {
    console.log(`[upstream-close] code=${code} reason=${reason?.toString() || ''}`)
    if (client.readyState === WebSocket.OPEN) {
      client.close(code === 1006 ? 1011 : code, reason)
    }
  })

  upstream.on('error', (err) => {
    console.error(`[upstream-error] ${err.message}`)
    if (client.readyState === WebSocket.OPEN) {
      client.close(1011, 'upstream error')
    }
  })

  client.on('message', (data, isBinary) => {
    if (upstreamOpen && upstream.readyState === WebSocket.OPEN) {
      upstream.send(data, { binary: isBinary })
    } else {
      buffer.push({ data, isBinary })
    }
  })

  client.on('close', (code, reason) => {
    console.log(`[client-close] code=${code} reason=${reason?.toString() || ''}`)
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.close()
    }
  })

  client.on('error', (err) => {
    console.error(`[client-error] ${err.message}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[ready] stt-proxy listening on :${PORT} (path /ws, /health)`)
})

const shutdown = (sig) => {
  console.log(`[signal] ${sig} received, closing`)
  wss.close()
  httpServer.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
