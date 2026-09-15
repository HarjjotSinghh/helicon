"use client";

import { ChatCircleDots, Plus, Question } from "@phosphor-icons/react";
import { useState } from "react";
import { FAQS, ISSUES_URL } from "@/lib/site";
import type { Audience } from "@/lib/os";
import { CellGrid, SectionHeading, buttonClass, cn } from "./ui";

function faqsFor(audience: Audience) {
  if (audience !== "windows") return FAQS;
  const windows = FAQS.find(([q]) => q === "How does it work on Windows?");
  const rest = FAQS.filter(([q]) => q !== "How does it work on Windows?");
  return windows ? [rest[0], windows, ...rest.slice(1)] : FAQS;
}

export function Faq({ audience, intro }: { audience: Audience; intro: string }) {
  const items = faqsFor(audience);
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" aria-labelledby="faq-title">
      <CellGrid className="xl:grid-cols-[minmax(0,500px)_1fr]">
        <div className="bg-bg px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div data-reveal="rise" className="xl:sticky xl:top-28">
          <SectionHeading id="faq-title" icon={<Question weight="duotone" />} title="Before you install" className="sm:[&_h2]:whitespace-nowrap">
            {intro}
          </SectionHeading>
          <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm", "mt-6 max-sm:h-11")}>
            <ChatCircleDots weight="bold" aria-hidden="true" />
            Ask on GitHub
          </a>
        </div>

        </div>
        <div data-stagger="35" data-base="130" className="divide-y divide-line bg-bg px-5 py-6 sm:px-8 lg:px-12 xl:py-14">
          {items.map(([q, a], i) => {
            const expanded = open === i;
            return (
              <div key={q}>
                <h3 data-reveal>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={expanded}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(expanded ? -1 : i)}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-medium text-fg"
                  >
                    <span className="transition-colors group-hover:text-accent-text">{q}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-muted transition-[transform,background-color,color] duration-300 ease-[var(--ease-out-quart)]",
                        expanded && "rotate-45 bg-tint text-accent-text",
                      )}
                    >
                      <Plus weight="bold" className="size-4" />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  inert={!expanded}
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-quart)] motion-reduce:transition-none",
                    expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-[64ch] pb-6 text-[16px] leading-relaxed text-muted sm:pr-12">{a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CellGrid>
    </section>
  );
}
