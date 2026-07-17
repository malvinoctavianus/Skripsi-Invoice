"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { RoleGuard } from "@/components/RoleGuard";
import { useAllCounterparties } from "@/lib/useCounterparties";
import { Role, Counterparty, CounterpartyStatus, counterpartyStatusLabel } from "@/lib/contract";
import { LEGAL_NAV } from "@/lib/navigation";
import { formatDateTime } from "@/lib/format";
import { cardClass, primaryButtonClass, statusBadgeClass } from "@/lib/ui";

type Tab = "pending" | "approved" | "rejected";

export default function MitraPage() {
  return (
    <RoleGuard role={Role.Legal} navItems={LEGAL_NAV}>
      <MitraList />
    </RoleGuard>
  );
}

function MitraList() {
  const { address } = useAccount();
  const { counterparties, isLoading } = useAllCounterparties();
  const [tab, setTab] = useState<Tab>("pending");

  const pending = counterparties.filter((s) => s.status === CounterpartyStatus.Pending);
  const approved = counterparties.filter((s) => s.status === CounterpartyStatus.Approved);
  const rejected = counterparties.filter((s) => s.status === CounterpartyStatus.Rejected);

  const listByTab: Record<Tab, Counterparty[]> = { pending, approved, rejected };
  const list = listByTab[tab];

  return (
    <main className="flex w-full max-w-4xl flex-col gap-6 px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Data Mitra</h1>
          <p className="mt-1 text-sm text-slate-500">
            Semua mitra ({counterparties.length}). Hanya yang berstatus{" "}
            <span className="font-medium text-emerald-600">Approved</span> yang bisa dipilih saat
            membuat kontrak — Admin perlu menyetujui mitra baru atau yang baru diedit. Mitra
            yang sudah <span className="font-medium text-emerald-600">Approved</span> tidak bisa
            diedit lagi; mitra yang <span className="font-medium text-red-600">Ditolak</span>{" "}
            masih bisa diajukan ulang.
          </p>
        </div>
        <Link href="/legal/mitra/new" className={`${primaryButtonClass} shrink-0 whitespace-nowrap`}>
          + Tambah Mitra
        </Link>
      </div>

      <div className="flex gap-2">
        {(
          [
            { key: "pending", label: `Menunggu Persetujuan (${pending.length})` },
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
              name="mitra-tab"
              value={opt.key}
              checked={tab === opt.key}
              onChange={() => setTab(opt.key)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Memuat data mitra...</p>}

      {!isLoading && list.length === 0 && (
        <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
          <p className="font-medium text-slate-700">Belum ada mitra pada kategori ini</p>
          {tab === "pending" && (
            <p className="max-w-sm text-sm text-slate-500">
              Klik &quot;+ Tambah Mitra&quot; untuk mendaftarkan mitra pertama.
            </p>
          )}
        </div>
      )}

      {!isLoading && list.length > 0 && (
        <div className={`${cardClass} overflow-x-auto p-0`}>
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Nama Perusahaan</th>
                <th className="px-4 py-3">Penandatangan</th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ditambahkan</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((counterparty) => {
                const label = counterpartyStatusLabel(counterparty.status);
                const isOwner = address?.toLowerCase() === counterparty.addedBy.toLowerCase();
                const canEdit = isOwner && counterparty.status !== CounterpartyStatus.Approved;
                return (
                  <tr key={counterparty.id.toString()} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-700">{counterparty.name}</td>
                    <td className="px-4 py-3 text-slate-600">{counterparty.signatoryName}</td>
                    <td className="px-4 py-3 text-slate-600">{counterparty.alamat}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                          statusBadgeClass[label] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(counterparty.addedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <Link
                          href={`/legal/mitra/${counterparty.id.toString()}/edit`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {counterparty.status === CounterpartyStatus.Rejected ? "Ajukan Ulang" : "Edit"}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
