// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IProMembership {
    function isActive(address user) external view returns (bool);
}

interface IAttestationNFT {
    function mintFor(
        address to,
        bytes32 meetingId,
        string calldata arweaveTxId,
        bytes32 litAccRef
    ) external returns (uint256);
}

/// @title TrueStory Pro Payment — handles single-meeting Pro upgrade payments and finalization
/// @notice Two distinct flows:
///         1) payForProMeeting: paid at meeting creation. Captures fee.
///         2) finalizeProUpgrade: called by backend after Arweave upload + Lit registration done.
///            Mints N attestation NFTs (if not skipped) atomically. Failure → refund() reverses payment.
contract TrueStoryProPayment {
    // ── errors ────────────────────────────────────────────────────────────────

    error NotOwner();
    error WrongAmount(uint256 sent, uint256 required);
    error AlreadyPaid(bytes32 meetingId);
    error NotPaid(bytes32 meetingId);
    error AlreadyFinalized(bytes32 meetingId);
    error RefundFailed();
    error WithdrawFailed();

    uint256 public constant SINGLE_PRICE = 0.5 ether;  // 0.5 MON

    address public owner;
    IProMembership public immutable membership;
    IAttestationNFT public immutable attestation;

    enum Status { Unpaid, Paid, Finalized, Refunded }

    struct ProMeeting {
        address payer;
        uint256 paidAmount;       // 0 if membership-covered
        Status status;
    }

    mapping(bytes32 => ProMeeting) public proMeetings;

    event ProMeetingPaid(bytes32 indexed meetingId, address indexed payer, uint256 amount);
    event ProUpgradeFinalized(bytes32 indexed meetingId, string arweaveTxId, bytes32 litAccRef);
    event ProUpgradeRefunded(bytes32 indexed meetingId, address indexed payer, uint256 amount);

    constructor(address membershipAddr, address attestationAddr) {
        owner = msg.sender;
        membership = IProMembership(membershipAddr);
        attestation = IAttestationNFT(attestationAddr);
    }

    /// @notice Pay for a Pro meeting at creation time. Capacity:
    ///         - Membership active: must send 0 (free)
    ///         - No membership: must send exactly SINGLE_PRICE
    function payForProMeeting(bytes32 meetingId) external payable {
        if (proMeetings[meetingId].status != Status.Unpaid) revert AlreadyPaid(meetingId);

        bool hasMembership = membership.isActive(msg.sender);
        uint256 required = hasMembership ? 0 : SINGLE_PRICE;
        if (msg.value != required) revert WrongAmount(msg.value, required);

        proMeetings[meetingId] = ProMeeting({
            payer: msg.sender,
            paidAmount: msg.value,
            status: Status.Paid
        });

        emit ProMeetingPaid(meetingId, msg.sender, msg.value);
    }

    /// @notice Called by backend (owner) after Arweave + Lit + (optional) NFT mints succeed.
    ///         Atomic: if any minting reverts, the whole tx reverts and payment stays held —
    ///         backend can then call refund() in a separate tx.
    function finalizeProUpgrade(
        bytes32 meetingId,
        address[] calldata participants,
        string calldata arweaveTxId,
        bytes32 litAccRef,
        bool mintAttestation
    ) external {
        if (msg.sender != owner) revert NotOwner();
        ProMeeting storage m = proMeetings[meetingId];
        if (m.status != Status.Paid) revert NotPaid(meetingId);

        m.status = Status.Finalized;

        if (mintAttestation) {
            for (uint256 i = 0; i < participants.length; i++) {
                attestation.mintFor(participants[i], meetingId, arweaveTxId, litAccRef);
            }
        }

        emit ProUpgradeFinalized(meetingId, arweaveTxId, litAccRef);
    }

    /// @notice Refund a paid-but-not-finalized meeting (e.g., Arweave upload failed).
    ///         Called by backend (owner) after detecting failure in off-chain pipeline.
    function refund(bytes32 meetingId) external {
        if (msg.sender != owner) revert NotOwner();
        ProMeeting storage m = proMeetings[meetingId];
        if (m.status != Status.Paid) revert NotPaid(meetingId);
        if (m.status == Status.Finalized) revert AlreadyFinalized(meetingId);

        uint256 amount = m.paidAmount;
        address payer = m.payer;
        m.status = Status.Refunded;

        if (amount > 0) {
            (bool ok, ) = payer.call{value: amount}("");
            if (!ok) revert RefundFailed();
        }

        emit ProUpgradeRefunded(meetingId, payer, amount);
    }

    /// @notice Owner withdraws accumulated fees from finalized meetings.
    function withdraw() external {
        if (msg.sender != owner) revert NotOwner();
        uint256 bal = address(this).balance;
        (bool ok, ) = owner.call{value: bal}("");
        if (!ok) revert WithdrawFailed();
    }

    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        owner = newOwner;
    }

    function getStatus(bytes32 meetingId) external view returns (Status) {
        return proMeetings[meetingId].status;
    }
}
