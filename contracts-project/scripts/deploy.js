const hre = require("hardhat");
const { ethers } = hre;

// Must match the hashing scheme used by the frontend:
// keccak256(abi.encodePacked(wallet, password))
function hashPassword(wallet, password) {
  return ethers.keccak256(
    ethers.solidityPacked(["address", "string"], [wallet, password])
  );
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying UserRegistry with admin wallet:", deployer.address);

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "changeme123";
  const adminPasswordHash = hashPassword(deployer.address, adminPassword);

  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const registry = await UserRegistry.deploy(adminUsername, adminPasswordHash);
  await registry.waitForDeployment();

  console.log("UserRegistry deployed at:", await registry.getAddress());
  console.log("Admin username:", adminUsername);
  console.log("Admin initial password (share securely, then change it):", adminPassword);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
