// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {TriSign} from "../src/TriSign.sol";

contract TriSignTest is Test {
    TriSign public trisign;

    // Deterministic test private keys
    uint256 internal constant PK_A = 0xA11CE;
    uint256 internal constant PK_B = 0xB0B;
    uint256 internal constant PK_C = 0xC0DE;

    address internal addrA;
    address internal addrB;
    address internal addrC;

    bytes32 internal constant MEETING_ID = keccak256("meeting-001");
    bytes32 internal constant ROOM_CODE_HASH = keccak256("123456");
    bytes32 internal constant FINAL_ROOT = keccak256("messages-root");
    bytes32 internal constant DISPUTES_ROOT = keccak256("disputes-root");

    function setUp() public {
        trisign = new TriSign();
        addrA = vm.addr(PK_A);
        addrB = vm.addr(PK_B);
        addrC = vm.addr(PK_C);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    function _participants() internal view returns (address[3] memory) {
        return [addrA, addrB, addrC];
    }

    function _makeConsensusHash(bytes32 meetingId, bytes32 finalRoot, bytes32 disputesRoot)
        internal
        pure
        returns (bytes32)
    {
        bytes32 msgHash = keccak256(abi.encodePacked(meetingId, finalRoot, disputesRoot));
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
    }

    function _signConsensus(uint256 pk, bytes32 meetingId, bytes32 finalRoot, bytes32 disputesRoot)
        internal
        view
        returns (bytes memory)
    {
        bytes32 ethHash = _makeConsensusHash(meetingId, finalRoot, disputesRoot);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethHash);
        return abi.encodePacked(r, s, v);
    }

    function _startMeeting() internal {
        trisign.startMeeting(MEETING_ID, ROOM_CODE_HASH, _participants());
    }

    function _submitConsensus() internal {
        bytes[3] memory sigs = [
            _signConsensus(PK_A, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT),
            _signConsensus(PK_B, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT),
            _signConsensus(PK_C, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT)
        ];
        trisign.submitConsensus(MEETING_ID, FINAL_ROOT, DISPUTES_ROOT, sigs);
    }

    // ── test 1: startMeeting stores participants and emits event ──────────────

    function test_startMeeting_success() public {
        vm.expectEmit(true, false, false, false);
        emit TriSign.MeetingStarted(MEETING_ID, _participants(), block.timestamp);

        _startMeeting();

        (, address[3] memory parts,,,,bool isStarted,) = trisign.getMeeting(MEETING_ID);
        assertTrue(isStarted);
        assertEq(parts[0], addrA);
        assertEq(parts[1], addrB);
        assertEq(parts[2], addrC);
    }

    // ── test 2: startMeeting reverts on duplicate ─────────────────────────────

    function test_startMeeting_revert_alreadyStarted() public {
        _startMeeting();
        vm.expectRevert(TriSign.AlreadyStarted.selector);
        _startMeeting();
    }

    // ── test 3: submitConsensus seals the meeting ─────────────────────────────

    function test_submitConsensus_success() public {
        _startMeeting();
        _submitConsensus();

        (,, bytes32 storedRoot,, uint256 sealedAt,, bool isSealed) = trisign.getMeeting(MEETING_ID);
        assertTrue(isSealed);
        assertEq(storedRoot, FINAL_ROOT);
        assertGt(sealedAt, 0);
    }

    // ── test 4: verifyMeeting returns true for correct root ───────────────────

    function test_verifyMeeting_correctRoot() public {
        _startMeeting();
        _submitConsensus();

        (bool isValid, address[3] memory signers) = trisign.verifyMeeting(MEETING_ID, FINAL_ROOT);
        assertTrue(isValid);
        assertEq(signers[0], addrA);
        assertEq(signers[1], addrB);
        assertEq(signers[2], addrC);
    }

    // ── test 5: verifyMeeting returns false for tampered root ─────────────────

    function test_verifyMeeting_wrongRoot() public {
        _startMeeting();
        _submitConsensus();

        bytes32 tamperedRoot = keccak256("tampered");
        (bool isValid,) = trisign.verifyMeeting(MEETING_ID, tamperedRoot);
        assertFalse(isValid);
    }

    // ── test 6: submitConsensus reverts on wrong signer ───────────────────────

    function test_submitConsensus_revert_signerMismatch() public {
        _startMeeting();

        // addrA signs for slot 0 but we put addrB's key in slot 0
        bytes[3] memory sigs = [
            _signConsensus(PK_B, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT), // wrong: B signs A's slot
            _signConsensus(PK_B, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT),
            _signConsensus(PK_C, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT)
        ];
        vm.expectRevert(abi.encodeWithSelector(TriSign.SignerMismatch.selector, uint256(0)));
        trisign.submitConsensus(MEETING_ID, FINAL_ROOT, DISPUTES_ROOT, sigs);
    }

    // ── test 7: submitConsensus reverts if called twice ───────────────────────

    function test_submitConsensus_revert_alreadySealed() public {
        _startMeeting();
        _submitConsensus();

        bytes[3] memory sigs = [
            _signConsensus(PK_A, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT),
            _signConsensus(PK_B, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT),
            _signConsensus(PK_C, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT)
        ];
        vm.expectRevert(TriSign.AlreadySealed.selector);
        trisign.submitConsensus(MEETING_ID, FINAL_ROOT, DISPUTES_ROOT, sigs);
    }

    // ── test 8: submitConsensus reverts if meeting not started ────────────────

    function test_submitConsensus_revert_notStarted() public {
        bytes[3] memory sigs = [
            _signConsensus(PK_A, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT),
            _signConsensus(PK_B, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT),
            _signConsensus(PK_C, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT)
        ];
        vm.expectRevert(TriSign.NotStarted.selector);
        trisign.submitConsensus(MEETING_ID, FINAL_ROOT, DISPUTES_ROOT, sigs);
    }
}
