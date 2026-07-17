const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const userRegistryAddress = process.env.USER_REGISTRY_ADDRESS;
  if (!userRegistryAddress) {
    throw new Error("Set USER_REGISTRY_ADDRESS env var to the deployed UserRegistry address");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying ContractApproval with deployer:", deployer.address);
  console.log("Using UserRegistry at:", userRegistryAddress);

  const ContractApproval = await ethers.getContractFactory("ContractApproval");
  const contractApproval = await ContractApproval.deploy(userRegistryAddress);
  await contractApproval.waitForDeployment();

  console.log("ContractApproval deployed at:", await contractApproval.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
