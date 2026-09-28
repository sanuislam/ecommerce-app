import { cn } from "@/lib/utils";

/**
 * Eid Bazar brand mark: a white geometric "E" with a small crescent on a
 * rose → amber gradient tile. Also used (as the same paths) to render the
 * favicon, app icons and the default social-share image.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("size-7 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id="eb-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f43f5e" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <mask id="eb-logo-moon">
          <rect width="512" height="512" fill="#fff" />
          <circle cx="396" cy="240" r="38" fill="#000" />
        </mask>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#eb-logo-bg)" />
      <g fill="#fff">
        <rect x="114" y="128" width="68" height="256" rx="14" />
        <rect x="114" y="128" width="210" height="60" rx="14" />
        <rect x="114" y="226" width="176" height="60" rx="14" />
        <rect x="114" y="324" width="232" height="60" rx="14" />
        <circle cx="378" cy="256" r="44" mask="url(#eb-logo-moon)" />
      </g>
    </svg>
  );
}

/** Mark + wordmark, used in the header and auth pages. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark className={markClassName} />
      <span className="truncate">Eid Bazar</span>
    </span>
  );
}
