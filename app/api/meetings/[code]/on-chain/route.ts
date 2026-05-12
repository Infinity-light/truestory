import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  let body: { txHash?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { txHash } = body
  if (!txHash) {
    return Response.json({ error: 'missing txHash' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('meetings')
    .update({ on_chain_tx_hash: txHash })
    .eq('room_code', code)

  if (error) {
    return Response.json({ error: 'failed to save tx hash' }, { status: 500 })
  }

  return Response.json({ ok: true }, { status: 200 })
}
