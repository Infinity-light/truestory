// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TrueStoryV2 — Multi-party consensus meeting record on Monad
/// @notice Dynamic participants (2-10), each calls submitConsensusSignature individually.
///         When all participants have signed the same (finalMessagesRoot, disputesRoot),
///         the meeting is sealed and the record is immutable.
contract TrueStoryV2 {
    // ── errors ────────────────────────────────────────────────────────────────

    error AlreadySealed(bytes32 meetingId);
    error NotParticipant(bytes32 meetingId, address caller);
    error AlreadySigned(bytes32 meetingId, address signer);
    error InvalidSignature();
    error RootMismatch(bytes32 meetingId);
    error InvalidParticipantCount(uint256 count);
    error ParticipantCountMismatch(uint256 expected, uint256 provided);

    uint256 public constant MIN_PARTICIPANTS = 2;
    uint256 public constant MAX_PARTICIPANTS = 10;

    // ── storage types ─────────────────────────────────────────────────────────

    struct EndSignature {
        address signer;
        uint256 signedAt;
        bytes32 finalMessagesRoot;
        bytes32 disputesRoot;
        bytes signature;
    }

    struct MeetingView {
        address[] participants;
        bytes32 finalMessagesRoot;
        bytes32 disputesRoot;
        uint256 sealedAt;
        bool isSealed;
        uint16 signedCount;
        uint16 expectedCount;
    }

    // ── state ─────────────────────────────────────────────────────────────────

    // packed storage per meeting
    mapping(bytes32 => address[]) private _participants;
    mapping(bytes32 => mapping(address => EndSignature)) private _endSigs;
    mapping(bytes32 => mapping(address => bool)) private _isParticipant;
    mapping(bytes32 => bytes32) private _finalMessagesRoot;
    mapping(bytes32 => bytes32) private _disputesRoot;
    mapping(bytes32 => uint256) private _sealedAt;
    mapping(bytes32 => bool) private _isSealed;
    mapping(bytes32 => uint16) private _signedCount;
    mapping(bytes32 => uint16) private _expectedCount;

    // ── events ────────────────────────────────────────────────────────────────

    event SignatureSubmitted(
        bytes32 indexed meetingId,
        address indexed signer,
        bytes signature
    );

    event MeetingSealed(
        bytes32 indexed meetingId,
        address[] participants,
        bytes32 finalMessagesRoot,
        bytes32 disputesRoot,
        uint256 timestamp
    );

    // ── external write ────────────────────────────────────────────────────────

    /// @notice Submit the caller's individual consensus signature.
    ///         Each participant calls this once with their own wallet.
    ///         Gas is paid by each signer.
    function submitConsensusSignature(
        bytes32 meetingId,
        address[] calldata participants,
        bytes32 finalMessagesRoot,
        bytes32 disputesRoot,
        bytes calldata signature
    ) external {
        if (_isSealed[meetingId]) revert AlreadySealed(meetingId);

        // First signer initializes participants array and locks expectedCount
        if (_signedCount[meetingId] == 0) {
            uint256 n = participants.length;
            if (n < MIN_PARTICIPANTS || n > MAX_PARTICIPANTS) {
                revert InvalidParticipantCount(n);
            }
            for (uint256 i = 0; i < n; i++) {
                _participants[meetingId].push(participants[i]);
                _isParticipant[meetingId][participants[i]] = true;
            }
            _expectedCount[meetingId] = uint16(n);
        } else {
            // Subsequent callers: participants list must match what first signer set
            if (participants.length != _expectedCount[meetingId]) {
                revert ParticipantCountMismatch(_expectedCount[meetingId], participants.length);
            }
            for (uint256 i = 0; i < participants.length; i++) {
                if (_participants[meetingId][i] != participants[i]) {
                    revert ParticipantCountMismatch(_expectedCount[meetingId], participants.length);
                }
            }
        }

        if (!_isParticipant[meetingId][msg.sender]) revert NotParticipant(meetingId, msg.sender);

        if (_endSigs[meetingId][msg.sender].signer != address(0)) {
            revert AlreadySigned(meetingId, msg.sender);
        }

        // All signers must agree on the same roots
        if (_signedCount[meetingId] > 0) {
            if (
                finalMessagesRoot != _finalMessagesRoot[meetingId] ||
                disputesRoot != _disputesRoot[meetingId]
            ) {
                revert RootMismatch(meetingId);
            }
        } else {
            _finalMessagesRoot[meetingId] = finalMessagesRoot;
            _disputesRoot[meetingId] = disputesRoot;
        }

        // Verify ECDSA signature
        bytes32 msgHash = _messageHash(meetingId, finalMessagesRoot, disputesRoot);
        address recovered = _recover(msgHash, signature);
        if (recovered != msg.sender) revert InvalidSignature();

        // Store
        _endSigs[meetingId][msg.sender] = EndSignature({
            signer: msg.sender,
            signedAt: block.timestamp,
            finalMessagesRoot: finalMessagesRoot,
            disputesRoot: disputesRoot,
            signature: signature
        });
        _signedCount[meetingId] += 1;

        emit SignatureSubmitted(meetingId, msg.sender, signature);

        // Seal when all expected participants have signed
        if (_signedCount[meetingId] == _expectedCount[meetingId]) {
            _isSealed[meetingId] = true;
            _sealedAt[meetingId] = block.timestamp;
            emit MeetingSealed(
                meetingId,
                _participants[meetingId],
                finalMessagesRoot,
                disputesRoot,
                block.timestamp
            );
        }
    }

    // ── external view ─────────────────────────────────────────────────────────

    function verifyMeeting(bytes32 meetingId, bytes32 candidateRoot)
        external
        view
        returns (bool isValid, address[] memory signers, bool isSealed)
    {
        return (
            _isSealed[meetingId] && _finalMessagesRoot[meetingId] == candidateRoot,
            _participants[meetingId],
            _isSealed[meetingId]
        );
    }

    function getMeeting(bytes32 meetingId) external view returns (MeetingView memory) {
        return MeetingView({
            participants: _participants[meetingId],
            finalMessagesRoot: _finalMessagesRoot[meetingId],
            disputesRoot: _disputesRoot[meetingId],
            sealedAt: _sealedAt[meetingId],
            isSealed: _isSealed[meetingId],
            signedCount: _signedCount[meetingId],
            expectedCount: _expectedCount[meetingId]
        });
    }

    function getParticipants(bytes32 meetingId) external view returns (address[] memory) {
        return _participants[meetingId];
    }

    function getSignature(bytes32 meetingId, address signer)
        external
        view
        returns (EndSignature memory)
    {
        return _endSigs[meetingId][signer];
    }

    // ── internal helpers ──────────────────────────────────────────────────────

    /// @dev Canonical message hash each participant signs.
    function _messageHash(
        bytes32 meetingId,
        bytes32 finalMessagesRoot,
        bytes32 disputesRoot
    ) internal pure returns (bytes32) {
        bytes32 raw = keccak256(
            abi.encodePacked("trueStory End: ", meetingId, finalMessagesRoot, disputesRoot)
        );
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", raw));
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
