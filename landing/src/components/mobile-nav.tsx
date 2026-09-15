"use client";

import { List, X } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { buttonClass } from "./ui";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      root.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
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
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Page sections"
              className="fixed inset-x-0 bottom-0 z-[200] overflow-y-auto bg-bg p-2 lg:hidden"
              style={{ top: "var(--header-offset)" }}
            >
              <nav className="flex flex-col">
                {links.map((link) => {
                  const external = link.href.startsWith("http");
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      onClick={() => setOpen(false)}
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
