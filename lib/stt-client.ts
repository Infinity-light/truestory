'use client'

export interface SttTranscript {
  text: string
  isFinal: boolean
}

export interface StreamingSttOptions {
  onTranscript: (t: SttTranscript) => void
  onError?: (err: Error) => void
  onClose?: () => void
}

interface SttCredentials {
  model: string
  wsEndpoint: string
}

export class StreamingStt {
  private ws: WebSocket | null = null
  private taskId: string = ''
  private opts: StreamingSttOptions
  private credentials: SttCredentials | null = null

  constructor(opts: StreamingSttOptions) {
    this.opts = opts
  }

  async connect(): Promise<void> {
    const res = await fetch('/api/stt/token')
    if (!res.ok) throw new Error(`Failed to fetch STT token: ${res.status}`)
    this.credentials = await res.json() as SttCredentials

    return new Promise((resolve, reject) => {
      const { model, wsEndpoint } = this.credentials!
      this.taskId = crypto.randomUUID().replace(/-/g, '')

      this.ws = new WebSocket(wsEndpoint)
      this.ws.binaryType = 'arraybuffer'

      this.ws.onopen = () => {
        const runTask = {
          header: {
            action: 'run-task',
            task_id: this.taskId,
            streaming: 'duplex',
          },
          payload: {
            task_group: 'audio',
            task: 'asr',
            function: 'recognition',
            model,
            input: {},
            parameters: {
              format: 'pcm',
              sample_rate: 16000,
            },
          },
        }
        this.ws!.send(JSON.stringify(runTask))
      }

      this.ws.onmessage = (evt) => {
        if (typeof evt.data !== 'string') return
        let msg: {
          header: { event: string; task_id?: string; error_code?: string; error_message?: string }
          payload?: { output?: { sentence?: { text?: string; end_time?: number | null } } }
        }
        try {
          msg = JSON.parse(evt.data)
        } catch {
          return
        }

        const event = msg.header?.event
        if (event === 'task-started') {
          resolve()
          return
        }

        if (event === 'result-generated') {
          const sentence = msg.payload?.output?.sentence
          if (sentence?.text) {
            this.opts.onTranscript({
              text: sentence.text,
              isFinal: sentence.end_time != null,
            })
          }
          return
        }

        if (event === 'task-finished') {
          return
        }

        if (event === 'task-failed') {
          const err = new Error(
            `DashScope STT failed: ${msg.header.error_code} — ${msg.header.error_message}`,
          )
          this.opts.onError?.(err)
          reject(err)
          return
        }
      }

      this.ws.onerror = () => {
        const err = new Error('DashScope STT WebSocket error')
        this.opts.onError?.(err)
        reject(err)
      }

      this.ws.onclose = () => {
        this.ws = null
        this.opts.onClose?.()
      }
    })
  }

  sendPcm16(buffer: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(buffer)
    }
  }

  stop(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    const finishTask = {
      header: {
        action: 'finish-task',
        task_id: this.taskId,
        streaming: 'duplex',
      },
      payload: { input: {} },
    }
    this.ws.send(JSON.stringify(finishTask))
    // Give the server a moment to flush final results before we close
    setTimeout(() => this.ws?.close(), 1500)
  }
}
