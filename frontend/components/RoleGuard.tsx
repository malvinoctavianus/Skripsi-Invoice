"use client";

import { ReactNode } from "react";
import { useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useAllContracts } from "@/lib/useContracts";
import { ContractStatus, Role, roleLabel } from "@/lib/contract";
import { NavItem } from "@/lib/navigation";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export function RoleGuard({
  role,
  navItems,
  children,
}: {
  role: Role;
  navItems: NavItem[];
  children: ReactNode;
}) {
  const { isConnected, isWrongNetwork, isLoading, isRegistered, role: userRole } = useCurrentUser();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Called unconditionally to satisfy the Rules of Hooks; only used for Finance's
  // "menunggu approval" nav badge, cheap to skip via `enabled` for every other role.
  const { contracts } = useAllContracts(role === Role.Finance);
  const financeQueueCount =
    role === Role.Finance
      ? contracts.filter((doc) => doc.status === ContractStatus.PendingFinance).length
      : 0;
  const navItemsWithBadge =
    role === Role.Finance
      ? navItems.map((item, i) => (i === 0 ? { ...item, badge: financeQueueCount } : item))
      : navItems;

  if (!isConnected) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <div className={`${cardClass} flex w-full flex-col items-center gap-4`}>
          <p className="text-sm text-slate-500">Hubungkan wallet terdaftar Anda terlebih dahulu.</p>
          <ConnectWalletButton />
        </div>
      </main>
    );
  }

  if (isWrongNetwork) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className={`${cardClass} flex w-full flex-col items-center gap-4`}>
          <p className="text-sm text-amber-700">
            Wallet Anda terhubung ke jaringan yang salah. Sistem ini berjalan di Ethereum
            Sepolia — ganti jaringan di MetaMask untuk melanjutkan.
          </p>
          <button
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isSwitching}
            className={primaryButtonClass}
          >
            {isSwitching ? "Mengganti jaringan..." : "Ganti ke Sepolia"}
          </button>
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

  if (!isRegistered || userRole !== role) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className={cardClass}>
          <p className="text-sm text-red-600">
            Halaman ini hanya bisa diakses oleh wallet {roleLabel(role)} yang terdaftar.
          </p>
        </div>
      </main>
    );
  }

  return <DashboardLayout navItems={navItemsWithBadge}>{children}</DashboardLayout>;
}
