"use client";

import { ReactNode } from "react";
import { Invoice, InvoiceStatus, invoiceStatusLabel } from "@/lib/contract";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cardClass, statusBadgeClass } from "@/lib/ui";

export function InvoiceDocument({ invoice, headerRight }: { invoice: Invoice; headerRight?: ReactNode }) {
  const invoiceId = `INV-${invoice.id.toString().padStart(4, "0")}`;
  const isRejected =
    invoice.status === InvoiceStatus.RejectedByFinance || invoice.status === InvoiceStatus.RejectedByManager;
  const rejection = invoice.history.find((r) => !r.approved);

  return (
    <div className={cardClass}>
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{invoiceId}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pemasok: <span className="text-slate-700">{invoice.supplierName}</span>
          </p>
          <p className="text-sm text-slate-500">Tanggal: {formatDateTime(invoice.invoiceDate)}</p>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
              statusBadgeClass[invoiceStatusLabel(invoice.status)] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {invoiceStatusLabel(invoice.status)}
          </span>
        </div>

        {headerRight}
      </div>

      {isRejected && rejection && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">
            Invoice ditolak oleh {rejection.roleLabel} pada {formatDateTime(rejection.timestamp)}.
          </p>
          {rejection.note && <p className="mt-1">Alasan: {rejection.note}</p>}
        </div>
      )}

      {invoice.keterangan && (
        <p className="mb-4 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Keterangan:</span> {invoice.keterangan}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
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
  );
}
