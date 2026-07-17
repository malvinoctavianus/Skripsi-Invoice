"use client";

import { useState } from "react";
import { CompanyContract, ContractStatus } from "@/lib/contract";
import { previewContractPdf } from "@/lib/contractPdf";
import { secondaryButtonClass } from "@/lib/ui";

export function ViewPdfButton({ contract }: { contract: CompanyContract }) {
  const [opening, setOpening] = useState(false);

  if (contract.status !== ContractStatus.Approved) return null;

  return (
    <button
      onClick={async () => {
        setOpening(true);
        try {
          await previewContractPdf(contract);
        } finally {
          setOpening(false);
        }
      }}
      disabled={opening}
      className={secondaryButtonClass}
    >
      {opening ? "Membuka PDF..." : "Lihat PDF"}
    </button>
  );
}
