import React from "react";
import { Icon } from "../icons.js";

export interface StatusBarProps {
  folderName: string | null;
  detail: string | null;
  modelLabel: string | null;
  turnCount: number | null;
}

export function StatusBar(props: StatusBarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-night-700 bg-night-900 px-3 py-1.5 text-[12px] text-ink-500">
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon name="folder" size={13} />
        <span className="truncate">{props.folderName ?? "No folder"}</span>
      </span>
      {props.detail && <span className="truncate">{props.detail}</span>}
      <span className="ml-auto shrink-0">{props.modelLabel ?? ""}</span>
      {props.turnCount !== null && (
        <span className="shrink-0 text-accent-400">
          {props.turnCount} turn{props.turnCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
