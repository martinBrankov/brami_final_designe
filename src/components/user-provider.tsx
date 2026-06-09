"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  role: string;
};

export type SpeedyLocationSnapshot = {
  id: string;
  data: {
    id: number;
    name: string;
    type?: "OFFICE" | "APT";
    address: {
      fullAddressString?: string;
      siteName?: string;
      postCode?: string;
    };
  };
};

export type CurrentUserProfile = {
  fullName: string;
  phone: string;
  city: string;
  postalCode: string;
  address: string;
  preferredOffice: SpeedyLocationSnapshot | null;
  preferredLocker: SpeedyLocationSnapshot | null;
  hasPassword: boolean;
  merchantDiscountPercent: number;
};

export type CurrentUserDiscount = {
  totalSpentEur: number;
  currentPercent: number;
  nextTierThresholdEur: number | null;
  nextTierPercent: number | null;
  amountToNextTierEur: number;
};

type UserContextValue = {
  user: CurrentUser | null;
  profile: CurrentUserProfile | null;
  discount: CurrentUserDiscount | null;
  isAuthenticated: boolean;
  setUser: (user: CurrentUser | null) => void;
  setProfile: (profile: CurrentUserProfile | null) => void;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  initialUser,
  initialProfile = null,
  initialDiscount = null,
  children,
}: {
  initialUser: CurrentUser | null;
  initialProfile?: CurrentUserProfile | null;
  initialDiscount?: CurrentUserDiscount | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(initialUser);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(initialProfile);
  const [discount, setDiscount] = useState<CurrentUserDiscount | null>(initialDiscount);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setProfile(null);
    setDiscount(null);
    router.push("/");
    router.refresh();
  }, [router]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      profile,
      discount,
      isAuthenticated: user !== null,
      setUser,
      setProfile,
      logout,
    }),
    [user, profile, discount, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }

  return context;
}
