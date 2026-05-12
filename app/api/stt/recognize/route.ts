import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY!
const DASHSCOPE_SUBMIT_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription'
const DASHSCOPE_TASK_URL =
  'https://dashscope.aliyuncs.com/api/v1/tasks'

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 30 // 60 seconds max

async function submitParaformerTask(fileUrl: string): Promise<string> {
  const res = await fetch(DASHSCOPE_SUBMIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'paraformer-v2',
      input: { file_urls: [fileUrl] },
      parameters: { language_hints: ['zh', 'en'] },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DashScope submit failed ${res.status}: ${body}`)
  }

  const data = await res.json()
  return data.output.task_id as string
}

async function pollTask(taskId: string): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const res = await fetch(`${DASHSCOPE_TASK_URL}/${taskId}`, {
      headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
    })

    if (!res.ok) throw new Error(`DashScope poll failed ${res.status}`)

    const data = await res.json()
    const status: string = data.output.task_status

    if (status === 'SUCCEEDED') {
      const transcriptionUrl: string = data.output.results[0].transcription_url
      const tRes = await fetch(transcriptionUrl)
      if (!tRes.ok) throw new Error('Failed to fetch transcription result')
      const tData = await tRes.json()
      // Concatenate all sentence texts with spaces
      const sentences: { text: string }[] =
        tData.transcripts?.[0]?.sentences ?? []
      return sentences.map((s) => s.text).join(' ').trim()
    }

    if (status === 'FAILED') {
      throw new Error(`DashScope task failed: ${JSON.stringify(data.output)}`)
    }
    // PENDING / RUNNING — keep polling
  }

  throw new Error('DashScope ASR timed out after 60 seconds')
}

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'expected multipart/form-data' }, { status: 400 })
  }

  const audioFile = formData.get('audio')
  const speakerAddress = formData.get('speakerAddress')
  const meetingId = formData.get('meetingId')

  if (!(audioFile instanceof Blob)) {
    return Response.json({ error: 'missing audio blob' }, { status: 400 })
  }
  if (typeof speakerAddress !== 'string' || typeof meetingId !== 'string') {
    return Response.json({ error: 'missing speakerAddress or meetingId' }, { status: 400 })
  }

  // Upload audio to Supabase Storage (public bucket: trisign-audio)
  const arrayBuffer = await audioFile.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  const filename = `${meetingId}/${speakerAddress}-${Date.now()}.webm`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('trisign-audio')
    .upload(filename, uint8Array, {
      contentType: audioFile.type || 'audio/webm',
      upsert: false,
    })

  if (uploadError) {
    return Response.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 },
    )
  }

  // Get public URL for DashScope
  const { data: urlData } = supabaseAdmin.storage
    .from('trisign-audio')
    .getPublicUrl(filename)

  const publicUrl = urlData.publicUrl

  let transcribedText = ''
  try {
    const taskId = await submitParaformerTask(publicUrl)
    transcribedText = await pollTask(taskId)
  } finally {
    // Clean up storage regardless of success/failure
    await supabaseAdmin.storage.from('trisign-audio').remove([filename])
  }

  return Response.json({ text: transcribedText })
}
