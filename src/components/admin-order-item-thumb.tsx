export function AdminOrderItemThumb({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  return (
    <div className="admin-print-hidden h-14 w-14 shrink-0 overflow-hidden rounded-[8px] border border-[#e7dfd1] bg-[#fcfbf8]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[#cbbfa9]">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="m4 17 4-4 4 4 4-4 4 4" />
            <circle cx="9" cy="8.5" r="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}
