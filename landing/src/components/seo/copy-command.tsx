"use client";

import { Check, Copy, TerminalWindow } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/client-analytics";
import { cn } from "../ui";

/** The same copyable command block the install section uses, reusable on generated pages. */
export function CopyCommand({
  value,
  className,
  multiline,
}: {
  value: string;
  className?: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      trackEvent("copy_command", { command: value });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "flex gap-2 rounded-[10px] bg-sunken py-1 pr-1 pl-3 shadow-[inset_0_0_0_1px_var(--border)]",
        multiline ? "items-start" : "items-center",
        className,
      )}
    >
      <TerminalWindow aria-hidden="true" className={cn("size-4 shrink-0 text-subtle", multiline && "mt-2.5")} />
      <pre
        className={cn(
          "min-w-0 flex-1 overflow-x-auto py-1.5 font-mono text-[13.5px] leading-relaxed text-fg",
          multiline ? "whitespace-pre" : "whitespace-nowrap",
        )}
      >
        <code>{value}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${value}`}
        className={cn(
          "relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface hover:text-fg",
          multiline && "mt-1",
        )}
      >
        <Copy
          aria-hidden="true"
          className={cn("size-4 transition-[opacity,transform] duration-200", copied && "scale-50 opacity-0")}
        />
        <Check
          aria-hidden="true"
          weight="bold"
          className={cn(
            "absolute size-4 text-add-fg transition-[opacity,transform] duration-200",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
        <span aria-live="polite" className="sr-only">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </button>
    </div>
  );
}
