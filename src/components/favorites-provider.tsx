"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FavoritesContextValue = {
  favoriteIds: number[];
  favoriteCount: number;
  hasHydrated: boolean;
  isFavorite: (productId: number) => boolean;
  toggleFavorite: (productId: number) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const STORAGE_KEY = "brami-favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);

      if (!rawValue) {
        setHasHydrated(true);
        return;
      }

      const parsedValue = JSON.parse(rawValue) as number[];

      if (Array.isArray(parsedValue)) {
        setFavoriteIds(
          parsedValue.filter((item): item is number => typeof item === "number"),
        );
      }
    } catch {
      // Ignore corrupted localStorage payloads and start with an empty favorites list.
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds, hasHydrated]);

  const value = useMemo<FavoritesContextValue>(() => {
    function isFavorite(productId: number) {
      return favoriteIds.includes(productId);
    }

    function toggleFavorite(productId: number) {
      setFavoriteIds((currentIds) =>
        currentIds.includes(productId)
          ? currentIds.filter((id) => id !== productId)
          : [...currentIds, productId],
      );
    }

    return {
      favoriteIds,
      favoriteCount: favoriteIds.length,
      hasHydrated,
      isFavorite,
      toggleFavorite,
    };
  }, [favoriteIds, hasHydrated]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }

  return context;
}
