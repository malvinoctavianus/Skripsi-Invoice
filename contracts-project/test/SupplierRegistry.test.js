const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const Role = { None: 0, Admin: 1, Purchasing: 2, Finance: 3, Manager: 4 };

describe("SupplierRegistry", function () {
  let registry, supplierRegistry, admin, purchasing1, outsider;

  beforeEach(async function () {
    [admin, purchasing1, outsider] = await ethers.getSigners();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    registry = await UserRegistry.deploy("admin");
    await registry.waitForDeployment();

    await registry.connect(admin).registerUser(purchasing1.address, "purchasing1", Role.Purchasing);

    const SupplierRegistry = await ethers.getContractFactory("SupplierRegistry");
    supplierRegistry = await SupplierRegistry.deploy(await registry.getAddress());
    await supplierRegistry.waitForDeployment();
  });

  it("lets a registered Purchasing wallet add a supplier", async function () {
    await expect(
      supplierRegistry.connect(purchasing1).addSupplier("PT Sumber Makmur", "Jl. Merdeka No. 1, Jakarta")
    )
      .to.emit(supplierRegistry, "SupplierAdded")
      .withArgs(1, "PT Sumber Makmur", purchasing1.address, anyValue);

    const supplier = await supplierRegistry.getSupplier(1);
    expect(supplier.name).to.equal("PT Sumber Makmur");
    expect(supplier.alamat).to.equal("Jl. Merdeka No. 1, Jakarta");
    expect(supplier.addedBy).to.equal(purchasing1.address);
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

  it("lists all suppliers", async function () {
    await supplierRegistry.connect(purchasing1).addSupplier("PT A", "Jl. A");
    await supplierRegistry.connect(purchasing1).addSupplier("PT B", "Jl. B");

    const all = await supplierRegistry.getAllSuppliers();
    expect(all.length).to.equal(2);
    expect(all[0].name).to.equal("PT A");
    expect(all[1].name).to.equal("PT B");
  });
});
