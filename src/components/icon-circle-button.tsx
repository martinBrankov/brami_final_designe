import type { ReactNode } from "react";

type IconCircleButtonProps = {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
};

export function IconCircleButton({
  label,
  onClick,
  children,
  className = "",
}: IconCircleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full text-[#8f72a7] transition hover:bg-[#f2e8f6] hover:text-[#432855] ${className}`}
    >
      <span className="inline-flex translate-y-px items-center justify-center leading-none">
        {children}
      </span>
    </button>
  );
}
