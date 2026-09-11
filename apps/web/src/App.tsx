import React from "react";
import {
  ApprovalCard,
  Composer,
  Onboarding,
  Sidebar,
  SessionView,
  applyDelta,
  applyFinal,
  emptyFold,
  orderedItems,
  type ApprovalMode,
  type ApprovalRequestView,
  type EnvironmentStatus,
  type ProjectView,
  type SessionViewData as SessionInfo,
  type TranscriptItem,
  type UserInputPromptView,
} from "@helicon/ui";
import { WebHeliconClient } from "./webClient.js";

const client = new WebHeliconClient();

const CONTRIBUTOR_HINT =
  "Contributor-tier models may use your prompts and outputs to improve Meta products. Use Standard for sensitive code.";

export function App(): React.ReactElement {
  const [env, setEnv] = React.useState<EnvironmentStatus | null>(null);
  const [projects, setProjects] = React.useState<ProjectView[]>([]);
  const [sessionsByCwd, setSessionsByCwd] = React.useState<Record<string, SessionInfo[]>>({});
  const [active, setActive] = React.useState<SessionInfo | null>(null);
  const [items, setItems] = React.useState<TranscriptItem[]>([]);
  const [fold, setFold] = React.useState(emptyFold);
  const [working, setWorking] = React.useState(false);
  const [lastTurnId, setLastTurnId] = React.useState<string | null>(null);
  const [approvals, setApprovals] = React.useState<ApprovalRequestView[]>([]);
  const [pendingInput, setPendingInput] = React.useState<UserInputPromptView | null>(null);
  const [search, setSearch] = React.useState("");
  const [folder, setFolder] = React.useState("");
  const [mode, setMode] = React.useState<ApprovalMode>("onRequest");
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const list = await client.listProjects();
    setProjects(list);
    const grouped: Record<string, SessionInfo[]> = {};
    for (const project of list) {
      grouped[project.cwd] = await client.listSessions(project.cwd);
    }
    setSessionsByCwd(grouped);
  }, []);

  React.useEffect(() => {
    client
      .probeEnvironment()
      .then((status) => {
        setEnv(status);
        if (status.museFound) {
          void refresh().catch((e) => setError(String(e)));
        }
      })
      .catch((e) => setError(String(e)));
    client.onEvent((event) => {
      if (event.type === "delta" || event.type === "item-final") {
        setFold((prev) =>
          event.type === "delta"
            ? applyDelta(prev, event.itemId, event.kind, event.text)
            : applyFinal(prev, event.itemId, event.kind, event.text),
        );
        if (event.type === "item-final") {
          setWorking(false);
        }
      } else if (event.type === "turn-terminal") {
        setWorking(false);
        if (event.turnId) {
          setLastTurnId(event.turnId);
        }
      } else if (event.type === "approval") {
        setApprovals((prev) => [...prev.filter((a) => a.approvalId !== event.approval.approvalId), event.approval]);
      } else if (event.type === "approval-resolved") {
        setApprovals((prev) => prev.filter((a) => a.approvalId !== event.approvalId));
      } else if (event.type === "user-input") {
        setPendingInput(event.prompt);
      } else if (event.type === "sessions-changed") {
        void refresh().catch(() => {});
      }
    });
  }, [refresh]);

  React.useEffect(() => {
    setItems(orderedItems(fold));
  }, [fold]);

  if (!env) {
    return <p>Loading Helicon...</p>;
  }
  if (!env.museFound) {
    return <Onboarding status={env} onRetry={() => window.location.reload()} />;
  }

  const selectSession = async (session: SessionInfo) => {
    setActive(session);
    setFold(emptyFold());
    setApprovals([]);
    setPendingInput(null);
    try {
      await client.resumeSession(session.sessionId);
    } catch (e) {
      setError(String(e));
    }
  };

  const newSession = async (cwd: string) => {
    try {
      const session = await client.startSession(cwd, mode);
      await refresh();
      await selectSession(session);
    } catch (e) {
      setError(String(e));
    }
  };

  const addFolder = async () => {
    const cwd = folder.trim();
    if (!cwd) {
      return;
    }
    try {
      await client.discover(cwd);
      setFolder("");
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const send = async (text: string) => {
    if (!active) {
      return;
    }
    try {
      setWorking(true);
      const ack = await client.sendTurn(active.sessionId, text);
      if (ack.turnId) {
        setLastTurnId(ack.turnId);
      }
    } catch (e) {
      setWorking(false);
      setError(String(e));
    }
  };

  const stop = async () => {
    if (!active) {
      return;
    }
    try {
      await client.interruptTurn(active.sessionId, lastTurnId ?? undefined);
    } catch (e) {
      setError(String(e));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="helicon-app">
      <Sidebar
        projects={projects}
        sessionsByCwd={sessionsByCwd}
        activeSessionId={active?.sessionId ?? null}
        search={search}
        onSearchChange={setSearch}
        onSelectSession={(s) => void selectSession(s)}
        onNewSession={(cwd) => void newSession(cwd)}
        onTogglePin={(cwd, pinned) => void client.setPinned(cwd, pinned).then(refresh).catch((e) => setError(String(e)))}
        onOpenFolder={(cwd) => void client.discover(cwd).then(refresh).catch((e) => setError(String(e)))}
      />
      <div className="helicon-main">
        <div className="helicon-toolbar">
          <input
            placeholder="Add folder by path, then Enter"
            value={folder}
            onChange={(e) => setFolder(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void addFolder();
              }
            }}
          />
          <label>
            Approval mode
            <select value={mode} onChange={(e) => setMode(e.currentTarget.value as ApprovalMode)}>
              <option value="onRequest">onRequest</option>
              <option value="promptUnmatched">promptUnmatched</option>
              <option value="denyUnmatched">denyUnmatched</option>
              <option value="allowAll">allowAll</option>
            </select>
          </label>
          <span className="helicon-hint" title={CONTRIBUTOR_HINT}>
            {CONTRIBUTOR_HINT}
          </span>
        </div>
        {error && <p className="helicon-error">{error}</p>}
        {approvals.map((approval) => (
          <ApprovalCard
            key={approval.approvalId}
            approval={approval}
            busy={false}
            onDecide={(choiceId, feedback) =>
              void client
                .decideApproval(approval.sessionId, approval.approvalId, approval.requirementId, choiceId, feedback)
                .catch((e) => setError(String(e)))
            }
          />
        ))}
        {pendingInput && (
          <div className="helicon-input-prompt">
            <strong>Agent question</strong>
            {pendingInput.questions.map((q) => (
              <p key={q.questionId}>{q.prompt}</p>
            ))}
            <FreeTextAnswer
              prompt={pendingInput}
              onAnswer={(answers) =>
                void client
                  .answerUserInput(pendingInput.sessionId, pendingInput.userInputId, answers)
                  .then(() => setPendingInput(null))
                  .catch((e) => setError(String(e)))
              }
            />
          </div>
        )}
        {active ? (
          <>
            <SessionView title={active.title} working={working} items={items} onInterrupt={() => void stop()} />
            <Composer disabled={false} working={working} onSend={(t) => void send(t)} onInterrupt={() => void stop()} />
          </>
        ) : (
          <p className="helicon-empty">Pick a session or start a new one.</p>
        )}
      </div>
    </div>
  );
}

function FreeTextAnswer(props: {
  prompt: UserInputPromptView;
  onAnswer: (answers: { questionId: string; freeText: string }[]) => void;
}): React.ReactElement {
  const [values, setValues] = React.useState<Record<string, string>>({});
  return (
    <div>
      {props.prompt.questions.map((q) => (
        <input
          key={q.questionId}
          placeholder={q.prompt || "Your answer"}
          value={values[q.questionId] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [q.questionId]: e.currentTarget.value }))}
        />
      ))}
      <button
        onClick={() =>
          props.onAnswer(props.prompt.questions.map((q) => ({ questionId: q.questionId, freeText: values[q.questionId] ?? "" })))
        }
      >
        Answer
      </button>
    </div>
  );
}
