"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ApprovalStatusPanel } from "@/components/ApprovalStatusPanel";
import { ContractDocument } from "@/components/ContractDocument";
import { RoleGuard } from "@/components/RoleGuard";
import { ViewPdfButton } from "@/components/ViewPdfButton";
import { useContract } from "@/lib/useContracts";
import { CONTRACT_ABI, CONTRACT_ADDRESS, CompanyContract, ContractStatus, Role } from "@/lib/contract";
import { DIREKTUR_NAV } from "@/lib/navigation";
import { cardClass, errorAlertClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type ActionMode = "approve" | "reject" | null;

export default function DirekturContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role={Role.Direktur} navItems={DIREKTUR_NAV}>
      <DirekturContractDetail params={params} />
    </RoleGuard>
  );
}

function DirekturContractDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useContract(BigInt(id));
  const contract = data as CompanyContract | undefined;

  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      router.push("/direktur");
    }
  }, [isSuccess, router]);

  const backLink = (
    <Link href="/direktur" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Daftar Kontrak
    </Link>
  );

  if (isLoading) {
    return (
      <main className="flex w-full max-w-3xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-slate-500">Memuat kontrak...</p>
      </main>
    );
  }

  if (!contract) {
    return (
      <main className="flex w-full max-w-3xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Kontrak tidak ditemukan.</p>
      </main>
    );
  }

  const isPendingDirektur = contract.status === ContractStatus.PendingDirektur;

  function handleConfirm() {
    setFormError(null);

    if (!CONTRACT_ADDRESS || !contract) return;

    if (actionMode === "reject" && note.trim().length === 0) {
      setFormError("Alasan penolakan wajib diisi.");
      return;
    }

    writeContract({
      abi: CONTRACT_ABI,
      address: CONTRACT_ADDRESS,
      functionName: actionMode === "approve" ? "approveByDirektur" : "rejectByDirektur",
      args: [contract.id, note.trim()],
    });
  }

  return (
    <main className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      {backLink}

      <ContractDocument
        contract={contract}
        headerRight={
          <ViewPdfButton
            contract={contract}
            visibleStatuses={[ContractStatus.PendingDirektur, ContractStatus.Approved]}
          />
        }
      />

      <div>
        <ApprovalStatusPanel contract={contract} />
      </div>

      {isPendingDirektur ? (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Aksi Direktur</h2>

          {!actionMode && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setActionMode("approve");
                  setNote("");
                  setFormError(null);
                }}
                className={primaryButtonClass}
              >
                Approve
              </button>
              <button
                onClick={() => {
                  setActionMode("reject");
                  setNote("");
                  setFormError(null);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          )}

          {actionMode && (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                {actionMode === "approve" ? "Catatan (opsional)" : "Alasan Penolakan"}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder={
                    actionMode === "approve"
                      ? "mis. Disetujui, lanjutkan ke penandatanganan"
                      : "mis. Mitra tidak sesuai daftar rekanan"
                  }
                  className={inputClass}
                />
              </label>

              {actionMode === "approve" && (
                <p className="text-xs text-slate-400">
                  Approve final akan langsung menerbitkan sertifikat NFT ke wallet Legal di
                  blockchain.
                </p>
              )}

              {formError && <p className={errorAlertClass}>{formError}</p>}
              {writeError && <p className={errorAlertClass}>{writeError.message.split("\n")[0]}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isPending || isConfirming}
                  className={
                    actionMode === "approve"
                      ? primaryButtonClass
                      : "inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  }
                >
                  {isPending
                    ? "Menunggu konfirmasi MetaMask..."
                    : isConfirming
                      ? "Mengirim ke blockchain..."
                      : actionMode === "approve"
                        ? "Konfirmasi Approve"
                        : "Konfirmasi Reject"}
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode(null)}
                  disabled={isPending || isConfirming}
                  className={secondaryButtonClass}
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Kontrak ini sudah diproses, tidak ada aksi tersedia.</p>
        </div>
      )}
    </main>
  );
}
