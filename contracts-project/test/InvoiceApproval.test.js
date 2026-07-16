const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const Role = { None: 0, Admin: 1, Purchasing: 2, Finance: 3, Manager: 4 };
const Status = {
  PendingFinance: 0,
  PendingManager: 1,
  Approved: 2,
  RejectedByFinance: 3,
  RejectedByManager: 4,
};

describe("InvoiceApproval", function () {
  let registry, invoiceApproval;
  let admin, purchasing1, finance1, manager1, outsider;

  const sampleItems = [
    { name: "Kertas A4", qty: 10, unitPrice: 50000 },
    { name: "Tinta Printer", qty: 2, unitPrice: 150000 },
  ];
  const sampleTotal = 10 * 50000 + 2 * 150000;

  beforeEach(async function () {
    [admin, purchasing1, finance1, manager1, outsider] = await ethers.getSigners();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    registry = await UserRegistry.deploy("admin");
    await registry.waitForDeployment();

    await registry.connect(admin).registerUser(purchasing1.address, "purchasing1", Role.Purchasing);
    await registry.connect(admin).registerUser(finance1.address, "finance1", Role.Finance);
    await registry.connect(admin).registerUser(manager1.address, "manager1", Role.Manager);

    const InvoiceApproval = await ethers.getContractFactory("InvoiceApproval");
    invoiceApproval = await InvoiceApproval.deploy(await registry.getAddress());
    await invoiceApproval.waitForDeployment();
  });

  it("lets a registered Purchasing wallet create an invoice with correct totals", async function () {
    const now = Math.floor(Date.now() / 1000);
    await expect(
      invoiceApproval.connect(purchasing1).createInvoice("PT Sumber Makmur", now, sampleItems, 0, "Keterangan test")
    )
      .to.emit(invoiceApproval, "InvoiceCreated")
      .withArgs(1, purchasing1.address, sampleTotal, anyValue);

    const inv = await invoiceApproval.getInvoice(1);
    expect(inv.supplierName).to.equal("PT Sumber Makmur");
    expect(inv.totalAmount).to.equal(sampleTotal);
    expect(inv.status).to.equal(Status.PendingFinance);
    expect(inv.items.length).to.equal(2);
    expect(inv.keterangan).to.equal("Keterangan test");
  });

  it("rejects invoice creation and revision without a keterangan", async function () {
    const now = Math.floor(Date.now() / 1000);
    await expect(
      invoiceApproval.connect(purchasing1).createInvoice("PT X", now, sampleItems, 0, "")
    ).to.be.revertedWith("InvoiceApproval: keterangan required");

    await invoiceApproval.connect(purchasing1).createInvoice("PT X", now, sampleItems, 0, "Keterangan test");
    await invoiceApproval.connect(finance1).rejectByFinance(1, "budget tidak cukup");

    await expect(
      invoiceApproval.connect(purchasing1).reviseInvoice(1, "PT X", now, sampleItems, 0, "")
    ).to.be.revertedWith("InvoiceApproval: keterangan required");
  });

  it("rejects invoice creation from a non-Purchasing wallet", async function () {
    const now = Math.floor(Date.now() / 1000);
    await expect(
      invoiceApproval.connect(finance1).createInvoice("PT X", now, sampleItems, 0, "Keterangan test")
    ).to.be.revertedWith("InvoiceApproval: wrong role");

    await expect(
      invoiceApproval.connect(outsider).createInvoice("PT X", now, sampleItems, 0, "Keterangan test")
    ).to.be.revertedWith("InvoiceApproval: wallet not registered");
  });

  it("rejects a DP amount greater than the invoice total", async function () {
    const now = Math.floor(Date.now() / 1000);
    await expect(
      invoiceApproval.connect(purchasing1).createInvoice("PT X", now, sampleItems, sampleTotal + 1, "Keterangan test")
    ).to.be.revertedWith("InvoiceApproval: DP exceeds total amount");
  });

  it("enforces sequential approval: Manager cannot act before Finance approves", async function () {
    const now = Math.floor(Date.now() / 1000);
    await invoiceApproval.connect(purchasing1).createInvoice("PT X", now, sampleItems, 0, "Keterangan test");

    await expect(
      invoiceApproval.connect(manager1).approveByManager(1, "ok")
    ).to.be.revertedWith("InvoiceApproval: not awaiting Manager approval");
  });

  it("runs the full happy path: Finance approves, Manager approves, NFT is minted", async function () {
    const now = Math.floor(Date.now() / 1000);
    await invoiceApproval.connect(purchasing1).createInvoice("PT X", now, sampleItems, 0, "Keterangan test");

    await expect(invoiceApproval.connect(finance1).approveByFinance(1, "sesuai anggaran"))
      .to.emit(invoiceApproval, "InvoiceApprovalUpdated")
      .withArgs(1, finance1.address, Status.PendingManager, anyValue);

    await expect(invoiceApproval.connect(manager1).approveByManager(1, "disetujui"))
      .to.emit(invoiceApproval, "InvoiceCertificateMinted")
      .withArgs(1, purchasing1.address, anyValue);

    const inv = await invoiceApproval.getInvoice(1);
    expect(inv.status).to.equal(Status.Approved);
    expect(inv.history.length).to.equal(2);

    expect(await invoiceApproval.ownerOf(1)).to.equal(purchasing1.address);
    const uri = await invoiceApproval.tokenURI(1);
    expect(uri).to.include("data:application/json;base64,");
  });

  it("lets Finance reject an invoice, stopping the flow", async function () {
    const now = Math.floor(Date.now() / 1000);
    await invoiceApproval.connect(purchasing1).createInvoice("PT X", now, sampleItems, 0, "Keterangan test");

    await expect(invoiceApproval.connect(finance1).rejectByFinance(1, "budget tidak cukup"))
      .to.emit(invoiceApproval, "InvoiceApprovalUpdated")
      .withArgs(1, finance1.address, Status.RejectedByFinance, anyValue);

    const inv = await invoiceApproval.getInvoice(1);
    expect(inv.status).to.equal(Status.RejectedByFinance);
    expect(inv.history[0].approved).to.equal(false);
    expect(inv.history[0].note).to.equal("budget tidak cukup");
  });

  it("lets Manager reject an invoice after Finance approved it", async function () {
    const now = Math.floor(Date.now() / 1000);
    await invoiceApproval.connect(purchasing1).createInvoice("PT X", now, sampleItems, 0, "Keterangan test");
    await invoiceApproval.connect(finance1).approveByFinance(1, "ok");

    await expect(invoiceApproval.connect(manager1).rejectByManager(1, "supplier tidak sesuai"))
      .to.emit(invoiceApproval, "InvoiceApprovalUpdated")
      .withArgs(1, manager1.address, Status.RejectedByManager, anyValue);

    const inv = await invoiceApproval.getInvoice(1);
    expect(inv.status).to.equal(Status.RejectedByManager);
    expect(inv.history.length).to.equal(2);
  });

  it("lets Purchasing revise a rejected invoice and resubmit it under the same id", async function () {
    const now = Math.floor(Date.now() / 1000);
    await invoiceApproval.connect(purchasing1).createInvoice("PT X", now, sampleItems, 0, "Keterangan test");
    await invoiceApproval.connect(finance1).rejectByFinance(1, "budget tidak cukup");

    const revisedItems = [{ name: "Kertas A4", qty: 5, unitPrice: 50000 }];
    const revisedTotal = 5 * 50000;

    await expect(
      invoiceApproval.connect(purchasing1).reviseInvoice(1, "PT Y", now, revisedItems, 0, "Keterangan revisi")
    )
      .to.emit(invoiceApproval, "InvoiceRevised")
      .withArgs(1, purchasing1.address, revisedTotal, anyValue);

    const inv = await invoiceApproval.getInvoice(1);
    expect(inv.status).to.equal(Status.PendingFinance);
    expect(inv.supplierName).to.equal("PT Y");
    expect(inv.totalAmount).to.equal(revisedTotal);
    expect(inv.items.length).to.equal(1);
    expect(inv.history.length).to.equal(2);
    expect(inv.history[0].note).to.equal("budget tidak cukup");
    expect(inv.history[1].roleLabel).to.equal("Purchasing");

    // full happy path after revision
    await invoiceApproval.connect(finance1).approveByFinance(1, "ok setelah revisi");
    await invoiceApproval.connect(manager1).approveByManager(1, "disetujui");
    expect(await invoiceApproval.ownerOf(1)).to.equal(purchasing1.address);
  });

  it("rejects revision from a non-owner wallet or a non-rejected invoice", async function () {
    const now = Math.floor(Date.now() / 1000);
    await invoiceApproval.connect(purchasing1).createInvoice("PT X", now, sampleItems, 0, "Keterangan test");

    await expect(
      invoiceApproval.connect(outsider).reviseInvoice(1, "PT Y", now, sampleItems, 0, "Keterangan test")
    ).to.be.revertedWith("InvoiceApproval: not the invoice owner");

    await expect(
      invoiceApproval.connect(purchasing1).reviseInvoice(1, "PT Y", now, sampleItems, 0, "Keterangan test")
    ).to.be.revertedWith("InvoiceApproval: invoice is not rejected");
  });

  it("lists invoice ids by Purchasing wallet", async function () {
    const now = Math.floor(Date.now() / 1000);
    await invoiceApproval.connect(purchasing1).createInvoice("PT A", now, sampleItems, 0, "Keterangan test");
    await invoiceApproval.connect(purchasing1).createInvoice("PT B", now, sampleItems, 0, "Keterangan test");

    const ids = await invoiceApproval.getInvoicesByPurchasing(purchasing1.address);
    expect(ids.map(Number)).to.deep.equal([1, 2]);
  });
});
