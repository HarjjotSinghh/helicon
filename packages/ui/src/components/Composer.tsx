import React from "react";

export interface ComposerProps {
  disabled: boolean;
  working: boolean;
  onSend: (text: string) => void;
  onInterrupt: () => void;
}

export function Composer(props: ComposerProps): React.ReactElement {
  const [text, setText] = React.useState("");
  const send = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || props.disabled) {
      return;
    }
    props.onSend(trimmed);
    setText("");
  };
  return (
    <footer className="helicon-composer">
      <textarea
        placeholder={props.disabled ? "Select or start a session first" : "Describe the change"}
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
      {props.working ? (
        <button onClick={props.onInterrupt}>Stop</button>
      ) : (
        <button onClick={send} disabled={props.disabled}>
          Send
        </button>
      )}
    </footer>
  );
}
