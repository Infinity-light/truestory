export const TRISIGN_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_TRISIGN_CONTRACT_ADDRESS as `0x${string}`) ??
  '0x0000000000000000000000000000000000000000'

export const triSignAbi = [
  {
    type: 'function',
    name: 'submitConsensusSignature',
    inputs: [
      { name: 'meetingId', type: 'bytes32' },
      { name: 'participants', type: 'address[3]' },
      { name: 'finalMessagesRoot', type: 'bytes32' },
      { name: 'disputesRoot', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'verifyMeeting',
    inputs: [
      { name: 'meetingId', type: 'bytes32' },
      { name: 'candidateRoot', type: 'bytes32' },
    ],
    outputs: [
      { name: 'isValid', type: 'bool' },
      { name: 'signers', type: 'address[3]' },
      { name: 'isSealed', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMeeting',
    inputs: [{ name: 'meetingId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'participants', type: 'address[3]' },
          {
            name: 'endSigs',
            type: 'tuple[3]',
            components: [
              { name: 'signer', type: 'address' },
              { name: 'signedAt', type: 'uint256' },
              { name: 'finalMessagesRoot', type: 'bytes32' },
              { name: 'disputesRoot', type: 'bytes32' },
              { name: 'signature', type: 'bytes' },
            ],
          },
          { name: 'finalMessagesRoot', type: 'bytes32' },
          { name: 'disputesRoot', type: 'bytes32' },
          { name: 'sealedAt', type: 'uint256' },
          { name: 'isSealed', type: 'bool' },
          { name: 'signedCount', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'SignatureSubmitted',
    inputs: [
      { name: 'meetingId', type: 'bytes32', indexed: true },
      { name: 'signer', type: 'address', indexed: true },
      { name: 'signature', type: 'bytes', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MeetingSealed',
    inputs: [
      { name: 'meetingId', type: 'bytes32', indexed: true },
      { name: 'participants', type: 'address[3]', indexed: false },
      { name: 'finalMessagesRoot', type: 'bytes32', indexed: false },
      { name: 'disputesRoot', type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'AlreadySealed', inputs: [{ name: 'meetingId', type: 'bytes32' }] },
  { type: 'error', name: 'NotParticipant', inputs: [{ name: 'meetingId', type: 'bytes32' }, { name: 'caller', type: 'address' }] },
  { type: 'error', name: 'AlreadySigned', inputs: [{ name: 'meetingId', type: 'bytes32' }, { name: 'signer', type: 'address' }] },
  { type: 'error', name: 'InvalidSignature', inputs: [] },
  { type: 'error', name: 'RootMismatch', inputs: [{ name: 'meetingId', type: 'bytes32' }] },
] as const
