"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { UserProvider } from "@/lib/user-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <UserProvider>{children}</UserProvider>
    </ClerkProvider>
  );
}
