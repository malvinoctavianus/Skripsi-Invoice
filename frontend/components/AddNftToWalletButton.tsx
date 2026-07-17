"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { secondaryButtonClass } from "@/lib/ui";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
    };
  }
}

function storageKey(address: string, tokenId: bigint) {
  return `nft-added-to-metamask-${address.toLowerCase()}-${tokenId.toString()}`;
}

/** One-click prompt for MetaMask to add this contract's NFT certificate to the wallet's
 * NFT tab. MetaMask (and every wallet) requires explicit user confirmation before adding
 * an asset - no dApp can inject it silently - so this is as automatic as it can get.
 * Once successfully added, that fact is remembered per wallet+token so the button won't
 * offer to add it again. */
export function AddNftToWalletButton({ tokenId }: { tokenId: bigint }) {
  const { address } = useAccount();
  const [status, setStatus] = useState<"idle" | "pending" | "added" | "error">("idle");
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    setHasWallet(Boolean(window.ethereum));
    if (address && window.localStorage.getItem(storageKey(address, tokenId))) {
      setStatus("added");
    }
  }, [address, tokenId]);

  async function handleClick() {
    if (!window.ethereum || !CONTRACT_ADDRESS || !address) return;
    setStatus("pending");
    try {
      const added = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC721",
          options: {
            address: CONTRACT_ADDRESS,
            tokenId: tokenId.toString(),
          },
        },
      });
      if (added) {
        window.localStorage.setItem(storageKey(address, tokenId), "1");
        setStatus("added");
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("error");
    }
  }

  if (!hasWallet) return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "pending" || status === "added"}
        className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {status === "pending"
          ? "Menunggu konfirmasi MetaMask..."
          : status === "added"
            ? "✔ Sudah Ditambahkan ke MetaMask"
            : "+ Tambahkan Sertifikat NFT ke MetaMask"}
      </button>
      {status === "error" && <p className="text-xs text-red-600">Gagal menambahkan, coba lagi.</p>}
    </div>
  );
}
