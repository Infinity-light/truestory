export type MeetingStatus =
  | 'waiting'
  | 'starting'
  | 'recording'
  | 'reviewing'
  | 'signing'
  | 'sealed'

export type ParticipantRole = 'host' | 'participant'

export type ProStatus =
  | 'none'         // free meeting
  | 'paid'         // Pro payment captured, awaiting finalization
  | 'finalizing'   // Arweave upload / Lit registration / NFT mint in progress
  | 'finalized'    // all Pro upgrade steps complete
  | 'refunded'     // Pro upgrade failed, payment returned

export interface Meeting {
  id: string
  roomCode: string
  hostAddress: string
  status: MeetingStatus
  createdAt: string
  expiresAt: string
  recordingStartedAt: string | null
  recordingEndedAt: string | null
  onChainTxHash: string | null
  // v2 fields
  isPro: boolean
  expectedCount: number | null
  codeReleasedAt: string | null
  arweaveTxId: string | null
  litAccRef: string | null
  proStatus: ProStatus
  skipAttestation: boolean
}

export interface Participant {
  meetingId: string
  walletAddress: string
  role: ParticipantRole
  joinedAt: string
  startSig: string | null
  startSignedAt: string | null
  endSig: string | null
  endSignedAt: string | null
  reviewCompleted: boolean
  // v2 fields
  color: string
  leftAt: string | null
  lastSeenAt: string
}

export type EndProposalStatus = 'active' | 'approved' | 'cancelled'

export interface EndProposal {
  id: string
  meetingId: string
  proposerAddress: string
  proposedAt: string
  status: EndProposalStatus
  agreedAddresses: string[]
  disagreedAddresses: string[]
  resolvedAt: string | null
}

// API request/response types

export interface CreateMeetingRequest {
  hostAddress: string
  isPro?: boolean
  skipAttestation?: boolean
}

export interface CreateMeetingResponse {
  meetingId: string
  roomCode: string
  joinUrl: string
  isPro: boolean
}

export interface JoinMeetingRequest {
  walletAddress: string
}

export interface JoinMeetingResponse {
  meetingId: string
  currentParticipants: Participant[]
}

export interface SignStartRequest {
  walletAddress: string
  signature: string
  signedMessage: string
}

export interface SignStartResponse {
  startedAt?: string
  waitingFor?: string[]
}

export interface GetMeetingResponse {
  meeting: Meeting
  participants: Participant[]
}

export interface LockRosterRequest {
  hostAddress: string
}

export interface ProposeEndRequest {
  proposerAddress: string
}

export interface VoteEndRequest {
  voterAddress: string
  agree: boolean
}

export interface Message {
  id: string
  meetingId: string
  speakerAddress: string
  originalText: string
  finalText: string | null
  spokenAt: string
  serverReceivedAt: string
  originalHash: string
  finalHash: string | null
  isDisputed: boolean
}

export interface CreateMessageRequest {
  meetingId: string
  speakerAddress: string
  originalText: string
  spokenAt: string
}

export interface CreateMessageResponse {
  message: Message
}
