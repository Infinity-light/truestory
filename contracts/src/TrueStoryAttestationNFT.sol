// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TrueStory Meeting Attestation NFT — soulbound participation credential
/// @notice One NFT per participant per Pro meeting. Metadata points to Arweave + Lit ACC reference.
///         Only the authorized minter (TrueStoryProPayment contract) can mint.
contract TrueStoryAttestationNFT {
    error Soulbound();
    error NotMinter();
    error NotOwner();

    string public constant name = "trueStory Meeting Attestation";
    string public constant symbol = "TSATT";

    address public owner;
    address public minter;
    uint256 private _nextTokenId = 1;

    struct Attestation {
        bytes32 meetingId;
        string arweaveTxId;
        bytes32 litAccRef;
        uint256 mintedAt;
    }

    mapping(uint256 => Attestation) public attestations;
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    // wallet → meetingId → tokenId
    mapping(address => mapping(bytes32 => uint256)) public participantToken;

    event AttestationMinted(
        address indexed holder,
        uint256 indexed tokenId,
        bytes32 indexed meetingId,
        string arweaveTxId
    );
    event Locked(uint256 tokenId);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(address initialMinter) {
        owner = msg.sender;
        minter = initialMinter;
    }

    function setMinter(address newMinter) external {
        if (msg.sender != owner) revert NotOwner();
        minter = newMinter;
    }

    /// @notice Mint one attestation NFT to a participant. Only callable by minter contract.
    function mintFor(
        address to,
        bytes32 meetingId,
        string calldata arweaveTxId,
        bytes32 litAccRef
    ) external returns (uint256 tokenId) {
        if (msg.sender != minter) revert NotMinter();

        tokenId = _nextTokenId++;
        attestations[tokenId] = Attestation({
            meetingId: meetingId,
            arweaveTxId: arweaveTxId,
            litAccRef: litAccRef,
            mintedAt: block.timestamp
        });

        _ownerOf[tokenId] = to;
        _balanceOf[to] += 1;
        participantToken[to][meetingId] = tokenId;

        emit Transfer(address(0), to, tokenId);
        emit AttestationMinted(to, tokenId, meetingId, arweaveTxId);
        emit Locked(tokenId);
    }

    // ── view ──────────────────────────────────────────────────────────────────

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _ownerOf[tokenId];
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balanceOf[account];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        Attestation memory a = attestations[tokenId];
        if (_ownerOf[tokenId] == address(0)) return "";
        return string(abi.encodePacked("ar://", a.arweaveTxId));
    }

    function locked(uint256 /* tokenId */) external pure returns (bool) {
        return true;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd ||
            interfaceId == 0xb45a3c0e ||
            interfaceId == 0x01ffc9a7;
    }

    // ── transfers blocked ─────────────────────────────────────────────────────

    function transferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert Soulbound(); }
    function approve(address, uint256) external pure { revert Soulbound(); }
    function setApprovalForAll(address, bool) external pure { revert Soulbound(); }
    function getApproved(uint256) external pure returns (address) { return address(0); }
    function isApprovedForAll(address, address) external pure returns (bool) { return false; }
}
