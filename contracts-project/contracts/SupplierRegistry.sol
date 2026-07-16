// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./UserRegistry.sol";

/// @title SupplierRegistry
/// @notice Purchasing-maintained on-chain list of suppliers (name + address) used when
///         creating invoices, so supplier data stays consistent and auditable instead of
///         being freely retyped on every invoice.
contract SupplierRegistry {
    struct Supplier {
        uint256 id;
        string name;
        string alamat;
        address addedBy;
        uint256 addedAt;
    }

    UserRegistry public immutable registry;

    uint256 public nextSupplierId = 1;
    mapping(uint256 => Supplier) private suppliers;
    uint256[] private supplierIds;

    event SupplierAdded(uint256 indexed id, string name, address indexed addedBy, uint256 timestamp);

    modifier onlyPurchasing() {
        (, UserRegistry.Role role, bool isRegistered, ) = registry.getUser(msg.sender);
        require(isRegistered, "SupplierRegistry: wallet not registered");
        require(role == UserRegistry.Role.Purchasing, "SupplierRegistry: wrong role");
        _;
    }

    constructor(address userRegistryAddress) {
        registry = UserRegistry(userRegistryAddress);
    }

    function addSupplier(string calldata name, string calldata alamat)
        external
        onlyPurchasing
        returns (uint256 id)
    {
        require(bytes(name).length > 0, "SupplierRegistry: name required");
        require(bytes(alamat).length > 0, "SupplierRegistry: address required");

        id = nextSupplierId++;
        suppliers[id] = Supplier({
            id: id,
            name: name,
            alamat: alamat,
            addedBy: msg.sender,
            addedAt: block.timestamp
        });
        supplierIds.push(id);

        emit SupplierAdded(id, name, msg.sender, block.timestamp);
    }

    function getAllSuppliers() external view returns (Supplier[] memory) {
        Supplier[] memory result = new Supplier[](supplierIds.length);
        for (uint256 i = 0; i < supplierIds.length; i++) {
            result[i] = suppliers[supplierIds[i]];
        }
        return result;
    }

    function getSupplier(uint256 id) external view returns (Supplier memory) {
        require(id > 0 && id < nextSupplierId, "SupplierRegistry: supplier does not exist");
        return suppliers[id];
    }
}
