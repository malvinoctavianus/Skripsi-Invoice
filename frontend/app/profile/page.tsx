"use client";

import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { roleLabel } from "@/lib/contract";
import { cardClass, roleBadgeClass } from "@/lib/ui";

export default function ProfilePage() {
  const { address, isConnected, isLoading, isAdmin, isRegistered, username, role } = useCurrentUser();

  if (!isConnected) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className={`${cardClass} flex w-full flex-col items-center gap-4`}>
          <p className="text-sm text-slate-500">Hubungkan wallet Anda terlebih dahulu.</p>
          <ConnectWalletButton />
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-6">
        <p className="text-sm text-slate-500">Memeriksa wallet...</p>
      </main>
    );
  }

  const roleName = isAdmin ? "Admin" : roleLabel(role);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Profil</h1>
            <p className="mt-1 font-mono text-xs text-slate-500">{address}</p>
            {(isAdmin || isRegistered) && (
              <p className="mt-1 text-sm text-slate-600">{username}</p>
            )}
          </div>
          {(isAdmin || isRegistered) && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                roleBadgeClass[roleName] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {roleName}
            </span>
          )}
        </div>

        {!isAdmin && !isRegistered && (
          <p className="mt-4 text-sm text-red-600">
            Wallet ini belum terdaftar. Hubungi Admin untuk registrasi.
          </p>
        )}

        <p className="mt-4 text-xs text-slate-400">
          Otentikasi berbasis wallet — tidak ada password untuk diganti. Cukup hubungkan wallet
          ini di MetaMask untuk masuk.
        </p>
      </div>
    </main>
  );
}
