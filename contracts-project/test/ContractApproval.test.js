const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const Role = { None: 0, Admin: 1, Legal: 2, Finance: 3, Direktur: 4 };
const Status = {
  PendingFinance: 0,
  PendingDirektur: 1,
  Approved: 2,
  RejectedByFinance: 3,
  RejectedByDirektur: 4,
};

describe("ContractApproval", function () {
  let registry, contractApproval;
  let admin, legal1, finance1, direktur1, outsider;

  const now = () => Math.floor(Date.now() / 1000);
  const oneYear = 365 * 24 * 60 * 60;

  const sampleClauses = [
    { content: "Pihak Pertama akan menanamkan modal kepada Pihak Kedua sebesar Rp 55.000.000." },
    { content: "Pihak Kedua akan memberikan keuntungan sebesar 2% dari hasil penjualan." },
  ];
  const sampleValue = 55000000;

  function createDefault(signer, counterpartyName, clauses, keterangan, contractValue) {
    const t = now();
    return contractApproval
      .connect(signer)
      .createContract(counterpartyName, t, t, t + oneYear, clauses, keterangan, contractValue);
  }

  function reviseDefault(signer, id, counterpartyName, clauses, keterangan, contractValue) {
    const t = now();
    return contractApproval
      .connect(signer)
      .reviseContract(id, counterpartyName, t, t, t + oneYear, clauses, keterangan, contractValue);
  }

  beforeEach(async function () {
    [admin, legal1, finance1, direktur1, outsider] = await ethers.getSigners();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    registry = await UserRegistry.deploy("admin");
    await registry.waitForDeployment();

    await registry.connect(admin).registerUser(legal1.address, "legal1", Role.Legal);
    await registry.connect(admin).registerUser(finance1.address, "finance1", Role.Finance);
    await registry.connect(admin).registerUser(direktur1.address, "direktur1", Role.Direktur);

    const ContractApproval = await ethers.getContractFactory("ContractApproval");
    contractApproval = await ContractApproval.deploy(await registry.getAddress());
    await contractApproval.waitForDeployment();
  });

  it("lets a registered Legal wallet create a contract with correct data", async function () {
    await expect(createDefault(legal1, "PT Mitra Sejahtera", sampleClauses, "Keterangan test", sampleValue))
      .to.emit(contractApproval, "ContractCreated")
      .withArgs(1, legal1.address, sampleValue, anyValue);

    const doc = await contractApproval.getContract(1);
    expect(doc.counterpartyName).to.equal("PT Mitra Sejahtera");
    expect(doc.contractValue).to.equal(sampleValue);
    expect(doc.status).to.equal(Status.PendingFinance);
    expect(doc.clauses.length).to.equal(2);
    expect(doc.clauses[0].content).to.equal(sampleClauses[0].content);
    expect(doc.keterangan).to.equal("Keterangan test");
  });

  it("rejects contract creation and revision without a keterangan", async function () {
    await expect(createDefault(legal1, "PT X", sampleClauses, "", sampleValue)).to.be.revertedWith(
      "ContractApproval: keterangan required"
    );

    await createDefault(legal1, "PT X", sampleClauses, "Keterangan test", sampleValue);
    await contractApproval.connect(finance1).rejectByFinance(1, "nilai tidak sesuai");

    await expect(reviseDefault(legal1, 1, "PT X", sampleClauses, "", sampleValue)).to.be.revertedWith(
      "ContractApproval: keterangan required"
    );
  });

  it("rejects an empty clause content", async function () {
    await expect(
      createDefault(legal1, "PT X", [{ content: "" }], "Keterangan test", sampleValue)
    ).to.be.revertedWith("ContractApproval: clause content required");
  });

  it("rejects contract creation from a non-Legal wallet", async function () {
    await expect(
      createDefault(finance1, "PT X", sampleClauses, "Keterangan test", sampleValue)
    ).to.be.revertedWith("ContractApproval: wrong role");

    await expect(
      createDefault(outsider, "PT X", sampleClauses, "Keterangan test", sampleValue)
    ).to.be.revertedWith("ContractApproval: wallet not registered");
  });

  it("rejects a validUntil before validFrom", async function () {
    const t = now();
    await expect(
      contractApproval
        .connect(legal1)
        .createContract("PT X", t, t + oneYear, t, sampleClauses, "Keterangan test", sampleValue)
    ).to.be.revertedWith("ContractApproval: validUntil before validFrom");
  });

  it("enforces sequential approval: Direktur cannot act before Finance approves", async function () {
    await createDefault(legal1, "PT X", sampleClauses, "Keterangan test", sampleValue);

    await expect(
      contractApproval.connect(direktur1).approveByDirektur(1, "ok")
    ).to.be.revertedWith("ContractApproval: not awaiting Direktur approval");
  });

  it("runs the full happy path: Finance approves, Direktur approves, NFT is minted", async function () {
    await createDefault(legal1, "PT X", sampleClauses, "Keterangan test", sampleValue);

    await expect(contractApproval.connect(finance1).approveByFinance(1, "sesuai anggaran"))
      .to.emit(contractApproval, "ContractApprovalUpdated")
      .withArgs(1, finance1.address, Status.PendingDirektur, anyValue);

    await expect(contractApproval.connect(direktur1).approveByDirektur(1, "disetujui"))
      .to.emit(contractApproval, "ContractCertificateMinted")
      .withArgs(1, legal1.address, anyValue);

    const doc = await contractApproval.getContract(1);
    expect(doc.status).to.equal(Status.Approved);
    expect(doc.history.length).to.equal(2);

    expect(await contractApproval.ownerOf(1)).to.equal(legal1.address);
    const uri = await contractApproval.tokenURI(1);
    expect(uri).to.include("data:application/json;base64,");
  });

  it("lets Finance reject a contract, stopping the flow", async function () {
    await createDefault(legal1, "PT X", sampleClauses, "Keterangan test", sampleValue);

    await expect(contractApproval.connect(finance1).rejectByFinance(1, "nilai tidak sesuai"))
      .to.emit(contractApproval, "ContractApprovalUpdated")
      .withArgs(1, finance1.address, Status.RejectedByFinance, anyValue);

    const doc = await contractApproval.getContract(1);
    expect(doc.status).to.equal(Status.RejectedByFinance);
    expect(doc.history[0].approved).to.equal(false);
    expect(doc.history[0].note).to.equal("nilai tidak sesuai");
  });

  it("lets Direktur reject a contract after Finance approved it", async function () {
    await createDefault(legal1, "PT X", sampleClauses, "Keterangan test", sampleValue);
    await contractApproval.connect(finance1).approveByFinance(1, "ok");

    await expect(contractApproval.connect(direktur1).rejectByDirektur(1, "mitra tidak sesuai"))
      .to.emit(contractApproval, "ContractApprovalUpdated")
      .withArgs(1, direktur1.address, Status.RejectedByDirektur, anyValue);

    const doc = await contractApproval.getContract(1);
    expect(doc.status).to.equal(Status.RejectedByDirektur);
    expect(doc.history.length).to.equal(2);
  });

  it("lets Legal revise a rejected contract and resubmit it under the same id", async function () {
    await createDefault(legal1, "PT X", sampleClauses, "Keterangan test", sampleValue);
    await contractApproval.connect(finance1).rejectByFinance(1, "nilai tidak sesuai");

    const revisedClauses = [{ content: "Pihak Pertama menanamkan modal sebesar Rp 25.000.000." }];
    const revisedValue = 25000000;

    await expect(reviseDefault(legal1, 1, "PT Y", revisedClauses, "Keterangan revisi", revisedValue))
      .to.emit(contractApproval, "ContractRevised")
      .withArgs(1, legal1.address, revisedValue, anyValue);

    const doc = await contractApproval.getContract(1);
    expect(doc.status).to.equal(Status.PendingFinance);
    expect(doc.counterpartyName).to.equal("PT Y");
    expect(doc.contractValue).to.equal(revisedValue);
    expect(doc.clauses.length).to.equal(1);
    expect(doc.history.length).to.equal(2);
    expect(doc.history[0].note).to.equal("nilai tidak sesuai");
    expect(doc.history[1].roleLabel).to.equal("Legal");

    // full happy path after revision
    await contractApproval.connect(finance1).approveByFinance(1, "ok setelah revisi");
    await contractApproval.connect(direktur1).approveByDirektur(1, "disetujui");
    expect(await contractApproval.ownerOf(1)).to.equal(legal1.address);
  });

  it("rejects revision from a non-owner wallet or a non-rejected contract", async function () {
    await createDefault(legal1, "PT X", sampleClauses, "Keterangan test", sampleValue);

    await expect(
      reviseDefault(outsider, 1, "PT Y", sampleClauses, "Keterangan test", sampleValue)
    ).to.be.revertedWith("ContractApproval: not the contract owner");

    await expect(
      reviseDefault(legal1, 1, "PT Y", sampleClauses, "Keterangan test", sampleValue)
    ).to.be.revertedWith("ContractApproval: contract is not rejected");
  });

  it("lists contract ids by Legal wallet", async function () {
    await createDefault(legal1, "PT A", sampleClauses, "Keterangan test", sampleValue);
    await createDefault(legal1, "PT B", sampleClauses, "Keterangan test", sampleValue);

    const ids = await contractApproval.getContractsByLegal(legal1.address);
    expect(ids.map(Number)).to.deep.equal([1, 2]);
  });
});
