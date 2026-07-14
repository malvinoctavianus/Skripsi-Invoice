"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { hashPassword } from "@/lib/crypto";
import { useAuth } from "@/lib/AuthContext";
import { USER_REGISTRY_ABI, USER_REGISTRY_ADDRESS, Role } from "@/lib/contract";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { setSession } = useAuth();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const { refetch } = useReadContract({
    abi: USER_REGISTRY_ABI,
    address: USER_REGISTRY_ADDRESS,
    functionName: "login",
    args: address && password ? [address, hashPassword(address, password)] : undefined,
    query: { enabled: false },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!address) {
      setError("Wallet belum terhubung.");
      return;
    }
    if (!USER_REGISTRY_ADDRESS) {
      setError("Alamat smart contract belum diset.");
      return;
    }
    if (password.length === 0) {
      setError("Password wajib diisi.");
      return;
    }

    setChecking(true);
    const { data, error: readError } = await refetch();
    setChecking(false);

    if (readError) {
      setError(readError.message.split("\n")[0]);
      return;
    }

    const [success, username, role] = data as [boolean, string, number];

    if (!success) {
      setError("Wallet belum terdaftar atau password salah.");
      return;
    }

    setSession({ wallet: address, username, role: role as Role });

    if ((role as Role) === Role.Purchasing) router.push("/purchasing");
    else if ((role as Role) === Role.Finance) router.push("/finance");
    else if ((role as Role) === Role.Manager) router.push("/manager");
    else if ((role as Role) === Role.Admin) router.push("/admin");
    else router.push("/profile");
  }

  const backLink = (
    <Link href="/" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Beranda
    </Link>
  );

  if (!isConnected) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        {backLink}
        <div className={`${cardClass} flex w-full flex-col items-center gap-4`}>
          <h1 className="text-lg font-semibold text-slate-900">Login Karyawan</h1>
          <p className="text-sm text-slate-500">Hubungkan wallet terdaftar Anda terlebih dahulu.</p>
          <ConnectWalletButton />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 px-6 py-12">
      {backLink}

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Login</h1>
          <p className="mt-1 text-sm text-slate-500">
            Wallet: <span className="font-mono text-slate-700">{address}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className={labelClass}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Masukkan password Anda"
            />
          </label>

          {error && <p className={errorAlertClass}>{error}</p>}

          <button type="submit" disabled={checking} className={primaryButtonClass}>
            {checking ? "Memeriksa..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
