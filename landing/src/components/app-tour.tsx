"use client";

import { CursorClick, MonitorPlay } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Rule, SectionHeading, WindowFrame, bandX, cn } from "./ui";

export type TourShot = {
  id: string;
  label: string;
  title: string;
  body: string;
  icon: ReactNode;
  view: ReactNode;
};

/** How long each screen shows before the tour moves on by itself. */
const AUTOPLAY_MS = 3000;

export function AppTour({ shots }: { shots: TourShot[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const section = useRef<HTMLDivElement>(null);
  const shot = shots[active];
  // Autoplay runs until the visitor takes over, and holds while they hover, focus, or scroll away.
  const [stopped, setStopped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const paused = hovered || focused || !visible;

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function choose(i: number) {
    setStopped(true);
    setActive(i);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    let next: number | null = dir ? (active + dir + shots.length) % shots.length : null;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = shots.length - 1;
    if (next === null) return;
    e.preventDefault();
    choose(next);
    tabs.current[next]?.focus();
  }

  return (
    <section id="tour" aria-labelledby="tour-title">
      <div data-reveal="rise" className={`${bandX} pt-14 sm:pt-20`}>
      <SectionHeading id="tour-title" icon={<MonitorPlay weight="duotone" />} title="Try the app right here">
        This is the real Helicon interface running on sample data in your browser. Pick a screen, then
        click around: open threads, approve a command, or send a message.
      </SectionHeading>
      </div>

      <div
        ref={section}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
        onPointerDown={() => setStopped(true)}
      >
      <div
        role="tablist"
        aria-label="App screens"
        data-stagger="40"
        data-base="100"
        onKeyDown={onKey}
        className={`${bandX} mt-10 flex gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden`}
      >
        {shots.map((s, i) => {
          const selected = i === active;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`tour-tab-${s.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls="tour-panel"
              data-reveal
              tabIndex={selected ? 0 : -1}
              onClick={() => choose(i)}
              className={cn(
                "relative isolate inline-flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-full pr-4 pl-3 text-[14.5px] font-medium transition-[background-color,color,box-shadow] duration-150 [&_svg]:size-[18px]",
                selected ? "bg-btn text-btn-fg shadow-[0_1px_2px_rgb(10_60_130/0.25)]" : "bg-surface text-muted shadow-soft hover:text-fg",
              )}
            >
              {selected && !stopped ? (
                // Fills the active pill over the autoplay interval; finishing moves the tour on.
                <span
                  key={active}
                  aria-hidden="true"
                  onAnimationEnd={() => setActive((a) => (a + 1) % shots.length)}
                  className="tour-progress absolute inset-0 -z-10 origin-left bg-white/20"
                  style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                />
              ) : null}
              <span aria-hidden="true" className="inline-flex">
                {s.icon}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      <p data-reveal data-delay="230" aria-live="polite" className={`${bandX} mt-5 mb-10 flex max-w-[70ch] items-start gap-2.5 text-[16px] leading-relaxed text-muted sm:mb-14 lg:max-w-none`}>
        <CursorClick aria-hidden="true" weight="duotone" className="mt-1 size-[18px] shrink-0 text-accent-text" />
        {shot.body}
      </p>

      <Rule />
      <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${shot.id}`} className={`${bandX} min-w-0 py-10 sm:py-12`}>
        <WindowFrame data-reveal="clip" title={shot.title} live>
          {/* Keyed so each screen starts fresh from its own sample state. */}
          <div key={shot.id} className="tour-fade">
            {shot.view}
          </div>
        </WindowFrame>
      </div>
      </div>
    </section>
  );
}
