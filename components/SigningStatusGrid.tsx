'use client'

interface SignerStatus {
  address: string
  hasEndSigned: boolean
}

interface SigningStatusGridProps {
  signers: SignerStatus[]
  myAddress: string | null
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function SigningStatusGrid({ signers, myAddress }: SigningStatusGridProps) {
  return (
    <div className="w-full space-y-2">
      {signers.map((signer) => {
        const isMe = myAddress?.toLowerCase() === signer.address.toLowerCase()
        return (
          <div
            key={signer.address}
            className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-zinc-200 flex items-center justify-center">
                <span className="text-xs font-medium text-zinc-500">
                  {signer.address.slice(2, 4).toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-sm font-mono text-zinc-900">{shortAddr(signer.address)}</span>
                {isMe && (
                  <span className="ml-1.5 text-xs text-zinc-400">(you)</span>
                )}
              </div>
            </div>
            <div>
              {signer.hasEndSigned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Signed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                  Pending
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
