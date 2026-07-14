"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-emerald-700">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button onClick={() => disconnect()} className={secondaryButtonClass}>
          Disconnect
        </button>
      </div>
    );
  }

  const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        disabled={isPending || !injectedConnector}
        className={primaryButtonClass}
      >
        <svg
          className="mr-2 h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5M21 7.5H16a2.5 2.5 0 0 0 0 5h5m0-5v5m0-5v-1.5A2 2 0 0 0 19 4H5"
          />
        </svg>
        {isPending ? "Menghubungkan..." : "Hubungkan MetaMask"}
      </button>
      {!injectedConnector && (
        <span className="text-xs text-red-600">
          Tidak ada wallet extension terdeteksi. Pastikan MetaMask terpasang &amp; aktif.
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error.message}</span>}
    </div>
  );
}
