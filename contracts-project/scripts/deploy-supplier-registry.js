const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const userRegistryAddress = process.env.USER_REGISTRY_ADDRESS;
  if (!userRegistryAddress) {
    throw new Error("Set USER_REGISTRY_ADDRESS env var to the deployed UserRegistry address");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying SupplierRegistry with deployer:", deployer.address);
  console.log("Using UserRegistry at:", userRegistryAddress);

  const SupplierRegistry = await ethers.getContractFactory("SupplierRegistry");
  const supplierRegistry = await SupplierRegistry.deploy(userRegistryAddress);
  await supplierRegistry.waitForDeployment();

  console.log("SupplierRegistry deployed at:", await supplierRegistry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
