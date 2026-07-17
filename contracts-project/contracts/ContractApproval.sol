// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./UserRegistry.sol";

/// @title ContractApproval
/// @notice Legal drafts a company contract; Finance then Direktur must approve it in that
///         order before the contract is considered final. A final Direktur approval mints an
///         ERC721 "approval certificate" to the Legal wallet, with fully on-chain metadata
///         (no IPFS/external storage) so the whole system stays self-contained.
/// @dev Role checks are delegated to the already-deployed UserRegistry rather than
///      duplicating role/user state here.
contract ContractApproval is ERC721 {
    using Strings for uint256;

    enum Status {
        PendingFinance,
        PendingDirektur,
        Approved,
        RejectedByFinance,
        RejectedByDirektur
    }

    enum PaymentMethod {
        Cash,
        Transfer
    }

    struct ContractClause {
        string content;
    }

    struct ApprovalRecord {
        address wallet;
        string roleLabel;
        bool approved;
        string note;
        uint256 timestamp;
    }

    struct ContractDoc {
        uint256 id;
        address legal;
        string counterpartyName;
        uint256 contractDate;
        uint256 createdAt;
        uint256 validFrom;
        uint256 validUntil;
        uint256 contractValue;
        Status status;
        string keterangan;
        PaymentMethod paymentMethod;
        ContractClause[] clauses;
        ApprovalRecord[] history;
    }

    UserRegistry public immutable registry;

    uint256 public nextContractId = 1;

    mapping(uint256 => ContractDoc) private contracts;
    mapping(address => uint256[]) private contractsByLegal;

    event ContractCreated(uint256 indexed id, address indexed legal, uint256 contractValue, uint256 timestamp);
    event ContractApprovalUpdated(uint256 indexed id, address indexed wallet, Status status, uint256 timestamp);
    event ContractCertificateMinted(uint256 indexed id, address indexed legal, uint256 timestamp);
    event ContractRevised(uint256 indexed id, address indexed legal, uint256 contractValue, uint256 timestamp);

    modifier onlyRole(UserRegistry.Role role) {
        (, UserRegistry.Role userRole, bool isRegistered, ) = registry.getUser(msg.sender);
        require(isRegistered, "ContractApproval: wallet not registered");
        require(userRole == role, "ContractApproval: wrong role");
        _;
    }

    constructor(address userRegistryAddress) ERC721("Contract Approval Certificate", "CAC") {
        registry = UserRegistry(userRegistryAddress);
    }

    function createContract(
        string calldata counterpartyName,
        uint256 contractDate,
        uint256 validFrom,
        uint256 validUntil,
        ContractClause[] calldata clauses,
        string calldata keterangan,
        PaymentMethod paymentMethod,
        uint256 contractValue
    ) external onlyRole(UserRegistry.Role.Legal) returns (uint256 id) {
        require(bytes(counterpartyName).length > 0, "ContractApproval: counterparty name required");
        require(clauses.length > 0, "ContractApproval: at least one clause required");
        require(bytes(keterangan).length > 0, "ContractApproval: keterangan required");
        require(validUntil >= validFrom, "ContractApproval: validUntil before validFrom");

        for (uint256 i = 0; i < clauses.length; i++) {
            require(bytes(clauses[i].content).length > 0, "ContractApproval: clause content required");
        }

        id = nextContractId++;

        ContractDoc storage doc = contracts[id];
        doc.id = id;
        doc.legal = msg.sender;
        doc.counterpartyName = counterpartyName;
        doc.contractDate = contractDate;
        doc.createdAt = block.timestamp;
        doc.validFrom = validFrom;
        doc.validUntil = validUntil;
        doc.contractValue = contractValue;
        doc.status = Status.PendingFinance;
        doc.keterangan = keterangan;
        doc.paymentMethod = paymentMethod;
        for (uint256 i = 0; i < clauses.length; i++) {
            doc.clauses.push(clauses[i]);
        }

        contractsByLegal[msg.sender].push(id);

        emit ContractCreated(id, msg.sender, contractValue, block.timestamp);
    }

    /// @notice Lets the original Legal wallet fix and resubmit a rejected contract under
    ///         the same id, so the rejection stays visible in `history` instead of being lost.
    function reviseContract(
        uint256 id,
        string calldata counterpartyName,
        uint256 contractDate,
        uint256 validFrom,
        uint256 validUntil,
        ContractClause[] calldata clauses,
        string calldata keterangan,
        PaymentMethod paymentMethod,
        uint256 contractValue
    ) external {
        ContractDoc storage doc = _requireContract(id);
        require(doc.legal == msg.sender, "ContractApproval: not the contract owner");
        require(
            doc.status == Status.RejectedByFinance || doc.status == Status.RejectedByDirektur,
            "ContractApproval: contract is not rejected"
        );
        require(bytes(counterpartyName).length > 0, "ContractApproval: counterparty name required");
        require(clauses.length > 0, "ContractApproval: at least one clause required");
        require(bytes(keterangan).length > 0, "ContractApproval: keterangan required");
        require(validUntil >= validFrom, "ContractApproval: validUntil before validFrom");

        for (uint256 i = 0; i < clauses.length; i++) {
            require(bytes(clauses[i].content).length > 0, "ContractApproval: clause content required");
        }

        doc.counterpartyName = counterpartyName;
        doc.contractDate = contractDate;
        doc.validFrom = validFrom;
        doc.validUntil = validUntil;
        doc.contractValue = contractValue;
        doc.status = Status.PendingFinance;
        doc.keterangan = keterangan;
        doc.paymentMethod = paymentMethod;

        delete doc.clauses;
        for (uint256 i = 0; i < clauses.length; i++) {
            doc.clauses.push(clauses[i]);
        }

        doc.history.push(
            ApprovalRecord(msg.sender, "Legal", true, "Kontrak direvisi dan diajukan ulang", block.timestamp)
        );

        emit ContractRevised(id, msg.sender, contractValue, block.timestamp);
    }

    function approveByFinance(uint256 id, string calldata note) external onlyRole(UserRegistry.Role.Finance) {
        ContractDoc storage doc = _requireContract(id);
        require(doc.status == Status.PendingFinance, "ContractApproval: not awaiting Finance approval");

        doc.history.push(ApprovalRecord(msg.sender, "Finance", true, note, block.timestamp));
        doc.status = Status.PendingDirektur;

        emit ContractApprovalUpdated(id, msg.sender, doc.status, block.timestamp);
    }

    function rejectByFinance(uint256 id, string calldata reason) external onlyRole(UserRegistry.Role.Finance) {
        ContractDoc storage doc = _requireContract(id);
        require(doc.status == Status.PendingFinance, "ContractApproval: not awaiting Finance approval");

        doc.history.push(ApprovalRecord(msg.sender, "Finance", false, reason, block.timestamp));
        doc.status = Status.RejectedByFinance;

        emit ContractApprovalUpdated(id, msg.sender, doc.status, block.timestamp);
    }

    function approveByDirektur(uint256 id, string calldata note) external onlyRole(UserRegistry.Role.Direktur) {
        ContractDoc storage doc = _requireContract(id);
        require(doc.status == Status.PendingDirektur, "ContractApproval: not awaiting Direktur approval");

        doc.history.push(ApprovalRecord(msg.sender, "Direktur", true, note, block.timestamp));
        doc.status = Status.Approved;

        emit ContractApprovalUpdated(id, msg.sender, doc.status, block.timestamp);

        _safeMint(doc.legal, id);
        emit ContractCertificateMinted(id, doc.legal, block.timestamp);
    }

    function rejectByDirektur(uint256 id, string calldata reason) external onlyRole(UserRegistry.Role.Direktur) {
        ContractDoc storage doc = _requireContract(id);
        require(doc.status == Status.PendingDirektur, "ContractApproval: not awaiting Direktur approval");

        doc.history.push(ApprovalRecord(msg.sender, "Direktur", false, reason, block.timestamp));
        doc.status = Status.RejectedByDirektur;

        emit ContractApprovalUpdated(id, msg.sender, doc.status, block.timestamp);
    }

    function getContract(uint256 id) external view returns (ContractDoc memory) {
        return _requireContract(id);
    }

    function getContractsByLegal(address wallet) external view returns (uint256[] memory) {
        return contractsByLegal[wallet];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ContractDoc storage doc = _requireContract(tokenId);
        require(doc.status == Status.Approved, "ContractApproval: certificate not minted");

        address approvedByFinance = address(0);
        uint256 financeApprovedAt = 0;
        address approvedByDirektur = address(0);
        uint256 direkturApprovedAt = 0;
        for (uint256 i = 0; i < doc.history.length; i++) {
            ApprovalRecord storage record = doc.history[i];
            if (record.approved && keccak256(bytes(record.roleLabel)) == keccak256(bytes("Finance"))) {
                approvedByFinance = record.wallet;
                financeApprovedAt = record.timestamp;
            }
            if (record.approved && keccak256(bytes(record.roleLabel)) == keccak256(bytes("Direktur"))) {
                approvedByDirektur = record.wallet;
                direkturApprovedAt = record.timestamp;
            }
        }

        bytes memory json = abi.encodePacked(
            "{",
            '"id":', doc.id.toString(), ",",
            '"counterparty":"', doc.counterpartyName, '",',
            '"contractValue":', doc.contractValue.toString(), ",",
            '"legal":"', Strings.toHexString(doc.legal), '",',
            '"approvedByFinance":"', Strings.toHexString(approvedByFinance), '",',
            '"financeApprovedAt":', financeApprovedAt.toString(), ",",
            '"approvedByDirektur":"', Strings.toHexString(approvedByDirektur), '",',
            '"direkturApprovedAt":', direkturApprovedAt.toString(),
            "}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    function _requireContract(uint256 id) private view returns (ContractDoc storage) {
        require(id > 0 && id < nextContractId, "ContractApproval: contract does not exist");
        return contracts[id];
    }
}
