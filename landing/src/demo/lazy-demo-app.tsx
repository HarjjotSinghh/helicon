"use client";

import { Suspense, lazy, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { cn } from "@/components/ui";
import type { DemoAppProps } from "./demo-app";

export type { DemoAppProps };

/*
 * A live demo runs the whole product UI, the heaviest code on the landing pages, and most of them
 * sit well below the fold. This wrapper keeps that code out of the first load: it holds the demo's
 * space with an empty box and loads the app once the box comes near the screen. Once one demo has
 * loaded, later ones (the tour's next screen) start straight away.
 */

let loaded = false;
const LiveDemo = lazy(() =>
  import("./demo-app").then((mod) => {
    loaded = true;
    return { default: mod.DemoApp };
  }),
);

/** The size DemoApp settles at: 560px tall on phones, its own layout box scaled to fit above md. */
function Space({ view = "app", fluid = false, width = 1100, height = 700, className, box }: DemoAppProps & { box?: RefObject<HTMLDivElement | null> }) {
  const style = { "--demo-h": `${height}px`, "--demo-ar": `${width} / ${height}` } as CSSProperties;
  return (
    <div
      ref={box}
      aria-hidden="true"
      style={style}
      className={cn(
        "w-full",
        view === "sidebar"
          ? "h-(--demo-h)"
          : fluid
            ? "h-[560px] md:h-(--demo-h)"
            : "h-[560px] md:aspect-(--demo-ar) md:h-auto md:max-h-(--demo-h)",
        className,
      )}
    />
  );
}

export function DemoApp(props: DemoAppProps) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(loaded);

  useEffect(() => {
    const el = box.current;
    if (near || !el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setNear(true);
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  if (!near) return <Space {...props} box={box} />;
  return (
    <Suspense fallback={<Space {...props} />}>
      <LiveDemo {...props} />
    </Suspense>
  );
}
