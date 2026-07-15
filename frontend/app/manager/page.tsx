"use client";

import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useAllInvoices } from "@/lib/useInvoices";
import { Invoice, InvoiceStatus, invoiceStatusLabel, Role } from "@/lib/contract";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { cardClass, statusBadgeClass } from "@/lib/ui";

export default function ManagerPage() {
  return (
    <RoleGuard role={Role.Manager}>
      <ManagerDashboard />
    </RoleGuard>
  );
}

function ManagerDashboard() {
  const { username } = useCurrentUser();
  const { invoices, isLoading } = useAllInvoices();

  const queue = invoices.filter((inv) => inv.status === InvoiceStatus.PendingManager);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard Manager</h1>
        <p className="mt-1 text-sm text-slate-500">
          Login berhasil sebagai <strong className="text-slate-700">{username}</strong>
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Antrian Menunggu Approval Manager ({queue.length})
        </h2>

        {isLoading && <p className="text-sm text-slate-500">Memuat invoice...</p>}

        {!isLoading && queue.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
            <p className="font-medium text-slate-700">Tidak ada invoice menunggu</p>
            <p className="max-w-sm text-sm text-slate-500">
              Antrian baru akan muncul di sini setelah Finance menyetujui invoice.
            </p>
          </div>
        )}

        {!isLoading && queue.length > 0 && (
          <div className={`${cardClass} overflow-x-auto p-0`}>
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Pemasok</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((inv) => (
                  <tr key={inv.id.toString()} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/manager/${inv.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        INV-{inv.id.toString().padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.supplierName}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(inv.invoiceDate)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatRupiah(inv.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Semua Transaksi Purchasing &amp; Finance ({invoices.length})
        </h2>
        <p className="mb-3 -mt-2 text-xs text-slate-500">
          Termasuk yang belum diverifikasi/di-approve, supaya Manager tetap bisa memantau seluruh
          transaksi yang berjalan.
        </p>

        {!isLoading && invoices.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
            <p className="font-medium text-slate-700">Belum ada invoice</p>
            <p className="max-w-sm text-sm text-slate-500">
              Invoice yang dibuat Purchasing akan muncul di sini.
            </p>
          </div>
        )}

        {!isLoading && invoices.length > 0 && (
          <div className={`${cardClass} overflow-x-auto p-0`}>
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Pemasok</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: Invoice) => (
                  <tr key={inv.id.toString()} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/manager/${inv.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        INV-{inv.id.toString().padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.supplierName}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(inv.invoiceDate)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatRupiah(inv.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusBadgeClass[invoiceStatusLabel(inv.status)] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {invoiceStatusLabel(inv.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
