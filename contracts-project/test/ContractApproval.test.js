const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const Role = { None: 0, Admin: 1, Legal: 2, Finance: 3, Direktur: 4 };
const PaymentMethod = { Cash: 0, Transfer: 1 };
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
    { name: "Pasal 1 - Ruang Lingkup Pekerjaan", value: 500000 },
    { name: "Pasal 2 - Jangka Waktu", value: 300000 },
  ];
  const sampleTotal = 500000 + 300000;

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

  it("lets a registered Legal wallet create a contract with correct totals", async function () {
    const t = now();
    await expect(
      contractApproval
        .connect(legal1)
        .createContract("PT Mitra Sejahtera", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash)
    )
      .to.emit(contractApproval, "ContractCreated")
      .withArgs(1, legal1.address, sampleTotal, anyValue);

    const doc = await contractApproval.getContract(1);
    expect(doc.counterpartyName).to.equal("PT Mitra Sejahtera");
    expect(doc.contractValue).to.equal(sampleTotal);
    expect(doc.status).to.equal(Status.PendingFinance);
    expect(doc.clauses.length).to.equal(2);
    expect(doc.keterangan).to.equal("Keterangan test");
    expect(doc.paymentMethod).to.equal(PaymentMethod.Cash);
  });

  it("rejects contract creation and revision without a keterangan", async function () {
    const t = now();
    await expect(
      contractApproval.connect(legal1).createContract("PT X", t, t, t + oneYear, sampleClauses, "", PaymentMethod.Cash)
    ).to.be.revertedWith("ContractApproval: keterangan required");

    await contractApproval
      .connect(legal1)
      .createContract("PT X", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash);
    await contractApproval.connect(finance1).rejectByFinance(1, "nilai tidak sesuai");

    await expect(
      contractApproval
        .connect(legal1)
        .reviseContract(1, "PT X", t, t, t + oneYear, sampleClauses, "", PaymentMethod.Cash)
    ).to.be.revertedWith("ContractApproval: keterangan required");
  });

  it("rejects contract creation from a non-Legal wallet", async function () {
    const t = now();
    await expect(
      contractApproval
        .connect(finance1)
        .createContract("PT X", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash)
    ).to.be.revertedWith("ContractApproval: wrong role");

    await expect(
      contractApproval
        .connect(outsider)
        .createContract("PT X", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash)
    ).to.be.revertedWith("ContractApproval: wallet not registered");
  });

  it("rejects a validUntil before validFrom", async function () {
    const t = now();
    await expect(
      contractApproval
        .connect(legal1)
        .createContract("PT X", t, t + oneYear, t, sampleClauses, "Keterangan test", PaymentMethod.Cash)
    ).to.be.revertedWith("ContractApproval: validUntil before validFrom");
  });

  it("enforces sequential approval: Direktur cannot act before Finance approves", async function () {
    const t = now();
    await contractApproval
      .connect(legal1)
      .createContract("PT X", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash);

    await expect(
      contractApproval.connect(direktur1).approveByDirektur(1, "ok")
    ).to.be.revertedWith("ContractApproval: not awaiting Direktur approval");
  });

  it("runs the full happy path: Finance approves, Direktur approves, NFT is minted", async function () {
    const t = now();
    await contractApproval
      .connect(legal1)
      .createContract("PT X", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash);

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
    const t = now();
    await contractApproval
      .connect(legal1)
      .createContract("PT X", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash);

    await expect(contractApproval.connect(finance1).rejectByFinance(1, "nilai tidak sesuai"))
      .to.emit(contractApproval, "ContractApprovalUpdated")
      .withArgs(1, finance1.address, Status.RejectedByFinance, anyValue);

    const doc = await contractApproval.getContract(1);
    expect(doc.status).to.equal(Status.RejectedByFinance);
    expect(doc.history[0].approved).to.equal(false);
    expect(doc.history[0].note).to.equal("nilai tidak sesuai");
  });

  it("lets Direktur reject a contract after Finance approved it", async function () {
    const t = now();
    await contractApproval
      .connect(legal1)
      .createContract("PT X", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash);
    await contractApproval.connect(finance1).approveByFinance(1, "ok");

    await expect(contractApproval.connect(direktur1).rejectByDirektur(1, "mitra tidak sesuai"))
      .to.emit(contractApproval, "ContractApprovalUpdated")
      .withArgs(1, direktur1.address, Status.RejectedByDirektur, anyValue);

    const doc = await contractApproval.getContract(1);
    expect(doc.status).to.equal(Status.RejectedByDirektur);
    expect(doc.history.length).to.equal(2);
  });

  it("lets Legal revise a rejected contract and resubmit it under the same id", async function () {
    const t = now();
    await contractApproval
      .connect(legal1)
      .createContract("PT X", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash);
    await contractApproval.connect(finance1).rejectByFinance(1, "nilai tidak sesuai");

    const revisedClauses = [{ name: "Pasal 1 - Ruang Lingkup Pekerjaan", value: 250000 }];
    const revisedTotal = 250000;

    await expect(
      contractApproval
        .connect(legal1)
        .reviseContract(1, "PT Y", t, t, t + oneYear, revisedClauses, "Keterangan revisi", PaymentMethod.Transfer)
    )
      .to.emit(contractApproval, "ContractRevised")
      .withArgs(1, legal1.address, revisedTotal, anyValue);

    const doc = await contractApproval.getContract(1);
    expect(doc.status).to.equal(Status.PendingFinance);
    expect(doc.counterpartyName).to.equal("PT Y");
    expect(doc.contractValue).to.equal(revisedTotal);
    expect(doc.clauses.length).to.equal(1);
    expect(doc.history.length).to.equal(2);
    expect(doc.history[0].note).to.equal("nilai tidak sesuai");
    expect(doc.history[1].roleLabel).to.equal("Legal");
    expect(doc.paymentMethod).to.equal(PaymentMethod.Transfer);

    // full happy path after revision
    await contractApproval.connect(finance1).approveByFinance(1, "ok setelah revisi");
    await contractApproval.connect(direktur1).approveByDirektur(1, "disetujui");
    expect(await contractApproval.ownerOf(1)).to.equal(legal1.address);
  });

  it("rejects revision from a non-owner wallet or a non-rejected contract", async function () {
    const t = now();
    await contractApproval
      .connect(legal1)
      .createContract("PT X", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash);

    await expect(
      contractApproval
        .connect(outsider)
        .reviseContract(1, "PT Y", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash)
    ).to.be.revertedWith("ContractApproval: not the contract owner");

    await expect(
      contractApproval
        .connect(legal1)
        .reviseContract(1, "PT Y", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash)
    ).to.be.revertedWith("ContractApproval: contract is not rejected");
  });

  it("lists contract ids by Legal wallet", async function () {
    const t = now();
    await contractApproval
      .connect(legal1)
      .createContract("PT A", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash);
    await contractApproval
      .connect(legal1)
      .createContract("PT B", t, t, t + oneYear, sampleClauses, "Keterangan test", PaymentMethod.Cash);

    const ids = await contractApproval.getContractsByLegal(legal1.address);
    expect(ids.map(Number)).to.deep.equal([1, 2]);
  });
});
