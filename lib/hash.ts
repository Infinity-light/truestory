import { keccak256, encodePacked } from 'viem'

/**
 * Computes the message hash matching Solidity:
 *   keccak256(abi.encodePacked(speaker, text, spokenAtMs))
 *
 * speaker   - checksummed or lowercase 0x address
 * text      - the original_text or final_text string
 * spokenAtMs - Unix timestamp in milliseconds (bigint)
 *
 * Returns a 0x-prefixed hex string (bytes32).
 */
export function keccakMessage(
  speaker: string,
  text: string,
  spokenAtMs: bigint,
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['address', 'string', 'uint256'],
      [speaker as `0x${string}`, text, spokenAtMs],
    ),
  )
}

/**
 * Computes the finalMessagesRoot from an ordered list of message hashes.
 *   keccak256(abi.encodePacked(hash1, hash2, ...))
 */
export function keccakMessagesRoot(
  hashes: `0x${string}`[],
): `0x${string}` {
  if (hashes.length === 0) {
    return keccak256(encodePacked(['bytes'], ['0x']))
  }
  return keccak256(
    encodePacked(
      hashes.map(() => 'bytes32' as const),
      hashes,
    ),
  )
}

/**
 * Computes the disputesRoot from (messageId, disputerAddress) pairs,
 * ordered by the time disputes were recorded.
 *   keccak256(abi.encodePacked(id1, addr1, id2, addr2, ...))
 */
export function keccakDisputesRoot(
  disputes: Array<{ messageId: `0x${string}`; disputerAddress: string }>,
): `0x${string}` {
  if (disputes.length === 0) {
    return keccak256(encodePacked(['bytes'], ['0x']))
  }
  const types: ('bytes32' | 'address')[] = []
  const values: (`0x${string}`)[] = []
  for (const d of disputes) {
    types.push('bytes32', 'address')
    values.push(d.messageId, d.disputerAddress as `0x${string}`)
  }
  return keccak256(encodePacked(types, values))
}
