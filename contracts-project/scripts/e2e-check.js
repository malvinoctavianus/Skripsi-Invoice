const hre = require("hardhat");
const { ethers } = hre;

function hashPassword(wallet, password) {
  return ethers.keccak256(
    ethers.solidityPacked(["address", "string"], [wallet, password])
  );
}

async function main() {
  const REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const [admin, purchasing1] = await ethers.getSigners();

  const registry = await ethers.getContractAt("UserRegistry", REGISTRY_ADDRESS);

  console.log("--- Admin registers purchasing1 wallet ---");
  const tempPassword = "temp123";
  const initialHash = hashPassword(purchasing1.address, tempPassword);
  const tx = await registry.connect(admin).registerUser(
    purchasing1.address,
    "purchasing1",
    initialHash,
    2 // Role.Purchasing
  );
  await tx.wait();
  console.log("Registered. Tx:", tx.hash);

  console.log("--- purchasing1 logs in with temp password ---");
  const loginResult = await registry.login(purchasing1.address, hashPassword(purchasing1.address, tempPassword));
  console.log("Login success:", loginResult.success, "username:", loginResult.username, "role:", loginResult.role.toString());

  console.log("--- purchasing1 changes password (must go on-chain) ---");
  const newPassword = "NewSecurePass!";
  const changeTx = await registry.connect(purchasing1).changePassword(
    hashPassword(purchasing1.address, tempPassword),
    hashPassword(purchasing1.address, newPassword)
  );
  await changeTx.wait();
  console.log("Password changed. Tx:", changeTx.hash);

  console.log("--- old password should now fail ---");
  const oldLogin = await registry.login(purchasing1.address, hashPassword(purchasing1.address, tempPassword));
  console.log("Old password login success (expected false):", oldLogin.success);

  console.log("--- new password should now work ---");
  const newLogin = await registry.login(purchasing1.address, hashPassword(purchasing1.address, newPassword));
  console.log("New password login success (expected true):", newLogin.success);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
