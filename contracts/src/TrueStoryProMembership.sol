// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TrueStory Pro Monthly Membership — soulbound NFT pass
/// @notice One-time payment of 5 MON, grants Pro privileges for 30 days.
///         Cannot be transferred (EIP-5192 soulbound). Each wallet can hold one active card;
///         purchasing again issues a new card, the previous becomes inactive but stays in wallet as record.
contract TrueStoryProMembership {
    // ── errors ────────────────────────────────────────────────────────────────

    error Soulbound();
    error WrongAmount(uint256 sent, uint256 required);
    error WithdrawFailed();
    error NotOwner();

    // ── constants ─────────────────────────────────────────────────────────────

    uint256 public constant PRICE = 5 ether;       // 5 MON
    uint256 public constant DURATION = 30 days;

    string public constant name = "trueStory Pro Membership";
    string public constant symbol = "TSPRO";

    // ── storage ───────────────────────────────────────────────────────────────

    address public owner;
    uint256 private _nextTokenId = 1;

    struct Membership {
        uint256 startAt;
        uint256 endAt;
        address holder;
    }

    mapping(uint256 => Membership) public memberships;
    mapping(address => uint256) public activeTokenOf;  // wallet → most recent token id
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;

    // ── events ────────────────────────────────────────────────────────────────

    event MembershipPurchased(address indexed holder, uint256 indexed tokenId, uint256 endAt);
    event Locked(uint256 tokenId);  // EIP-5192
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor() {
        owner = msg.sender;
    }

    // ── external write ────────────────────────────────────────────────────────

    function purchase() external payable returns (uint256 tokenId) {
        if (msg.value != PRICE) revert WrongAmount(msg.value, PRICE);

        tokenId = _nextTokenId++;
        memberships[tokenId] = Membership({
            startAt: block.timestamp,
            endAt: block.timestamp + DURATION,
            holder: msg.sender
        });

        _ownerOf[tokenId] = msg.sender;
        _balanceOf[msg.sender] += 1;
        activeTokenOf[msg.sender] = tokenId;

        emit Transfer(address(0), msg.sender, tokenId);
        emit MembershipPurchased(msg.sender, tokenId, block.timestamp + DURATION);
        emit Locked(tokenId);  // EIP-5192 soulbound declaration
    }

    function withdraw() external {
        if (msg.sender != owner) revert NotOwner();
        uint256 bal = address(this).balance;
        (bool ok, ) = owner.call{value: bal}("");
        if (!ok) revert WithdrawFailed();
    }

    // ── external view ─────────────────────────────────────────────────────────

    /// @notice Returns true if the given wallet has an active (unexpired) membership.
    function isActive(address user) external view returns (bool) {
        uint256 tokenId = activeTokenOf[user];
        if (tokenId == 0) return false;
        return memberships[tokenId].endAt > block.timestamp;
    }

    function getMembership(address user) external view returns (Membership memory) {
        uint256 tokenId = activeTokenOf[user];
        if (tokenId == 0) return Membership(0, 0, address(0));
        return memberships[tokenId];
    }

    // ── ERC-721 minimal surface (read-only / blocked transfers) ──────────────

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _ownerOf[tokenId];
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balanceOf[account];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        Membership memory m = memberships[tokenId];
        if (m.holder == address(0)) return "";
        // Inline minimal JSON metadata; could point to off-chain JSON later
        return string(abi.encodePacked(
            "data:application/json;utf8,{\"name\":\"trueStory Pro Membership #",
            _toString(tokenId),
            "\",\"description\":\"30-day Pro pass, soulbound\"}"
        ));
    }

    /// @notice EIP-5192: token is always locked (soulbound).
    function locked(uint256 /* tokenId */) external pure returns (bool) {
        return true;
    }

    /// @notice EIP-165 support: ERC-721 + EIP-5192
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd ||  // ERC-721
            interfaceId == 0xb45a3c0e ||  // EIP-5192 locked
            interfaceId == 0x01ffc9a7;    // ERC-165
    }

    // ── transfer functions all revert ────────────────────────────────────────

    function transferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert Soulbound(); }
    function approve(address, uint256) external pure { revert Soulbound(); }
    function setApprovalForAll(address, bool) external pure { revert Soulbound(); }
    function getApproved(uint256) external pure returns (address) { return address(0); }
    function isApprovedForAll(address, address) external pure returns (bool) { return false; }

    // ── helpers ───────────────────────────────────────────────────────────────

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
