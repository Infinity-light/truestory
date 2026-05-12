export const TRISIGN_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_TRISIGN_CONTRACT_ADDRESS as `0x${string}`) ??
  '0x0000000000000000000000000000000000000000'

export const triSignAbi = [
  {
    type: 'function',
    name: 'getMeeting',
    inputs: [{ name: 'meetingId', type: 'bytes32' }],
    outputs: [
      { name: 'roomCodeHash', type: 'bytes32' },
      { name: 'participants', type: 'address[3]' },
      { name: 'finalMessagesRoot', type: 'bytes32' },
      { name: 'disputesRoot', type: 'bytes32' },
      { name: 'sealedAt', type: 'uint256' },
      { name: 'isStarted', type: 'bool' },
      { name: 'isSealed', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'startMeeting',
    inputs: [
      { name: 'meetingId', type: 'bytes32' },
      { name: 'roomCodeHash', type: 'bytes32' },
      { name: 'participants', type: 'address[3]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitConsensus',
    inputs: [
      { name: 'meetingId', type: 'bytes32' },
      { name: 'finalMessagesRoot', type: 'bytes32' },
      { name: 'disputesRoot', type: 'bytes32' },
      { name: 'sigs', type: 'bytes[3]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'verifyMeeting',
    inputs: [
      { name: 'meetingId', type: 'bytes32' },
      { name: 'candidateMessagesRoot', type: 'bytes32' },
    ],
    outputs: [
      { name: 'isValid', type: 'bool' },
      { name: 'signers', type: 'address[3]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'MeetingStarted',
    inputs: [
      { name: 'meetingId', type: 'bytes32', indexed: true },
      { name: 'participants', type: 'address[3]', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SignatureSubmitted',
    inputs: [
      { name: 'meetingId', type: 'bytes32', indexed: true },
      { name: 'signer', type: 'address', indexed: true },
      { name: 'finalMessagesRoot', type: 'bytes32', indexed: false },
      { name: 'disputesRoot', type: 'bytes32', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MeetingSealed',
    inputs: [
      { name: 'meetingId', type: 'bytes32', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'AlreadySealed', inputs: [] },
  { type: 'error', name: 'AlreadyStarted', inputs: [] },
  { type: 'error', name: 'InvalidParticipantCount', inputs: [] },
  { type: 'error', name: 'InvalidSignature', inputs: [{ name: 'index', type: 'uint256' }] },
  { type: 'error', name: 'NotParticipant', inputs: [] },
  { type: 'error', name: 'NotStarted', inputs: [] },
  { type: 'error', name: 'SignerMismatch', inputs: [{ name: 'index', type: 'uint256' }] },
] as const
