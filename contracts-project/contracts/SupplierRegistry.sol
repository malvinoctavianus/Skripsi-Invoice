// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./UserRegistry.sol";

/// @title SupplierRegistry
/// @notice Purchasing-maintained on-chain list of suppliers (name + address) used when
///         creating invoices, so supplier data stays consistent and auditable instead of
///         being freely retyped on every invoice. New suppliers and edits both require
///         Admin approval before they can be used on an invoice, and every edit is kept
///         as history rather than silently overwritten.
contract SupplierRegistry {
    enum SupplierStatus {
        Pending,
        Approved,
        Rejected
    }

    struct Supplier {
        uint256 id;
        string name;
        string alamat;
        address addedBy;
        uint256 addedAt;
        address lastEditedBy;
        uint256 lastEditedAt;
        SupplierStatus status;
        address reviewedBy;
        uint256 reviewedAt;
        string reviewNote;
    }

    struct SupplierEdit {
        string name;
        string alamat;
        address editedBy;
        uint256 editedAt;
    }

    UserRegistry public immutable registry;

    uint256 public nextSupplierId = 1;
    mapping(uint256 => Supplier) private suppliers;
    uint256[] private supplierIds;
    mapping(uint256 => SupplierEdit[]) private editHistory;
    mapping(bytes32 => bool) private activeNameHashes;

    event SupplierAdded(uint256 indexed id, string name, address indexed addedBy, uint256 timestamp);
    event SupplierEdited(uint256 indexed id, string name, address indexed editedBy, uint256 timestamp);
    event SupplierReviewed(
        uint256 indexed id,
        SupplierStatus status,
        address indexed reviewedBy,
        string note,
        uint256 timestamp
    );

    modifier onlyPurchasing() {
        (, UserRegistry.Role role, bool isRegistered, ) = registry.getUser(msg.sender);
        require(isRegistered, "SupplierRegistry: wallet not registered");
        require(role == UserRegistry.Role.Purchasing, "SupplierRegistry: wrong role");
        _;
    }

    modifier onlyAdmin() {
        (, UserRegistry.Role role, bool isRegistered, ) = registry.getUser(msg.sender);
        require(isRegistered, "SupplierRegistry: wallet not registered");
        require(role == UserRegistry.Role.Admin, "SupplierRegistry: wrong role");
        _;
    }

    constructor(address userRegistryAddress) {
        registry = UserRegistry(userRegistryAddress);
    }

    function _nameHash(string memory name) private pure returns (bytes32) {
        return keccak256(bytes(name));
    }

    function addSupplier(string calldata name, string calldata alamat)
        external
        onlyPurchasing
        returns (uint256 id)
    {
        require(bytes(name).length > 0, "SupplierRegistry: name required");
        require(bytes(alamat).length > 0, "SupplierRegistry: address required");
        bytes32 hash = _nameHash(name);
        require(!activeNameHashes[hash], "SupplierRegistry: supplier name already exists");

        id = nextSupplierId++;
        suppliers[id] = Supplier({
            id: id,
            name: name,
            alamat: alamat,
            addedBy: msg.sender,
            addedAt: block.timestamp,
            lastEditedBy: address(0),
            lastEditedAt: 0,
            status: SupplierStatus.Pending,
            reviewedBy: address(0),
            reviewedAt: 0,
            reviewNote: ""
        });
        supplierIds.push(id);
        activeNameHashes[hash] = true;

        emit SupplierAdded(id, name, msg.sender, block.timestamp);
    }

    function editSupplier(uint256 id, string calldata name, string calldata alamat) external {
        require(id > 0 && id < nextSupplierId, "SupplierRegistry: supplier does not exist");
        require(bytes(name).length > 0, "SupplierRegistry: name required");
        require(bytes(alamat).length > 0, "SupplierRegistry: address required");

        Supplier storage supplier = suppliers[id];

        (, UserRegistry.Role role, bool isRegistered, ) = registry.getUser(msg.sender);
        require(isRegistered, "SupplierRegistry: wallet not registered");
        require(
            msg.sender == supplier.addedBy || role == UserRegistry.Role.Admin,
            "SupplierRegistry: not allowed to edit this supplier"
        );

        bytes32 oldHash = _nameHash(supplier.name);
        bytes32 newHash = _nameHash(name);
        if (newHash != oldHash) {
            require(!activeNameHashes[newHash], "SupplierRegistry: supplier name already exists");
            activeNameHashes[oldHash] = false;
            activeNameHashes[newHash] = true;
        }

        editHistory[id].push(
            SupplierEdit({ name: supplier.name, alamat: supplier.alamat, editedBy: msg.sender, editedAt: block.timestamp })
        );

        supplier.name = name;
        supplier.alamat = alamat;
        supplier.lastEditedBy = msg.sender;
        supplier.lastEditedAt = block.timestamp;
        // Edited data must be re-verified before it can be used again.
        supplier.status = SupplierStatus.Pending;
        supplier.reviewedBy = address(0);
        supplier.reviewedAt = 0;
        supplier.reviewNote = "";

        emit SupplierEdited(id, name, msg.sender, block.timestamp);
    }

    function reviewSupplier(uint256 id, bool approve, string calldata note) external onlyAdmin {
        require(id > 0 && id < nextSupplierId, "SupplierRegistry: supplier does not exist");
        Supplier storage supplier = suppliers[id];
        require(supplier.status == SupplierStatus.Pending, "SupplierRegistry: supplier not pending review");

        supplier.status = approve ? SupplierStatus.Approved : SupplierStatus.Rejected;
        supplier.reviewedBy = msg.sender;
        supplier.reviewedAt = block.timestamp;
        supplier.reviewNote = note;

        if (!approve) {
            activeNameHashes[_nameHash(supplier.name)] = false;
        }

        emit SupplierReviewed(id, supplier.status, msg.sender, note, block.timestamp);
    }

    function getAllSuppliers() external view returns (Supplier[] memory) {
        Supplier[] memory result = new Supplier[](supplierIds.length);
        for (uint256 i = 0; i < supplierIds.length; i++) {
            result[i] = suppliers[supplierIds[i]];
        }
        return result;
    }

    function getApprovedSuppliers() external view returns (Supplier[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < supplierIds.length; i++) {
            if (suppliers[supplierIds[i]].status == SupplierStatus.Approved) count++;
        }
        Supplier[] memory result = new Supplier[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < supplierIds.length; i++) {
            Supplier storage supplier = suppliers[supplierIds[i]];
            if (supplier.status == SupplierStatus.Approved) {
                result[j++] = supplier;
            }
        }
        return result;
    }

    function getSupplier(uint256 id) external view returns (Supplier memory) {
        require(id > 0 && id < nextSupplierId, "SupplierRegistry: supplier does not exist");
        return suppliers[id];
    }

    function getSupplierEditHistory(uint256 id) external view returns (SupplierEdit[] memory) {
        require(id > 0 && id < nextSupplierId, "SupplierRegistry: supplier does not exist");
        return editHistory[id];
    }
}
