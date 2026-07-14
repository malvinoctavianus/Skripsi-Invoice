"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ApprovalStatusPanel } from "@/components/ApprovalStatusPanel";
import { useInvoice } from "@/lib/useInvoices";
import { Invoice, InvoiceStatus, invoiceStatusLabel } from "@/lib/contract";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cardClass, primaryButtonClass, secondaryButtonClass, statusBadgeClass } from "@/lib/ui";

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

  const invoiceId = `INV-${invoice.id.toString().padStart(4, "0")}`;
  const isApproved = invoice.status === InvoiceStatus.Approved;
  const isRejected =
    invoice.status === InvoiceStatus.RejectedByFinance || invoice.status === InvoiceStatus.RejectedByManager;
  const rejection = invoice.history.find((r) => !r.approved);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      {backLink}

      <div className={cardClass}>
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{invoiceId}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pemasok: <span className="text-slate-700">{invoice.supplierName}</span>
            </p>
            <p className="text-sm text-slate-500">Tanggal: {formatDateTime(invoice.invoiceDate)}</p>
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                statusBadgeClass[invoiceStatusLabel(invoice.status)] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {invoiceStatusLabel(invoice.status)}
            </span>
          </div>

          {isApproved && (
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
          )}
        </div>

        {isRejected && rejection && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">
              Invoice ditolak oleh {rejection.roleLabel} pada {formatDateTime(rejection.timestamp)}.
            </p>
            {rejection.note && <p className="mt-1">Alasan: {rejection.note}</p>}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">Barang</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Harga Satuan</th>
                <th className="py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-3 text-slate-700">{item.name}</td>
                  <td className="py-2.5 pr-3 text-slate-500">{item.qty.toString()}</td>
                  <td className="py-2.5 pr-3 text-slate-500">{formatRupiah(item.unitPrice)}</td>
                  <td className="py-2.5 text-slate-700">{formatRupiah(item.qty * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col items-end gap-1 text-sm">
          <p className="text-slate-500">
            DP: <span className="text-slate-700">{formatRupiah(invoice.dpAmount)}</span>
          </p>
          <p className="text-slate-500">
            Total: <span className="font-semibold text-slate-900">{formatRupiah(invoice.totalAmount)}</span>
          </p>
          <p className="text-slate-500">
            Sisa Pembayaran:{" "}
            <span className="font-semibold text-slate-900">
              {formatRupiah(invoice.totalAmount - invoice.dpAmount)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-full sm:max-w-md">
          <ApprovalStatusPanel invoice={invoice} />
        </div>
      </div>
    </main>
  );
}
