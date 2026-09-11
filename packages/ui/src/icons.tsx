import React from "react";

export type IconName =
  | "search"
  | "plus"
  | "folder"
  | "file"
  | "chevron-down"
  | "chevron-right"
  | "check"
  | "x"
  | "stop"
  | "clip"
  | "gear"
  | "branch"
  | "terminal"
  | "refresh"
  | "dot"
  | "send"
  | "lock";

const PATHS: Record<IconName, React.ReactNode> = {
  search: (
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
  ),
  plus: (
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  folder: (
    <path
      d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  file: (
    <path
      d="M6 3h8l4 4v14H6V3Z M14 3v4h4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  "chevron-down": (
    <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  "chevron-right": (
    <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  check: (
    <path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  x: (
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />,
  clip: (
    <path
      d="m8 12 8-8 4 4-8 8-6 6a4 4 0 0 1-6-6l8-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  gear: (
    <path
      d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 1 0 12 8.5Z M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ),
  branch: (
    <path
      d="M6 3v12 M6 21v-3 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M6 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M6 15c0 3 4 2 6 2h3 M18 9c0 4-6 3-9 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ),
  terminal: (
    <path d="m5 7 5 5-5 5 M11 17h9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  refresh: (
    <path
      d="M20 12a8 8 0 1 1-2.3-5.6 M20 3v4h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ),
  dot: <circle cx="12" cy="12" r="5" fill="currentColor" />,
  send: (
    <path d="M4 12 20 4l-4 8 4 8-16-8Z M12 12h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  ),
  lock: (
    <path
      d="M7 11V8a5 5 0 0 1 10 0v3 M6 11h12v10H6V11Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
};

export function Icon(props: { name: IconName; size?: number; className?: string }): React.ReactElement {
  const extra = props.name === "search" ? (
    <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ) : null;
  return (
    <svg
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 24 24"
      className={props.className}
      aria-hidden="true"
    >
      {PATHS[props.name]}
      {extra}
    </svg>
  );
}

export function Logo(props: { size?: number }): React.ReactElement {
  const size = props.size ?? 28;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1a1a21" />
      <text
        x="16"
        y="22"
        fontFamily="system-ui, sans-serif"
        fontSize="17"
        fontWeight="700"
        fill="#f2f2f5"
        textAnchor="middle"
      >
        H
      </text>
      <circle cx="25" cy="7" r="3" fill="#3fd2e0" />
    </svg>
  );
}
