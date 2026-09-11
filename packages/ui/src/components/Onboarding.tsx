import React from "react";
import type { EnvironmentStatus } from "../types.js";
import { Icon, Logo } from "../icons.js";

export interface OnboardingProps {
  status: EnvironmentStatus;
  folder: string;
  onFolderChange: (value: string) => void;
  onAddFolder: () => void;
  onRetry: () => void;
}

export function Onboarding(props: OnboardingProps): React.ReactElement {
  const s = props.status;
  const wslOk = s.platform !== "win32" || s.wslAvailable;
  const ready = wslOk && s.museFound;
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo size={44} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Welcome to Helicon</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Unofficial client for the Muse Code CLI. Not made, endorsed, or supported by Meta.
        </p>
      </div>
      <ol className="w-full rounded-xl border border-night-700 bg-night-900 p-4 text-left text-[13px]">
        <li className="flex items-center gap-2.5 py-1.5">
          <Step ok={wslOk} />
          <span>
            {s.platform === "win32"
              ? s.wslAvailable
                ? `WSL2 ready (default: ${s.defaultDistro ?? "none"})`
                : "WSL2 not found. Run wsl --install with Ubuntu, then check again."
              : "Native OS route ready."}
          </span>
        </li>
        <li className="flex items-center gap-2.5 border-t border-night-700 py-1.5">
          <Step ok={s.museFound} />
          <span>
            {s.museFound
              ? `Muse CLI found (${s.musePath})`
              : "Muse CLI not found. Install it, then run muse login once."}
          </span>
        </li>
        <li className="flex items-center gap-2.5 border-t border-night-700 py-1.5">
          <Step ok={false} pending />
          <span>Add a project folder below to start your first session.</span>
        </li>
      </ol>
      <div className="flex w-full gap-2">
        <input
          className="flex-1 rounded-xl border border-night-600 bg-night-900 px-3.5 py-2.5 text-[13px] placeholder:text-ink-600 focus:outline-none"
          placeholder="Project folder path, then Enter"
          value={props.folder}
          onChange={(e) => props.onFolderChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              props.onAddFolder();
            }
          }}
        />
        <button
          className="rounded-xl bg-ink-100 px-4 text-[13px] font-semibold text-night-950 hover:brightness-110 disabled:opacity-40"
          disabled={!ready || props.folder.trim().length === 0}
          onClick={props.onAddFolder}
        >
          Add
        </button>
      </div>
      {!ready && (
        <button className="text-[13px] text-accent-400 hover:underline" onClick={props.onRetry}>
          Check again
        </button>
      )}
    </div>
  );
}

function Step(props: { ok: boolean; pending?: boolean }): React.ReactElement {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
        props.ok ? "border-ok-500 text-ok-500" : props.pending ? "border-night-600" : "border-danger-500 text-danger-500"
      }`}
    >
      {props.ok ? (
        <Icon name="check" size={11} />
      ) : props.pending ? (
        <Icon name="dot" size={8} className="text-ink-600" />
      ) : (
        <Icon name="x" size={11} />
      )}
    </span>
  );
}
