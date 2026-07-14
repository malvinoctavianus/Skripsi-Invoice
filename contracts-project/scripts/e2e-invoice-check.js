const hre = require("hardhat");
const { ethers } = hre;

// Temporary manual verification script (not part of the app) - simulates the full
// Purchasing -> Finance -> Manager flow via impersonation against the already-deployed
// contracts, so the Purchasing dashboard has something real to show Pending/Approved on.

const PURCHASING_WALLET = "0x92A7cb6c486A2452ac9CA73646A511b63f198Adc";
const FINANCE_WALLET = "0x18677C7262aE7fDaC0357846fAC356d2d24aEF81";
const MANAGER_WALLET = "0xBC6C6Ec0D7e0b2D4D18935e37fFd66c00A48788d";
const INVOICE_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

async function impersonate(address) {
  await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [address] });
  await hre.network.provider.request({
    method: "hardhat_setBalance",
    params: [address, "0x56BC75E2D63100000"],
  });
  return ethers.getSigner(address);
}

async function main() {
  const invoiceApproval = await ethers.getContractAt("InvoiceApproval", INVOICE_ADDRESS);

  const purchasing = await impersonate(PURCHASING_WALLET);
  const finance = await impersonate(FINANCE_WALLET);
  const manager = await impersonate(MANAGER_WALLET);

  // Invoice 1: full happy path -> Approved + NFT
  let tx = await invoiceApproval.connect(purchasing).createInvoice(
    "PT Sumber Makmur",
    Math.floor(Date.now() / 1000),
    [
      { name: "Kertas A4", qty: 20, unitPrice: 55000 },
      { name: "Tinta Printer", qty: 4, unitPrice: 180000 },
    ],
    200000
  );
  let receipt = await tx.wait();
  console.log("Invoice #1 created, tx:", receipt.hash);

  await (await invoiceApproval.connect(finance).approveByFinance(1, "Sesuai anggaran Q3")).wait();
  await (await invoiceApproval.connect(manager).approveByManager(1, "Disetujui, lanjutkan pembayaran")).wait();
  console.log("Invoice #1 fully approved. Owner of NFT #1:", await invoiceApproval.ownerOf(1));

  // Invoice 2: still pending Finance (for the Pending tab)
  tx = await invoiceApproval.connect(purchasing).createInvoice(
    "CV Maju Jaya",
    Math.floor(Date.now() / 1000),
    [{ name: "Laptop", qty: 2, unitPrice: 12000000 }],
    0
  );
  await tx.wait();
  console.log("Invoice #2 created, still PendingFinance.");

  // Invoice 3: rejected by Finance (for the Ditolak tab)
  tx = await invoiceApproval.connect(purchasing).createInvoice(
    "UD Berkah",
    Math.floor(Date.now() / 1000),
    [{ name: "Meja Kantor", qty: 1, unitPrice: 3000000 }],
    0
  );
  await tx.wait();
  await (await invoiceApproval.connect(finance).rejectByFinance(3, "Melebihi budget bulanan")).wait();
  console.log("Invoice #3 rejected by Finance.");

  for (const addr of [PURCHASING_WALLET, FINANCE_WALLET, MANAGER_WALLET]) {
    await hre.network.provider.request({ method: "hardhat_stopImpersonatingAccount", params: [addr] });
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
