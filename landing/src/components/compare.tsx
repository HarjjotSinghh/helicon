import {
  CheckCircle,
  CodeBlock,
  CreditCard,
  FolderSimple,
  Info,
  MapPin,
  Monitor,
  Scales,
  ShieldCheck,
  Shuffle,
} from "@phosphor-icons/react/ssr";
import { Logo, Rule, SectionHeading, bandX } from "./ui";

const rows = [
  { icon: Monitor, label: "Runs on Windows", a: "Signed installer, native or WSL2", b: "Via your editor's WSL setup", c: "Varies" },
  { icon: CreditCard, label: "Billing", a: "Your Muse subscription", b: "Your Muse subscription", c: "Usually its own API billing" },
  { icon: MapPin, label: "Lives where", a: "Standalone app or web", b: "Inside the editor", c: "Its own harness" },
  { icon: FolderSimple, label: "Several repos at once", a: "Sidebar, grouped by directory", b: "One window per project", c: "Varies" },
  { icon: ShieldCheck, label: "Approvals", a: "Surfaced, never bypassed", b: "Editor-dependent", c: "Harness-dependent" },
];

export function Compare({ body }: { body: string }) {
  return (
    <section id="compare" aria-labelledby="compare-title">
      <div className={`${bandX} py-14 sm:py-20`}>
      <SectionHeading id="compare-title" icon={<Scales weight="duotone" />} title="Where Helicon fits">
        {body}
      </SectionHeading>
      </div>
      <Rule />

      <div className="divide-y divide-line md:hidden">
        {rows.map(({ icon: Icon, label, a, b, c }) => (
          <div key={label} className="px-5 py-4 sm:px-8">
            <p className="flex items-center gap-2.5 text-[14px] font-medium text-fg">
              <Icon aria-hidden="true" weight="duotone" className="size-[18px] shrink-0 text-subtle" />
              {label}
            </p>
            <dl className="mt-3 grid gap-3 text-[13.5px] leading-relaxed">
              <div>
                <dt className="text-[12px] font-semibold tracking-wide text-accent-text uppercase">Helicon</dt>
                <dd className="mt-0.5 text-fg">{a}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-semibold tracking-wide text-subtle uppercase">Editor extension</dt>
                <dd className="mt-0.5 text-muted">{b}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-semibold tracking-wide text-subtle uppercase">Switch harness</dt>
                <dd className="mt-0.5 text-muted">{c}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-[15px]">
          <caption className="sr-only">Helicon compared with editor extensions and switching harness</caption>
          <thead>
            <tr data-stagger="45" className="border-b border-line">
              <th scope="col" className="w-[24%] px-5 py-4 first:pl-5 last:pr-5 sm:first:pl-8 sm:last:pr-8 lg:first:pl-12 lg:last:pr-12">
                <span data-reveal className="sr-only">Criteria</span>
              </th>
              <th scope="col" className="w-[26%] bg-tint px-5 py-4 first:pl-5 last:pr-5 sm:first:pl-8 sm:last:pr-8 lg:first:pl-12 lg:last:pr-12 font-semibold text-fg">
                <span data-reveal className="inline-flex items-center gap-2.5">
                  <Logo size={22} className="rounded-[6px]" />
                  Helicon
                </span>
              </th>
              <th scope="col" className="w-[25%] px-5 py-4 first:pl-5 last:pr-5 sm:first:pl-8 sm:last:pr-8 lg:first:pl-12 lg:last:pr-12 font-semibold text-muted">
                <span data-reveal className="inline-flex items-center gap-2.5">
                  <CodeBlock aria-hidden="true" weight="duotone" className="size-5 text-subtle" />
                  Editor extension
                </span>
              </th>
              <th scope="col" className="w-[25%] px-5 py-4 first:pl-5 last:pr-5 sm:first:pl-8 sm:last:pr-8 lg:first:pl-12 lg:last:pr-12 font-semibold text-muted">
                <span data-reveal className="inline-flex items-center gap-2.5">
                  <Shuffle aria-hidden="true" weight="duotone" className="size-5 text-subtle" />
                  Switch harness
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ icon: Icon, label, a, b, c }, i) => (
              <tr key={label} data-stagger="45" data-base={50 + i * 40} className={i < rows.length - 1 ? "border-b border-line" : undefined}>
                <th scope="row" className="px-5 py-4 first:pl-5 last:pr-5 sm:first:pl-8 sm:last:pr-8 lg:first:pl-12 lg:last:pr-12 font-medium text-fg">
                  <span data-reveal className="inline-flex items-center gap-2.5">
                    <Icon aria-hidden="true" weight="duotone" className="size-[18px] text-subtle" />
                    {label}
                  </span>
                </th>
                <td className="bg-tint/60 px-5 py-4 first:pl-5 last:pr-5 sm:first:pl-8 sm:last:pr-8 lg:first:pl-12 lg:last:pr-12 font-medium text-fg">
                  <span data-reveal className="inline-flex items-start gap-2">
                    <CheckCircle aria-hidden="true" weight="fill" className="mt-0.5 size-[18px] shrink-0 text-accent-text" />
                    {a}
                  </span>
                </td>
                <td className="px-5 py-4 first:pl-5 last:pr-5 sm:first:pl-8 sm:last:pr-8 lg:first:pl-12 lg:last:pr-12 text-muted">
                  <span data-reveal className="inline-block">{b}</span>
                </td>
                <td className="px-5 py-4 first:pl-5 last:pr-5 sm:first:pl-8 sm:last:pr-8 lg:first:pl-12 lg:last:pr-12 text-muted">
                  <span data-reveal className="inline-block">{c}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`${bandX} hidden items-center gap-2 border-t border-line py-3 text-[13.5px] text-subtle md:flex lg:hidden`}>
        <Info aria-hidden="true" className="size-4" />
        Scroll the table sideways to compare.
      </p>
    </section>
  );
}
