"use client";

import { ArrowCounterClockwise, Check, CheckCircle, ShieldWarning, X, XCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "./ui";

type Phase = "waiting" | "running" | "passed" | "rejected";

/** A working copy of the app's approval card: decide, watch the result, replay. */
export function ApprovalDemo() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function allow() {
    setPhase("running");
    timer.current = setTimeout(() => setPhase("passed"), 1300);
  }

  const settled = phase === "passed" || phase === "rejected";

  return (
    <div data-reveal="scale" className="mt-7 flex flex-1 flex-col">
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden rounded-xl bg-bg text-[13px] transition-shadow duration-200 dark:bg-sunken",
          phase === "waiting" ? "shadow-[0_0_0_1px_var(--warn-line)]" : "shadow-[0_0_0_1px_var(--border)]",
        )}
      >
        <div className="flex items-start gap-2.5 px-3.5 pt-3.5">
          <span
            aria-hidden="true"
            className={cn(
              "mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-md",
              phase === "waiting" ? "bg-warn-bg text-warn" : phase === "rejected" ? "bg-del-bg text-del-fg" : "bg-add-bg text-add-fg",
            )}
          >
            {phase === "waiting" ? (
              <ShieldWarning weight="fill" className="size-3.5" />
            ) : phase === "rejected" ? (
              <XCircle weight="fill" className="size-3.5" />
            ) : (
              <CheckCircle weight="fill" className="size-3.5" />
            )}
          </span>
          <div className="min-w-0" aria-live="polite">
            <p className="font-medium text-fg">
              {phase === "waiting"
                ? "Muse wants to run a shell command"
                : phase === "running"
                  ? "Allowed once, running"
                  : phase === "passed"
                    ? "Allowed once, tests passed"
                    : "Rejected, nothing ran"}
            </p>
            <p className="text-[12px] text-subtle">
              {phase === "waiting" ? "Nothing runs until you decide." : "Decided by you, just now."}
            </p>
          </div>
        </div>

        <div className="mx-3.5 mt-3 rounded-lg bg-surface-2 px-3 py-2 font-mono text-[12px] text-fg shadow-[inset_0_0_0_1px_var(--border)]">
          <span className="text-subtle">$ </span>npm test -- routes/projects
          {phase === "running" ? (
            <span className="mt-1 block text-subtle">
              <span className="mr-1.5 inline-block size-2.5 animate-spin rounded-full border-[1.5px] border-subtle/30 border-t-subtle align-[-1px] motion-reduce:animate-none" />
              running 2 tests
            </span>
          ) : phase === "passed" ? (
            <span className="mt-1 block text-add-fg">2 passed, 0 failed (0.4s)</span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-1.5 p-3.5">
          {settled ? (
            <button
              type="button"
              onClick={() => setPhase("waiting")}
              className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md bg-surface px-2.5 text-[12.5px] font-medium text-muted shadow-[0_0_0_1px_var(--border)] transition-colors hover:text-fg"
            >
              <ArrowCounterClockwise weight="bold" className="size-3.5" aria-hidden="true" />
              Replay
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={allow}
                disabled={phase !== "waiting"}
                className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md bg-fg px-2.5 text-[12.5px] font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Check weight="bold" className="size-3.5" aria-hidden="true" />
                Allow once
              </button>
              <button
                type="button"
                onClick={() => setPhase("rejected")}
                disabled={phase !== "waiting"}
                className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md bg-surface px-2.5 text-[12.5px] font-medium text-muted shadow-[0_0_0_1px_var(--border)] transition-colors hover:text-fg disabled:opacity-50"
              >
                <X weight="bold" className="size-3.5" aria-hidden="true" />
                Reject
              </button>
              <span aria-hidden="true" className="ml-auto hidden items-center gap-1 text-[11px] text-subtle xl:flex">
                <kbd className="rounded-[4px] bg-surface px-1 font-sans shadow-[0_0_0_1px_var(--border)]">A</kbd>
                allow
              </span>
            </>
          )}
        </div>
      </div>
      <p className="mt-2 text-[12px] text-subtle">Try it: this card works.</p>
    </div>
  );
}
