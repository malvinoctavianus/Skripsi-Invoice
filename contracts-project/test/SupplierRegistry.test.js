const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const Role = { None: 0, Admin: 1, Purchasing: 2, Finance: 3, Manager: 4 };
const Status = { Pending: 0, Approved: 1, Rejected: 2 };

describe("SupplierRegistry", function () {
  let registry, supplierRegistry, admin, purchasing1, purchasing2, outsider;

  beforeEach(async function () {
    [admin, purchasing1, purchasing2, outsider] = await ethers.getSigners();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    registry = await UserRegistry.deploy("admin");
    await registry.waitForDeployment();

    await registry.connect(admin).registerUser(purchasing1.address, "purchasing1", Role.Purchasing);
    await registry.connect(admin).registerUser(purchasing2.address, "purchasing2", Role.Purchasing);

    const SupplierRegistry = await ethers.getContractFactory("SupplierRegistry");
    supplierRegistry = await SupplierRegistry.deploy(await registry.getAddress());
    await supplierRegistry.waitForDeployment();
  });

  it("lets a registered Purchasing wallet add a supplier as Pending", async function () {
    await expect(
      supplierRegistry.connect(purchasing1).addSupplier("PT Sumber Makmur", "Jl. Merdeka No. 1, Jakarta")
    )
      .to.emit(supplierRegistry, "SupplierAdded")
      .withArgs(1, "PT Sumber Makmur", purchasing1.address, anyValue);

    const supplier = await supplierRegistry.getSupplier(1);
    expect(supplier.name).to.equal("PT Sumber Makmur");
    expect(supplier.alamat).to.equal("Jl. Merdeka No. 1, Jakarta");
    expect(supplier.addedBy).to.equal(purchasing1.address);
    expect(supplier.status).to.equal(Status.Pending);
  });

  it("rejects adding a supplier from a non-Purchasing wallet", async function () {
    await expect(
      supplierRegistry.connect(outsider).addSupplier("PT X", "Jl. Y")
    ).to.be.revertedWith("SupplierRegistry: wallet not registered");

    await expect(
      supplierRegistry.connect(admin).addSupplier("PT X", "Jl. Y")
    ).to.be.revertedWith("SupplierRegistry: wrong role");
  });

  it("rejects empty name or address", async function () {
    await expect(
      supplierRegistry.connect(purchasing1).addSupplier("", "Jl. Y")
    ).to.be.revertedWith("SupplierRegistry: name required");

    await expect(
      supplierRegistry.connect(purchasing1).addSupplier("PT X", "")
    ).to.be.revertedWith("SupplierRegistry: address required");
  });

  it("rejects a duplicate supplier name", async function () {
    await supplierRegistry.connect(purchasing1).addSupplier("PT A", "Jl. A");
    await expect(
      supplierRegistry.connect(purchasing2).addSupplier("PT A", "Jl. Beda")
    ).to.be.revertedWith("SupplierRegistry: supplier name already exists");
  });

  it("lists all suppliers", async function () {
    await supplierRegistry.connect(purchasing1).addSupplier("PT A", "Jl. A");
    await supplierRegistry.connect(purchasing1).addSupplier("PT B", "Jl. B");

    const all = await supplierRegistry.getAllSuppliers();
    expect(all.length).to.equal(2);
    expect(all[0].name).to.equal("PT A");
    expect(all[1].name).to.equal("PT B");
  });

  it("only returns Approved suppliers from getApprovedSuppliers", async function () {
    await supplierRegistry.connect(purchasing1).addSupplier("PT A", "Jl. A");
    await supplierRegistry.connect(purchasing1).addSupplier("PT B", "Jl. B");
    await supplierRegistry.connect(admin).reviewSupplier(1, true, "ok");

    const approved = await supplierRegistry.getApprovedSuppliers();
    expect(approved.length).to.equal(1);
    expect(approved[0].name).to.equal("PT A");
  });

  it("lets Admin approve or reject a pending supplier, and rejects non-Admin review", async function () {
    await supplierRegistry.connect(purchasing1).addSupplier("PT A", "Jl. A");

    await expect(
      supplierRegistry.connect(purchasing1).reviewSupplier(1, true, "ok")
    ).to.be.revertedWith("SupplierRegistry: wrong role");

    await expect(supplierRegistry.connect(admin).reviewSupplier(1, true, "Sudah dicek"))
      .to.emit(supplierRegistry, "SupplierReviewed")
      .withArgs(1, Status.Approved, admin.address, "Sudah dicek", anyValue);

    const supplier = await supplierRegistry.getSupplier(1);
    expect(supplier.status).to.equal(Status.Approved);
    expect(supplier.reviewedBy).to.equal(admin.address);

    await expect(
      supplierRegistry.connect(admin).reviewSupplier(1, false, "sudah direview")
    ).to.be.revertedWith("SupplierRegistry: supplier not pending review");
  });

  it("frees up the name after rejection so it can be re-added", async function () {
    await supplierRegistry.connect(purchasing1).addSupplier("PT A", "Jl. A");
    await supplierRegistry.connect(admin).reviewSupplier(1, false, "data tidak valid");

    await expect(supplierRegistry.connect(purchasing2).addSupplier("PT A", "Jl. Baru")).to.not.be.reverted;
  });

  it("lets the original Purchasing wallet or Admin edit a supplier, resets status to Pending, and keeps history", async function () {
    await supplierRegistry.connect(purchasing1).addSupplier("PT A", "Jl. Lama");
    await supplierRegistry.connect(admin).reviewSupplier(1, true, "ok");

    await expect(supplierRegistry.connect(purchasing1).editSupplier(1, "PT A Updated", "Jl. Baru"))
      .to.emit(supplierRegistry, "SupplierEdited")
      .withArgs(1, "PT A Updated", purchasing1.address, anyValue);

    const supplier = await supplierRegistry.getSupplier(1);
    expect(supplier.name).to.equal("PT A Updated");
    expect(supplier.alamat).to.equal("Jl. Baru");
    expect(supplier.status).to.equal(Status.Pending);

    const history = await supplierRegistry.getSupplierEditHistory(1);
    expect(history.length).to.equal(1);
    expect(history[0].name).to.equal("PT A");
    expect(history[0].alamat).to.equal("Jl. Lama");

    await supplierRegistry.connect(admin).editSupplier(1, "PT A Final", "Jl. Final");
    const supplier2 = await supplierRegistry.getSupplier(1);
    expect(supplier2.name).to.equal("PT A Final");
    expect((await supplierRegistry.getSupplierEditHistory(1)).length).to.equal(2);
  });

  it("rejects edits from a wallet that neither added the supplier nor is Admin", async function () {
    await supplierRegistry.connect(purchasing1).addSupplier("PT A", "Jl. A");
    await expect(
      supplierRegistry.connect(purchasing2).editSupplier(1, "PT A Hacked", "Jl. Hacked")
    ).to.be.revertedWith("SupplierRegistry: not allowed to edit this supplier");
  });

  it("rejects an edit that collides with another supplier's active name", async function () {
    await supplierRegistry.connect(purchasing1).addSupplier("PT A", "Jl. A");
    await supplierRegistry.connect(purchasing1).addSupplier("PT B", "Jl. B");

    await expect(
      supplierRegistry.connect(purchasing1).editSupplier(2, "PT A", "Jl. B Baru")
    ).to.be.revertedWith("SupplierRegistry: supplier name already exists");
  });
});
