"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CartNotification } from "@/components/cart-notification";
import type { Product } from "@/data/products";
import { useProducts } from "@/components/products-context";

type CartItem = {
  productId: number;
  quantity: number;
};

type CartNotificationState = {
  productId: number;
  productName: string;
  productImage?: Product["imageSrc"][number];
  variant: "success" | "error";
  message?: string;
  key: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (productId: number, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  notifyStockLimit: (productId: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "brami-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const products = useProducts();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [notification, setNotification] = useState<CartNotificationState | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);

      if (!rawValue) {
        setHasHydrated(true);
        return;
      }

      const parsedValue = JSON.parse(rawValue) as CartItem[];

      if (Array.isArray(parsedValue)) {
        setItems(
          parsedValue.filter(
            (item) =>
              typeof item.productId === "number" &&
              typeof item.quantity === "number" &&
              item.quantity > 0,
          ),
        );
      }
    } catch {
      // Ignore corrupted localStorage payloads and start with an empty cart.
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hasHydrated, items]);

  useEffect(
    () => () => {
      if (notificationTimeoutRef.current) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    },
    [],
  );

  const value = useMemo<CartContextValue>(() => {
    function showNotification(next: Omit<CartNotificationState, "key">) {
      if (notificationTimeoutRef.current) {
        window.clearTimeout(notificationTimeoutRef.current);
      }

      setNotification({ ...next, key: Date.now() });

      notificationTimeoutRef.current = window.setTimeout(() => {
        setNotification(null);
        notificationTimeoutRef.current = null;
      }, 3200);
    }

    function addItem(productId: number, quantity = 1) {
      const stockLimit = products.find((entry) => entry.id === productId)?.stock ?? Infinity;

      setItems((currentItems) => {
        const existingItem = currentItems.find((item) => item.productId === productId);

        if (!existingItem) {
          const nextQuantity = Math.min(Math.max(1, quantity), stockLimit);
          if (nextQuantity <= 0) {
            return currentItems;
          }
          return [...currentItems, { productId, quantity: nextQuantity }];
        }

        return currentItems.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: Math.min(item.quantity + Math.max(1, quantity), stockLimit),
              }
            : item,
        );
      });

      const product = products.find((entry) => entry.id === productId);

      if (product) {
        showNotification({
          productId,
          productName: product.name,
          productImage: product.imageSrc[0],
          variant: "success",
        });
      }
    }

    function notifyStockLimit(productId: number) {
      const product = products.find((entry) => entry.id === productId);

      if (!product) {
        return;
      }

      const message =
        product.stock <= 0
          ? "Този продукт в момента е изчерпан."
          : `Наличните бройки са ${product.stock}. Не може да добавите повече от наличното.`;

      showNotification({
        productId,
        productName: product.name,
        productImage: product.imageSrc[0],
        variant: "error",
        message,
      });
    }

    function removeItem(productId: number) {
      setItems((currentItems) =>
        currentItems.filter((item) => item.productId !== productId),
      );
    }

    function updateQuantity(productId: number, quantity: number) {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }

      const stockLimit = products.find((entry) => entry.id === productId)?.stock ?? Infinity;
      const nextQuantity = Math.min(quantity, stockLimit);

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.productId === productId ? { ...item, quantity: nextQuantity } : item,
        ),
      );
    }

    function clearCart() {
      setItems([]);
    }

    return {
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      addItem,
      removeItem,
      updateQuantity,
      notifyStockLimit,
      clearCart,
    };
  }, [items, products]);

  return (
    <CartContext.Provider value={value}>
      {children}
      {notification ? (
        <CartNotification
          key={notification.key}
          variant={notification.variant}
          message={notification.message}
          productName={notification.productName}
          productImage={notification.productImage}
          onClose={() => {
            if (notificationTimeoutRef.current) {
              window.clearTimeout(notificationTimeoutRef.current);
              notificationTimeoutRef.current = null;
            }

            setNotification(null);
          }}
        />
      ) : null}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
