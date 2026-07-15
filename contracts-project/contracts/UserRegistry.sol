// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title UserRegistry
/// @notice Handles wallet-based registration for the invoice approval system.
/// @dev Design notes (why it's built this way):
///      - The admin wallet is fixed at deployment (immutable) and can never be changed,
///        matching the requirement that the admin identity is permanently trusted.
///      - Only the admin can register new users (Purchasing / Finance / Manager), since
///        every new wallet must be validated by the admin before it can transact.
///      - Authentication is wallet-only: connecting the registered MetaMask wallet already
///        proves control of the private key, so there is no separate password. A wallet is
///        either registered with a role or it isn't - connecting it is enough to use the app.
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
        Role role;
        bool isRegistered;
        uint256 registeredAt;
    }

    /// @notice The one and only admin wallet, fixed forever at deployment.
    address public immutable admin;

    mapping(address => User) private users;
    address[] private registeredWallets;

    event UserRegistered(address indexed wallet, string username, Role role, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "UserRegistry: caller is not admin");
        _;
    }

    /// @param adminUsername Username shown for the admin account.
    constructor(string memory adminUsername) {
        admin = msg.sender;
        users[msg.sender] = User({
            username: adminUsername,
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
    /// @param role Must be Purchasing, Finance, or Manager (never None/Admin).
    function registerUser(
        address wallet,
        string calldata username,
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
            role: role,
            isRegistered: true,
            registeredAt: block.timestamp
        });
        registeredWallets.push(wallet);

        emit UserRegistered(wallet, username, role, block.timestamp);
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
