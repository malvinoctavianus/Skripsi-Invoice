"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { StatCard } from "@/components/StatCard";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { usePurchasingInvoices } from "@/lib/useInvoices";
import { useDashboardSetting } from "@/lib/dashboardSettings";
import { invoiceStatusLabel, Invoice, Role } from "@/lib/contract";
import { PURCHASING_NAV } from "@/lib/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { cardClass, primaryButtonClass, statusBadgeClass } from "@/lib/ui";

type Tab = "pending" | "approved" | "rejected";

export default function PurchasingPage() {
  return (
    <RoleGuard role={Role.Purchasing} navItems={PURCHASING_NAV}>
      <PurchasingDashboard />
    </RoleGuard>
  );
}

function PurchasingDashboard() {
  const { username } = useCurrentUser();
  const { title, message } = useDashboardSetting("purchasing");
  const { pending, approved, rejected, isLoading } = usePurchasingInvoices();
  const [tab, setTab] = useState<Tab>("pending");

  const listByTab: Record<Tab, Invoice[]> = { pending, approved, rejected };
  const list = listByTab[tab];

  return (
    <main className="flex w-full max-w-5xl flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Login sebagai <strong className="text-slate-700">{username}</strong>
          </p>
        </div>
        <Link href="/purchasing/new" className={primaryButtonClass}>
          + Tambah Invoice
        </Link>
      </div>

      {message && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={pending.length} />
        <StatCard label="Approved" value={approved.length} />
        <StatCard label="Ditolak" value={rejected.length} />
      </div>

      <div className="flex gap-2">
        {(
          [
            { key: "pending", label: `Pending (${pending.length})` },
            { key: "approved", label: `Approved (${approved.length})` },
            { key: "rejected", label: `Ditolak (${rejected.length})` },
          ] as { key: Tab; label: string }[]
        ).map((opt) => (
          <label
            key={opt.key}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === opt.key
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="invoice-tab"
              value={opt.key}
              checked={tab === opt.key}
              onChange={() => setTab(opt.key)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Memuat invoice...</p>}

      {!isLoading && list.length === 0 && (
        <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
          <p className="font-medium text-slate-700">Belum ada invoice</p>
          <p className="max-w-sm text-sm text-slate-500">
            {tab === "pending"
              ? "Klik \"+ Tambah Invoice\" untuk membuat invoice baru."
              : "Belum ada invoice pada kategori ini."}
          </p>
        </div>
      )}

      {!isLoading && list.length > 0 && (
        <div className={`${cardClass} overflow-x-auto p-0`}>
          <table className="w-full min-w-[560px] border-collapse text-sm">
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
              {list.map((inv) => (
                <tr key={inv.id.toString()} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/purchasing/${inv.id}`}
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
    </main>
  );
}
