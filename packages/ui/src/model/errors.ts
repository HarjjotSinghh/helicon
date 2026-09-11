/**
 * Failures that leave a thread stuck rather than merely failing once. Each turn sends the whole thread, so a
 * piece of history the provider will not take fails every later turn the same way, however many times it is
 * retried. Compacting summarizes the history and drops the part that cannot be sent.
 */
export type StuckKind = "image" | "reasoning";

export interface StuckThread {
  kind: StuckKind;
  /** Said in place of the provider's own wording, which explains nothing about what to do. */
  message: string;
}

const PATTERNS: { kind: StuckKind; test: RegExp; message: string }[] = [
  {
    kind: "image",
    test: /invalid image data at input\[|payload could not be decoded/i,
    message:
      "An image earlier in this thread is unreadable to the model. Every turn sends the whole thread, so the next one fails the same way. Compacting summarizes what happened and leaves the image behind.",
  },
  {
    kind: "reasoning",
    test: /provider-private history is incompatible|reasoning replay .* has no provider attribution/i,
    message:
      "This thread's stored reasoning belongs to the provider it ran on before, and cannot be replayed after the switch. Compacting summarizes what happened and leaves that reasoning behind.",
  },
];

/** What is wrong with this thread's history, when a failure says a later turn cannot succeed either. */
export function stuckThread(message: string | null | undefined): StuckThread | null {
  const text = message ?? "";
  const found = text ? PATTERNS.find((pattern) => pattern.test.test(text)) : undefined;
  return found ? { kind: found.kind, message: found.message } : null;
}
