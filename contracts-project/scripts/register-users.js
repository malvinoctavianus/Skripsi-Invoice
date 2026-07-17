const hre = require("hardhat");
const { ethers } = hre;

// Registers Legal/Finance/Direktur wallets as the impersonated admin,
// against the already-deployed UserRegistry contract. Local Hardhat only.

const ADMIN_WALLET = "0x2f5B45c929CA80f063464D3f0F60B1d4367Dc293";
const REGISTRY_ADDRESS = "0x85294d3E45F507005525C681da61cB358406872E";

const Role = { Legal: 2, Finance: 3, Direktur: 4 };

const USERS = [
  { wallet: "0x92A7cb6c486A2452ac9CA73646A511b63f198Adc", username: "Legal 1", role: Role.Legal },
  { wallet: "0x18677C7262aE7fDaC0357846fAC356d2d24aEF81", username: "Finance 1", role: Role.Finance },
  { wallet: "0xBC6C6Ec0D7e0b2D4D18935e37fFd66c00A48788d", username: "Direktur", role: Role.Direktur },
];

async function main() {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [ADMIN_WALLET],
  });
  await hre.network.provider.request({
    method: "hardhat_setBalance",
    params: [ADMIN_WALLET, "0x56BC75E2D63100000"],
  });

  const admin = await ethers.getSigner(ADMIN_WALLET);
  const registry = await ethers.getContractAt("UserRegistry", REGISTRY_ADDRESS, admin);

  for (const user of USERS) {
    const tx = await registry.registerUser(user.wallet, user.username, user.role);
    await tx.wait();
    console.log(`Registered ${user.username} (${user.wallet}) as role ${user.role}`);
  }

  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [ADMIN_WALLET],
  });

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
