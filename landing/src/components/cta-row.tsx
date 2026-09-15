import type { Cta } from "@/lib/copy";
import { buttonClass } from "./ui";
import { Code, DownloadSimple } from "@phosphor-icons/react/ssr";
import { WindowsLogo, AppleLogo } from "./os-logos";

function Icon({ href, kind }: { href: string; kind: Cta["kind"] }) {
  if (href.includes("/download/windows")) return <WindowsLogo className="size-[18px]" />;
  if (href.includes("/download/macos")) return <AppleLogo className="size-[18px]" />;
  if (kind === "outline") return <Code weight="bold" />;
  return <DownloadSimple weight="bold" />;
}

export function CtaRow({ ctas, size = "md", className }: { ctas: Cta[]; size?: "sm" | "md"; className?: string }) {
  return (
    <div className={className ?? "flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap"}>
      {ctas.map((cta) => (
        <a
          key={cta.href + cta.label}
          href={cta.href}
          target={cta.external ? "_blank" : undefined}
          rel={cta.external ? "noopener noreferrer" : undefined}
          className={buttonClass(cta.kind, size, "w-full sm:w-auto")}
        >
          <Icon href={cta.href} kind={cta.kind} />
          {cta.label}
        </a>
      ))}
    </div>
  );
}
