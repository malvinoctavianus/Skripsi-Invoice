"use client";

import { useState } from "react";
import { Invoice } from "@/lib/contract";
import { previewInvoicePdf } from "@/lib/invoicePdf";
import { secondaryButtonClass } from "@/lib/ui";

export function ViewPdfButton({ invoice }: { invoice: Invoice }) {
  const [opening, setOpening] = useState(false);

  return (
    <button
      onClick={async () => {
        setOpening(true);
        try {
          await previewInvoicePdf(invoice);
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
