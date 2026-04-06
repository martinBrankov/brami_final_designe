"use client";

import { useFavorites } from "@/components/favorites-provider";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.4 5.6 14.7A4.9 4.9 0 0 1 12 7.4a4.9 4.9 0 0 1 6.4-.1 4.8 4.8 0 0 1-.3 7.4Z" />
    </svg>
  );
}

export function FavoriteToggleButton({
  productId,
  className = "",
}: {
  productId: number;
  className?: string;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(productId);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(productId)}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold uppercase tracking-[0.08em] transition ${
        favorite
          ? "border-transparent bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
          : "border-[#d8d0de] bg-white text-[#432855] hover:bg-[#faf7fc]"
      } ${className}`}
      aria-pressed={favorite}
    >
      <HeartIcon filled={favorite} />
      {favorite ? "В любими" : "Добави в любими"}
    </button>
  );
}
