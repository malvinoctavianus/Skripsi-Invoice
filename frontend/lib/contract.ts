import type { Abi } from "viem";
import userRegistryAbi from "./UserRegistryAbi.json";
import invoiceApprovalAbi from "./InvoiceApprovalAbi.json";

export const USER_REGISTRY_ADDRESS = process.env
  .NEXT_PUBLIC_USER_REGISTRY_ADDRESS as `0x${string}` | undefined;

export const USER_REGISTRY_ABI = userRegistryAbi as Abi;

export const INVOICE_ADDRESS = process.env
  .NEXT_PUBLIC_INVOICE_ADDRESS as `0x${string}` | undefined;

export const INVOICE_ABI = invoiceApprovalAbi as Abi;

export enum Role {
  None = 0,
  Admin = 1,
  Purchasing = 2,
  Finance = 3,
  Manager = 4,
}

export function roleLabel(role: Role | number): string {
  switch (role) {
    case Role.Admin:
      return "Admin";
    case Role.Purchasing:
      return "Purchasing";
    case Role.Finance:
      return "Finance";
    case Role.Manager:
      return "Manager";
    default:
      return "Unknown";
  }
}

export enum InvoiceStatus {
  PendingFinance = 0,
  PendingManager = 1,
  Approved = 2,
  RejectedByFinance = 3,
  RejectedByManager = 4,
}

export function invoiceStatusLabel(status: InvoiceStatus | number): string {
  switch (status) {
    case InvoiceStatus.PendingFinance:
      return "Menunggu Finance";
    case InvoiceStatus.PendingManager:
      return "Menunggu Manager";
    case InvoiceStatus.Approved:
      return "Approved";
    case InvoiceStatus.RejectedByFinance:
      return "Ditolak Finance";
    case InvoiceStatus.RejectedByManager:
      return "Ditolak Manager";
    default:
      return "Unknown";
  }
}

export type InvoiceItem = {
  name: string;
  qty: bigint;
  unitPrice: bigint;
};

export type ApprovalRecord = {
  wallet: `0x${string}`;
  roleLabel: string;
  approved: boolean;
  note: string;
  timestamp: bigint;
};

export type Invoice = {
  id: bigint;
  purchasing: `0x${string}`;
  supplierName: string;
  invoiceDate: bigint;
  createdAt: bigint;
  dpAmount: bigint;
  totalAmount: bigint;
  status: InvoiceStatus;
  items: readonly InvoiceItem[];
  history: readonly ApprovalRecord[];
};
