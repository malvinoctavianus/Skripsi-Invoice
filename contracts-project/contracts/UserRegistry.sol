// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title UserRegistry
/// @notice Handles wallet-based registration and login for the invoice approval system.
/// @dev Design notes (why it's built this way):
///      - The admin wallet is fixed at deployment (immutable) and can never be changed,
///        matching the requirement that the admin identity is permanently trusted.
///      - Only the admin can register new users (Purchasing / Finance / Manager), since
///        every new wallet must be validated by the admin before it can transact.
///      - Passwords are NEVER sent to the contract in plaintext. The frontend hashes the
///        password with Keccak256, salted with the wallet address
///        (keccak256(abi.encodePacked(wallet, password))), before it is submitted. This
///        keeps plaintext secrets out of transaction calldata, which is permanently public
///        on-chain, while still allowing the contract to verify a password server-side (i.e.
///        on-chain) without trusting a centralized backend.
///      - "Login" is a read-only (view) check: the wallet connection itself (a signed
///        MetaMask session) already proves control of the private key; the password hash
///        check is a second factor tied to the registered account record.
///      - changePassword is a real transaction (it mutates state), so it is inherently
///        authenticated by msg.sender - only the wallet's private key holder can call it for
///        their own account. Its result (a new password hash) is written into the blockchain,
///        satisfying the "password change must enter the blockchain" requirement.
contract UserRegistry {
    enum Role {
        None,
        Admin,
        Purchasing,
        Finance,
        Manager
    }

    struct User {
        string username;
        bytes32 passwordHash;
        Role role;
        bool isRegistered;
        uint256 registeredAt;
    }

    /// @notice The one and only admin wallet, fixed forever at deployment.
    address public immutable admin;

    mapping(address => User) private users;
    address[] private registeredWallets;

    event UserRegistered(address indexed wallet, string username, Role role, uint256 timestamp);
    event PasswordChanged(address indexed wallet, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "UserRegistry: caller is not admin");
        _;
    }

    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "UserRegistry: wallet not registered");
        _;
    }

    /// @param adminUsername Username shown for the admin account.
    /// @param adminPasswordHash Keccak256(abi.encodePacked(adminWallet, adminPassword)), computed off-chain.
    constructor(string memory adminUsername, bytes32 adminPasswordHash) {
        admin = msg.sender;
        users[msg.sender] = User({
            username: adminUsername,
            passwordHash: adminPasswordHash,
            role: Role.Admin,
            isRegistered: true,
            registeredAt: block.timestamp
        });
        registeredWallets.push(msg.sender);
        emit UserRegistered(msg.sender, adminUsername, Role.Admin, block.timestamp);
    }

    /// @notice Admin-only registration of a new Purchasing/Finance/Manager wallet.
    /// @param wallet The MetaMask address being registered.
    /// @param username Human-readable identity used during smart-contract handshakes.
    /// @param initialPasswordHash Keccak256(abi.encodePacked(wallet, tempPassword)), computed off-chain by the admin UI.
    /// @param role Must be Purchasing, Finance, or Manager (never None/Admin).
    function registerUser(
        address wallet,
        string calldata username,
        bytes32 initialPasswordHash,
        Role role
    ) external onlyAdmin {
        require(wallet != address(0), "UserRegistry: zero address");
        require(!users[wallet].isRegistered, "UserRegistry: wallet already registered");
        require(bytes(username).length > 0, "UserRegistry: username required");
        require(
            role == Role.Purchasing || role == Role.Finance || role == Role.Manager,
            "UserRegistry: invalid role"
        );

        users[wallet] = User({
            username: username,
            passwordHash: initialPasswordHash,
            role: role,
            isRegistered: true,
            registeredAt: block.timestamp
        });
        registeredWallets.push(wallet);

        emit UserRegistered(wallet, username, role, block.timestamp);
    }

    /// @notice Read-only login check. No plaintext or transaction involved.
    /// @param wallet The connected MetaMask address.
    /// @param passwordHash Keccak256(abi.encodePacked(wallet, password)) computed client-side.
    function login(address wallet, bytes32 passwordHash) external view returns (bool success, string memory username, Role role) {
        User storage u = users[wallet];
        if (u.isRegistered && u.passwordHash == passwordHash) {
            return (true, u.username, u.role);
        }
        return (false, "", Role.None);
    }

    /// @notice Lets a logged-in wallet change its own password. Writes the new hash to the blockchain.
    /// @param oldPasswordHash Keccak256(abi.encodePacked(msg.sender, oldPassword)).
    /// @param newPasswordHash Keccak256(abi.encodePacked(msg.sender, newPassword)).
    function changePassword(bytes32 oldPasswordHash, bytes32 newPasswordHash) external onlyRegistered {
        require(users[msg.sender].passwordHash == oldPasswordHash, "UserRegistry: old password mismatch");
        require(newPasswordHash != bytes32(0), "UserRegistry: new password hash required");
        users[msg.sender].passwordHash = newPasswordHash;
        emit PasswordChanged(msg.sender, block.timestamp);
    }

    function getUser(address wallet) external view returns (string memory username, Role role, bool isRegistered, uint256 registeredAt) {
        User storage u = users[wallet];
        return (u.username, u.role, u.isRegistered, u.registeredAt);
    }

    function getAllWallets() external view returns (address[] memory) {
        return registeredWallets;
    }

    function isWalletRegistered(address wallet) external view returns (bool) {
        return users[wallet].isRegistered;
    }
}
