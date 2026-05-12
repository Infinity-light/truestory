// Probe which ASR models the /inference endpoint accepts.
import { WebSocket } from 'ws'
import { randomUUID } from 'node:crypto'

const PROXY = 'ws://localhost:8765/ws'
const MODELS = [
  'paraformer-realtime-v2',
  'paraformer-realtime-v1',
  'paraformer-realtime-8k-v1',
  'gummy-realtime-v1',
  'qwen3-asr-flash-realtime-2026-02-10',
  'qwen3-asr-flash-realtime',
]

async function probe(model) {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY)
    const taskId = randomUUID().replace(/-/g, '')
    let resolved = false
    const done = (verdict) => {
      if (resolved) return
      resolved = true
      try { ws.close() } catch {}
      resolve({ model, ...verdict })
    }
    const timer = setTimeout(() => done({ ok: false, reason: 'timeout' }), 5000)
    ws.on('open', () => {
      ws.send(JSON.stringify({
        header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
        payload: {
          task_group: 'audio', task: 'asr', function: 'recognition', model,
          input: {}, parameters: { format: 'pcm', sample_rate: 16000 },
        },
      }))
    })
    ws.on('message', (data, isBinary) => {
      if (isBinary) return
      const msg = JSON.parse(data.toString())
      const evt = msg.header?.event
      if (evt === 'task-started') {
        clearTimeout(timer)
        done({ ok: true })
      } else if (evt === 'task-failed') {
        clearTimeout(timer)
        done({ ok: false, code: msg.header.error_code, reason: msg.header.error_message })
      }
    })
    ws.on('error', (err) => { clearTimeout(timer); done({ ok: false, reason: err.message }) })
  })
}

for (const m of MODELS) {
  const r = await probe(m)
  const status = r.ok ? 'PASS' : `FAIL (${r.code || ''} ${r.reason})`
  console.log(`${status.padEnd(40)}  ${m}`)
}
