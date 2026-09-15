import {
  AppWindow,
  ArrowsLeftRight,
  Database,
  HardDrives,
  Key,
  Lightning,
  TerminalWindow,
} from "@phosphor-icons/react/ssr";
import type { ComponentProps, ReactNode } from "react";
import { WindowsLogo } from "./os-logos";
import { CellGrid, SectionHeading } from "./ui";

function Node({
  icon,
  title,
  detail,
  mono,
  highlight,
  ...rest
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  mono?: boolean;
  highlight?: boolean;
} & Omit<ComponentProps<"li">, "title">) {
  return (
    <li
      {...rest}
      className={
        "relative flex items-center gap-4 rounded-xl p-4 " +
        (highlight
          ? "bg-tint shadow-[inset_0_0_0_1px_var(--tint-strong)]"
          : "bg-surface shadow-soft")
      }
    >
      <span
        aria-hidden="true"
        className={
          "inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-[22px] " +
          (highlight ? "bg-btn text-btn-fg" : "bg-sunken text-fg")
        }
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className={"block text-[16px] font-semibold text-fg " + (mono ? "font-mono text-[15px]" : "")}>
          {title}
        </span>
        <span className="block text-[14px] text-subtle">{detail}</span>
      </span>
    </li>
  );
}

function Connector() {
  return (
    <li aria-hidden="true" data-reveal="extend" className="flex h-8 items-center pl-[37px]">
      <svg width="2" height="32" className="overflow-visible text-line-strong">
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="32"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="motion-safe:[animation:flow_0.8s_linear_infinite]"
        />
      </svg>
    </li>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-sunken px-1.5 py-0.5 text-[0.86em] text-fg">{children}</code>;
}

export function Architecture({ extra }: { extra: string | null }) {
  return (
    <section id="how" aria-labelledby="how-title">
      <CellGrid className="lg:grid-cols-2">
        <div className="bg-bg px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div>
            <SectionHeading id="how-title" icon={<Lightning weight="duotone" />} title="No terminal scraping" />
          </div>
          <div className="mt-5 max-w-[56ch] space-y-4 text-[15px] leading-relaxed text-muted sm:text-[17px]">
            <p>
              A local daemon spawns one <Code>muse serve</Code> host per workspace and speaks the Muse
              Session Protocol through Meta&apos;s official MIT <Code>@muse-code/sdk</Code>.
            </p>
            <p>
              Auth is your own <Code>muse login</Code>. Helicon never stores credentials, and all state is
              local SQLite.
            </p>
            {extra ? <p>{extra}</p> : null}
          </div>
          <ul data-stagger="45" data-base="275" className="mt-8 flex flex-wrap gap-2">
            {[
              { icon: Key, text: "Auth from muse login" },
              { icon: Database, text: "Local SQLite" },
              { icon: WindowsLogo, text: "Windows: WSL2 sidecar with path translation" },
            ].map(({ icon: Icon, text }) => (
              <li
                key={text}
                data-reveal="scale"
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-surface py-1.5 pr-3.5 pl-2.5 text-[12.5px] font-medium whitespace-nowrap text-muted shadow-soft sm:text-[13.5px]"
              >
                <Icon aria-hidden="true" size={16} className="size-4 shrink-0 text-accent-text" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <figure className="flex flex-col justify-center bg-[color-mix(in_oklab,var(--bg-sidebar)_40%,var(--bg))] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
          <ol data-stagger="105" data-base="160" className="flex flex-col" aria-label="Request path from the app to muse">
            <Node data-reveal="scale" icon={<AppWindow weight="duotone" />} title="Helicon UI" detail="Tauri desktop app or web app" />
            <Connector />
            <Node
              data-reveal="scale"
              highlight
              icon={<HardDrives weight="duotone" />}
              title="Local daemon"
              detail="SQLite state, one host per workspace"
            />
            <Connector />
            <Node data-reveal="scale" mono icon={<TerminalWindow weight="duotone" />} title="muse serve" detail="Muse Session Protocol via @muse-code/sdk" />
          </ol>
          <figcaption data-reveal data-delay="650" className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-[13.5px] text-subtle">
            <ArrowsLeftRight aria-hidden="true" className="size-4" />
            Events stream both ways, so approvals and diffs arrive as they happen.
          </figcaption>
        </figure>
      </CellGrid>
    </section>
  );
}
