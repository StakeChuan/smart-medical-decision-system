import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { SESSION_KEY } from "@/api/client";
import type { User } from "@/types/api";

interface AuthContextValue {
  user: User | null;
  setSession: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as User : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(readSession);
  const value = useMemo<AuthContextValue>(() => ({
    user,
    setSession(next) { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); setUser(next); },
    logout() { localStorage.removeItem(SESSION_KEY); setUser(null); },
  }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
