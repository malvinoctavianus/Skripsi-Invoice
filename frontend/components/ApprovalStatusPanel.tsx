"use client";

import { useReadContracts } from "wagmi";
import {
  ApprovalRecord,
  Invoice,
  InvoiceStatus,
  USER_REGISTRY_ABI,
  USER_REGISTRY_ADDRESS,
} from "@/lib/contract";
import { formatDateTime } from "@/lib/format";

function findRecord(history: readonly ApprovalRecord[], roleLabel: string): ApprovalRecord | undefined {
  return history.find((r) => r.roleLabel === roleLabel);
}

export function ApprovalStatusPanel({ invoice }: { invoice: Invoice }) {
  const financeRecord = findRecord(invoice.history, "Finance");
  const managerRecord = findRecord(invoice.history, "Manager");

  const wallets = [financeRecord?.wallet, managerRecord?.wallet].filter(
    (wallet): wallet is `0x${string}` => Boolean(wallet)
  );

  const { data } = useReadContracts({
    contracts: wallets.map((wallet) => ({
      abi: USER_REGISTRY_ABI,
      address: USER_REGISTRY_ADDRESS,
      functionName: "getUser",
      args: [wallet],
    })),
    query: { enabled: Boolean(USER_REGISTRY_ADDRESS) && wallets.length > 0 },
  });

  function usernameFor(wallet: `0x${string}` | undefined) {
    if (!wallet) return "-";
    const idx = wallets.indexOf(wallet);
    const result = data?.[idx]?.result as readonly [string, number, boolean, bigint] | undefined;
    return result?.[0] || `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  }

  const rows: { label: string; record: ApprovalRecord | undefined; blocked: boolean }[] = [
    { label: "Finance", record: financeRecord, blocked: false },
    {
      label: "Manager",
      record: managerRecord,
      blocked: invoice.status === InvoiceStatus.RejectedByFinance,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Persetujuan Invoice</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-3">Nama</th>
              <th className="py-2 pr-3">Jabatan</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, record, blocked }) => (
              <tr key={label} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-3 text-slate-700">{record ? usernameFor(record.wallet) : "-"}</td>
                <td className="py-2.5 pr-3 text-slate-700">{label}</td>
                <td className="py-2.5 pr-3">
                  {record ? (
                    record.approved ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                        ✔ Approved
                        <span className="font-normal text-slate-400">
                          ({formatDateTime(record.timestamp)})
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium text-red-600">
                        ✘ Rejected
                        <span className="font-normal text-slate-400">
                          ({formatDateTime(record.timestamp)})
                        </span>
                      </span>
                    )
                  ) : blocked ? (
                    <span className="text-slate-400">-</span>
                  ) : (
                    <span className="font-medium text-amber-600">Menunggu</span>
                  )}
                </td>
                <td className="py-2.5 text-slate-600">{record?.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
