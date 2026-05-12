'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface DownloadRecordButtonProps {
  roomCode: string
}

export function DownloadRecordButton({ roomCode }: DownloadRecordButtonProps) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/meetings/${roomCode}/forensic-export`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'failed' }))
        toast.error(err.error ?? 'Failed to fetch record')
        return
      }
      const data = await res.json()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const uuidShort = (data.meeting?.uuid ?? '').slice(0, 8)
      a.download = `trueStory-${roomCode}-${uuidShort}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="w-full h-11 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-medium
                 transition-colors hover:bg-zinc-50 hover:border-zinc-400
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {downloading ? '生成中...' : '下载取证记录 · Download forensic record'}
    </button>
  )
}
