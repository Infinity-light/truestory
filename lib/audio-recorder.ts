'use client'

// Converts Float32 samples in [-1,1] to Int16 PCM bytes
function floatToInt16(floatSamples: Float32Array): ArrayBuffer {
  const buf = new ArrayBuffer(floatSamples.length * 2)
  const view = new DataView(buf)
  for (let i = 0; i < floatSamples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, floatSamples[i]))
    view.setInt16(i * 2, clamped * 0x7fff, true)
  }
  return buf
}

export interface StreamingRecorderOptions {
  // Called with each PCM16 chunk as it arrives
  onPcmChunk: (pcm16: ArrayBuffer) => void
  sampleRate?: number
  bufferSize?: number
}

export interface StreamingRecorder {
  start(): Promise<void>
  stop(): void
  isActive(): boolean
}

export function createStreamingRecorder(opts: StreamingRecorderOptions): StreamingRecorder {
  const { onPcmChunk, sampleRate = 16000, bufferSize = 4096 } = opts

  let audioContext: AudioContext | null = null
  let source: MediaStreamAudioSourceNode | null = null
  // ScriptProcessorNode is deprecated but has near-universal browser support;
  // AudioWorklet is the modern alternative but requires a separate worklet file
  let processor: ScriptProcessorNode | null = null
  let stream: MediaStream | null = null
  let active = false

  async function start(): Promise<void> {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioContext = new AudioContext({ sampleRate })
    source = audioContext.createMediaStreamSource(stream)
    processor = audioContext.createScriptProcessor(bufferSize, 1, 1)

    processor.onaudioprocess = (e) => {
      if (!active) return
      const channelData = e.inputBuffer.getChannelData(0) // Float32Array mono
      const pcm16 = floatToInt16(channelData)
      onPcmChunk(pcm16)
    }

    source.connect(processor)
    // Must connect to destination to keep the audio graph alive in Chrome
    processor.connect(audioContext.destination)
    active = true
  }

  function stop(): void {
    active = false
    source?.disconnect()
    processor?.disconnect()
    audioContext?.close()
    stream?.getTracks().forEach((t) => t.stop())
    source = null
    processor = null
    audioContext = null
    stream = null
  }

  function isActive(): boolean {
    return active
  }

  return { start, stop, isActive }
}
