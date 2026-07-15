"use client";

import { useState } from "react";

export type DashboardKey = "purchasing" | "finance" | "manager";

export type DashboardSettings = {
  title: string;
  message: string;
};

type AllDashboardSettings = Record<DashboardKey, DashboardSettings>;

const STORAGE_KEY = "admin-dashboard-settings";

export const DEFAULT_SETTINGS: AllDashboardSettings = {
  purchasing: { title: "Dashboard Purchasing", message: "" },
  finance: { title: "Dashboard Finance", message: "" },
  manager: { title: "Dashboard Manager", message: "" },
};

export function loadDashboardSettings(): AllDashboardSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AllDashboardSettings>;
    return {
      purchasing: { ...DEFAULT_SETTINGS.purchasing, ...parsed.purchasing },
      finance: { ...DEFAULT_SETTINGS.finance, ...parsed.finance },
      manager: { ...DEFAULT_SETTINGS.manager, ...parsed.manager },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveDashboardSettings(settings: AllDashboardSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Reads the current title/message for one dashboard, once, on mount. */
export function useDashboardSetting(key: DashboardKey): DashboardSettings {
  const [settings] = useState(() => loadDashboardSettings()[key]);
  return settings;
}
