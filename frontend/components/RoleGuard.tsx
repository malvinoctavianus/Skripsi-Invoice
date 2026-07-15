"use client";

import { ReactNode } from "react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Role, roleLabel } from "@/lib/contract";
import { NavItem } from "@/lib/navigation";
import { cardClass } from "@/lib/ui";

export function RoleGuard({
  role,
  navItems,
  children,
}: {
  role: Role;
  navItems: NavItem[];
  children: ReactNode;
}) {
  const { isConnected, isLoading, isRegistered, role: userRole } = useCurrentUser();

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

  return <DashboardLayout navItems={navItems}>{children}</DashboardLayout>;
}
