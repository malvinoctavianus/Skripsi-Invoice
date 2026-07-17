// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./UserRegistry.sol";

/// @title CounterpartyRegistry
/// @notice Legal-maintained on-chain list of counterparties (mitra/nama perusahaan kedua +
///         alamat) used when drafting contracts, so counterparty data stays consistent and
///         auditable instead of being freely retyped on every contract. New counterparties
///         and edits both require Admin approval before they can be used on a contract, and
///         every edit is kept as history rather than silently overwritten.
contract CounterpartyRegistry {
    enum CounterpartyStatus {
        Pending,
        Approved,
        Rejected
    }

    struct Counterparty {
        uint256 id;
        string name;
        string alamat;
        address addedBy;
        uint256 addedAt;
        address lastEditedBy;
        uint256 lastEditedAt;
        CounterpartyStatus status;
        address reviewedBy;
        uint256 reviewedAt;
        string reviewNote;
    }

    struct CounterpartyEdit {
        string name;
        string alamat;
        address editedBy;
        uint256 editedAt;
    }

    UserRegistry public immutable registry;

    uint256 public nextCounterpartyId = 1;
    mapping(uint256 => Counterparty) private counterparties;
    uint256[] private counterpartyIds;
    mapping(uint256 => CounterpartyEdit[]) private editHistory;
    mapping(bytes32 => bool) private activeNameHashes;

    event CounterpartyAdded(uint256 indexed id, string name, address indexed addedBy, uint256 timestamp);
    event CounterpartyEdited(uint256 indexed id, string name, address indexed editedBy, uint256 timestamp);
    event CounterpartyReviewed(
        uint256 indexed id,
        CounterpartyStatus status,
        address indexed reviewedBy,
        string note,
        uint256 timestamp
    );

    modifier onlyLegal() {
        (, UserRegistry.Role role, bool isRegistered, ) = registry.getUser(msg.sender);
        require(isRegistered, "CounterpartyRegistry: wallet not registered");
        require(role == UserRegistry.Role.Legal, "CounterpartyRegistry: wrong role");
        _;
    }

    modifier onlyAdmin() {
        (, UserRegistry.Role role, bool isRegistered, ) = registry.getUser(msg.sender);
        require(isRegistered, "CounterpartyRegistry: wallet not registered");
        require(role == UserRegistry.Role.Admin, "CounterpartyRegistry: wrong role");
        _;
    }

    constructor(address userRegistryAddress) {
        registry = UserRegistry(userRegistryAddress);
    }

    function _nameHash(string memory name) private pure returns (bytes32) {
        return keccak256(bytes(name));
    }

    function addCounterparty(string calldata name, string calldata alamat)
        external
        onlyLegal
        returns (uint256 id)
    {
        require(bytes(name).length > 0, "CounterpartyRegistry: name required");
        require(bytes(alamat).length > 0, "CounterpartyRegistry: address required");
        bytes32 hash = _nameHash(name);
        require(!activeNameHashes[hash], "CounterpartyRegistry: counterparty name already exists");

        id = nextCounterpartyId++;
        counterparties[id] = Counterparty({
            id: id,
            name: name,
            alamat: alamat,
            addedBy: msg.sender,
            addedAt: block.timestamp,
            lastEditedBy: address(0),
            lastEditedAt: 0,
            status: CounterpartyStatus.Pending,
            reviewedBy: address(0),
            reviewedAt: 0,
            reviewNote: ""
        });
        counterpartyIds.push(id);
        activeNameHashes[hash] = true;

        emit CounterpartyAdded(id, name, msg.sender, block.timestamp);
    }

    function editCounterparty(uint256 id, string calldata name, string calldata alamat) external {
        require(id > 0 && id < nextCounterpartyId, "CounterpartyRegistry: counterparty does not exist");
        require(bytes(name).length > 0, "CounterpartyRegistry: name required");
        require(bytes(alamat).length > 0, "CounterpartyRegistry: address required");

        Counterparty storage counterparty = counterparties[id];
        require(
            counterparty.status != CounterpartyStatus.Approved,
            "CounterpartyRegistry: approved counterparty cannot be edited"
        );

        (, UserRegistry.Role role, bool isRegistered, ) = registry.getUser(msg.sender);
        require(isRegistered, "CounterpartyRegistry: wallet not registered");
        require(
            msg.sender == counterparty.addedBy || role == UserRegistry.Role.Admin,
            "CounterpartyRegistry: not allowed to edit this counterparty"
        );

        bytes32 oldHash = _nameHash(counterparty.name);
        bytes32 newHash = _nameHash(name);
        if (newHash != oldHash) {
            require(!activeNameHashes[newHash], "CounterpartyRegistry: counterparty name already exists");
            activeNameHashes[oldHash] = false;
            activeNameHashes[newHash] = true;
        }

        editHistory[id].push(
            CounterpartyEdit({ name: counterparty.name, alamat: counterparty.alamat, editedBy: msg.sender, editedAt: block.timestamp })
        );

        counterparty.name = name;
        counterparty.alamat = alamat;
        counterparty.lastEditedBy = msg.sender;
        counterparty.lastEditedAt = block.timestamp;
        // Edited data must be re-verified before it can be used again.
        counterparty.status = CounterpartyStatus.Pending;
        counterparty.reviewedBy = address(0);
        counterparty.reviewedAt = 0;
        counterparty.reviewNote = "";

        emit CounterpartyEdited(id, name, msg.sender, block.timestamp);
    }

    function reviewCounterparty(uint256 id, bool approve, string calldata note) external onlyAdmin {
        require(id > 0 && id < nextCounterpartyId, "CounterpartyRegistry: counterparty does not exist");
        Counterparty storage counterparty = counterparties[id];
        require(counterparty.status == CounterpartyStatus.Pending, "CounterpartyRegistry: counterparty not pending review");

        counterparty.status = approve ? CounterpartyStatus.Approved : CounterpartyStatus.Rejected;
        counterparty.reviewedBy = msg.sender;
        counterparty.reviewedAt = block.timestamp;
        counterparty.reviewNote = note;

        if (!approve) {
            activeNameHashes[_nameHash(counterparty.name)] = false;
        }

        emit CounterpartyReviewed(id, counterparty.status, msg.sender, note, block.timestamp);
    }

    function getAllCounterparties() external view returns (Counterparty[] memory) {
        Counterparty[] memory result = new Counterparty[](counterpartyIds.length);
        for (uint256 i = 0; i < counterpartyIds.length; i++) {
            result[i] = counterparties[counterpartyIds[i]];
        }
        return result;
    }

    function getApprovedCounterparties() external view returns (Counterparty[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < counterpartyIds.length; i++) {
            if (counterparties[counterpartyIds[i]].status == CounterpartyStatus.Approved) count++;
        }
        Counterparty[] memory result = new Counterparty[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < counterpartyIds.length; i++) {
            Counterparty storage counterparty = counterparties[counterpartyIds[i]];
            if (counterparty.status == CounterpartyStatus.Approved) {
                result[j++] = counterparty;
            }
        }
        return result;
    }

    function getCounterparty(uint256 id) external view returns (Counterparty memory) {
        require(id > 0 && id < nextCounterpartyId, "CounterpartyRegistry: counterparty does not exist");
        return counterparties[id];
    }

    function getCounterpartyEditHistory(uint256 id) external view returns (CounterpartyEdit[] memory) {
        require(id > 0 && id < nextCounterpartyId, "CounterpartyRegistry: counterparty does not exist");
        return editHistory[id];
    }
}
