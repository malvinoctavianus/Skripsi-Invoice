const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const userRegistryAddress = process.env.USER_REGISTRY_ADDRESS;
  if (!userRegistryAddress) {
    throw new Error("Set USER_REGISTRY_ADDRESS env var to the deployed UserRegistry address");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying CounterpartyRegistry with deployer:", deployer.address);
  console.log("Using UserRegistry at:", userRegistryAddress);

  const CounterpartyRegistry = await ethers.getContractFactory("CounterpartyRegistry");
  const counterpartyRegistry = await CounterpartyRegistry.deploy(userRegistryAddress);
  await counterpartyRegistry.waitForDeployment();

  console.log("CounterpartyRegistry deployed at:", await counterpartyRegistry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
