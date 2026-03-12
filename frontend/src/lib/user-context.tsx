"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth, useUser as useClerkUser } from "@clerk/nextjs";
import { apiFetch, setTokenGetter } from "./api";

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
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
  checkin_time: string | null;
  voice_pref: string | null;
  language: string;
  onboarding_completed?: boolean;
  onboarding_step?: number;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  logout: () => {},
  refreshProfile: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { isSignedIn, isLoaded, getToken, signOut } = useAuth();
  const { user: clerkUser } = useClerkUser();

  // Wire up token getter for apiFetch
  useEffect(() => {
    if (isSignedIn) {
      setTokenGetter(getToken);
    }
  }, [isSignedIn, getToken]);

  // Fetch health profile when Clerk session is active
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await apiFetch("/api/profiles");
        if (res.ok) {
          const profile: UserProfile = await res.json();
          setUser(profile);
        } else {
          // Profile will be lazy-created by backend on first authenticated request
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isSignedIn, isLoaded, clerkUser?.id]);

  const logout = () => {
    setUser(null);
    signOut();
  };

  const refreshProfile = async () => {
    if (!isSignedIn) return;
    try {
      const res = await apiFetch("/api/profiles");
      if (res.ok) {
        const profile: UserProfile = await res.json();
        setUser(profile);
      }
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
