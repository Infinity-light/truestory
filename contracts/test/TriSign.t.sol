// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {TriSign} from "../src/TriSign.sol";

contract TriSignTest is Test {
    TriSign public trisign;

    uint256 internal constant PK_A = 0xA11CE;
    uint256 internal constant PK_B = 0xB0B;
    uint256 internal constant PK_C = 0xC0DE;

    address internal addrA;
    address internal addrB;
    address internal addrC;

    bytes32 internal constant MEETING_ID = keccak256("meeting-001");
    bytes32 internal constant FINAL_ROOT = keccak256("messages-root");
    bytes32 internal constant DISPUTES_ROOT = keccak256("disputes-root");

    function setUp() public {
        trisign = new TriSign();
        addrA = vm.addr(PK_A);
        addrB = vm.addr(PK_B);
        addrC = vm.addr(PK_C);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    function _ethSignedHash(bytes32 meetingId, bytes32 finalRoot, bytes32 disputesRoot)
        internal
        pure
        returns (bytes32)
    {
        bytes32 raw = keccak256(
            abi.encodePacked("TriSign End: ", meetingId, finalRoot, disputesRoot)
        );
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", raw));
    }

    function _sign(uint256 pk, bytes32 meetingId, bytes32 finalRoot, bytes32 disputesRoot)
        internal
        pure
        returns (bytes memory)
    {
        bytes32 h = _ethSignedHash(meetingId, finalRoot, disputesRoot);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, h);
        return abi.encodePacked(r, s, v);
    }

    function _submitAs(uint256 pk, address caller) internal {
        vm.prank(caller);
        trisign.submitConsensusSignature(
            MEETING_ID,
            [addrA, addrB, addrC],
            FINAL_ROOT,
            DISPUTES_ROOT,
            _sign(pk, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT)
        );
    }

    // ── test 1: first signer sets participants; meeting not sealed yet ─────────

    function test_firstSignature_pendingState() public {
        _submitAs(PK_A, addrA);

        TriSign.Meeting memory m = trisign.getMeeting(MEETING_ID);
        assertEq(m.signedCount, 1);
        assertFalse(m.isSealed);
        assertEq(m.endSigs[0].signer, addrA);
    }

    // ── test 2: all three sign → meeting sealed ───────────────────────────────

    function test_allThreeSigns_sealsmeeting() public {
        _submitAs(PK_A, addrA);
        _submitAs(PK_B, addrB);
        _submitAs(PK_C, addrC);

        TriSign.Meeting memory m = trisign.getMeeting(MEETING_ID);
        assertTrue(m.isSealed);
        assertEq(m.signedCount, 3);
        assertGt(m.sealedAt, 0);
    }

    // ── test 3: verifyMeeting returns true after sealing ─────────────────────

    function test_verifyMeeting_correctRoot() public {
        _submitAs(PK_A, addrA);
        _submitAs(PK_B, addrB);
        _submitAs(PK_C, addrC);

        (bool isValid, address[3] memory signers, bool isSealed) =
            trisign.verifyMeeting(MEETING_ID, FINAL_ROOT);

        assertTrue(isValid);
        assertTrue(isSealed);
        assertEq(signers[0], addrA);
        assertEq(signers[1], addrB);
        assertEq(signers[2], addrC);
    }

    // ── test 4: verifyMeeting returns false for tampered root ─────────────────

    function test_verifyMeeting_wrongRoot() public {
        _submitAs(PK_A, addrA);
        _submitAs(PK_B, addrB);
        _submitAs(PK_C, addrC);

        (bool isValid,,) = trisign.verifyMeeting(MEETING_ID, keccak256("tampered"));
        assertFalse(isValid);
    }

    // ── test 5: double-sign reverts ───────────────────────────────────────────

    function test_revert_doubleSigning() public {
        _submitAs(PK_A, addrA);

        vm.prank(addrA);
        vm.expectRevert(abi.encodeWithSelector(TriSign.AlreadySigned.selector, MEETING_ID, addrA));
        trisign.submitConsensusSignature(
            MEETING_ID,
            [addrA, addrB, addrC],
            FINAL_ROOT,
            DISPUTES_ROOT,
            _sign(PK_A, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT)
        );
    }

    // ── test 6: non-participant reverts ───────────────────────────────────────

    function test_revert_notParticipant() public {
        uint256 outsiderPk = 0xDEAD;
        address outsider = vm.addr(outsiderPk);

        bytes memory sig = _sign(outsiderPk, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT);

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(TriSign.NotParticipant.selector, MEETING_ID, outsider));
        trisign.submitConsensusSignature(
            MEETING_ID, [addrA, addrB, addrC], FINAL_ROOT, DISPUTES_ROOT, sig
        );
    }

    // ── test 7: submit after sealed reverts ───────────────────────────────────

    function test_revert_submitAfterSealed() public {
        _submitAs(PK_A, addrA);
        _submitAs(PK_B, addrB);
        _submitAs(PK_C, addrC);

        // any caller after sealed hits AlreadySealed
        vm.prank(addrA);
        vm.expectRevert(abi.encodeWithSelector(TriSign.AlreadySealed.selector, MEETING_ID));
        trisign.submitConsensusSignature(
            MEETING_ID,
            [addrA, addrB, addrC],
            FINAL_ROOT,
            DISPUTES_ROOT,
            _sign(PK_A, MEETING_ID, FINAL_ROOT, DISPUTES_ROOT)
        );
    }

    // ── test 8: root mismatch reverts ─────────────────────────────────────────

    function test_revert_rootMismatch() public {
        // A signs with FINAL_ROOT
        _submitAs(PK_A, addrA);

        // B tries to sign with a different root
        bytes32 differentRoot = keccak256("different-messages");
        bytes memory sig = _sign(PK_B, MEETING_ID, differentRoot, DISPUTES_ROOT);

        vm.prank(addrB);
        vm.expectRevert(abi.encodeWithSelector(TriSign.RootMismatch.selector, MEETING_ID));
        trisign.submitConsensusSignature(
            MEETING_ID, [addrA, addrB, addrC], differentRoot, DISPUTES_ROOT, sig
        );
    }
}
