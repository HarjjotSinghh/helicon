"use client";

import { ArrowCounterClockwise, ArrowRight, DownloadSimple, FilmReel, Pause, Play } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { DemoApp } from "@/demo/demo-app";
import { ReplayClient, runDuration, type Recording, type ReplayState } from "@/demo/replay";
import { trackEvent } from "@/lib/client-analytics";
import { installerPath } from "@/lib/downloads";
import type { VisitorOs } from "@/lib/os";
import { REPO_URL } from "@/lib/site";
import { Rule, SectionHeading, WindowFrame, bandX, buttonClass, cn } from "./ui";

type TaskId = "paginate-users" | "fix-failing-test" | "readme-oneliner";

const TASKS: { id: TaskId; title: string; repo: string; words: RegExp; load: () => Promise<{ default: unknown }> }[] = [
  {
    id: "paginate-users",
    title: "Add pagination to an API endpoint",
    repo: "api-server",
    words: /pagin|page|limit|api|endpoint|route|server|query/i,
    load: () => import("@/demo/recordings/paginate-users.json"),
  },
  {
    id: "fix-failing-test",
    title: "Fix a failing test",
    repo: "slugify",
    words: /test|fail|bug|fix|broken|error|crash/i,
    load: () => import("@/demo/recordings/fix-failing-test.json"),
  },
  {
    id: "readme-oneliner",
    title: "Write a README one-liner",
    repo: "readme-demo",
    words: /readme|doc|description|explain|summar|comment/i,
    load: () => import("@/demo/recordings/readme-oneliner.json"),
  },
];

/** Gap between steps while "Play all" runs. */
const PLAY_MS = 1100;

function closestTask(text: string): (typeof TASKS)[number] {
  return TASKS.find((t) => t.words.test(text)) ?? TASKS[1];
}

