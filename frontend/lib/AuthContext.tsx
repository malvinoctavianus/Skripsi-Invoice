"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Role } from "./contract";

type Session = {
  wallet: `0x${string}`;
  username: string;
  role: Role;
};

type AuthContextValue = {
  session: Session | null;
  setSession: (session: Session | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "invoice-approval-session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSessionState(JSON.parse(raw));
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  function setSession(next: Session | null) {
    setSessionState(next);
    if (next) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <AuthContext.Provider value={{ session, setSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
