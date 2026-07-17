"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { CompanyContract, ContractStatus, USER_REGISTRY_ABI, USER_REGISTRY_ADDRESS } from "@/lib/contract";
import { useAllCounterparties } from "@/lib/useCounterparties";
import { previewContractPdf } from "@/lib/contractPdf";
import { secondaryButtonClass } from "@/lib/ui";

export function ViewPdfButton({
  contract,
  visibleStatuses = [ContractStatus.Approved],
}: {
  contract: CompanyContract;
  visibleStatuses?: ContractStatus[];
}) {
  const [opening, setOpening] = useState(false);

  const { data: legalUserData } = useReadContract({
    abi: USER_REGISTRY_ABI,
    address: USER_REGISTRY_ADDRESS,
    functionName: "getUser",
    args: [contract.legal],
    query: { enabled: Boolean(USER_REGISTRY_ADDRESS) },
  });
  const legalUsername = (legalUserData as readonly [string, number, boolean, bigint] | undefined)?.[0];

  const { counterparties } = useAllCounterparties();
  const counterparty = counterparties.find((c) => c.name === contract.counterpartyName);

  if (!visibleStatuses.includes(contract.status)) return null;

  return (
    <button
      onClick={async () => {
        setOpening(true);
        try {
          await previewContractPdf(contract, {
            legalUsername: legalUsername || contract.legal,
            legalWallet: contract.legal,
            counterparty,
          });
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
