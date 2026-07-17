const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const Role = { None: 0, Admin: 1, Legal: 2, Finance: 3, Direktur: 4 };

describe("UserRegistry", function () {
  let registry, admin, legal1, finance1, outsider;

  beforeEach(async function () {
    [admin, legal1, finance1, outsider] = await ethers.getSigners();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    registry = await UserRegistry.deploy("admin");
    await registry.waitForDeployment();
  });

  it("sets the deployer as the fixed, immutable admin", async function () {
    expect(await registry.admin()).to.equal(admin.address);
  });

  it("registers the admin itself at deployment", async function () {
    const user = await registry.getUser(admin.address);
    expect(user.username).to.equal("admin");
    expect(user.role).to.equal(Role.Admin);
    expect(user.isRegistered).to.equal(true);
  });

  it("allows only the admin to register a new user", async function () {
    await expect(
      registry.connect(outsider).registerUser(legal1.address, "legal1", Role.Legal)
    ).to.be.revertedWith("UserRegistry: caller is not admin");

    await expect(registry.connect(admin).registerUser(legal1.address, "legal1", Role.Legal))
      .to.emit(registry, "UserRegistered")
      .withArgs(legal1.address, "legal1", Role.Legal, anyValue);

    const user = await registry.getUser(legal1.address);
    expect(user.username).to.equal("legal1");
    expect(user.role).to.equal(Role.Legal);
    expect(user.isRegistered).to.equal(true);
  });

  it("rejects registering the same wallet twice", async function () {
    await registry.connect(admin).registerUser(legal1.address, "legal1", Role.Legal);
    await expect(
      registry.connect(admin).registerUser(legal1.address, "legal1-again", Role.Finance)
    ).to.be.revertedWith("UserRegistry: wallet already registered");
  });

  it("rejects invalid roles (None/Admin) on registration", async function () {
    await expect(
      registry.connect(admin).registerUser(legal1.address, "x", Role.Admin)
    ).to.be.revertedWith("UserRegistry: invalid role");
  });

  it("reports isWalletRegistered correctly", async function () {
    expect(await registry.isWalletRegistered(finance1.address)).to.equal(false);
    await registry.connect(admin).registerUser(finance1.address, "finance1", Role.Finance);
    expect(await registry.isWalletRegistered(finance1.address)).to.equal(true);
  });

  it("lists all registered wallets", async function () {
    await registry.connect(admin).registerUser(legal1.address, "legal1", Role.Legal);
    const wallets = await registry.getAllWallets();
    expect(wallets).to.include(admin.address);
    expect(wallets).to.include(legal1.address);
  });
});
