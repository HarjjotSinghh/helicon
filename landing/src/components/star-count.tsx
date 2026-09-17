import { Star } from "@phosphor-icons/react/ssr";
import { formatStars } from "@/lib/github-release";

/** The repo's stars, beside whatever links to GitHub. Renders nothing when the count could not be read. */
export function StarCount({ stars, className }: { stars: number | null; className?: string }) {
  if (stars === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[13px] font-medium tabular-nums ${className ?? "text-muted"}`}
      title={`${stars.toLocaleString()} stars on GitHub`}
    >
      <Star weight="fill" aria-hidden="true" className="size-3.5 text-[#e3b341]" />
      {formatStars(stars)}
      <span className="sr-only">stars on GitHub</span>
    </span>
  );
}
