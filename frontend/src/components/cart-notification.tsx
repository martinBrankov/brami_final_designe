"use client";

import Image, { type StaticImageData } from "next/image";

type CartNotificationProps = {
  productName: string;
  productImage?: string | StaticImageData;
  onClose: () => void;
};

export function CartNotification({
  productName,
  productImage,
  onClose,
}: CartNotificationProps) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] sm:bottom-6">
      <div className="pointer-events-auto mx-auto w-full max-w-[360px] rounded-[24px] border border-[#ddd3e4] bg-white/95 p-4 shadow-[0_18px_45px_rgba(67,40,85,0.14)] backdrop-blur sm:max-w-none">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.5 10.5 8 14l7.5-8" />
            </svg>
          </div>

          <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
            <div className="min-w-0 sm:flex-1">
              <p className="font-serif text-[1.15rem] leading-6 text-[#432855] sm:text-[1.2rem] sm:leading-7">
                Продуктът е добавен в количката.
              </p>
            </div>

            {productImage ? (
              <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-[#ece3f2] bg-[#faf7fc] p-2.5 sm:mt-0 sm:min-w-[260px] sm:max-w-[320px] sm:flex-1">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-white">
                  <Image
                    src={productImage}
                    alt={productName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium leading-5 text-[#432855]">
                    {productName}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6b587f] sm:mt-0 sm:max-w-[320px]">
                {productName}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Затвори известието"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e6deec] text-lg leading-none text-[#6b587f] transition hover:bg-[#f5eff8]"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
