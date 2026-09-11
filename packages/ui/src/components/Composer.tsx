import React from "react";
import { Icon } from "../icons.js";
import type { ApprovalMode } from "../types.js";

export interface ModelOption {
  modelId: string;
  displayLabel: string;
}

export interface ComposerProps {
  disabled: boolean;
  working: boolean;
  models: ModelOption[];
  modelId: string | null;
  mode: ApprovalMode;
  cwdLabel: string | null;
  onModelChange: (modelId: string) => void;
  onModeChange: (mode: ApprovalMode) => void;
  onSend: (text: string) => void;
  onInterrupt: () => void;
}

const MODES: { id: ApprovalMode; label: string }[] = [
  { id: "onRequest", label: "On request" },
  { id: "promptUnmatched", label: "Prompt unmatched" },
  { id: "denyUnmatched", label: "Deny unmatched" },
  { id: "allowAll", label: "Allow all" },
];

export function Composer(props: ComposerProps): React.ReactElement {
  const [text, setText] = React.useState("");
  const send = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || props.disabled || props.working) {
      return;
    }
    props.onSend(trimmed);
    setText("");
  };
  return (
    <div className="rounded-2xl border border-night-600 bg-night-900 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
      <textarea
        className="max-h-48 min-h-[56px] w-full resize-y bg-transparent px-4 pt-3.5 text-[14px] placeholder:text-ink-600 focus:outline-none"
        placeholder={
          props.disabled ? "Select or start a session first" : "Ask anything, @tag files/folders, $use skills, or / for commands"
        }
        value={text}
        disabled={props.disabled}
        onChange={(e) => setText(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <div className="flex items-center gap-1 px-2.5 pb-2.5">
        <select
          className="max-w-[190px] truncate rounded-md bg-transparent px-1.5 py-1 text-[12px] text-ink-300 hover:bg-night-800 focus:outline-none"
          title="Model"
          value={props.modelId ?? ""}
          disabled={props.models.length === 0}
          onChange={(e) => props.onModelChange(e.currentTarget.value)}
        >
          {props.models.length === 0 && <option value="">Model</option>}
          {props.models.map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.displayLabel}
            </option>
          ))}
        </select>
        <select
          className="rounded-md bg-transparent px-1.5 py-1 text-[12px] text-ink-300 hover:bg-night-800 focus:outline-none"
          title="Approval mode for new sessions"
          value={props.mode}
          onChange={(e) => props.onModeChange(e.currentTarget.value as ApprovalMode)}
        >
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <span
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] text-ink-300"
          title="Approvals still gate tool calls"
        >
          <Icon name="lock" size={13} /> Full access
        </span>
        <span className="ml-auto" />
        <button
          className="rounded-md p-2 text-ink-500 hover:bg-night-800 hover:text-ink-100"
          title={props.cwdLabel ? `Attach ${props.cwdLabel}` : "Attach project folder"}
          disabled={!props.cwdLabel}
          onClick={() =>
            props.cwdLabel &&
            setText((t) => `${t.length === 0 || t.endsWith(" ") ? t : `${t} `}@${props.cwdLabel} `)
          }
        >
          <Icon name="clip" size={15} />
        </button>
        {props.working ? (
          <button
            className="rounded-full bg-danger-500 p-2.5 text-white hover:brightness-110"
            title="Stop the running turn"
            onClick={props.onInterrupt}
          >
            <Icon name="stop" size={14} />
          </button>
        ) : (
          <button
            className="rounded-full bg-night-700 p-2.5 text-ink-300 hover:bg-night-600 disabled:opacity-40"
            title="Send"
            disabled={props.disabled || text.trim().length === 0}
            onClick={send}
          >
            <Icon name="send" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
