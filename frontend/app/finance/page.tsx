"use client";

import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { StatCard } from "@/components/StatCard";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useAllInvoices } from "@/lib/useInvoices";
import { useDashboardSetting } from "@/lib/dashboardSettings";
import { Invoice, InvoiceStatus, invoiceStatusLabel, Role } from "@/lib/contract";
import { FINANCE_NAV } from "@/lib/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { cardClass, statusBadgeClass } from "@/lib/ui";

export default function FinancePage() {
  return (
    <RoleGuard role={Role.Finance} navItems={FINANCE_NAV}>
      <FinanceDashboard />
    </RoleGuard>
  );
}

function FinanceDashboard() {
  const { username } = useCurrentUser();
  const { title, message } = useDashboardSetting("finance");
  const { invoices, isLoading } = useAllInvoices();

  const queue = invoices.filter((inv) => inv.status === InvoiceStatus.PendingFinance);
  const processedByMe = invoices.filter((inv) => inv.history.some((r) => r.roleLabel === "Finance"));
  const approvedByMe = processedByMe.filter((inv) =>
    inv.history.some((r) => r.roleLabel === "Finance" && r.approved)
  ).length;
  const rejectedByMe = processedByMe.filter((inv) =>
    inv.history.some((r) => r.roleLabel === "Finance" && !r.approved)
  ).length;

  return (
    <main className="flex w-full max-w-5xl flex-col gap-6 px-8 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Login berhasil sebagai <strong className="text-slate-700">{username}</strong>
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Menunggu Approval" value={queue.length} />
        <StatCard label="Sudah Disetujui" value={approvedByMe} />
        <StatCard label="Sudah Ditolak" value={rejectedByMe} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Antrian Menunggu Approval ({queue.length})
        </h2>

        {isLoading && <p className="text-sm text-slate-500">Memuat invoice...</p>}

        {!isLoading && queue.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
            <p className="font-medium text-slate-700">Tidak ada invoice menunggu</p>
            <p className="max-w-sm text-sm text-slate-500">
              Semua invoice sudah diproses. Antrian baru akan muncul di sini saat Purchasing
              mengajukan invoice.
            </p>
          </div>
        )}

        {!isLoading && queue.length > 0 && (
          <div className={`${cardClass} overflow-x-auto p-0`}>
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Pemasok</th>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((inv) => (
                  <tr key={inv.id.toString()} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-3">
                      <Link
                        href={`/finance/${inv.id}`}
                        className="whitespace-nowrap font-medium text-blue-600 hover:underline"
                      >
                        INV-{inv.id.toString().padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-700">{inv.supplierName}</td>
                    <td className="px-6 py-3 text-slate-500">{formatDateTime(inv.invoiceDate)}</td>
                    <td className="px-6 py-3 text-slate-700">{formatRupiah(inv.totalAmount)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
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

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Invoice yang Sudah Saya Proses ({processedByMe.length})
        </h2>
        <p className="mb-3 -mt-2 text-xs text-slate-500">
          Termasuk status akhirnya di Manager, supaya kamu tahu invoice yang sudah kamu approve
          akhirnya lolos atau ditolak.
        </p>

        {!isLoading && processedByMe.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
            <p className="font-medium text-slate-700">Belum ada invoice yang kamu proses</p>
          </div>
        )}

        {!isLoading && processedByMe.length > 0 && (
          <div className={`${cardClass} overflow-x-auto p-0`}>
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Pemasok</th>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {processedByMe.map((inv: Invoice) => (
                  <tr key={inv.id.toString()} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-3">
                      <Link
                        href={`/finance/${inv.id}`}
                        className="whitespace-nowrap font-medium text-blue-600 hover:underline"
                      >
                        INV-{inv.id.toString().padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-700">{inv.supplierName}</td>
                    <td className="px-6 py-3 text-slate-500">{formatDateTime(inv.invoiceDate)}</td>
                    <td className="px-6 py-3 text-slate-700">{formatRupiah(inv.totalAmount)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
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
