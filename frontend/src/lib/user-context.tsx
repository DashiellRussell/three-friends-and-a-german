"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const STORAGE_KEY = "kira_user";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  date_of_birth: string | null;
  blood_type: string | null;
  conditions: string[];
  allergies: string[];
  phone_number: string | null;
  timezone: string;
  emergency_contact: { name: string; phone: string; relationship: string } | null;
  checkin_time: string | null;
  voice_pref: string | null;
  language: string;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    const res = await fetch(`${BACKEND_URL}/api/profiles/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
    const profile: UserProfile = await res.json();
    setUser(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const res = await fetch(`${BACKEND_URL}/api/profiles`, {
      headers: { "x-user-id": user.id },
    });
    if (res.ok) {
      const profile: UserProfile = await res.json();
      setUser(profile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
