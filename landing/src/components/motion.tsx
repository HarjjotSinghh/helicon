"use client";

import { useEffect } from "react";

/*
 * Scroll reveals for everything below the hero, driven by CSS keyframes (off the main thread).
 *
 * Markup contract:
 * - data-reveal="fade|rise|scale|clip|draw|grow|slide|wordmark" marks an element that animates in
 *   once, the first time it scrolls into view. The value picks the keyframes (see globals.css).
 * - data-stagger="40" on a container reveals its data-reveal descendants together, each one
 *   step (in ms) after the previous. Nested containers own their own descendants.
 * - data-base="130" on a stagger container offsets its whole sequence (for side-by-side cells).
 * - data-delay="80" adds a fixed delay to one element.
 *
 * Content is only hidden while html.motion-ready is set (by the pre-paint script), so the page
 * reads fine without JavaScript. When an element's animation finishes, data-revealed drops the
 * animation and its blur filter entirely, so nothing keeps a compositing layer alive.
 */
export function MotionObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const settle = (el: HTMLElement) => {
      if (el.dataset.revealed !== undefined) return;
      el.dataset.revealed = "";
    };

    const start = (el: HTMLElement, delay: number) => {
      if (el.dataset.inview !== undefined) return;
      const own = Number(el.dataset.delay ?? 0);
      el.style.setProperty("--reveal-delay", `${delay + own}ms`);
      el.dataset.inview = "";
      const done = (event: AnimationEvent) => {
        if (event.target !== el) return;
        el.removeEventListener("animationend", done);
        settle(el);
      };
      el.addEventListener("animationend", done);
      // Safety net: whatever happens to the animation, the filter is gone within a few seconds.
      window.setTimeout(() => settle(el), delay + own + 3000);
    };

    const ownerOf = (el: Element) => el.parentElement?.closest("[data-stagger]") ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          if (el.dataset.stagger !== undefined) {
            el.dataset.played = "";
            const step = Number(el.dataset.stagger) || 60;
            const base = Number(el.dataset.base ?? 0);
            const items = [...el.querySelectorAll<HTMLElement>("[data-reveal]")].filter((item) => ownerOf(item) === el);
            items.forEach((item, i) => start(item, base + i * step));
            if (el.dataset.reveal !== undefined) start(el, 0);
          } else {
            start(el, 0);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    // A fast fling can carry an element past the viewport between frames, so it never intersects.
    // Anything already above the viewport is shown at once, without animating.
    const showNow = (el: HTMLElement) => {
      if (el.dataset.inview !== undefined) return;
      observer.unobserve(el);
      el.dataset.inview = "";
      el.dataset.revealed = "";
    };
    let frame = 0;
    const sweep = () => {
      frame = 0;
      for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-inview]), [data-stagger]:not([data-played])")) {
        if (el.getBoundingClientRect().bottom >= 0) continue;
        if (el.dataset.stagger !== undefined) {
          el.dataset.played = "";
          observer.unobserve(el);
          el.querySelectorAll<HTMLElement>("[data-reveal]").forEach(showNow);
        }
        if (el.dataset.reveal !== undefined) showNow(el);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sweep);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    for (const el of document.querySelectorAll<HTMLElement>("[data-stagger]")) observer.observe(el);
    for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
      if (!ownerOf(el) && el.dataset.stagger === undefined) observer.observe(el);
    }

    // Elements rendered later (a new tab panel, a different platform's steps) join in as they mount.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement) || node.closest(".helicon-app")) continue;
          const found = [node, ...node.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
            (el) => el.dataset.reveal !== undefined && el.dataset.inview === undefined,
          );
          found.forEach((el, i) => {
            const owner = ownerOf(el) as HTMLElement | null;
            // Inside a container that already played, stagger right away; otherwise wait for view.
            if (owner && owner.dataset.played !== undefined) start(el, i * (Number(owner.dataset.stagger) || 60));
            else if (!owner) observer.observe(el);
          });
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    root.dataset.motionBooted = "";
    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
