"use client";

import { useAccount, useChainId, useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { USER_REGISTRY_ABI, USER_REGISTRY_ADDRESS, Role } from "./contract";

export function useCurrentUser() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isWrongNetwork = isConnected && chainId !== sepolia.id;

  const { data, isLoading, refetch } = useReadContract({
    abi: USER_REGISTRY_ABI,
    address: USER_REGISTRY_ADDRESS,
    functionName: "getUser",
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: Boolean(address && USER_REGISTRY_ADDRESS) && !isWrongNetwork },
  });

  const { data: adminAddress } = useReadContract({
    abi: USER_REGISTRY_ABI,
    address: USER_REGISTRY_ADDRESS,
    functionName: "admin",
    chainId: sepolia.id,
    query: { enabled: Boolean(USER_REGISTRY_ADDRESS) && !isWrongNetwork },
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
    isWrongNetwork,
    isLoading: isWrongNetwork ? false : isLoading,
    refetch,
    isAdmin,
    isRegistered: result?.[2] ?? false,
    username: result?.[0] ?? "",
    role: (result?.[1] ?? Role.None) as Role,
  };
}
