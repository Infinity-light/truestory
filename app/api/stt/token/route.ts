import { NextRequest } from 'next/server'

// Returns DashScope credentials so the browser can open a WebSocket directly.
// The API key is short-lived in the demo context; not suitable for production.
export async function GET(_request: NextRequest) {
  const apiKey = process.env.DASHSCOPE_API_KEY
  const model = process.env.DASHSCOPE_ASR_MODEL ?? 'qwen3-asr-flash-realtime-2026-02-10'

  if (!apiKey) {
    return Response.json({ error: 'DASHSCOPE_API_KEY not configured' }, { status: 500 })
  }

  return Response.json({
    apiKey,
    model,
    wsEndpoint: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference',
  })
}
