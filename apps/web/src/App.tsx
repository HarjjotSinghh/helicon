import React from "react";
import {
  ActivityFeed,
  ApprovalCard,
  Composer,
  Onboarding,
  SessionHeader,
  Sidebar,
  StatusBar,
  UserInputCard,
  applyDelta,
  applyFinal,
  emptyFold,
  formatElapsed,
  orderedItems,
  toActivityEntries,
  type ApprovalMode,
  type ApprovalRequestView,
  type EnvironmentStatus,
  type ModelOption,
  type ProjectView,
  type SessionView as SessionInfo,
  type TranscriptItem,
  type UserInputPromptView,
} from "@helicon/ui";
import { WebHeliconClient } from "./webClient.js";

const client = new WebHeliconClient();

function shortCwd(cwd: string): string {
  const trimmed = cwd.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}

function modelsFromServer(value: unknown): ModelOption[] {
  const root = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const list = Array.isArray(root["models"]) ? root["models"] : [];
  const options: ModelOption[] = [];
  for (const entry of list) {
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const modelId = typeof record["modelId"] === "string" ? record["modelId"] : null;
      if (modelId) {
        options.push({
          modelId,
          displayLabel: typeof record["displayLabel"] === "string" ? record["displayLabel"] : modelId,
        });
      }
    }
  }
  return options;
}

