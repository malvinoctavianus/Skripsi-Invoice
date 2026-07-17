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
 * A dApp has no way to detect that the user later removed the asset from MetaMask, so the
 * button stays clickable even after a successful add - it just remembers (per wallet+token)
 * that it was added before, to show a hint, and lets the user re-trigger the prompt as many
 * times as needed (e.g. after removing the NFT from MetaMask). */
export function AddNftToWalletButton({ tokenId }: { tokenId: bigint }) {
  const { address } = useAccount();
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [addedBefore, setAddedBefore] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    setHasWallet(Boolean(window.ethereum));
    if (address && window.localStorage.getItem(storageKey(address, tokenId))) {
      setAddedBefore(true);
    }
  }, [address, tokenId]);

  async function handleClick() {
    if (!window.ethereum || !CONTRACT_ADDRESS || !address) return;
    setStatus("pending");
    setJustAdded(false);
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
        setAddedBefore(true);
        setJustAdded(true);
      }
      setStatus("idle");
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
        disabled={status === "pending"}
        className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {status === "pending"
          ? "Menunggu konfirmasi MetaMask..."
          : addedBefore
            ? "Tambahkan Lagi ke MetaMask"
            : "+ Tambahkan Sertifikat NFT ke MetaMask"}
      </button>
      {status === "error" && <p className="text-xs text-red-600">Gagal menambahkan, coba lagi.</p>}
      {justAdded && status !== "pending" && (
        <p className="text-xs text-emerald-600">✔ Berhasil ditambahkan ke MetaMask.</p>
      )}
      {addedBefore && !justAdded && status !== "pending" && (
        <p className="text-xs text-slate-400">
          Kalau sudah dihapus dari MetaMask, klik tombol di atas untuk menambahkannya lagi.
        </p>
      )}
    </div>
  );
}
