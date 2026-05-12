// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TriSign — Three-party consensus meeting record on Monad
/// @notice Each participant calls submitConsensusSignature individually (gas distributed).
///         Once all three have signed the same (finalMessagesRoot, disputesRoot), the meeting
///         is sealed and the record is immutable.
contract TriSign {
    // ── errors ────────────────────────────────────────────────────────────────

    error AlreadySealed(bytes32 meetingId);
    error NotParticipant(bytes32 meetingId, address caller);
    error AlreadySigned(bytes32 meetingId, address signer);
    error InvalidSignature();
    error RootMismatch(bytes32 meetingId);

    // ── storage types ─────────────────────────────────────────────────────────

    struct EndSignature {
        address signer;
        uint256 signedAt;
        bytes32 finalMessagesRoot;
        bytes32 disputesRoot;
        bytes signature;
    }

    struct Meeting {
        address[3] participants;
        EndSignature[3] endSigs;
        bytes32 finalMessagesRoot;
        bytes32 disputesRoot;
        uint256 sealedAt;
        bool isSealed;
        uint8 signedCount;
    }

    // ── state ─────────────────────────────────────────────────────────────────

    mapping(bytes32 => Meeting) public meetings;

    // ── events ────────────────────────────────────────────────────────────────

    /// @notice Emitted each time one participant submits their signature
    event SignatureSubmitted(
        bytes32 indexed meetingId,
        address indexed signer,
        bytes signature
    );

    /// @notice Emitted once the third signature is received and the meeting is sealed
    event MeetingSealed(
        bytes32 indexed meetingId,
        address[3] participants,
        bytes32 finalMessagesRoot,
        bytes32 disputesRoot,
        uint256 timestamp
    );

    // ── external write ────────────────────────────────────────────────────────

    /// @notice Submit the caller's individual consensus signature.
    ///         Each of the three participants calls this once with their own wallet.
    ///         Gas is paid by each signer — no single party bears the full cost.
    ///
    /// @param meetingId           keccak256 of the meeting UUID (set by front-end)
    /// @param participants        The three wallet addresses (must be consistent across calls)
    /// @param finalMessagesRoot   keccak256 of all final message hashes (ordered)
    /// @param disputesRoot        keccak256 of all (messageId, disputerAddress) pairs
    /// @param signature           ECDSA signature of the packed message (see _messageHash)
    function submitConsensusSignature(
        bytes32 meetingId,
        address[3] calldata participants,
        bytes32 finalMessagesRoot,
        bytes32 disputesRoot,
        bytes calldata signature
    ) external {
        Meeting storage m = meetings[meetingId];

        if (m.isSealed) revert AlreadySealed(meetingId);

        // ── first signer initialises participants; subsequent callers must match ──
        if (m.signedCount == 0) {
            m.participants = participants;
        }

        // ── caller must be one of the three participants ──────────────────────
        uint8 slot = _findSlot(m.participants, msg.sender);
        if (slot == type(uint8).max) revert NotParticipant(meetingId, msg.sender);

        // ── prevent double-signing ────────────────────────────────────────────
        if (m.endSigs[slot].signer != address(0)) revert AlreadySigned(meetingId, msg.sender);

        // ── all signers must agree on the same roots ──────────────────────────
        if (m.signedCount > 0) {
            if (finalMessagesRoot != m.finalMessagesRoot || disputesRoot != m.disputesRoot) {
                revert RootMismatch(meetingId);
            }
        } else {
            m.finalMessagesRoot = finalMessagesRoot;
            m.disputesRoot = disputesRoot;
        }

        // ── verify ECDSA signature ────────────────────────────────────────────
        bytes32 msgHash = _messageHash(meetingId, finalMessagesRoot, disputesRoot);
        address recovered = _recover(msgHash, signature);
        if (recovered != msg.sender) revert InvalidSignature();

        // ── store ─────────────────────────────────────────────────────────────
        m.endSigs[slot] = EndSignature({
            signer: msg.sender,
            signedAt: block.timestamp,
            finalMessagesRoot: finalMessagesRoot,
            disputesRoot: disputesRoot,
            signature: signature
        });
        m.signedCount += 1;

        emit SignatureSubmitted(meetingId, msg.sender, signature);

        // ── seal when all three have signed ───────────────────────────────────
        if (m.signedCount == 3) {
            m.isSealed = true;
            m.sealedAt = block.timestamp;
            emit MeetingSealed(meetingId, m.participants, finalMessagesRoot, disputesRoot, block.timestamp);
        }
    }

    // ── external view ─────────────────────────────────────────────────────────

    /// @notice Verify that a candidate root matches the sealed on-chain record.
    /// @return isValid   true iff meeting is sealed and roots match
    /// @return signers   the three participant addresses
    /// @return isSealed  whether the meeting has been sealed
    function verifyMeeting(bytes32 meetingId, bytes32 candidateRoot)
        external
        view
        returns (bool isValid, address[3] memory signers, bool isSealed)
    {
        Meeting storage m = meetings[meetingId];
        return (
            m.isSealed && m.finalMessagesRoot == candidateRoot,
            m.participants,
            m.isSealed
        );
    }

    /// @notice Return the full Meeting struct for a given meetingId.
    function getMeeting(bytes32 meetingId) external view returns (Meeting memory) {
        return meetings[meetingId];
    }

    // ── internal helpers ──────────────────────────────────────────────────────

    /// @dev The canonical message each participant signs:
    ///      keccak256(abi.encodePacked("TriSign End: ", meetingId, finalMessagesRoot, disputesRoot))
    ///      wrapped with the Ethereum signed-message prefix.
    function _messageHash(
        bytes32 meetingId,
        bytes32 finalMessagesRoot,
        bytes32 disputesRoot
    ) internal pure returns (bytes32) {
        bytes32 raw = keccak256(
            abi.encodePacked("TriSign End: ", meetingId, finalMessagesRoot, disputesRoot)
        );
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", raw));
    }

    /// @dev Return the index (0-2) of `who` in `participants`, or type(uint8).max if not found.
    function _findSlot(address[3] storage participants, address who)
        internal
        view
        returns (uint8)
    {
        for (uint8 i = 0; i < 3; i++) {
            if (participants[i] == who) return i;
        }
        return type(uint8).max;
    }

    /// @dev Recover signer from a 65-byte ECDSA signature.
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
