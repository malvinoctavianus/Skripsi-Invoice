const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying UserRegistry with admin wallet:", deployer.address);

  const adminUsername = process.env.ADMIN_USERNAME || "admin";

  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const registry = await UserRegistry.deploy(adminUsername);
  await registry.waitForDeployment();

  console.log("UserRegistry deployed at:", await registry.getAddress());
  console.log("Admin username:", adminUsername);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
