'use client'

import { useState } from 'react'

interface TxHashLinkProps {
  txHash: string
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

export function TxHashLink({ txHash }: TxHashLinkProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(txHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full rounded-xl border border-zinc-100 bg-zinc-50 p-4 space-y-2">
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        On-chain transaction
      </span>
      <div className="flex items-center justify-between gap-3">
        <a
          href={`https://testnet.monadexplorer.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-zinc-700 hover:text-zinc-900 underline underline-offset-2 truncate"
        >
          {shortHash(txHash)}
        </a>
        <button
          onClick={handleCopy}
          className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 rounded border border-zinc-200 hover:border-zinc-400"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
