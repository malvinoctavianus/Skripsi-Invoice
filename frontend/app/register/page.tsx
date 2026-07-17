"use client";

import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { RoleGuard } from "@/components/RoleGuard";
import { USER_REGISTRY_ABI, USER_REGISTRY_ADDRESS, Role, roleLabel } from "@/lib/contract";
import { ADMIN_NAV } from "@/lib/navigation";
import {
  cardClass,
  errorAlertClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  successAlertClass,
} from "@/lib/ui";

function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export default function RegisterPage() {
  return (
    <RoleGuard role={Role.Admin} navItems={ADMIN_NAV}>
      <RegisterForm />
    </RoleGuard>
  );
}

function RegisterForm() {
  const [wallet, setWallet] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>(Role.Legal);
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      setWallet("");
      setUsername("");
      setRole(Role.Legal);
    }
  }, [isSuccess]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!isAddress(wallet)) {
      setFormError("Alamat wallet tidak valid.");
      return;
    }
    if (username.trim().length === 0) {
      setFormError("Username wajib diisi.");
      return;
    }
    if (!USER_REGISTRY_ADDRESS) {
      setFormError("Alamat smart contract belum diset (NEXT_PUBLIC_USER_REGISTRY_ADDRESS).");
      return;
    }

    writeContract({
      abi: USER_REGISTRY_ABI,
      address: USER_REGISTRY_ADDRESS,
      functionName: "registerUser",
      args: [wallet, username.trim(), role],
    });
  }

  return (
    <main className="flex w-full max-w-lg flex-col gap-5 px-8 py-10">
      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Register User Baru</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hanya Admin yang bisa mendaftarkan wallet Legal, Finance, atau Direktur.
            Otentikasi selanjutnya cukup dengan menghubungkan wallet ini di MetaMask — tidak
            perlu password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className={labelClass}>
            Alamat Wallet (MetaMask)
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x..."
              className={`${inputClass} font-mono`}
            />
          </label>

          <label className={labelClass}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mis. legal1"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Role
            <select
              value={role}
              onChange={(e) => setRole(Number(e.target.value) as Role)}
              className={inputClass}
            >
              <option value={Role.Legal}>{roleLabel(Role.Legal)}</option>
              <option value={Role.Finance}>{roleLabel(Role.Finance)}</option>
              <option value={Role.Direktur}>{roleLabel(Role.Direktur)}</option>
            </select>
          </label>

          {formError && <p className={errorAlertClass}>{formError}</p>}
          {writeError && (
            <p className={errorAlertClass}>{writeError.message.split("\n")[0]}</p>
          )}

          <button type="submit" disabled={isPending || isConfirming} className={primaryButtonClass}>
            {isPending
              ? "Menunggu konfirmasi MetaMask..."
              : isConfirming
                ? "Mengirim ke blockchain..."
                : "Daftarkan Wallet"}
          </button>

          {isSuccess && (
            <p className={successAlertClass}>
              Berhasil! Wallet terdaftar on-chain. Tx hash:{" "}
              <span className="break-all font-mono">{txHash}</span>
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