function formatRun(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} seconds`;
  const rest = seconds % 60;
  return rest ? `${Math.floor(seconds / 60)} min ${rest} s` : `${seconds / 60} min`;
}

function download(os: VisitorOs): { label: string; href: string } {
  if (os === "windows") return { label: "Download for Windows", href: installerPath("windows", "replay") };
  if (os === "macos") return { label: "Download for macOS", href: installerPath("macos", "replay") };
  if (os === "linux") return { label: "Download for Linux", href: "/download?src=replay" };
  return { label: "Download Helicon", href: "/download?src=replay" };
}

type Session = { task: (typeof TASKS)[number]; client: ReplayClient; startedAt: number; duration: number };

function openSession(task: (typeof TASKS)[number], recording: Recording): Session {
  return { task, client: new ReplayClient(recording), startedAt: Date.now(), duration: runDuration(recording) };
}

export function ReplayDemo({ os }: { os: VisitorOs }) {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<ReplayState | null>(null);
  const [playing, setPlaying] = useState(false);
  const [typed, setTyped] = useState("");
  const [closest, setClosest] = useState<string | null>(null);
  const loading = useRef(0);
  const completed = useRef(false);
  const cta = download(os);

  async function start(task: (typeof TASKS)[number], source: "card" | "typed") {
    const ticket = ++loading.current;
    const recording = (await task.load()).default as Recording;
    if (ticket !== loading.current) return;
    session?.client.dispose();
    const next = openSession(task, recording);
    completed.current = false;
    setPlaying(false);
    setState(next.client.state());
    setSession(next);
    trackEvent("demo_start", { task: task.id, source });
  }

  useEffect(() => {
    if (!session) return;
    const { client, task, startedAt } = session;
    const stop = client.onChange((next) => {
      setState(next);
      if (next.done && !completed.current) {
        completed.current = true;
        setPlaying(false);
        trackEvent("demo_complete", { task: task.id, steps: next.total, seconds: Math.round((Date.now() - startedAt) / 1000) });
      }
    });
    return () => {
      stop();
    };
  }, [session]);

  useEffect(() => () => session?.client.dispose(), [session]);

  useEffect(() => {
    if (!playing || !session) return;
    const timer = setInterval(() => session.client.next(), PLAY_MS);
    return () => clearInterval(timer);
  }, [playing, session]);

  // Approving in the window is the visitor's step, so it counts like a click on "Next step".
  const wasWaiting = useRef(false);
  useEffect(() => {
    if (!session || !state) return;
    if (wasWaiting.current && !state.waiting && !state.denied) trackEvent("demo_approve", { task: session.task.id });
    wasWaiting.current = state.waiting;
  }, [session, state]);

  function next() {
    if (!session) return;
    setPlaying(false);
    session.client.next();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" || !session) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, [contenteditable='true'], [role='dialog']")) return;
    event.preventDefault();
    next();
  }

  function onTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = typed.trim();
    if (!text) return;
    const task = closestTask(text);
    setClosest(task.title);
    void start(task, "typed");
  }

  function toCta(kind: "download" | "another" | "sample") {
    if (!session) return;
    trackEvent("demo_to_cta", { task: session.task.id, cta: kind, completed: Boolean(state?.done) }, kind === "download" ? { beacon: true } : undefined);
  }

  const step = session && state ? session.client.steps[state.played - 1] : null;
  const sampleUrl = session ? `${REPO_URL}/tree/prod/landing/scripts/demo-fixtures/${session.task.repo}` : REPO_URL;
  const route = useMemo(() => (session ? `#/t/${session.client.sessionId}` : ""), [session]);

  return (
    // tabIndex -1: a click on blank space inside the section keeps focus here, so the arrow key still steps.
    <section id="replay" aria-labelledby="replay-title" onKeyDown={onKeyDown} tabIndex={-1} className="outline-none">
      <div data-reveal="rise" className={`${bandX} pt-14 sm:pt-20`}>
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-[12.5px] font-medium text-accent-text">
          Replay of a real run, sped up
        </span>
        <SectionHeading id="replay-title" icon={<FilmReel weight="duotone" />} title="Watch Muse Code fix a real bug">
          I recorded these runs on a public sample repo. Pick a task, step through each tool call, approve the edit and
          watch the diff land. Nothing runs on your machine.
        </SectionHeading>
      </div>

      <div className={`${bandX} mt-10 grid gap-3 sm:grid-cols-3`} data-stagger="40" data-base="100">
        {TASKS.map((task) => {
          const selected = session?.task.id === task.id;
          return (
            <button
              key={task.id}
              type="button"
              data-reveal
              aria-pressed={selected}
              onClick={() => {
                setClosest(null);
                void start(task, "card");
              }}
              className={cn(
                "flex min-h-[76px] flex-col items-start justify-between gap-2 rounded-xl px-4 py-3.5 text-left transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.985]",
                selected ? "bg-btn text-btn-fg shadow-[0_1px_2px_rgb(10_60_130/0.25)]" : "bg-surface text-fg shadow-soft hover:shadow-[0_0_0_1px_var(--border-strong)]",
              )}
            >
              <span className="text-[15px] leading-snug font-medium">{task.title}</span>
              <span className={cn("font-mono text-[12px]", selected ? "text-btn-fg/75" : "text-subtle")}>{task.repo}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={onTyped} className={`${bandX} mt-3 flex gap-2`}>
        <label htmlFor="replay-typed" className="sr-only">
          Or describe a task
        </label>
        <input
          id="replay-typed"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Or type a task, like: my tests are failing"
          maxLength={200}
          className="h-11 min-w-0 flex-1 rounded-[10px] bg-surface px-3.5 text-[15px] text-fg shadow-soft outline-none placeholder:text-subtle focus-visible:shadow-[0_0_0_2px_var(--accent)]"
        />
        <button type="submit" className={buttonClass("outline", "md")}>
          Replay
        </button>
      </form>
      {closest ? (
        <p aria-live="polite" className={`${bandX} mt-2.5 text-[14px] text-muted`}>
          Closest real run: {closest}. Install Helicon to run your own prompt.
        </p>
      ) : null}

      <Rule className="mt-10" />
      <div className={`${bandX} min-w-0 py-10 sm:py-12`}>
        {session && state ? (
          <>
            <WindowFrame title={session.task.repo} badge="Recorded run">
              <div key={session.client.sessionId + session.startedAt} className="tour-fade">
                <DemoApp client={session.client} route={route} label={`Replay: ${session.task.title}`} />
              </div>
            </WindowFrame>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={next} disabled={state.done || state.waiting || state.denied} className={buttonClass("primary", "md", "disabled:opacity-50")}>
                Next step
                <ArrowRight weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!playing) session.client.next();
                  setPlaying(!playing);
                }}
                disabled={state.done}
                aria-pressed={playing}
                className={buttonClass("outline", "md", "disabled:opacity-50")}
              >
                {playing ? <Pause weight="fill" /> : <Play weight="fill" />}
                {playing ? "Pause" : "Play all"}
              </button>
              <p aria-live="polite" className="min-w-0 basis-full text-[14px] text-muted sm:ml-1 sm:basis-auto sm:flex-1">
                <span className="font-medium text-fg tabular-nums">
                  Step {state.played} of {state.total}
                </span>
                {state.waiting
                  ? " · Muse is waiting for you. Decide on the card in the window."
                  : state.denied
                    ? " · Muse stops and waits. Your call, every time."
                    : step
                      ? ` · ${step.label}`
                      : " · Press Next step or the right arrow key to send the prompt."}
              </p>
              {state.denied ? (
                <button type="button" onClick={() => session.client.askAgain()} className={buttonClass("ghost", "sm")}>
                  Approve it instead
                </button>
              ) : null}
            </div>

            {state.done ? (
              <div className="tour-fade mt-6 flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[16px] leading-relaxed text-fg">
                  This run took {formatRun(session.duration)} on a real machine. Run it on your own code.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a href={cta.href} onClick={() => toCta("download")} className={buttonClass("primary", "md")}>
                    <DownloadSimple weight="bold" />
                    {cta.label}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      toCta("another");
                      const nextTask = TASKS[(TASKS.indexOf(session.task) + 1) % TASKS.length];
                      void start(nextTask, "card");
                    }}
                    className={buttonClass("outline", "md")}
                  >
                    <ArrowCounterClockwise weight="bold" />
                    Try another task
                  </button>
                  <a href={sampleUrl} target="_blank" rel="noopener" onClick={() => toCta("sample")} className="px-2 text-[13.5px] text-muted underline-offset-4 hover:text-fg hover:underline">
                    See the sample repo on GitHub
                  </a>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <WindowFrame title="Pick a task" badge="Recorded run">
            <div className="flex aspect-[11/7] max-h-[700px] w-full flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
              <p className="max-w-[44ch] text-[15px] text-muted">Pick a task above. Each one replays a real Muse Code run inside the Helicon window, one step at a time.</p>
              <button type="button" onClick={() => void start(TASKS[1], "card")} className={buttonClass("primary", "md")}>
                <Play weight="fill" />
                Start with: {TASKS[1].title}
              </button>
            </div>
          </WindowFrame>
        )}
      </div>
    </section>
  );
}
