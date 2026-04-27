import type { ReactNode } from "react";

export const pageSectionClassName =
  "w-full px-6 pb-0 pt-12 sm:px-10 sm:pt-16 lg:px-14";

export const contentSectionClassName =
  "w-full border-y border-[#d8d0de] bg-white";

export const contentSectionInnerClassName = "px-6 py-8 sm:px-10 lg:px-14";

export const sectionActionClassName =
  "inline-flex h-11 items-center justify-center rounded-full border border-[#d8d0de] bg-white px-5 text-sm font-semibold text-[#432855] transition hover:bg-[#faf7fc]";

export const sectionPrimaryButtonClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-105";

type SectionIntroProps = {
  title: ReactNode;
  description?: string;
  note?: string;
  action?: ReactNode;
  children?: ReactNode;
  titleAs?: "h1" | "h2";
  size?: "page" | "section" | "hero";
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  noteClassName?: string;
};

const sizeStyles = {
  page: {
    title:
      "font-serif text-[2.15rem] leading-[1.04] text-[#432855] sm:text-[2.85rem]",
    description:
      "mt-3 max-w-2xl text-base leading-8 text-[#6b587f] sm:text-[1.05rem]",
  },
  section: {
    title:
      "font-serif text-[2rem] leading-[1.08] text-[#432855] sm:text-[2.5rem]",
    description:
      "mt-3 max-w-2xl text-base leading-8 text-[#6b587f] sm:text-[1.05rem]",
  },
  hero: {
    title:
      "font-serif text-[2.35rem] leading-[1.02] text-[#432855] sm:text-[3.25rem] lg:text-[4rem]",
    description:
      "mt-5 max-w-xl text-base leading-6 text-[#6b587f] sm:text-[1.05rem]",
  },
} as const;

export function SectionIntro({
  title,
  description,
  note,
  action,
  children,
  titleAs = "h2",
  size = "section",
  className = "",
  contentClassName = "",
  titleClassName = "",
  descriptionClassName = "",
  noteClassName = "",
}: SectionIntroProps) {
  const TitleTag = titleAs;
  const selectedSize = sizeStyles[size];

  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-start md:justify-between ${className}`}
    >
      <div className={`min-w-0 max-w-4xl ${contentClassName}`}>
        <TitleTag className={`${selectedSize.title} ${titleClassName}`}>
          {title}
        </TitleTag>
        {description ? (
          <p className={`${selectedSize.description} ${descriptionClassName}`}>
            {description}
          </p>
        ) : null}
        {note ? (
          <p
            className={`mt-4 text-base font-semibold leading-8 text-[#432855] ${noteClassName}`}
          >
            {note}
          </p>
        ) : null}
        {children ? <div className="mt-3 space-y-2">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-start">{action}</div> : null}
    </div>
  );
}
