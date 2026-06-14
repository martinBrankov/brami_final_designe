"use client";

import { useState } from "react";

export function CartQuantityStepper({
  quantity,
  stock,
  onChange,
  size = "md",
}: {
  quantity: number;
  stock: number;
  onChange: (next: number) => void;
  size?: "sm" | "md";
}) {
  const [limitReached, setLimitReached] = useState(false);
  const atMax = quantity >= stock;
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const valueWidth = size === "sm" ? "min-w-8" : "min-w-10";

  function decrease() {
    setLimitReached(false);
    onChange(quantity - 1);
  }

  function increase() {
    // Stock is hidden by default — it is only revealed here, when the customer
    // actually tries to add more than what is available.
    if (atMax) {
      setLimitReached(true);
      return;
    }
    setLimitReached(false);
    onChange(quantity + 1);
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="inline-flex items-center rounded-full border border-[#ddd3e4] bg-white p-1">
        <button
          type="button"
          onClick={decrease}
          className={`flex ${buttonSize} items-center justify-center rounded-full text-xl text-[#432855] transition hover:bg-[#f2e8f6]`}
        >
          −
        </button>
        <span className={`${valueWidth} text-center text-sm font-semibold text-[#432855]`}>
          {quantity}
        </span>
        <button
          type="button"
          onClick={increase}
          className={`flex ${buttonSize} items-center justify-center rounded-full text-xl text-[#432855] transition hover:bg-[#f2e8f6]`}
        >
          +
        </button>
      </div>
      {limitReached ? (
        <p className="text-xs font-medium text-[#c0392b]">
          Наличните бройки са {stock}. Не може да поръчате повече от наличното,
          затова количеството е зададено на максимума.
        </p>
      ) : null}
    </div>
  );
}
