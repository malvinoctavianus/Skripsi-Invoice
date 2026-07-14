// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./UserRegistry.sol";

/// @title InvoiceApproval
/// @notice Purchasing creates invoices; Finance then Manager must approve them in that
///         order before an invoice is considered final. A final Manager approval mints an
///         ERC721 "approval certificate" to the Purchasing wallet, with fully on-chain
///         metadata (no IPFS/external storage) so the whole system stays self-contained.
/// @dev Role checks are delegated to the already-deployed UserRegistry rather than
///      duplicating role/user state here.
contract InvoiceApproval is ERC721 {
    using Strings for uint256;

    enum Status {
        PendingFinance,
        PendingManager,
        Approved,
        RejectedByFinance,
        RejectedByManager
    }

    struct InvoiceItem {
        string name;
        uint256 qty;
        uint256 unitPrice;
    }

    struct ApprovalRecord {
        address wallet;
        string roleLabel;
        bool approved;
        string note;
        uint256 timestamp;
    }

    struct Invoice {
        uint256 id;
        address purchasing;
        string supplierName;
        uint256 invoiceDate;
        uint256 createdAt;
        uint256 dpAmount;
        uint256 totalAmount;
        Status status;
        InvoiceItem[] items;
        ApprovalRecord[] history;
    }

    UserRegistry public immutable registry;

    uint256 public nextInvoiceId = 1;

    mapping(uint256 => Invoice) private invoices;
    mapping(address => uint256[]) private invoicesByPurchasing;

    event InvoiceCreated(uint256 indexed id, address indexed purchasing, uint256 totalAmount, uint256 timestamp);
    event InvoiceApprovalUpdated(uint256 indexed id, address indexed wallet, Status status, uint256 timestamp);
    event InvoiceCertificateMinted(uint256 indexed id, address indexed purchasing, uint256 timestamp);

    modifier onlyRole(UserRegistry.Role role) {
        (, UserRegistry.Role userRole, bool isRegistered, ) = registry.getUser(msg.sender);
        require(isRegistered, "InvoiceApproval: wallet not registered");
        require(userRole == role, "InvoiceApproval: wrong role");
        _;
    }

    constructor(address userRegistryAddress) ERC721("Invoice Approval Certificate", "IAC") {
        registry = UserRegistry(userRegistryAddress);
    }

    function createInvoice(
        string calldata supplierName,
        uint256 invoiceDate,
        InvoiceItem[] calldata items,
        uint256 dpAmount
    ) external onlyRole(UserRegistry.Role.Purchasing) returns (uint256 id) {
        require(bytes(supplierName).length > 0, "InvoiceApproval: supplier name required");
        require(items.length > 0, "InvoiceApproval: at least one item required");

        uint256 total = 0;
        for (uint256 i = 0; i < items.length; i++) {
            require(items[i].qty > 0, "InvoiceApproval: item qty must be > 0");
            total += items[i].qty * items[i].unitPrice;
        }
        require(dpAmount <= total, "InvoiceApproval: DP exceeds total amount");

        id = nextInvoiceId++;

        Invoice storage inv = invoices[id];
        inv.id = id;
        inv.purchasing = msg.sender;
        inv.supplierName = supplierName;
        inv.invoiceDate = invoiceDate;
        inv.createdAt = block.timestamp;
        inv.dpAmount = dpAmount;
        inv.totalAmount = total;
        inv.status = Status.PendingFinance;
        for (uint256 i = 0; i < items.length; i++) {
            inv.items.push(items[i]);
        }

        invoicesByPurchasing[msg.sender].push(id);

        emit InvoiceCreated(id, msg.sender, total, block.timestamp);
    }

    function approveByFinance(uint256 id, string calldata note) external onlyRole(UserRegistry.Role.Finance) {
        Invoice storage inv = _requireInvoice(id);
        require(inv.status == Status.PendingFinance, "InvoiceApproval: not awaiting Finance approval");

        inv.history.push(ApprovalRecord(msg.sender, "Finance", true, note, block.timestamp));
        inv.status = Status.PendingManager;

        emit InvoiceApprovalUpdated(id, msg.sender, inv.status, block.timestamp);
    }

    function rejectByFinance(uint256 id, string calldata reason) external onlyRole(UserRegistry.Role.Finance) {
        Invoice storage inv = _requireInvoice(id);
        require(inv.status == Status.PendingFinance, "InvoiceApproval: not awaiting Finance approval");

        inv.history.push(ApprovalRecord(msg.sender, "Finance", false, reason, block.timestamp));
        inv.status = Status.RejectedByFinance;

        emit InvoiceApprovalUpdated(id, msg.sender, inv.status, block.timestamp);
    }

    function approveByManager(uint256 id, string calldata note) external onlyRole(UserRegistry.Role.Manager) {
        Invoice storage inv = _requireInvoice(id);
        require(inv.status == Status.PendingManager, "InvoiceApproval: not awaiting Manager approval");

        inv.history.push(ApprovalRecord(msg.sender, "Manager", true, note, block.timestamp));
        inv.status = Status.Approved;

        emit InvoiceApprovalUpdated(id, msg.sender, inv.status, block.timestamp);

        _safeMint(inv.purchasing, id);
        emit InvoiceCertificateMinted(id, inv.purchasing, block.timestamp);
    }

    function rejectByManager(uint256 id, string calldata reason) external onlyRole(UserRegistry.Role.Manager) {
        Invoice storage inv = _requireInvoice(id);
        require(inv.status == Status.PendingManager, "InvoiceApproval: not awaiting Manager approval");

        inv.history.push(ApprovalRecord(msg.sender, "Manager", false, reason, block.timestamp));
        inv.status = Status.RejectedByManager;

        emit InvoiceApprovalUpdated(id, msg.sender, inv.status, block.timestamp);
    }

    function getInvoice(uint256 id) external view returns (Invoice memory) {
        return _requireInvoice(id);
    }

    function getInvoicesByPurchasing(address wallet) external view returns (uint256[] memory) {
        return invoicesByPurchasing[wallet];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        Invoice storage inv = _requireInvoice(tokenId);
        require(inv.status == Status.Approved, "InvoiceApproval: certificate not minted");

        address approvedByFinance = address(0);
        uint256 financeApprovedAt = 0;
        address approvedByManager = address(0);
        uint256 managerApprovedAt = 0;
        for (uint256 i = 0; i < inv.history.length; i++) {
            ApprovalRecord storage record = inv.history[i];
            if (record.approved && keccak256(bytes(record.roleLabel)) == keccak256(bytes("Finance"))) {
                approvedByFinance = record.wallet;
                financeApprovedAt = record.timestamp;
            }
            if (record.approved && keccak256(bytes(record.roleLabel)) == keccak256(bytes("Manager"))) {
                approvedByManager = record.wallet;
                managerApprovedAt = record.timestamp;
            }
        }

        bytes memory json = abi.encodePacked(
            "{",
            '"id":', inv.id.toString(), ",",
            '"supplier":"', inv.supplierName, '",',
            '"totalAmount":', inv.totalAmount.toString(), ",",
            '"purchasing":"', Strings.toHexString(inv.purchasing), '",',
            '"approvedByFinance":"', Strings.toHexString(approvedByFinance), '",',
            '"financeApprovedAt":', financeApprovedAt.toString(), ",",
            '"approvedByManager":"', Strings.toHexString(approvedByManager), '",',
            '"managerApprovedAt":', managerApprovedAt.toString(),
            "}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    function _requireInvoice(uint256 id) private view returns (Invoice storage) {
        require(id > 0 && id < nextInvoiceId, "InvoiceApproval: invoice does not exist");
        return invoices[id];
    }
}
