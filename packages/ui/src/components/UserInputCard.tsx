import React from "react";
import type { UserInputPromptView } from "../types.js";
import type { UserInputAnswerItem } from "../client.js";

export interface UserInputCardProps {
  prompt: UserInputPromptView;
  busy: boolean;
  onAnswer: (answers: UserInputAnswerItem[]) => void;
}

export function UserInputCard(props: UserInputCardProps): React.ReactElement {
  const [free, setFree] = React.useState<Record<string, string>>({});
  const [picked, setPicked] = React.useState<Record<string, string[]>>({});
  const toggle = (questionId: string, label: string, multiple: boolean) => {
    setPicked((prev) => {
      const current = prev[questionId] ?? [];
      if (multiple) {
        return {
          ...prev,
          [questionId]: current.includes(label) ? current.filter((l) => l !== label) : [...current, label],
        };
      }
      return { ...prev, [questionId]: [label] };
    });
  };
  const answer = () => {
    props.onAnswer(
      props.prompt.questions.map((q) => {
        const selected = picked[q.questionId] ?? [];
        if (q.mode === "multiple") {
          return { questionId: q.questionId, selectedLabels: selected };
        }
        if (q.mode === "single" && q.options.length > 0) {
          return { questionId: q.questionId, selectedLabel: selected[0] ?? q.options[0] ?? "" };
        }
        return { questionId: q.questionId, freeText: free[q.questionId] ?? "" };
      }),
    );
  };
  return (
    <div className="rounded-xl border border-night-600 bg-night-900 px-4 py-3">
      <p className="text-[13px] font-semibold">Agent question</p>
      {props.prompt.questions.map((q) => (
        <div key={q.questionId} className="mt-2">
          <p className="text-[13px] text-ink-300">{q.prompt}</p>
          {q.options.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {q.options.map((option) => {
                const on = (picked[q.questionId] ?? []).includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => toggle(q.questionId, option, q.mode === "multiple")}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] ${
                      on ? "border-accent-500 bg-night-800" : "border-night-700 hover:border-night-600"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              className="mt-1.5 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-1.5 text-[13px] placeholder:text-ink-600 focus:outline-none"
              placeholder="Your answer"
              value={free[q.questionId] ?? ""}
              onChange={(e) => setFree((v) => ({ ...v, [q.questionId]: e.currentTarget.value }))}
            />
          )}
        </div>
      ))}
      <div className="mt-2.5 flex justify-end">
        <button
          className="rounded-lg bg-ink-100 px-4 py-1.5 text-[13px] font-semibold text-night-950 hover:brightness-110 disabled:opacity-40"
          disabled={props.busy}
          onClick={answer}
        >
          Answer
        </button>
      </div>
    </div>
  );
}
