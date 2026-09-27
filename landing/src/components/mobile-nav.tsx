"use client";

import { List, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buttonClass } from "./ui";
import { trackHref } from "@/lib/client-analytics";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
      if (event.key === "Tab") {
        const focusableElements = panelRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    };

    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    // Focus the first link on open
    const focusTimer = setTimeout(() => {
      firstLinkRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      root.style.overflow = previous;
      clearTimeout(focusTimer);
      
      // Return focus to the toggle button on close
      toggleRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={toggleRef}
        type="button"
        className={buttonClass("ghost", "icon")}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X weight="bold" /> : <List weight="bold" />}
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Page sections"
              className="fixed inset-x-0 bottom-0 z-[200] overflow-y-auto bg-bg p-2 lg:hidden"
              style={{ top: "var(--header-offset)" }}
            >
              <nav className="flex flex-col">
                {links.map((link, index) => {
                  const external = link.href.startsWith("http");
                  return (
                    <a
                      key={link.href}
                      ref={index === 0 ? firstLinkRef : undefined}
                      href={link.href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      onClick={() => {
                        trackHref(link.href, { placement: "mobile_nav", label: link.label });
                        setOpen(false);
                      }}
                      className="flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-fg"
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}