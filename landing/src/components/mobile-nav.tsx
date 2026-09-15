"use client";

import { List, X } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { buttonClass } from "./ui";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
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
      {open ? (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full z-50 border-b border-line bg-bg p-2 shadow-soft"
        >
          <nav aria-label="Page sections" className="flex flex-col">
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
        </div>
      ) : null}
    </div>
  );
}
