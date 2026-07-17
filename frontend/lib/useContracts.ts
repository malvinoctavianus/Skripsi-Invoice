"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { CONTRACT_ABI, CONTRACT_ADDRESS, CompanyContract, ContractStatus } from "./contract";

export function useContract(id: bigint | number | undefined) {
  return useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: "getContract",
    args: id !== undefined ? [BigInt(id)] : undefined,
    query: { enabled: Boolean(CONTRACT_ADDRESS && id !== undefined) },
  });
}

export function useLegalContracts() {
  const { address } = useAccount();

  const { data: ids, isLoading: idsLoading, refetch: refetchIds } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: "getContractsByLegal",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(CONTRACT_ADDRESS && address) },
  });

  const contractIds = (ids as readonly bigint[] | undefined) ?? [];

  const { data: contractsData, isLoading: contractsLoading, refetch: refetchContracts } = useReadContracts({
    contracts: contractIds.map((id) => ({
      abi: CONTRACT_ABI,
      address: CONTRACT_ADDRESS,
      functionName: "getContract",
      args: [id],
    })),
    query: { enabled: Boolean(CONTRACT_ADDRESS) && contractIds.length > 0 },
  });

  const contracts = (contractsData ?? [])
    .map((entry) => entry.result as CompanyContract | undefined)
    .filter((doc): doc is CompanyContract => Boolean(doc));

  const pending = contracts.filter(
    (doc) => doc.status === ContractStatus.PendingFinance || doc.status === ContractStatus.PendingDirektur
  );
  const approved = contracts.filter((doc) => doc.status === ContractStatus.Approved);
  const rejected = contracts.filter(
    (doc) => doc.status === ContractStatus.RejectedByFinance || doc.status === ContractStatus.RejectedByDirektur
  );

  function refetch() {
    refetchIds();
    refetchContracts();
  }

  return {
    contracts,
    pending,
    approved,
    rejected,
    isLoading: idsLoading || contractsLoading,
    refetch,
  };
}

/** All contracts across every Legal wallet, newest first - for Finance/Direktur queues. */
export function useAllContracts() {
  const { data: nextIdData, isLoading: nextIdLoading, refetch: refetchNextId } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: "nextContractId",
    query: { enabled: Boolean(CONTRACT_ADDRESS) },
  });

  const nextId = (nextIdData as bigint | undefined) ?? BigInt(1);
  const ids = Array.from({ length: Math.max(Number(nextId) - 1, 0) }, (_, i) => BigInt(i + 1));

  const { data: contractsData, isLoading: contractsLoading, refetch: refetchContracts } = useReadContracts({
    contracts: ids.map((id) => ({
      abi: CONTRACT_ABI,
      address: CONTRACT_ADDRESS,
      functionName: "getContract",
      args: [id],
    })),
    query: { enabled: Boolean(CONTRACT_ADDRESS) && ids.length > 0 },
  });

  const contracts = (contractsData ?? [])
    .map((entry) => entry.result as CompanyContract | undefined)
    .filter((doc): doc is CompanyContract => Boolean(doc))
    .sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));

  function refetch() {
    refetchNextId();
    refetchContracts();
  }

  return {
    contracts,
    isLoading: nextIdLoading || contractsLoading,
    refetch,
  };
}
