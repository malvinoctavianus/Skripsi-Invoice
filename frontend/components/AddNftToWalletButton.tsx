"use client";

import { useEffect, useState } from "react";
import { INVOICE_ADDRESS } from "@/lib/contract";
import { secondaryButtonClass } from "@/lib/ui";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
    };
  }
}

/** One-click prompt for MetaMask to add this invoice's NFT certificate to the wallet's
 * NFT tab. MetaMask (and every wallet) requires explicit user confirmation before adding
 * an asset - no dApp can inject it silently - so this is as automatic as it can get. */
export function AddNftToWalletButton({ tokenId }: { tokenId: bigint }) {
  const [status, setStatus] = useState<"idle" | "pending" | "added" | "error">("idle");
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    setHasWallet(Boolean(window.ethereum));
  }, []);

  async function handleClick() {
    if (!window.ethereum || !INVOICE_ADDRESS) return;
    setStatus("pending");
    try {
      const added = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC721",
          options: {
            address: INVOICE_ADDRESS,
            tokenId: tokenId.toString(),
          },
        },
      });
      setStatus(added ? "added" : "idle");
    } catch {
      setStatus("error");
    }
  }

  if (!hasWallet) return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={handleClick} disabled={status === "pending"} className={secondaryButtonClass}>
        {status === "pending" ? "Menunggu konfirmasi MetaMask..." : "+ Tambahkan Sertifikat NFT ke MetaMask"}
      </button>
      {status === "added" && <p className="text-xs text-emerald-600">Sertifikat NFT ditambahkan ke MetaMask.</p>}
      {status === "error" && <p className="text-xs text-red-600">Gagal menambahkan, coba lagi.</p>}
    </div>
  );
}
