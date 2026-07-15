const hre = require("hardhat");
const { ethers } = hre;

// Deploys UserRegistry with a chosen wallet as admin, using Hardhat's
// impersonation feature so we don't need that wallet's private key.
// Only works against a local Hardhat network.

const ADMIN_WALLET = "0x2f5B45c929CA80f063464D3f0F60B1d4367Dc293";

async function main() {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [ADMIN_WALLET],
  });
  await hre.network.provider.request({
    method: "hardhat_setBalance",
    params: [ADMIN_WALLET, "0x56BC75E2D63100000"], // 100 ETH
  });

  const deployer = await ethers.getSigner(ADMIN_WALLET);

  const adminUsername = process.env.ADMIN_USERNAME || "admin";

  const UserRegistry = await ethers.getContractFactory("UserRegistry", deployer);
  const registry = await UserRegistry.deploy(adminUsername);
  await registry.waitForDeployment();

  console.log("UserRegistry deployed at:", await registry.getAddress());
  console.log("Admin wallet:", ADMIN_WALLET);
  console.log("Admin username:", adminUsername);

  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [ADMIN_WALLET],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
