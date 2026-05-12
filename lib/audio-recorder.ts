'use client'

export interface AudioRecorderOptions {
  onChunk?: (chunk: Blob) => void
  chunkIntervalMs?: number
  mimeType?: string
}

export interface AudioRecorder {
  start(): Promise<void>
  stop(): Promise<Blob>
  isRecording(): boolean
}

export function createAudioRecorder(options: AudioRecorderOptions = {}): AudioRecorder {
  const { onChunk, chunkIntervalMs = 2000 } = options

  let mediaRecorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  const chunks: Blob[] = []
  let resolveStop: ((blob: Blob) => void) | null = null

  function getSupportedMimeType(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    for (const type of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return ''
  }

  async function start(): Promise<void> {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const mimeType = options.mimeType ?? getSupportedMimeType()
    const recorderOptions = mimeType ? { mimeType } : {}
    mediaRecorder = new MediaRecorder(stream, recorderOptions)
    chunks.length = 0

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
        onChunk?.(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const mimeUsed = mediaRecorder?.mimeType ?? 'audio/webm'
      const blob = new Blob(chunks, { type: mimeUsed })
      resolveStop?.(blob)
      resolveStop = null
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      mediaRecorder = null
    }

    mediaRecorder.start(onChunk ? chunkIntervalMs : undefined)
  }

  function stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('recorder not active'))
        return
      }
      resolveStop = resolve
      mediaRecorder.stop()
    })
  }

  function isRecording(): boolean {
    return mediaRecorder?.state === 'recording'
  }

  return { start, stop, isRecording }
}
