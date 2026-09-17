import type { Cta } from "@/lib/copy";
import { buttonClass } from "./ui";
import { DownloadSimple } from "@phosphor-icons/react/ssr";
import { AppleLogo, GitHubLogo, WindowsLogo } from "./os-logos";
import { TrackedLink } from "./tracked-link";
import { StarCount } from "./star-count";

function Icon({ href }: { href: string; kind: Cta["kind"] }) {
  if (href.includes("github.com")) return <GitHubLogo />;
  if (href.includes("/download/windows")) return <WindowsLogo className="size-[18px]" />;
  if (href.includes("/download/macos")) return <AppleLogo className="size-[18px]" />;
  return <DownloadSimple weight="bold" />;
}

export function CtaRow({
  ctas,
  size = "md",
  className,
  placement,
  stars = null,
}: {
  ctas: Cta[];
  size?: "sm" | "md";
  className?: string;
  placement: string;
  stars?: number | null;
}) {
  return (
    <div className={className ?? "flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap"}>
      {ctas.map((cta) => (
        <TrackedLink
          key={cta.href + cta.label}
          href={cta.href}
          placement={placement}
          eventLabel={cta.label}
          target={cta.external ? "_blank" : undefined}
          rel={cta.external ? "noopener noreferrer" : undefined}
          className={buttonClass(cta.kind, size, "w-full sm:w-auto")}
        >
          <Icon href={cta.href} kind={cta.kind} />
          {cta.label}
          {cta.href.includes("github.com") ? <StarCount stars={stars} className="ml-0.5 text-subtle" /> : null}
        </TrackedLink>
      ))}
    </div>
  );
}
