import { NextRequest } from 'next/server'

// Returns the STT proxy URL. The browser cannot connect to DashScope directly
// because its WebSocket API does not allow custom HTTP headers, and DashScope
// rejects subprotocol-based auth. The proxy (Node ws server) injects the
// required Authorization: Bearer header when talking to DashScope upstream.
export async function GET(_request: NextRequest) {
  const proxyUrl = process.env.STT_PROXY_URL
  const model = process.env.DASHSCOPE_ASR_MODEL ?? 'paraformer-realtime-v2'

  if (!proxyUrl) {
    return Response.json({ error: 'STT_PROXY_URL not configured' }, { status: 500 })
  }

  return Response.json({ model, wsEndpoint: proxyUrl })
}
