import React from "react";
import type { ApprovalRequestView } from "../types.js";

export interface ApprovalCardProps {
  approval: ApprovalRequestView;
  busy: boolean;
  onDecide: (choiceId: string, feedback: string | null) => void;
}

export function ApprovalCard(props: ApprovalCardProps): React.ReactElement {
  const [feedback, setFeedback] = React.useState("");
  const needsFeedback = props.approval.choices.some((c) => c.acceptsFeedback);
  return (
    <div className="helicon-approval" role="alert">
      <strong>Approval needed</strong>
      <p>{props.approval.subject}</p>
      {needsFeedback && (
        <input
          placeholder="Feedback for the model (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.currentTarget.value)}
        />
      )}
      <div className="helicon-approval-actions">
        {props.approval.choices.map((choice) => (
          <button
            key={choice.choiceId}
            disabled={props.busy}
            onClick={() =>
              props.onDecide(choice.choiceId, feedback.trim().length > 0 ? feedback : null)
            }
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
