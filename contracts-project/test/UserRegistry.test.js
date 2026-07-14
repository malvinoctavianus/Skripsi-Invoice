const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

function hashPassword(wallet, password) {
  return ethers.keccak256(
    ethers.solidityPacked(["address", "string"], [wallet, password])
  );
}

const Role = { None: 0, Admin: 1, Purchasing: 2, Finance: 3, Manager: 4 };

describe("UserRegistry", function () {
  let registry, admin, purchasing1, finance1, outsider;

  beforeEach(async function () {
    [admin, purchasing1, finance1, outsider] = await ethers.getSigners();

    const adminPasswordHash = hashPassword(admin.address, "adminPass123");
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    registry = await UserRegistry.deploy("admin", adminPasswordHash);
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
    const pwHash = hashPassword(purchasing1.address, "temp123");
    await expect(
      registry
        .connect(outsider)
        .registerUser(purchasing1.address, "purchasing1", pwHash, Role.Purchasing)
    ).to.be.revertedWith("UserRegistry: caller is not admin");

    await expect(
      registry.connect(admin).registerUser(purchasing1.address, "purchasing1", pwHash, Role.Purchasing)
    )
      .to.emit(registry, "UserRegistered")
      .withArgs(purchasing1.address, "purchasing1", Role.Purchasing, anyValue);

    const user = await registry.getUser(purchasing1.address);
    expect(user.username).to.equal("purchasing1");
    expect(user.role).to.equal(Role.Purchasing);
    expect(user.isRegistered).to.equal(true);
  });

  it("rejects registering the same wallet twice", async function () {
    const pwHash = hashPassword(purchasing1.address, "temp123");
    await registry.connect(admin).registerUser(purchasing1.address, "purchasing1", pwHash, Role.Purchasing);
    await expect(
      registry.connect(admin).registerUser(purchasing1.address, "purchasing1-again", pwHash, Role.Finance)
    ).to.be.revertedWith("UserRegistry: wallet already registered");
  });

  it("rejects invalid roles (None/Admin) on registration", async function () {
    const pwHash = hashPassword(purchasing1.address, "temp123");
    await expect(
      registry.connect(admin).registerUser(purchasing1.address, "x", pwHash, Role.Admin)
    ).to.be.revertedWith("UserRegistry: invalid role");
  });

  it("logs in successfully with the correct password hash and fails otherwise", async function () {
    const correctHash = hashPassword(finance1.address, "temp456");
    await registry.connect(admin).registerUser(finance1.address, "finance1", correctHash, Role.Finance);

    const ok = await registry.login(finance1.address, correctHash);
    expect(ok.success).to.equal(true);
    expect(ok.username).to.equal("finance1");
    expect(ok.role).to.equal(Role.Finance);

    const wrongHash = hashPassword(finance1.address, "wrongpass");
    const bad = await registry.login(finance1.address, wrongHash);
    expect(bad.success).to.equal(false);
  });

  it("lets a registered wallet change its own password, and rejects a wrong old-password hash", async function () {
    const oldHash = hashPassword(purchasing1.address, "temp123");
    await registry.connect(admin).registerUser(purchasing1.address, "purchasing1", oldHash, Role.Purchasing);

    const newHash = hashPassword(purchasing1.address, "newSecurePass!");
    const wrongOldHash = hashPassword(purchasing1.address, "notTheOldOne");

    await expect(
      registry.connect(purchasing1).changePassword(wrongOldHash, newHash)
    ).to.be.revertedWith("UserRegistry: old password mismatch");

    await expect(registry.connect(purchasing1).changePassword(oldHash, newHash))
      .to.emit(registry, "PasswordChanged")
      .withArgs(purchasing1.address, anyValue);

    const loginOld = await registry.login(purchasing1.address, oldHash);
    expect(loginOld.success).to.equal(false);
    const loginNew = await registry.login(purchasing1.address, newHash);
    expect(loginNew.success).to.equal(true);
  });

  it("prevents an unregistered wallet from changing a password", async function () {
    await expect(
      registry.connect(outsider).changePassword(ethers.ZeroHash, ethers.ZeroHash)
    ).to.be.revertedWith("UserRegistry: wallet not registered");
  });

  it("lists all registered wallets", async function () {
    const pwHash = hashPassword(purchasing1.address, "temp123");
    await registry.connect(admin).registerUser(purchasing1.address, "purchasing1", pwHash, Role.Purchasing);
    const wallets = await registry.getAllWallets();
    expect(wallets).to.include(admin.address);
    expect(wallets).to.include(purchasing1.address);
  });
});
