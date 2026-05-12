import { NextRequest } from 'next/server'
import { buildForensicExport } from '@/lib/forensic-export'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const exportData = await buildForensicExport(code)
  if (!exportData) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }
  return Response.json(exportData, {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="trueStory-${code}-${exportData.meeting.uuid.slice(0, 8)}.json"`,
    },
  })
}
