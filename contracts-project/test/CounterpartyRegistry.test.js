const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const Role = { None: 0, Admin: 1, Legal: 2, Finance: 3, Direktur: 4 };
const Status = { Pending: 0, Approved: 1, Rejected: 2 };

describe("CounterpartyRegistry", function () {
  let registry, counterpartyRegistry, admin, legal1, legal2, outsider;

  beforeEach(async function () {
    [admin, legal1, legal2, outsider] = await ethers.getSigners();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    registry = await UserRegistry.deploy("admin");
    await registry.waitForDeployment();

    await registry.connect(admin).registerUser(legal1.address, "legal1", Role.Legal);
    await registry.connect(admin).registerUser(legal2.address, "legal2", Role.Legal);

    const CounterpartyRegistry = await ethers.getContractFactory("CounterpartyRegistry");
    counterpartyRegistry = await CounterpartyRegistry.deploy(await registry.getAddress());
    await counterpartyRegistry.waitForDeployment();
  });

  it("lets a registered Legal wallet add a counterparty as Pending", async function () {
    await expect(
      counterpartyRegistry.connect(legal1).addCounterparty("PT Mitra Sejahtera", "Jl. Merdeka No. 1, Jakarta")
    )
      .to.emit(counterpartyRegistry, "CounterpartyAdded")
      .withArgs(1, "PT Mitra Sejahtera", legal1.address, anyValue);

    const counterparty = await counterpartyRegistry.getCounterparty(1);
    expect(counterparty.name).to.equal("PT Mitra Sejahtera");
    expect(counterparty.alamat).to.equal("Jl. Merdeka No. 1, Jakarta");
    expect(counterparty.addedBy).to.equal(legal1.address);
    expect(counterparty.status).to.equal(Status.Pending);
  });

  it("rejects adding a counterparty from a non-Legal wallet", async function () {
    await expect(
      counterpartyRegistry.connect(outsider).addCounterparty("PT X", "Jl. Y")
    ).to.be.revertedWith("CounterpartyRegistry: wallet not registered");

    await expect(
      counterpartyRegistry.connect(admin).addCounterparty("PT X", "Jl. Y")
    ).to.be.revertedWith("CounterpartyRegistry: wrong role");
  });

  it("rejects empty name or address", async function () {
    await expect(
      counterpartyRegistry.connect(legal1).addCounterparty("", "Jl. Y")
    ).to.be.revertedWith("CounterpartyRegistry: name required");

    await expect(
      counterpartyRegistry.connect(legal1).addCounterparty("PT X", "")
    ).to.be.revertedWith("CounterpartyRegistry: address required");
  });

  it("rejects a duplicate counterparty name", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. A");
    await expect(
      counterpartyRegistry.connect(legal2).addCounterparty("PT A", "Jl. Beda")
    ).to.be.revertedWith("CounterpartyRegistry: counterparty name already exists");
  });

  it("lists all counterparties", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. A");
    await counterpartyRegistry.connect(legal1).addCounterparty("PT B", "Jl. B");

    const all = await counterpartyRegistry.getAllCounterparties();
    expect(all.length).to.equal(2);
    expect(all[0].name).to.equal("PT A");
    expect(all[1].name).to.equal("PT B");
  });

  it("only returns Approved counterparties from getApprovedCounterparties", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. A");
    await counterpartyRegistry.connect(legal1).addCounterparty("PT B", "Jl. B");
    await counterpartyRegistry.connect(admin).reviewCounterparty(1, true, "ok");

    const approved = await counterpartyRegistry.getApprovedCounterparties();
    expect(approved.length).to.equal(1);
    expect(approved[0].name).to.equal("PT A");
  });

  it("lets Admin approve or reject a pending counterparty, and rejects non-Admin review", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. A");

    await expect(
      counterpartyRegistry.connect(legal1).reviewCounterparty(1, true, "ok")
    ).to.be.revertedWith("CounterpartyRegistry: wrong role");

    await expect(counterpartyRegistry.connect(admin).reviewCounterparty(1, true, "Sudah dicek"))
      .to.emit(counterpartyRegistry, "CounterpartyReviewed")
      .withArgs(1, Status.Approved, admin.address, "Sudah dicek", anyValue);

    const counterparty = await counterpartyRegistry.getCounterparty(1);
    expect(counterparty.status).to.equal(Status.Approved);
    expect(counterparty.reviewedBy).to.equal(admin.address);

    await expect(
      counterpartyRegistry.connect(admin).reviewCounterparty(1, false, "sudah direview")
    ).to.be.revertedWith("CounterpartyRegistry: counterparty not pending review");
  });

  it("frees up the name after rejection so it can be re-added", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. A");
    await counterpartyRegistry.connect(admin).reviewCounterparty(1, false, "data tidak valid");

    await expect(counterpartyRegistry.connect(legal2).addCounterparty("PT A", "Jl. Baru")).to.not.be.reverted;
  });

  it("lets the original Legal wallet or Admin edit a Pending counterparty, resets status to Pending, and keeps history", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. Lama");

    await expect(counterpartyRegistry.connect(legal1).editCounterparty(1, "PT A Updated", "Jl. Baru"))
      .to.emit(counterpartyRegistry, "CounterpartyEdited")
      .withArgs(1, "PT A Updated", legal1.address, anyValue);

    const counterparty = await counterpartyRegistry.getCounterparty(1);
    expect(counterparty.name).to.equal("PT A Updated");
    expect(counterparty.alamat).to.equal("Jl. Baru");
    expect(counterparty.status).to.equal(Status.Pending);

    const history = await counterpartyRegistry.getCounterpartyEditHistory(1);
    expect(history.length).to.equal(1);
    expect(history[0].name).to.equal("PT A");
    expect(history[0].alamat).to.equal("Jl. Lama");

    await counterpartyRegistry.connect(admin).editCounterparty(1, "PT A Final", "Jl. Final");
    const counterparty2 = await counterpartyRegistry.getCounterparty(1);
    expect(counterparty2.name).to.equal("PT A Final");
    expect((await counterpartyRegistry.getCounterpartyEditHistory(1)).length).to.equal(2);
  });

  it("rejects editing a counterparty once it has been Approved", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. A");
    await counterpartyRegistry.connect(admin).reviewCounterparty(1, true, "ok");

    await expect(
      counterpartyRegistry.connect(legal1).editCounterparty(1, "PT A Updated", "Jl. Baru")
    ).to.be.revertedWith("CounterpartyRegistry: approved counterparty cannot be edited");

    await expect(
      counterpartyRegistry.connect(admin).editCounterparty(1, "PT A Updated", "Jl. Baru")
    ).to.be.revertedWith("CounterpartyRegistry: approved counterparty cannot be edited");
  });

  it("lets a rejected counterparty be revised and resubmitted for Admin review again", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. Lama");
    await counterpartyRegistry.connect(admin).reviewCounterparty(1, false, "alamat kurang lengkap");

    let counterparty = await counterpartyRegistry.getCounterparty(1);
    expect(counterparty.status).to.equal(Status.Rejected);

    await counterpartyRegistry.connect(legal1).editCounterparty(1, "PT A", "Jl. Lengkap No. 5");
    counterparty = await counterpartyRegistry.getCounterparty(1);
    expect(counterparty.alamat).to.equal("Jl. Lengkap No. 5");
    expect(counterparty.status).to.equal(Status.Pending);

    await expect(counterpartyRegistry.connect(admin).reviewCounterparty(1, true, "sudah lengkap"))
      .to.emit(counterpartyRegistry, "CounterpartyReviewed")
      .withArgs(1, Status.Approved, admin.address, "sudah lengkap", anyValue);
  });

  it("rejects edits from a wallet that neither added the counterparty nor is Admin", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. A");
    await expect(
      counterpartyRegistry.connect(legal2).editCounterparty(1, "PT A Hacked", "Jl. Hacked")
    ).to.be.revertedWith("CounterpartyRegistry: not allowed to edit this counterparty");
  });

  it("rejects an edit that collides with another counterparty's active name", async function () {
    await counterpartyRegistry.connect(legal1).addCounterparty("PT A", "Jl. A");
    await counterpartyRegistry.connect(legal1).addCounterparty("PT B", "Jl. B");

    await expect(
      counterpartyRegistry.connect(legal1).editCounterparty(2, "PT A", "Jl. B Baru")
    ).to.be.revertedWith("CounterpartyRegistry: counterparty name already exists");
  });
});
