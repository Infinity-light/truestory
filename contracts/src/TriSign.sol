// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TriSign {
    error AlreadyStarted();
    error NotStarted();
    error AlreadySealed();
    error InvalidParticipantCount();
    error InvalidSignature(uint256 index);
    error SignerMismatch(uint256 index);
    error NotParticipant();

    struct Meeting {
        bytes32 roomCodeHash;
        address[3] participants;
        bytes32 finalMessagesRoot;
        bytes32 disputesRoot;
        uint256 sealedAt;
        bool isStarted;
        bool isSealed;
    }

    mapping(bytes32 => Meeting) public meetings;

    event MeetingStarted(bytes32 indexed meetingId, address[3] participants, uint256 timestamp);
    event SignatureSubmitted(
        bytes32 indexed meetingId,
        address indexed signer,
        bytes32 finalMessagesRoot,
        bytes32 disputesRoot
    );
    event MeetingSealed(bytes32 indexed meetingId, uint256 timestamp);

    function startMeeting(
        bytes32 meetingId,
        bytes32 roomCodeHash,
        address[3] calldata participants
    ) external {
        Meeting storage m = meetings[meetingId];
        if (m.isStarted) revert AlreadyStarted();
        if (participants[0] == address(0) || participants[1] == address(0) || participants[2] == address(0)) {
            revert InvalidParticipantCount();
        }

        m.roomCodeHash = roomCodeHash;
        m.participants = participants;
        m.isStarted = true;

        emit MeetingStarted(meetingId, participants, block.timestamp);
    }

    function submitConsensus(
        bytes32 meetingId,
        bytes32 finalMessagesRoot,
        bytes32 disputesRoot,
        bytes[3] calldata sigs
    ) external {
        Meeting storage m = meetings[meetingId];
        if (!m.isStarted) revert NotStarted();
        if (m.isSealed) revert AlreadySealed();

        // The message each participant signs:
        // keccak256(abi.encodePacked(meetingId, finalMessagesRoot, disputesRoot))
        bytes32 msgHash = keccak256(abi.encodePacked(meetingId, finalMessagesRoot, disputesRoot));
        bytes32 ethSignedHash = _toEthSignedMessageHash(msgHash);

        for (uint256 i = 0; i < 3; i++) {
            address recovered = _recover(ethSignedHash, sigs[i]);
            if (recovered == address(0)) revert InvalidSignature(i);
            if (recovered != m.participants[i]) revert SignerMismatch(i);

            emit SignatureSubmitted(meetingId, recovered, finalMessagesRoot, disputesRoot);
        }

        m.finalMessagesRoot = finalMessagesRoot;
        m.disputesRoot = disputesRoot;
        m.sealedAt = block.timestamp;
        m.isSealed = true;

        emit MeetingSealed(meetingId, block.timestamp);
    }

    function verifyMeeting(bytes32 meetingId, bytes32 candidateMessagesRoot)
        external
        view
        returns (bool isValid, address[3] memory signers)
    {
        Meeting storage m = meetings[meetingId];
        isValid = m.isSealed && m.finalMessagesRoot == candidateMessagesRoot;
        signers = m.participants;
    }

    function getMeeting(bytes32 meetingId)
        external
        view
        returns (
            bytes32 roomCodeHash,
            address[3] memory participants,
            bytes32 finalMessagesRoot,
            bytes32 disputesRoot,
            uint256 sealedAt,
            bool isStarted,
            bool isSealed
        )
    {
        Meeting storage m = meetings[meetingId];
        return (
            m.roomCodeHash,
            m.participants,
            m.finalMessagesRoot,
            m.disputesRoot,
            m.sealedAt,
            m.isStarted,
            m.isSealed
        );
    }

    // ── internal helpers ──────────────────────────────────────────────────────

    function _toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function _recover(bytes32 hash, bytes calldata sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        return ecrecover(hash, v, r, s);
    }
}
