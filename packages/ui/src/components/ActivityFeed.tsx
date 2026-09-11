import React from "react";
import { Icon } from "../icons.js";
import type { TranscriptItem } from "../types.js";

export interface ActivityEntry {
  key: string;
  role: "user" | "agent" | "tool" | "command";
  title: string;
  body: string;
  live: boolean;
}

export function toActivityEntries(items: TranscriptItem[]): ActivityEntry[] {
  return items.map((item) => {
    const kind = item.kind.toLowerCase();
    if (kind.includes("tool")) {
      return { key: item.itemId, role: "tool", title: item.kind, body: item.text, live: item.status === "running" };
    }
    if (kind.includes("command") || kind.includes("exec") || kind.includes("shell")) {
      return { key: item.itemId, role: "command", title: item.kind, body: item.text, live: item.status === "running" };
    }
    if (kind.includes("user")) {
      return { key: item.itemId, role: "user", title: "You", body: item.text, live: false };
    }
    return { key: item.itemId, role: "agent", title: "", body: item.text, live: item.status === "running" };
  });
}

export function ActivityFeed(props: { entries: ActivityEntry[] }): React.ReactElement {
  if (props.entries.length === 0) {
    return <p className="px-1 py-8 text-center text-[13px] text-ink-500">Nothing here yet. Ask below to start.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {props.entries.map((entry) => {
        if (entry.role === "user") {
          return (
            <div key={entry.key} className="rounded-xl border border-night-700 bg-night-900 px-4 py-3">
              <p className="whitespace-pre-wrap text-[13.5px]">{entry.body}</p>
            </div>
          );
        }
        if (entry.role === "tool" || entry.role === "command") {
          return (
            <div key={entry.key} className="flex items-start gap-2.5 text-[13px]">
              <span className="mt-0.5 shrink-0 rounded-md border border-night-700 bg-night-900 p-1 text-ink-500">
                <Icon name={entry.role === "tool" ? "terminal" : "chevron-right"} size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-300">{entry.title}</p>
                {entry.body && (
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-night-950 p-2.5 font-mono text-[12px] text-ink-500">
                    {entry.body}
                  </pre>
                )}
              </div>
            </div>
          );
        }
        return (
          <div key={entry.key} className="text-[13.5px] leading-relaxed">
            <p className="whitespace-pre-wrap">{entry.body}</p>
            {entry.live && <span className="text-accent-400 helicon-pulse">...</span>}
          </div>
        );
      })}
    </div>
  );
}