export function App(): React.ReactElement {
  const [env, setEnv] = React.useState<EnvironmentStatus | null>(null);
  const [projects, setProjects] = React.useState<ProjectView[]>([]);
  const [sessionsByCwd, setSessionsByCwd] = React.useState<Record<string, SessionInfo[]>>({});
  const [active, setActive] = React.useState<SessionInfo | null>(null);
  const [items, setItems] = React.useState<TranscriptItem[]>([]);
  const [fold, setFold] = React.useState(emptyFold);
  const [working, setWorking] = React.useState(false);
  const [workingIds, setWorkingIds] = React.useState<string[]>([]);
  const [turnStartedAt, setTurnStartedAt] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(Date.now());
  const [lastTurnId, setLastTurnId] = React.useState<string | null>(null);
  const [approvals, setApprovals] = React.useState<ApprovalRequestView[]>([]);
  const [deciding, setDeciding] = React.useState<string | null>(null);
  const [pendingInput, setPendingInput] = React.useState<UserInputPromptView | null>(null);
  const [answering, setAnswering] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [folder, setFolder] = React.useState("");
  const [mode, setMode] = React.useState<ApprovalMode>("onRequest");
  const [models, setModels] = React.useState<ModelOption[]>([]);
  const [modelId, setModelId] = React.useState<string | null>(null);
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
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
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
          setTurnStartedAt(null);
        }
      } else if (event.type === "turn-terminal") {
        setWorking(false);
        setTurnStartedAt(null);
        setWorkingIds((ids) => ids.filter((id) => id !== event.sessionId));
        if (event.turnId) {
          setLastTurnId(event.turnId);
        }
        void refresh().catch(() => {});
      } else if (event.type === "approval") {
        setApprovals((prev) => [...prev.filter((a) => a.approvalId !== event.approval.approvalId), event.approval]);
      } else if (event.type === "approval-resolved") {
        setApprovals((prev) => prev.filter((a) => a.approvalId !== event.approvalId));
        setDeciding(null);
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
    return (
      <div className="flex h-full items-center justify-center bg-night-950 text-[13px] text-ink-500">
        Loading Helicon...
      </div>
    );
  }
  if (!env.museFound) {
    return (
      <div className="h-full bg-night-950">
        <Onboarding
          status={env}
          folder={folder}
          onFolderChange={setFolder}
          onAddFolder={() => void addFolder()}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  async function addFolder() {
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
  }

  async function selectSession(session: SessionInfo) {
    setActive(session);
    setFold(emptyFold());
    setApprovals([]);
    setPendingInput(null);
    setWorkingIds((ids) => (ids.includes(session.sessionId) ? ids : [...ids, session.sessionId]));
    try {
      await client.resumeSession(session.sessionId);
      const catalog = await client.listModels(session.sessionId);
      const options = modelsFromServer(catalog);
      if (options.length > 0) {
        setModels(options);
        setModelId((current) => current ?? session.modelId ?? options[0]?.modelId ?? null);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setWorkingIds((ids) => ids.filter((id) => id !== session.sessionId));
    }
  }

  async function newSession(cwd: string) {
    try {
      const session = await client.startSession(cwd, mode, modelId ?? undefined);
      await refresh();
      await selectSession(session);
    } catch (e) {
      setError(String(e));
    }
  }

  async function send(text: string) {
    if (!active) {
      return;
    }
    try {
      setWorking(true);
      setTurnStartedAt(Date.now());
      setWorkingIds((ids) => (ids.includes(active.sessionId) ? ids : [...ids, active.sessionId]));
      setFold((prev) => applyDelta(prev, `user-${Date.now()}`, "user", text));
      const ack = await client.sendTurn(active.sessionId, text);
      if (ack.turnId) {
        setLastTurnId(ack.turnId);
      }
    } catch (e) {
      setWorking(false);
      setTurnStartedAt(null);
      setError(String(e));
    }
  }

  async function stop() {
    if (!active) {
      return;
    }
    try {
      await client.interruptTurn(active.sessionId, lastTurnId ?? undefined);
    } catch (e) {
      setError(String(e));
    } finally {
      setWorking(false);
      setTurnStartedAt(null);
    }
  }

  const entries = toActivityEntries(items);
  const elapsed = formatElapsed(turnStartedAt);
  void now;

  return (
    <div className="flex h-full bg-night-950 text-ink-100">
      <Sidebar
        projects={projects}
        sessionsByCwd={sessionsByCwd}
        activeSessionId={active?.sessionId ?? null}
        workingSessionIds={working ? (active ? [active.sessionId] : []) : workingIds}
        search={search}
        onSearchChange={setSearch}
        onSelectSession={(s) => void selectSession(s)}
        onNewSession={(cwd) => void newSession(cwd)}
        onTogglePin={(cwd, pinned) => void client.setPinned(cwd, pinned).then(refresh).catch((e) => setError(String(e)))}
        onRefreshProject={(cwd) => void client.discover(cwd).then(refresh).catch((e) => setError(String(e)))}
        onOpenSettings={() => setError("Settings live in a next pass. Approval mode and model pickers sit in the composer below.")}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <SessionHeader
              projectName={shortCwd(active.cwd)}
              title={active.title}
              working={working}
              elapsed={elapsed}
              modelLabel={modelId}
              onNewSession={() => void newSession(active.cwd)}
              onRefresh={() => void refresh().catch((e) => setError(String(e)))}
            />
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {error && (
                  <p className="rounded-lg border border-danger-500/40 bg-danger-500/10 px-3 py-2 text-[13px]">
                    {error}
                  </p>
                )}
                {approvals
                  .filter((a) => a.sessionId === active.sessionId)
                  .map((approval) => (
                    <ApprovalCard
                      key={approval.approvalId}
                      approval={approval}
                      busy={deciding === approval.approvalId}
                      onDecide={(choiceId, feedback) => {
                        setDeciding(approval.approvalId);
                        void client
                          .decideApproval(approval.sessionId, approval.approvalId, approval.requirementId, choiceId, feedback)
                          .catch((e) => {
                            setDeciding(null);
                            setError(String(e));
                          });
                      }}
                    />
                  ))}
                {pendingInput && pendingInput.sessionId === active.sessionId && (
                  <UserInputCard
                    prompt={pendingInput}
                    busy={answering}
                    onAnswer={(answers) => {
                      setAnswering(true);
                      void client
                        .answerUserInput(pendingInput.sessionId, pendingInput.userInputId, answers)
                        .then(() => {
                          setPendingInput(null);
                          setAnswering(false);
                        })
                        .catch((e) => {
                          setAnswering(false);
                          setError(String(e));
                        });
                    }}
                  />
                )}
                <ActivityFeed entries={entries} />
              </div>
            </div>
            <div className="px-6 pb-2">
              <div className="mx-auto flex max-w-3xl flex-col gap-2">
                <Composer
                  disabled={false}
                  working={working}
                  models={models}
                  modelId={modelId}
                  mode={mode}
                  cwdLabel={active.cwd ? shortCwd(active.cwd) : null}
                  onModelChange={(id) => {
                    setModelId(id);
                    void client
                      .setSessionModel(active.sessionId, { modelId: id })
                      .catch((e) => setError(String(e)));
                  }}
                  onModeChange={setMode}
                  onSend={(t) => void send(t)}
                  onInterrupt={() => void stop()}
                />
                <StatusBar
                  folderName={active.cwd ? shortCwd(active.cwd) : null}
                  detail={active.origin === "tui" ? " resumed from terminal" : null}
                  modelLabel={modelId}
                  turnCount={active.turnCount}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-[15px] font-medium">Pick a session or start a new one.</p>
            <div className="flex w-full max-w-md gap-2">
              <input
                className="flex-1 rounded-xl border border-night-600 bg-night-900 px-3.5 py-2.5 text-[13px] placeholder:text-ink-600 focus:outline-none"
                placeholder="Add folder by path, then Enter"
                value={folder}
                onChange={(e) => setFolder(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void addFolder();
                  }
                }}
              />
              <button
                className="rounded-xl bg-ink-100 px-4 text-[13px] font-semibold text-night-950 hover:brightness-110 disabled:opacity-40"
                disabled={folder.trim().length === 0}
                onClick={() => void addFolder()}
              >
                Add
              </button>
            </div>
            {error && <p className="text-[13px] text-danger-500">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
