import React from "react";
import type { EnvironmentStatus } from "../types.js";

export interface OnboardingProps {
  status: EnvironmentStatus;
  onRetry: () => void;
}

export function Onboarding(props: OnboardingProps): React.ReactElement {
  const s = props.status;
  const cliOk = s.museFound;
  const wslOk = s.platform !== "win32" || s.wslAvailable;
  return (
    <div className="helicon-onboarding">
      <h2>Welcome to Helicon (Unofficial)</h2>
      <p>Not made, endorsed, or supported by Meta. It drives your own Muse login.</p>
      <ol>
        <li>
          {wslOk ? "[ok]" : "[missing]"} Windows route:{" "}
          {s.platform === "win32"
            ? s.wslAvailable
              ? `WSL2 ready (default: ${s.defaultDistro ?? "none"})`
              : "WSL2 not found. Run wsl --install, add Ubuntu, then retry."
            : "Not needed on this OS."}
        </li>
        <li>
          {cliOk ? "[ok]" : "[missing]"} Muse CLI:{" "}
          {cliOk
            ? `found (${s.musePath})`
            : "not found. Install it, then run muse login once."}
        </li>
        <li>[...] Open a project folder to start your first session.</li>
      </ol>
      <button onClick={props.onRetry}>Check again</button>
    </div>
  );
}
