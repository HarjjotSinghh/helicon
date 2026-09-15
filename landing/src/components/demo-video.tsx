"use client";

import { useEffect, useState } from "react";

export function DemoVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const sync = () => {
      setAutoplay(!reduce.matches && !coarse.matches && !connection?.saveData && window.innerWidth >= 768);
    };
    sync();
    reduce.addEventListener("change", sync);
    coarse.addEventListener("change", sync);
    return () => {
      reduce.removeEventListener("change", sync);
      coarse.removeEventListener("change", sync);
    };
  }, []);

  return (
    <video
      className="aspect-video h-auto w-full bg-bg"
      poster={poster}
      controls
      playsInline
      preload={autoplay ? "metadata" : "none"}
      muted
      loop
      autoPlay={autoplay}
      aria-label={label}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
