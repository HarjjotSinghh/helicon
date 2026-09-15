import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/*
 * Button styling adapted from shadcn/ui Button (MIT): inline-flex alignment,
 * icon sizing, focus ring, and pressed feedback, remapped to Helicon tokens.
 */
const buttonBase =
  "group/btn inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] [&_svg]:shrink-0";

const buttonVariants = {
  primary:
    "bg-btn text-btn-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(10_60_130/0.25)] hover:bg-btn-hover",
  outline:
    "bg-surface text-fg shadow-soft hover:bg-surface-2 hover:shadow-[0_0_0_1px_var(--border-strong)]",
  ghost: "text-muted hover:bg-sunken hover:text-fg",
};

const buttonSizes = {
  sm: "h-9 px-3.5 text-[13.5px] [&_svg]:size-4",
  md: "h-11 px-5 text-[15px] [&_svg]:size-[18px]",
  icon: "size-9 [&_svg]:size-[18px]",
};

export function buttonClass(
  variant: keyof typeof buttonVariants = "primary",
  size: keyof typeof buttonSizes = "md",
  extra?: string,
) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], extra);
}

export function ThemedImage({
  light,
  dark,
  alt,
  width = 1440,
  height = 900,
  className,
  sizes = "(min-width: 1280px) 1200px, 100vw",
  fetchPriority,
}: {
  light: string;
  dark: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  fetchPriority?: "high" | "low" | "auto";
}) {
  return (
    <>
      <Image
        src={light}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        fetchPriority={fetchPriority}
        className={cn("theme-light-only h-auto w-full", className)}
      />
      <Image
        src={dark}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        fetchPriority={fetchPriority}
        className={cn("theme-dark-only h-auto w-full", className)}
      />
    </>
  );
}

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <>
      <Image
        src="/assets/logo-light.png"
        alt=""
        width={size}
        height={size}
        className={cn("theme-light-only rounded-[7px]", className)}
      />
      <Image
        src="/assets/logo-dark.png"
        alt=""
        width={size}
        height={size}
        className={cn("theme-dark-only rounded-[7px]", className)}
      />
    </>
  );
}

/**
 * A horizontal rule across the page frame, with square markers where it meets the frame edges.
 * Part of the page structure, so it never animates.
 */
export function Rule({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("rule", className)} />
  );
}

/** One band of the framed page: padded content between rules. */
export function Section({
  id,
  className,
  children,
  ...rest
}: ComponentProps<"section">) {
  return (
    <section id={id} className={cn("px-5 py-14 sm:px-8 sm:py-20 lg:px-12", className)} {...rest}>
      {children}
    </section>
  );
}

/** Band padding for blocks that are not their own section. */
export const bandX = "px-5 sm:px-8 lg:px-12";

/** A grid whose cells share 1px borders, edge to edge inside the frame. */
export function CellGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid grid-cols-1 gap-px bg-line [&>*]:min-w-0", className)}>{children}</div>;
}

export function SectionHeading({
  icon,
  title,
  children,
  id,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        aria-hidden="true"
        className="mb-5 inline-flex size-10 items-center justify-center rounded-[10px] bg-tint text-accent-text shadow-[inset_0_0_0_1px_var(--tint-strong)] [&_svg]:size-5"
      >
        {icon}
      </div>
      <h2
        id={id}
        className="font-headline text-[clamp(1.875rem,3.6vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.015em] text-fg"
      >
        {title}
      </h2>
      {children ? (
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-muted">{children}</p>
      ) : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-surface px-2 font-mono text-[12.5px] text-fg shadow-[inset_0_-1px_0_var(--border-strong),0_0_0_1px_var(--border)]">
      {children}
    </kbd>
  );
}

export function WindowFrame({
  title,
  children,
  className,
  live,
  ...rest
}: {
  title: string;
  children: ReactNode;
  className?: string;
  /** Marks the window as a working demo rather than a picture. */
  live?: boolean;
} & Omit<ComponentProps<"div">, "title">) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-bg shadow-frame", className)} {...rest}>
      <div className="grid h-10 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line bg-surface-2 px-4">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="text-[12.5px] font-medium text-subtle">{title}</span>
        {live ? (
          <span className="inline-flex items-center gap-1.5 justify-self-end rounded-full bg-tint px-2 py-0.5 text-[11.5px] font-medium text-accent-text">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
            Live demo, try it
          </span>
        ) : (
          <span />
        )}
      </div>
      {children}
    </div>
  );
}
