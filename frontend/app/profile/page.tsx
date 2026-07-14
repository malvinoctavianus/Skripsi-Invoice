"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useAuth } from "@/lib/AuthContext";
import { hashPassword } from "@/lib/crypto";
import { USER_REGISTRY_ABI, USER_REGISTRY_ADDRESS, roleLabel } from "@/lib/contract";
import {
  cardClass,
  errorAlertClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  roleBadgeClass,
  successAlertClass,
} from "@/lib/ui";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { session } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!address) {
      setFormError("Wallet belum terhubung.");
      return;
    }
    if (!USER_REGISTRY_ADDRESS) {
      setFormError("Alamat smart contract belum diset.");
      return;
    }
    if (newPassword.length < 6) {
      setFormError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Konfirmasi password baru tidak cocok.");
      return;
    }

    const oldHash = hashPassword(address, oldPassword);
    const newHash = hashPassword(address, newPassword);

    writeContract({
      abi: USER_REGISTRY_ABI,
      address: USER_REGISTRY_ADDRESS,
      functionName: "changePassword",
      args: [oldHash, newHash],
    });
  }

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

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className={cardClass}>
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Profil</h1>
            <p className="mt-1 font-mono text-xs text-slate-500">{address}</p>
            {session && <p className="mt-1 text-sm text-slate-600">{session.username}</p>}
          </div>
          {session && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                roleBadgeClass[roleLabel(session.role)] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {roleLabel(session.role)}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-800">Ganti Password</h2>

          <label className={labelClass}>
            Password Lama
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Password Baru
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Konfirmasi Password Baru
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
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
                : "Simpan Password Baru"}
          </button>

          {isSuccess && (
            <p className={successAlertClass}>
              Password berhasil diubah on-chain. Tx hash:{" "}
              <span className="break-all font-mono">{txHash}</span>
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
