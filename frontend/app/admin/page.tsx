"use client";

import Link from "next/link";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useAuth } from "@/lib/AuthContext";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default function AdminPage() {
  const { session } = useAuth();
  const { address, isConnected, isLoading, isAdmin } = useCurrentUser();

  if (!isConnected) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <div className={`${cardClass} flex w-full flex-col items-center gap-4`}>
          <h1 className="text-lg font-semibold text-slate-900">Dashboard Admin</h1>
          <p className="text-sm text-slate-500">Hubungkan wallet Admin terlebih dahulu.</p>
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

  if (!isAdmin) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className={cardClass}>
          <p className="text-sm text-red-600">
            Halaman ini hanya bisa diakses oleh wallet Admin yang terdaftar di smart contract.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Masuk sebagai <strong className="text-slate-700">{session?.username ?? "Admin"}</strong>{" "}
          &middot; <span className="font-mono text-xs">{address}</span>
        </p>
      </div>

      <div className={`${cardClass} flex flex-col items-start gap-3`}>
        <h2 className="text-sm font-semibold text-slate-800">Manajemen User</h2>
        <p className="text-sm text-slate-500">
          Daftarkan wallet baru untuk karyawan Purchasing, Finance, atau Manager.
        </p>
        <Link href="/register" className={primaryButtonClass}>
          Buka Halaman Register User
        </Link>
      </div>
    </main>
  );
}
