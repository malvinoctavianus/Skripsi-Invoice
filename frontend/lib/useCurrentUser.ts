"use client";

import { useAccount, useReadContract } from "wagmi";
import { USER_REGISTRY_ABI, USER_REGISTRY_ADDRESS, Role } from "./contract";

export function useCurrentUser() {
  const { address, isConnected } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    abi: USER_REGISTRY_ABI,
    address: USER_REGISTRY_ADDRESS,
    functionName: "getUser",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && USER_REGISTRY_ADDRESS) },
  });

  const { data: adminAddress } = useReadContract({
    abi: USER_REGISTRY_ABI,
    address: USER_REGISTRY_ADDRESS,
    functionName: "admin",
    query: { enabled: Boolean(USER_REGISTRY_ADDRESS) },
  });

  const result = data as
    | readonly [string, number, boolean, bigint]
    | undefined;

  const isAdmin =
    Boolean(address) &&
    Boolean(adminAddress) &&
    address?.toLowerCase() === (adminAddress as string)?.toLowerCase();

  return {
    address,
    isConnected,
    isLoading,
    refetch,
    isAdmin,
    isRegistered: result?.[2] ?? false,
    username: result?.[0] ?? "",
    role: (result?.[1] ?? Role.None) as Role,
  };
}
