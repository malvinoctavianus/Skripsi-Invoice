const hre = require("hardhat");
const { ethers } = hre;

// Registers Legal/Finance/Direktur wallets against an already-deployed UserRegistry,
// using the real ADMIN_PRIVATE_KEY signer. Works on any live network (Sepolia, etc.) since
// it doesn't rely on Hardhat's impersonation (which only exists on local networks).

const REGISTRY_ADDRESS = process.env.USER_REGISTRY_ADDRESS;

const Role = { Legal: 2, Finance: 3, Direktur: 4 };

const USERS = [
  { wallet: "0x92A7cb6c486A2452ac9CA73646A511b63f198Adc", username: "Legal 1", role: Role.Legal },
  { wallet: "0x18677C7262aE7fDaC0357846fAC356d2d24aEF81", username: "Finance 1", role: Role.Finance },
  { wallet: "0xBC6C6Ec0D7e0b2D4D18935e37fFd66c00A48788d", username: "Direktur", role: Role.Direktur },
];

async function main() {
  if (!REGISTRY_ADDRESS) {
    throw new Error("Set USER_REGISTRY_ADDRESS env var");
  }

  const [admin] = await ethers.getSigners();
  console.log("Registering as admin:", admin.address);

  const registry = await ethers.getContractAt("UserRegistry", REGISTRY_ADDRESS, admin);

  for (const user of USERS) {
    const alreadyRegistered = await registry.isWalletRegistered(user.wallet);
    if (alreadyRegistered) {
      console.log(`Skipping ${user.username} (${user.wallet}) - already registered.`);
      continue;
    }
    const tx = await registry.registerUser(user.wallet, user.username, user.role);
    await tx.wait();
    console.log(`Registered ${user.username} (${user.wallet}) as role ${user.role}, tx: ${tx.hash}`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
