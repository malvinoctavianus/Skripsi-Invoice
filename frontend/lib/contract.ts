import userRegistryAbi from "./UserRegistryAbi.json";

export const USER_REGISTRY_ADDRESS = process.env
  .NEXT_PUBLIC_USER_REGISTRY_ADDRESS as `0x${string}` | undefined;

export const USER_REGISTRY_ABI = userRegistryAbi;

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
