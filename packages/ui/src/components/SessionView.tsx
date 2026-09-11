import React from "react";
import type { TranscriptItem } from "../types.js";

export interface SessionViewProps {
  title: string;
  working: boolean;
  items: TranscriptItem[];
  onInterrupt: () => void;
}

export function SessionView(props: SessionViewProps): React.ReactElement {
  return (
    <main className="helicon-session-view">
      <header className="helicon-session-head">
        <h2>{props.title}</h2>
        {props.working && <button onClick={props.onInterrupt}>Stop</button>}
      </header>
      <div className="helicon-transcript">
        {props.items.map((item) => (
          <article key={item.itemId} className={`helicon-item helicon-${item.kind}`}>
            <pre>{item.text}</pre>
            {item.status === "running" && <span className="helicon-live">...</span>}
          </article>
        ))}
        {props.items.length === 0 && (
          <p className="helicon-empty">Send a prompt below to start working.</p>
        )}
      </div>
    </main>
  );
}
