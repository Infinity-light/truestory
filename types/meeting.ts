export type MeetingStatus =
  | 'waiting'
  | 'starting'
  | 'recording'
  | 'reviewing'
  | 'signing'
  | 'sealed'

export type ParticipantRole = 'host' | 'participant'

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
}

// API request/response types

export interface CreateMeetingRequest {
  hostAddress: string
}

export interface CreateMeetingResponse {
  meetingId: string
  roomCode: string
  joinUrl: string
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
