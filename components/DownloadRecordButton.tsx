'use client'

interface RecordData {
  roomCode: string
  meetingId: string
  messages: unknown[]
  participants: unknown[]
  disputes: unknown[]
  finalMessagesRoot: string
  disputesRoot: string
  txHash: string | null
}

interface DownloadRecordButtonProps {
  data: RecordData
}

export function DownloadRecordButton({ data }: DownloadRecordButtonProps) {
  function handleDownload() {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trisign-meeting-${data.roomCode}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleDownload}
      className="w-full h-11 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-medium
                 transition-colors hover:bg-zinc-50 hover:border-zinc-400"
    >
      Download record
    </button>
  )
}
