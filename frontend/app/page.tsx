"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Role } from "@/lib/contract";
import { cardClass } from "@/lib/ui";

const ROLE_ROUTE: Partial<Record<Role, string>> = {
  [Role.Purchasing]: "/purchasing",
  [Role.Finance]: "/finance",
  [Role.Manager]: "/manager",
};

export default function HomePage() {
  const router = useRouter();
  const { isConnected, isLoading, isAdmin, isRegistered, role } = useCurrentUser();

  useEffect(() => {
    if (!isConnected || isLoading) return;
    if (isAdmin) {
      router.push("/admin");
      return;
    }
    if (isRegistered) {
      const route = ROLE_ROUTE[role];
      if (route) router.push(route);
    }
  }, [isConnected, isLoading, isAdmin, isRegistered, role, router]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm">
          IA
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Sistem Approval Invoice
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          Autentikasi menggunakan wallet MetaMask. Hubungkan wallet Anda untuk langsung masuk —
          tidak perlu password.
        </p>
      </div>

      <ConnectWalletButton />

      {isConnected && isLoading && (
        <p className="text-sm text-slate-500">Memeriksa status wallet...</p>
      )}

      {isConnected && !isLoading && (isAdmin || isRegistered) && (
        <p className="text-sm text-slate-500">Mengarahkan ke dashboard...</p>
      )}

      {isConnected && !isLoading && !isAdmin && !isRegistered && (
        <div className={`${cardClass} flex w-full items-start gap-2.5 text-left`}>
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <p className="text-sm text-red-600">
            Wallet ini belum terdaftar. Hubungi Admin perusahaan untuk registrasi.
          </p>
        </div>
      )}
    </main>
  );
}
