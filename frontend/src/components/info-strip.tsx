import type { ComponentType, SVGProps } from "react";

type StripIconProps = SVGProps<SVGSVGElement>;
type StripIcon = ComponentType<StripIconProps>;

export function DeliveryIcon(props: StripIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 7.5h11v7H3z" />
      <path d="M14 10h3.2l2.3 2.6v1.9H14z" />
      <circle cx="7" cy="17.5" r="1.4" />
      <circle cx="17" cy="17.5" r="1.4" />
      <path d="M5.5 10.5h2.5" />
    </svg>
  );
}

export function LeafIcon(props: StripIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12.2 20c4.7-1 7.3-4.4 7.3-9.8V4.5h-5.7C8.7 4.5 5 8.1 5 13c0 3.4 2.1 6 5.6 7" />
      <path d="M8.5 14.5c1.7-.1 3.2-.8 4.6-2.1 1.4-1.3 2.3-2.9 2.9-4.9" />
    </svg>
  );
}

export type InfoStripItem = {
  icon: StripIcon;
  title: string;
  text: string;
};

const defaultItems: InfoStripItem[] = [
  {
    icon: DeliveryIcon,
    title: "Безплатна доставка",
    text: "над 50 евро",
  },
  {
    icon: LeafIcon,
    title: "Натурални",
    text: "съставки",
  },
];

type InfoStripProps = {
  items?: InfoStripItem[];
  className?: string;
};

export function InfoStrip({
  items = defaultItems,
  className = "",
}: InfoStripProps) {
  return (
    <section className={`w-full border-b border-[#d8d0de] bg-white/55 ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-center sm:gap-10 lg:px-14">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={`${title}-${text}`} className="flex items-center gap-3 text-[#4B2E6F]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d0de] bg-white/80">
              <Icon />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5 text-[0.95rem] leading-5 sm:block sm:text-base">
              <p className="font-semibold whitespace-nowrap">{title}</p>
              <p className="text-[#6b587f] whitespace-nowrap">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
