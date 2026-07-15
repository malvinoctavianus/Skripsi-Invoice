"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { hashPassword } from "@/lib/crypto";
import { PASSWORD_HINT, validatePassword } from "@/lib/password";
import { USER_REGISTRY_ABI, USER_REGISTRY_ADDRESS, Role, roleLabel } from "@/lib/contract";
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
  const { isConnected } = useAccount();
  const { isAdmin, isLoading } = useCurrentUser();

  const [wallet, setWallet] = useState("");
  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.Purchasing);
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const backLink = (
    <Link href="/" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Login / Register
    </Link>
  );

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
    const passwordError = validatePassword(tempPassword);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }
    if (!USER_REGISTRY_ADDRESS) {
      setFormError("Alamat smart contract belum diset (NEXT_PUBLIC_USER_REGISTRY_ADDRESS).");
      return;
    }

    const passwordHash = hashPassword(wallet, tempPassword);

    writeContract({
      abi: USER_REGISTRY_ABI,
      address: USER_REGISTRY_ADDRESS,
      functionName: "registerUser",
      args: [wallet, username.trim(), passwordHash, role],
    });
  }

  if (!isConnected) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        {backLink}
        <div className={`${cardClass} flex w-full flex-col items-center gap-4`}>
          <h1 className="text-lg font-semibold text-slate-900">Register User Baru</h1>
          <p className="text-sm text-slate-500">Hubungkan wallet Admin terlebih dahulu.</p>
          <ConnectWalletButton />
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6">
        {backLink}
        <p className="text-sm text-slate-500">Memeriksa wallet...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        {backLink}
        <div className={cardClass}>
          <p className={errorAlertClass}>
            Halaman ini hanya bisa diakses oleh wallet Admin yang terdaftar di smart contract.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-5 px-6 py-12">
      {backLink}

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Register User Baru</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hanya Admin yang bisa mendaftarkan wallet Purchasing atau Finance. Password sementara
            akan di-hash (Keccak256) sebelum dikirim ke blockchain — tidak pernah disimpan dalam
            bentuk teks biasa.
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
              placeholder="mis. purchasing1"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Password Sementara
            <input
              type="password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="mis. Purchasing123"
              className={inputClass}
            />
            <span className="text-xs font-normal text-slate-400">{PASSWORD_HINT}</span>
          </label>

          <label className={labelClass}>
            Role
            <select
              value={role}
              onChange={(e) => setRole(Number(e.target.value) as Role)}
              className={inputClass}
            >
              <option value={Role.Purchasing}>{roleLabel(Role.Purchasing)}</option>
              <option value={Role.Finance}>{roleLabel(Role.Finance)}</option>
              <option value={Role.Manager}>{roleLabel(Role.Manager)}</option>
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
