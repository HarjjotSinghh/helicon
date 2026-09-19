import { Info } from "@phosphor-icons/react/ssr";
import { Fragment } from "react";
import type { Block, Step } from "@/lib/seo/types";
import { CopyCommand } from "./copy-command";
import { cn } from "../ui";

/**
 * Content is authored as plain strings so the same text can render as React and as Markdown.
 * Two Markdown spellings survive into the HTML: `code` and **bold**. Anything more would mean
 * shipping a parser to render a landing page, which is not a trade worth making.
 */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code
              key={i}
              className="rounded-[5px] bg-sunken px-[0.35em] py-[0.1em] font-mono text-[0.9em] text-fg"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="font-semibold text-fg">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Slugs a heading so the table of contents and deep links can reach it. */
export function headingId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function Steps({ steps, idPrefix = "step" }: { steps: Step[]; idPrefix?: string }) {
  return (
    <ol className="mt-6 space-y-3.5">
      {steps.map((step, i) => (
        <li key={step.name} id={`${idPrefix}-${i + 1}`} className="flex gap-3.5 scroll-mt-28">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-tint text-[12.5px] font-semibold text-accent-text tabular-nums"
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-relaxed text-fg sm:text-[16px]">
              <strong className="font-semibold">{step.name}.</strong> <Inline text={step.text} />
            </p>
            {step.code ? <CopyCommand value={step.code} className="mt-2" /> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2
          id={headingId(block.text)}
          className="mt-12 scroll-mt-28 font-headline text-[clamp(1.375rem,2.6vw,1.75rem)] leading-tight font-semibold tracking-[-0.012em] text-fg first:mt-0"
        >
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 id={headingId(block.text)} className="mt-8 scroll-mt-28 text-[17px] font-semibold text-fg sm:text-[18px]">
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p className="mt-4 max-w-[68ch] text-[15.5px] leading-[1.75] text-muted sm:text-[16.5px]">
          <Inline text={block.text} />
        </p>
      );
    case "ul":
      return (
        <ul className="mt-4 max-w-[68ch] space-y-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-[15.5px] leading-[1.7] text-muted sm:text-[16px]">
              <span aria-hidden="true" className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent-text/60" />
              <span className="min-w-0">
                <Inline text={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="mt-4 max-w-[68ch] space-y-2.5">
          {block.items.map((item, i) => (
            <li key={item} className="flex gap-3 text-[15.5px] leading-[1.7] text-muted sm:text-[16px]">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-sunken text-[12.5px] font-semibold text-fg tabular-nums"
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <Inline text={item} />
              </span>
            </li>
          ))}
        </ol>
      );
    case "code":
      return <CopyCommand value={block.code} className="mt-5 max-w-[68ch]" multiline />;
    case "note":
      return (
        <aside className="mt-6 flex max-w-[68ch] gap-3 rounded-xl bg-tint px-4 py-3.5 text-[14.5px] leading-relaxed text-fg shadow-[inset_0_0_0_1px_var(--tint-strong)] sm:text-[15px]">
          <Info aria-hidden="true" weight="duotone" className="mt-0.5 size-[18px] shrink-0 text-accent-text" />
          <span className="min-w-0">
            <Inline text={block.text} />
          </span>
        </aside>
      );
    case "quote":
      return (
        <figure className="mt-6 max-w-[68ch] border-l-2 border-line-strong pl-5">
          <blockquote className="text-[16px] leading-relaxed text-fg italic">{block.text}</blockquote>
          {block.cite ? <figcaption className="mt-2 text-[13.5px] text-subtle">{block.cite}</figcaption> : null}
        </figure>
      );
    case "stats":
      return (
        <dl className="mt-6 grid gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-3">
          {block.items.map((stat) => (
            <div key={stat.label} className="bg-bg px-4 py-4">
              <dt className="font-headline text-[26px] leading-none font-semibold text-fg tabular-nums">{stat.value}</dt>
              <dd className="mt-2 text-[13.5px] leading-snug text-muted">
                {stat.label}
                {stat.source ? <span className="block text-subtle">{stat.source}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      );
    case "steps":
      return <Steps steps={block.steps} />;
    case "table":
      return (
        <figure className="mt-6">
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[34rem] border-collapse text-left text-[14.5px] sm:text-[15px]">
              <thead>
                <tr className="border-b border-line-strong">
                  {block.head.map((cell, i) => (
                    <th
                      key={`${cell}-${i}`}
                      scope="col"
                      className={cn(
                        "py-2.5 pr-4 align-bottom font-semibold text-fg",
                        i === 0 && "w-[34%] min-w-[9rem]",
                      )}
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr key={row.join("|")} className="border-b border-line last:border-0">
                    {row.map((cell, i) => (
                      <td
                        key={`${cell}-${i}`}
                        className={cn("py-3 pr-4 align-top leading-relaxed", i === 0 ? "font-medium text-fg" : "text-muted")}
                      >
                        <Inline text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption ? (
            <figcaption className="mt-3 text-[13.5px] leading-relaxed text-subtle">
              <Inline text={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
  }
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <BlockView key={`${block.kind}-${i}`} block={block} />
      ))}
    </>
  );
}

/** The h2 headings of a page, for the table of contents. */
export function headingsOf(blocks: Block[]) {
  return blocks.filter((block): block is Extract<Block, { kind: "h2" }> => block.kind === "h2");
}
