import { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: ReactNode };

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  className: "h-4.5 w-4.5",
};

const GridIcon = (
  <svg {...iconProps}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />
  </svg>
);

const PlusIcon = (
  <svg {...iconProps}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const UsersIcon = (
  <svg {...iconProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
    />
  </svg>
);

const UserShieldIcon = (
  <svg {...iconProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75m-3-7-8.25 3v6c0 5.25 3.75 8.25 8.25 9.75 4.5-1.5 8.25-4.5 8.25-9.75v-6l-8.25-3Z"
    />
  </svg>
);

const BuildingIcon = (
  <svg {...iconProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 21h16.5M4.5 3h9v18h-9V3Zm9 6.75h6v11.25h-6M7.5 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m-1.5 3h1.5"
    />
  </svg>
);

export const PURCHASING_NAV: NavItem[] = [
  { href: "/purchasing", label: "Dashboard", icon: GridIcon },
  { href: "/purchasing/new", label: "Tambah Invoice", icon: PlusIcon },
  { href: "/purchasing/suppliers", label: "Data Supplier", icon: BuildingIcon },
];

export const FINANCE_NAV: NavItem[] = [{ href: "/finance", label: "Dashboard", icon: GridIcon }];

export const MANAGER_NAV: NavItem[] = [{ href: "/manager", label: "Dashboard", icon: GridIcon }];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: GridIcon },
  { href: "/register", label: "Manajemen User", icon: UserShieldIcon },
  { href: "/admin/accounts", label: "Akun Terdaftar", icon: UsersIcon },
  { href: "/admin/suppliers", label: "Persetujuan Supplier", icon: BuildingIcon },
];
