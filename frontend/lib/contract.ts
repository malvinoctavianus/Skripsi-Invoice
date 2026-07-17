import type { Abi } from "viem";
import userRegistryAbi from "./UserRegistryAbi.json";
import contractApprovalAbi from "./ContractApprovalAbi.json";
import counterpartyRegistryAbi from "./CounterpartyRegistryAbi.json";

export const USER_REGISTRY_ADDRESS = process.env
  .NEXT_PUBLIC_USER_REGISTRY_ADDRESS as `0x${string}` | undefined;

export const USER_REGISTRY_ABI = userRegistryAbi as Abi;

export const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;

export const CONTRACT_ABI = contractApprovalAbi as Abi;

export const COUNTERPARTY_REGISTRY_ADDRESS = process.env
  .NEXT_PUBLIC_COUNTERPARTY_REGISTRY_ADDRESS as `0x${string}` | undefined;

export const COUNTERPARTY_REGISTRY_ABI = counterpartyRegistryAbi as Abi;

export enum Role {
  None = 0,
  Admin = 1,
  Legal = 2,
  Finance = 3,
  Direktur = 4,
}

export function roleLabel(role: Role | number): string {
  switch (role) {
    case Role.Admin:
      return "Admin";
    case Role.Legal:
      return "Legal";
    case Role.Finance:
      return "Finance";
    case Role.Direktur:
      return "Direktur";
    default:
      return "Unknown";
  }
}

export enum ContractStatus {
  PendingFinance = 0,
  PendingDirektur = 1,
  Approved = 2,
  RejectedByFinance = 3,
  RejectedByDirektur = 4,
}

export function contractStatusLabel(status: ContractStatus | number): string {
  switch (status) {
    case ContractStatus.PendingFinance:
      return "Menunggu Finance";
    case ContractStatus.PendingDirektur:
      return "Menunggu Direktur";
    case ContractStatus.Approved:
      return "Approved";
    case ContractStatus.RejectedByFinance:
      return "Ditolak Finance";
    case ContractStatus.RejectedByDirektur:
      return "Ditolak Direktur";
    default:
      return "Unknown";
  }
}

export enum PaymentMethod {
  Cash = 0,
  Transfer = 1,
}

export function paymentMethodLabel(method: PaymentMethod | number): string {
  switch (method) {
    case PaymentMethod.Cash:
      return "Cash";
    case PaymentMethod.Transfer:
      return "Transfer";
    default:
      return "Unknown";
  }
}

export type ContractClause = {
  content: string;
};

export type ApprovalRecord = {
  wallet: `0x${string}`;
  roleLabel: string;
  approved: boolean;
  note: string;
  timestamp: bigint;
};

export type CompanyContract = {
  id: bigint;
  legal: `0x${string}`;
  counterpartyName: string;
  contractDate: bigint;
  createdAt: bigint;
  validFrom: bigint;
  validUntil: bigint;
  contractValue: bigint;
  status: ContractStatus;
  keterangan: string;
  paymentMethod: PaymentMethod;
  clauses: readonly ContractClause[];
  history: readonly ApprovalRecord[];
};

export enum CounterpartyStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
}

export function counterpartyStatusLabel(status: CounterpartyStatus | number): string {
  switch (status) {
    case CounterpartyStatus.Pending:
      return "Menunggu Persetujuan";
    case CounterpartyStatus.Approved:
      return "Approved";
    case CounterpartyStatus.Rejected:
      return "Ditolak";
    default:
      return "Unknown";
  }
}

export type Counterparty = {
  id: bigint;
  name: string;
  signatoryName: string;
  birthPlace: string;
  birthDate: bigint;
  alamat: string;
  idNumber: string;
  addedBy: `0x${string}`;
  addedAt: bigint;
  lastEditedBy: `0x${string}`;
  lastEditedAt: bigint;
  status: CounterpartyStatus;
  reviewedBy: `0x${string}`;
  reviewedAt: bigint;
  reviewNote: string;
};

export type CounterpartyEdit = {
  name: string;
  signatoryName: string;
  birthPlace: string;
  birthDate: bigint;
  alamat: string;
  idNumber: string;
  editedBy: `0x${string}`;
  editedAt: bigint;
};
