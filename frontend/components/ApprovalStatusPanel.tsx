"use client";

import { useReadContracts } from "wagmi";
import {
  ApprovalRecord,
  CompanyContract,
  ContractStatus,
  USER_REGISTRY_ABI,
  USER_REGISTRY_ADDRESS,
} from "@/lib/contract";
import { formatDateTime } from "@/lib/format";

/** Every revise (including after a revision request) pushes a "Legal" record - only the
 * history after the most recent one belongs to the current cycle. Without this, a stale
 * approval/rejection from a previous cycle could still show up after Legal resubmits. */
function currentCycleHistory(history: readonly ApprovalRecord[]): readonly ApprovalRecord[] {
  const lastLegalIndex = history.reduce(
    (acc, record, i) => (record.roleLabel === "Legal" ? i : acc),
    -1
  );
  return lastLegalIndex === -1 ? history : history.slice(lastLegalIndex + 1);
}

function findRecord(history: readonly ApprovalRecord[], roleLabel: string): ApprovalRecord | undefined {
  return [...history].reverse().find((r) => r.roleLabel === roleLabel);
}

export function ApprovalStatusPanel({ contract }: { contract: CompanyContract }) {
  const cycleHistory = currentCycleHistory(contract.history);
  const financeRecord = findRecord(cycleHistory, "Finance");
  const direkturRecord = findRecord(cycleHistory, "Direktur");

  const wallets = [financeRecord?.wallet, direkturRecord?.wallet].filter(
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
      label: "Direktur",
      record: direkturRecord,
      blocked:
        contract.status === ContractStatus.RejectedByFinance ||
        contract.status === ContractStatus.RevisionRequested,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Persetujuan Kontrak</h3>
      <div className="flex flex-col divide-y divide-slate-100">
        {rows.map(({ label, record, blocked }) => (
          <div key={label} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {record ? usernameFor(record.wallet) : "-"}
                </p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>

              {record ? (
                record.isRevisionRequest ? (
                  <span className="text-sm font-medium text-orange-600">↻ Revisi Diminta</span>
                ) : record.approved ? (
                  <span className="text-sm font-medium text-emerald-600">✔ Approved</span>
                ) : (
                  <span className="text-sm font-medium text-red-600">✘ Rejected</span>
                )
              ) : blocked ? (
                <span className="text-sm text-slate-400">-</span>
              ) : (
                <span className="text-sm font-medium text-amber-600">Menunggu</span>
              )}
            </div>

            {record && <p className="text-xs text-slate-400">{formatDateTime(record.timestamp)}</p>}
            {record?.note && (
              <p className="text-sm text-slate-600">
                <span className="text-slate-400">Keterangan: </span>
                {record.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
