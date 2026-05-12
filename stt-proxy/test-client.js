// Smoke test: connect to local proxy, send run-task, expect task-started.
import { WebSocket } from 'ws'
import { randomUUID } from 'node:crypto'

const PROXY = process.env.PROXY_URL || 'ws://localhost:8765/ws'
const MODEL = process.env.MODEL || 'paraformer-realtime-v2'
const TASK_ID = randomUUID().replace(/-/g, '')

const ws = new WebSocket(PROXY)

const t0 = Date.now()
const timeoutId = setTimeout(() => {
  console.error(`[FAIL] timeout — no task-started within 10s`)
  process.exit(2)
}, 10000)

ws.on('open', () => {
  console.log(`[open] connected to ${PROXY} after ${Date.now() - t0}ms`)
  ws.send(JSON.stringify({
    header: { action: 'run-task', task_id: TASK_ID, streaming: 'duplex' },
    payload: {
      task_group: 'audio',
      task: 'asr',
      function: 'recognition',
      model: MODEL,
      input: {},
      parameters: { format: 'pcm', sample_rate: 16000 },
    },
  }))
})

ws.on('message', (data, isBinary) => {
  if (isBinary) {
    console.log(`[bin] ${data.length} bytes`)
    return
  }
  const msg = JSON.parse(data.toString())
  console.log(`[evt] ${msg.header?.event} task=${msg.header?.task_id?.slice(0, 8)}`)
  if (msg.header?.event === 'task-started') {
    console.log(`[PASS] task-started received after ${Date.now() - t0}ms`)
    clearTimeout(timeoutId)
    ws.send(JSON.stringify({
      header: { action: 'finish-task', task_id: TASK_ID, streaming: 'duplex' },
      payload: { input: {} },
    }))
    setTimeout(() => { ws.close(); process.exit(0) }, 500)
  } else if (msg.header?.event === 'task-failed') {
    console.error(`[FAIL] task-failed: ${msg.header.error_code} ${msg.header.error_message}`)
    clearTimeout(timeoutId)
    process.exit(3)
  }
})

ws.on('error', (err) => {
  console.error(`[err] ${err.message}`)
})

ws.on('close', (code, reason) => {
  console.log(`[close] code=${code} reason=${reason?.toString() || ''}`)
})
