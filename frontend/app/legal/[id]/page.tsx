"use client";

import { use } from "react";
import Link from "next/link";
import { AddNftToWalletButton } from "@/components/AddNftToWalletButton";
import { ApprovalStatusPanel } from "@/components/ApprovalStatusPanel";
import { ContractDocument } from "@/components/ContractDocument";
import { RoleGuard } from "@/components/RoleGuard";
import { ViewPdfButton } from "@/components/ViewPdfButton";
import { useContract } from "@/lib/useContracts";
import { CompanyContract, ContractStatus, Role } from "@/lib/contract";
import { LEGAL_NAV } from "@/lib/navigation";
import { primaryButtonClass } from "@/lib/ui";

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role={Role.Legal} navItems={LEGAL_NAV}>
      <ContractDetail params={params} />
    </RoleGuard>
  );
}

function ContractDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useContract(BigInt(id));
  const contract = data as CompanyContract | undefined;

  const backLink = (
    <Link href="/legal" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
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

  const isRejected =
    contract.status === ContractStatus.RejectedByFinance || contract.status === ContractStatus.RejectedByDirektur;

  return (
    <main className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      {backLink}

      <ContractDocument contract={contract} headerRight={<ViewPdfButton contract={contract} />} />

      <div>
        <ApprovalStatusPanel contract={contract} />
      </div>

      {contract.status === ContractStatus.Approved && (
        <div className="flex justify-end">
          <AddNftToWalletButton tokenId={contract.id} />
        </div>
      )}

      {isRejected && (
        <div className="flex justify-end">
          <Link href={`/legal/${contract.id}/revise`} className={primaryButtonClass}>
            Revisi &amp; Ajukan Ulang
          </Link>
        </div>
      )}
    </main>
  );
}
