"use client";

import { ReactNode } from "react";
import { CompanyContract, ContractStatus, contractStatusLabel } from "@/lib/contract";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cardClass, statusBadgeClass } from "@/lib/ui";

export function ContractDocument({ contract, headerRight }: { contract: CompanyContract; headerRight?: ReactNode }) {
  const contractId = `KTR-${contract.id.toString().padStart(4, "0")}`;
  const isRejected =
    contract.status === ContractStatus.RejectedByFinance || contract.status === ContractStatus.RejectedByDirektur;
  const rejection = contract.history.find((r) => !r.approved);

  return (
    <div className={cardClass}>
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{contractId}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pihak Kedua: <span className="text-slate-700">{contract.counterpartyName}</span>
          </p>
          <p className="text-sm text-slate-500">Tanggal: {formatDateTime(contract.contractDate)}</p>
          <p className="text-sm text-slate-500">
            Masa Berlaku: {formatDateTime(contract.validFrom)} s/d {formatDateTime(contract.validUntil)}
          </p>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
              statusBadgeClass[contractStatusLabel(contract.status)] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {contractStatusLabel(contract.status)}
          </span>
        </div>

        {headerRight}
      </div>

      {isRejected && rejection && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">
            Kontrak ditolak oleh {rejection.roleLabel} pada {formatDateTime(rejection.timestamp)}.
          </p>
          {rejection.note && <p className="mt-1">Alasan: {rejection.note}</p>}
        </div>
      )}

      {contract.keterangan && (
        <p className="mb-4 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Keterangan:</span> {contract.keterangan}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {contract.clauses.map((clause, idx) => (
          <div key={idx}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PASAL {idx + 1}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{clause.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-end gap-1 border-t border-slate-100 pt-4 text-sm">
        <p className="text-slate-500">
          Nilai Kontrak:{" "}
          <span className="font-semibold text-slate-900">{formatRupiah(contract.contractValue)}</span>
        </p>
      </div>
    </div>
  );
}
