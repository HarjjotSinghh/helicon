import React from "react";
import { Icon } from "../icons.js";
import type { ApprovalRequestView } from "../types.js";

export interface ApprovalCardProps {
  approval: ApprovalRequestView;
  busy: boolean;
  onDecide: (choiceId: string, feedback: string | null) => void;
}

export function ApprovalCard(props: ApprovalCardProps): React.ReactElement {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState("");
  const chosen = props.approval.choices.find((c) => c.choiceId === selected) ?? null;
  const needsFeedback = props.approval.choices.some((c) => c.acceptsFeedback);
  return (
    <div className="rounded-xl border border-night-600 bg-night-900 px-4 py-3" role="alert">
      <p className="text-[13px] font-semibold">Approval needed</p>
      <p className="mt-0.5 text-[13px] text-ink-300">{props.approval.subject}</p>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {props.approval.choices.map((choice) => {
          const active = choice.choiceId === selected;
          return (
            <button
              key={choice.choiceId}
              disabled={props.busy}
              onClick={() => setSelected(choice.choiceId)}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] disabled:opacity-50 ${
                active ? "border-accent-500 bg-night-800" : "border-night-700 hover:border-night-600"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  active ? "border-accent-500 text-accent-400" : "border-night-600 text-transparent"
                }`}
              >
                <Icon name="check" size={10} />
              </span>
              {choice.label}
            </button>
          );
        })}
      </div>
      {needsFeedback && (
        <input
          className="mt-2 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-1.5 text-[13px] placeholder:text-ink-600 focus:outline-none"
          placeholder="Feedback for the model (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.currentTarget.value)}
        />
      )}
      <div className="mt-2.5 flex justify-end">
        <button
          className="rounded-lg bg-ink-100 px-4 py-1.5 text-[13px] font-semibold text-night-950 hover:brightness-110 disabled:opacity-40"
          disabled={props.busy || !chosen}
          onClick={() =>
            chosen && props.onDecide(chosen.choiceId, feedback.trim().length > 0 ? feedback : null)
          }
        >
          Continue
        </button>
      </div>
    </div>
  );
}
