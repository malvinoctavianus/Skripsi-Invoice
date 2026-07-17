"use client";

import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { StatCard } from "@/components/StatCard";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useAllContracts } from "@/lib/useContracts";
import { CompanyContract, ContractStatus, contractStatusLabel, Role } from "@/lib/contract";
import { DIREKTUR_NAV } from "@/lib/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { cardClass, statusBadgeClass } from "@/lib/ui";

export default function DirekturPage() {
  return (
    <RoleGuard role={Role.Direktur} navItems={DIREKTUR_NAV}>
      <DirekturDashboard />
    </RoleGuard>
  );
}

function DirekturDashboard() {
  const { username } = useCurrentUser();
  const { contracts, isLoading } = useAllContracts();

  const queue = contracts.filter((doc) => doc.status === ContractStatus.PendingDirektur);
  const approvedCount = contracts.filter((doc) => doc.status === ContractStatus.Approved).length;

  return (
    <main className="flex w-full max-w-5xl flex-col gap-8 px-8 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard Direktur</h1>
        <p className="mt-1 text-sm text-slate-500">
          Login berhasil sebagai <strong className="text-slate-700">{username}</strong>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Menunggu Approval" value={queue.length} />
        <StatCard label="Sudah Approved (NFT Terbit)" value={approvedCount} />
        <StatCard label="Total Transaksi" value={contracts.length} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Antrian Menunggu Approval Direktur ({queue.length})
        </h2>

        {isLoading && <p className="text-sm text-slate-500">Memuat kontrak...</p>}

        {!isLoading && queue.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
            <p className="font-medium text-slate-700">Tidak ada kontrak menunggu</p>
            <p className="max-w-sm text-sm text-slate-500">
              Antrian baru akan muncul di sini setelah Finance menyetujui kontrak.
            </p>
          </div>
        )}

        {!isLoading && queue.length > 0 && (
          <div className={`${cardClass} overflow-x-auto p-0`}>
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Pihak Kedua</th>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((doc) => (
                  <tr key={doc.id.toString()} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-3">
                      <Link
                        href={`/direktur/${doc.id}`}
                        className="whitespace-nowrap font-medium text-blue-600 hover:underline"
                      >
                        KTR-{doc.id.toString().padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-700">{doc.counterpartyName}</td>
                    <td className="px-6 py-3 text-slate-500">{formatDateTime(doc.contractDate)}</td>
                    <td className="px-6 py-3 text-slate-700">{formatRupiah(doc.contractValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Semua Transaksi Legal &amp; Finance ({contracts.length})
        </h2>
        <p className="mb-3 -mt-2 text-xs text-slate-500">
          Termasuk yang belum diverifikasi/di-approve, supaya Direktur tetap bisa memantau
          seluruh transaksi yang berjalan.
        </p>

        {!isLoading && contracts.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
            <p className="font-medium text-slate-700">Belum ada kontrak</p>
            <p className="max-w-sm text-sm text-slate-500">
              Kontrak yang dibuat Legal akan muncul di sini.
            </p>
          </div>
        )}

        {!isLoading && contracts.length > 0 && (
          <div className={`${cardClass} overflow-x-auto p-0`}>
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Pihak Kedua</th>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Nilai</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((doc: CompanyContract) => (
                  <tr key={doc.id.toString()} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-3">
                      <Link
                        href={`/direktur/${doc.id}`}
                        className="whitespace-nowrap font-medium text-blue-600 hover:underline"
                      >
                        KTR-{doc.id.toString().padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-700">{doc.counterpartyName}</td>
                    <td className="px-6 py-3 text-slate-500">{formatDateTime(doc.contractDate)}</td>
                    <td className="px-6 py-3 text-slate-700">{formatRupiah(doc.contractValue)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                          statusBadgeClass[contractStatusLabel(doc.status)] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {contractStatusLabel(doc.status)}
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
