"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  /** max(volume tier, admin manual) — the discount applied in the cart. */
  effectiveMerchantDiscountPercent: number;
  /** Whether a merchant has accepted the terms (gates access + discounts). */
  merchantTermsAccepted: boolean;
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
  /** False until the first answer from /api/auth/session has arrived. */
  isLoaded: boolean;
  setUser: (user: CurrentUser | null) => void;
  setProfile: (profile: CurrentUserProfile | null) => void;
  /** Reloads user, profile and discount from the server. */
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

type SessionResponse = {
  user: CurrentUser | null;
  profile: CurrentUserProfile | null;
  discount: CurrentUserDiscount | null;
};

const UserContext = createContext<UserContextValue | null>(null);

// The pages are cached and identical for everyone, so the signed-in visitor
// is loaded in the browser from /api/auth/session, never rendered on the server.
export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUserState] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [discount, setDiscount] = useState<CurrentUserDiscount | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Only the answer to the latest request is applied.
  const requestIdRef = useRef(0);

  const refreshUser = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) return;
      const state = (await response.json()) as SessionResponse;
      if (requestId !== requestIdRef.current) return;
      setUserState(state.user);
      setProfile(state.profile);
      setDiscount(state.discount);
    } catch {
      // Offline or aborted: keep what we have.
    } finally {
      if (requestId === requestIdRef.current) setIsLoaded(true);
    }
  }, []);

  // On load and on every navigation, so consent, profile and discount changes
  // made on one page are reflected on the next without a hard reload.
  useEffect(() => {
    void refreshUser();
  }, [pathname, refreshUser]);

  // Login/registration hand over the user at once; profile and discount follow.
  const setUser = useCallback(
    (nextUser: CurrentUser | null) => {
      setUserState(nextUser);
      if (nextUser) {
        void refreshUser();
      } else {
        setProfile(null);
        setDiscount(null);
      }
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    requestIdRef.current += 1;
    setUserState(null);
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
      isLoaded,
      setUser,
      setProfile,
      refreshUser,
      logout,
    }),
    [user, profile, discount, isLoaded, setUser, refreshUser, logout],
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
