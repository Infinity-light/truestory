// Pro upgrade pipeline — encrypts forensic JSON, uploads to Arweave,
// registers Lit Protocol access control conditions, mints attestation NFTs.
//
// EXTERNAL DEPENDENCIES NOT YET PROVISIONED:
//   - Arweave wallet keyfile (need user to provide AR JWK)
//   - Lit Protocol capacity credit token (need user to register at https://developer.litprotocol.com)
//
// Until those keys are provided, this module returns mock values so the rest of
// the system can be exercised end-to-end. Each function is a single integration
// point — when keys arrive, swap the implementation body without touching callers.

import type { ForensicExportV1 } from './forensic-export'

const PRO_UPGRADE_PLACEHOLDER_MODE = process.env.PRO_UPGRADE_PLACEHOLDER !== '0'

export interface EncryptionResult {
  ciphertext: `0x${string}`
  encryptedSymKey: `0x${string}`
  litAccConditions: unknown
}

/**
 * Encrypt the forensic JSON for the given participants.
 * Lit Protocol manages the symmetric key; only wallets in the participants list can decrypt.
 */
export async function encryptForParticipants(
  json: ForensicExportV1,
  participants: `0x${string}`[],
): Promise<EncryptionResult> {
  if (PRO_UPGRADE_PLACEHOLDER_MODE) {
    // Return a deterministic mock so the rest of the pipeline can be exercised.
    const plaintext = Buffer.from(JSON.stringify(json), 'utf8').toString('hex')
    return {
      ciphertext: `0x${plaintext}` as `0x${string}`,
      encryptedSymKey:
        '0xPLACEHOLDER_LIT_SYM_KEY_AWAITING_USER_API_PROVISIONING' as `0x${string}`,
      litAccConditions: {
        type: 'evmBasic',
        conditionType: 'membership',
        participants,
      },
    }
  }

  throw new Error('Lit Protocol integration awaiting capacity credit provisioning')
}

/**
 * Upload an encrypted blob to Arweave. Returns the Arweave tx id.
 * Real implementation: use arweave-js + Bundlr Network for fast confirmation.
 */
export async function uploadToArweave(
  ciphertext: `0x${string}`,
): Promise<string> {
  if (PRO_UPGRADE_PLACEHOLDER_MODE) {
    // 43-char base64url placeholder mimicking Arweave tx id format
    const stamp = Date.now().toString(36).padEnd(8, '0')
    return `PLACEHOLDER_ARWEAVE_TXID_${stamp}_AWAITING_AR_WALLET`.slice(0, 43)
  }

  throw new Error('Arweave integration awaiting AR wallet keyfile')
}

/**
 * Register the Lit Protocol access control condition for this meeting.
 * Returns an opaque reference (bytes32) used by the contract layer.
 */
export async function registerLitACC(
  meetingId: string,
  participants: `0x${string}`[],
): Promise<`0x${string}`> {
  if (PRO_UPGRADE_PLACEHOLDER_MODE) {
    // Derive a deterministic mock ref from inputs
    const hex = Buffer.from(`${meetingId}:${participants.join(',')}`, 'utf8')
      .toString('hex')
      .padEnd(64, '0')
      .slice(0, 64)
    return `0x${hex}` as `0x${string}`
  }

  throw new Error('Lit Protocol integration awaiting capacity credit provisioning')
}

/**
 * After encryption + upload + Lit registration succeed, call the on-chain
 * finalize function to atomically mint attestation NFTs (if not skipped).
 *
 * Real implementation: use viem + a server-side signer (Ownable owner of ProPayment).
 */
export async function finalizeProUpgrade(
  meetingId: `0x${string}`,
  participants: `0x${string}`[],
  arweaveTxId: string,
  litAccRef: `0x${string}`,
  skipAttestation: boolean,
): Promise<{ txHash: string | null }> {
  if (PRO_UPGRADE_PLACEHOLDER_MODE) {
    return {
      txHash: `0x${'00'.repeat(32)}PLACEHOLDER`.slice(0, 66) as string,
    }
  }

  throw new Error(
    'On-chain finalize awaiting backend signer wallet configuration (PRO_PAYMENT_OWNER_PRIVATE_KEY)',
  )
}

/**
 * Full pipeline orchestration. Called by the pro-upgrade-start API route.
 */
export interface ProUpgradeResult {
  arweaveTxId: string
  litAccRef: `0x${string}`
  finalizeTxHash: string | null
  placeholderMode: boolean
}

export async function runProUpgradePipeline(
  meetingId: `0x${string}`,
  meetingUuid: string,
  participants: `0x${string}`[],
  forensicJson: ForensicExportV1,
  skipAttestation: boolean,
): Promise<ProUpgradeResult> {
  const encryption = await encryptForParticipants(forensicJson, participants)
  const arweaveTxId = await uploadToArweave(encryption.ciphertext)
  const litAccRef = await registerLitACC(meetingUuid, participants)
  const { txHash } = await finalizeProUpgrade(
    meetingId,
    participants,
    arweaveTxId,
    litAccRef,
    skipAttestation,
  )

  return {
    arweaveTxId,
    litAccRef,
    finalizeTxHash: txHash,
    placeholderMode: PRO_UPGRADE_PLACEHOLDER_MODE,
  }
}
