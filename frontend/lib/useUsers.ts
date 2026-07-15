"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { Role, USER_REGISTRY_ABI, USER_REGISTRY_ADDRESS } from "./contract";

export type RegisteredUser = {
  wallet: `0x${string}`;
  username: string;
  role: Role;
  isRegistered: boolean;
  registeredAt: bigint;
};

export function useAllUsers() {
  const { data: wallets, isLoading: walletsLoading, refetch: refetchWallets } = useReadContract({
    abi: USER_REGISTRY_ABI,
    address: USER_REGISTRY_ADDRESS,
    functionName: "getAllWallets",
    query: { enabled: Boolean(USER_REGISTRY_ADDRESS) },
  });

  const walletList = (wallets as readonly `0x${string}`[] | undefined) ?? [];

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useReadContracts({
    contracts: walletList.map((wallet) => ({
      abi: USER_REGISTRY_ABI,
      address: USER_REGISTRY_ADDRESS,
      functionName: "getUser",
      args: [wallet],
    })),
    query: { enabled: Boolean(USER_REGISTRY_ADDRESS) && walletList.length > 0 },
  });

  const users: RegisteredUser[] = walletList.map((wallet, i) => {
    const result = usersData?.[i]?.result as
      | readonly [string, number, boolean, bigint]
      | undefined;
    return {
      wallet,
      username: result?.[0] ?? "",
      role: (result?.[1] ?? 0) as Role,
      isRegistered: result?.[2] ?? false,
      registeredAt: result?.[3] ?? BigInt(0),
    };
  });

  function refetch() {
    refetchWallets();
    refetchUsers();
  }

  return {
    users,
    isLoading: walletsLoading || usersLoading,
    refetch,
  };
}
