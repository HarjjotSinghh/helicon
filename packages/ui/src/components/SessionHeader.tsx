import React from "react";
import { Icon } from "../icons.js";

export interface SessionHeaderProps {
  projectName: string;
  title: string;
  working: boolean;
  elapsed: string;
  modelLabel: string | null;
  onNewSession: () => void;
  onRefresh: () => void;
}

export function SessionHeader(props: SessionHeaderProps): React.ReactElement {
  return (
    <header className="flex items-center gap-2 border-b border-night-700 px-4 py-2.5">
      <span className="text-accent-400">
        <Icon name="folder" size={16} />
      </span>
      <span className="truncate text-[14px]">
        <span className="font-medium">{props.projectName}</span>
        <span className="mx-1.5 text-ink-600">/</span>
        <span className="text-ink-300">{props.title}</span>
      </span>
      {props.working && (
        <span className="ml-1 flex items-center gap-1.5 text-[12px] text-ink-500">
          <span className="text-accent-400 helicon-pulse">
            <Icon name="dot" size={11} />
          </span>
          Working for {props.elapsed}
        </span>
      )}
      <span className="ml-auto" />
      {props.modelLabel && (
        <span className="hidden rounded-md border border-night-700 px-2 py-0.5 text-[11px] text-ink-500 lg:inline">
          {props.modelLabel}
        </span>
      )}
      <button
        className="flex items-center gap-1.5 rounded-lg border border-night-600 px-2.5 py-1 text-[12px] font-medium hover:bg-night-800"
        onClick={props.onNewSession}
      >
        <Icon name="plus" size={13} /> New
      </button>
      <button
        className="rounded-lg border border-night-600 p-1.5 hover:bg-night-800"
        title="Refresh sessions"
        onClick={props.onRefresh}
      >
        <Icon name="refresh" size={13} />
      </button>
    </header>
  );
}

export function formatElapsed(sinceMs: number | null): string {
  if (!sinceMs) {
    return "0s";
  }
  const total = Math.max(0, Math.floor((Date.now() - sinceMs) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes < 1) {
    return `${seconds}s`;
  }
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
