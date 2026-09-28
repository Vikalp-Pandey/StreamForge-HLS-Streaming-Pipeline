interface BrandProps {
  className?: string;
}

export function BrandMark({ className = 'size-6' }: BrandProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="9" fill="#0ea5e9" />
      <path
        d="M13 10.75v10.5a1.25 1.25 0 0 0 1.92 1.05l8.25-5.25a1.25 1.25 0 0 0 0-2.1L14.92 9.7A1.25 1.25 0 0 0 13 10.75Z"
        fill="white"
      />
      <path
        d="M8.5 10.5h1.75M8.5 16h1.75M8.5 21.5h1.75"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".72"
      />
    </svg>
  );
}

export function Brand({ className = '' }: BrandProps) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-sm font-bold tracking-[0.28em] text-white ${className}`}
      aria-label="StreamForge"
    >
      <BrandMark className="size-6 shrink-0" />
      <span>STREAMFORGE</span>
    </span>
  );
}
