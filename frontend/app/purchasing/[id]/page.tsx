"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ApprovalStatusPanel } from "@/components/ApprovalStatusPanel";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { useInvoice } from "@/lib/useInvoices";
import { Invoice, InvoiceStatus } from "@/lib/contract";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { secondaryButtonClass } from "@/lib/ui";

async function downloadInvoicePdf(invoice: Invoice) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  const invoiceId = `INV-${invoice.id.toString().padStart(4, "0")}`;

  doc.setFontSize(16);
  doc.text("Invoice Approval - Blockchain", 14, 18);
  doc.setFontSize(11);
  doc.text(`No. Invoice: ${invoiceId}`, 14, 28);
  doc.text(`Pemasok: ${invoice.supplierName}`, 14, 34);
  doc.text(`Tanggal: ${formatDateTime(invoice.invoiceDate)}`, 14, 40);

  autoTable(doc, {
    startY: 48,
    head: [["Barang", "Qty", "Harga Satuan", "Subtotal"]],
    body: invoice.items.map((item) => [
      item.name,
      item.qty.toString(),
      formatRupiah(item.unitPrice),
      formatRupiah(item.qty * item.unitPrice),
    ]),
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.text(`DP: ${formatRupiah(invoice.dpAmount)}`, 14, finalY);
  doc.text(`Total: ${formatRupiah(invoice.totalAmount)}`, 14, finalY + 6);
  doc.text(`Sisa Pembayaran: ${formatRupiah(invoice.totalAmount - invoice.dpAmount)}`, 14, finalY + 12);

  let sigY = finalY + 24;
  for (const record of invoice.history) {
    if (record.approved) {
      doc.text(
        `Disetujui oleh ${record.roleLabel} (${record.wallet}) - ${formatDateTime(record.timestamp)}`,
        14,
        sigY
      );
      sigY += 6;
    }
  }

  doc.save(`${invoiceId}.pdf`);
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useInvoice(BigInt(id));
  const invoice = data as Invoice | undefined;
  const [downloading, setDownloading] = useState(false);

  const backLink = (
    <Link href="/purchasing" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Daftar Invoice
    </Link>
  );

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        {backLink}
        <p className="text-sm text-slate-500">Memuat invoice...</p>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        {backLink}
        <p className="text-sm text-red-600">Invoice tidak ditemukan.</p>
      </main>
    );
  }

  const isApproved = invoice.status === InvoiceStatus.Approved;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      {backLink}

      <InvoiceDocument
        invoice={invoice}
        headerRight={
          isApproved && (
            <button
              onClick={async () => {
                setDownloading(true);
                try {
                  await downloadInvoicePdf(invoice);
                } finally {
                  setDownloading(false);
                }
              }}
              disabled={downloading}
              className={secondaryButtonClass}
            >
              {downloading ? "Membuat PDF..." : "Download PDF"}
            </button>
          )
        }
      />

      <div className="flex justify-end">
        <div className="w-full sm:max-w-md">
          <ApprovalStatusPanel invoice={invoice} />
        </div>
      </div>
    </main>
  );
}
