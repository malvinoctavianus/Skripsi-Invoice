"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { useAuth } from "@/lib/AuthContext";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { roleLabel } from "@/lib/contract";
import { roleBadgeClass } from "@/lib/ui";

export function Header() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { session, setSession } = useAuth();
  const { isAdmin } = useCurrentUser();

  function handleLogout() {
    setSession(null);
    disconnect();
    router.push("/");
  }

  const roleName = session ? roleLabel(session.role) : isAdmin ? "Admin" : null;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
            IA
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-white">
              Sistem Approval Invoice
            </span>
            <span className="text-[11px] tracking-wide text-slate-400">
              BLOCKCHAIN VERIFIED
            </span>
          </span>
        </Link>

        {isConnected && address && (
          <div className="flex items-center gap-2.5">
            {roleName && (
              <span
                className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-block ${
                  roleBadgeClass[roleName] ?? "bg-slate-700 text-slate-200"
                }`}
              >
                {roleName}
              </span>
            )}
            <span className="hidden rounded-full border border-slate-700 px-3 py-1 font-mono text-xs text-slate-300 sm:inline-block">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              {session ? "Logout" : "Disconnect"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
