const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const userRegistryAddress = process.env.USER_REGISTRY_ADDRESS;
  if (!userRegistryAddress) {
    throw new Error("Set USER_REGISTRY_ADDRESS env var to the deployed UserRegistry address");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying InvoiceApproval with deployer:", deployer.address);
  console.log("Using UserRegistry at:", userRegistryAddress);

  const InvoiceApproval = await ethers.getContractFactory("InvoiceApproval");
  const invoiceApproval = await InvoiceApproval.deploy(userRegistryAddress);
  await invoiceApproval.waitForDeployment();

  console.log("InvoiceApproval deployed at:", await invoiceApproval.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
