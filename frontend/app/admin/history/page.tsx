"use client";

import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { useAllInvoices } from "@/lib/useInvoices";
import { invoiceStatusLabel, Role } from "@/lib/contract";
import { ADMIN_NAV } from "@/lib/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { cardClass, statusBadgeClass } from "@/lib/ui";

export default function AdminHistoryPage() {
  return (
    <RoleGuard role={Role.Admin} navItems={ADMIN_NAV}>
      <HistoryList />
    </RoleGuard>
  );
}

function HistoryList() {
  const { invoices, isLoading } = useAllInvoices();

  return (
    <main className="flex w-full max-w-4xl flex-col gap-5 px-8 py-10">
      <Link href="/admin" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
        &larr; Kembali ke Dashboard Admin
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">History Transaksi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Semua invoice yang pernah dibuat, dengan status terkini ({invoices.length}).
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Memuat invoice...</p>}

      {!isLoading && invoices.length === 0 && (
        <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
          <p className="font-medium text-slate-700">Belum ada invoice</p>
        </div>
      )}

      {!isLoading && invoices.length > 0 && (
        <div className={`${cardClass} overflow-x-auto p-0`}>
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Purchasing</th>
                <th className="px-4 py-3">Pemasok</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id.toString()} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/history/${inv.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      INV-{inv.id.toString().padStart(4, "0")}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {inv.purchasing.slice(0, 6)}...{inv.purchasing.slice(-4)}
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
    </main>
  );
}
