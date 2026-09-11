import { Check, Copy } from "lucide-react";
import { Children, isValidElement, memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { highlight } from "sugar-high";
import { cn } from "./primitives.js";
import { SwapIcon } from "./sourced.js";

export function useCopy(timeout = 1400): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
  }, []);
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
      timer.current = window.setTimeout(() => setCopied(false), timeout);
    });
  };
  return [copied, copy];
}

export function CopyButton(props: { text: string; label?: string; className?: string }) {
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : (props.label ?? "Copy")}
      onClick={() => copy(props.text)}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md text-subtle transition-colors hover:bg-hover hover:text-fg",
        props.className,
      )}
    >
      <SwapIcon value={copied ? "copied" : "copy"}>
        {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
      </SwapIcon>
    </button>
  );
}

const HIGHLIGHTABLE = /^(js|jsx|ts|tsx|javascript|typescript|json|jsonc|css|scss|html|xml|java|c|cpp|cs|go|rust|rs|swift|kotlin|php|py|python|rb|ruby|sh|bash|zsh|shell|ps1|powershell|sql|yaml|yml|toml|lua|dart)$/i;

export const CodeBlock = memo(function CodeBlock(props: { code: string; language: string | null; className?: string }) {
  const html = useMemo(() => {
    if (props.code.length > 60_000 || (props.language && !HIGHLIGHTABLE.test(props.language))) {
      return null;
    }
    try {
      return highlight(props.code);
    } catch {
      return null;
    }
  }, [props.code, props.language]);
  return (
    <div className={cn("code-surface group/code my-3 overflow-hidden rounded-xl bg-sunken shadow-[0_0_0_1px_var(--border)]", props.className)}>
      <div className="flex h-8 items-center justify-between pr-1 pl-3.5">
        <span className="font-mono text-2xs text-subtle">{props.language ?? "text"}</span>
        <CopyButton text={props.code} label="Copy code" className="opacity-60 group-hover/code:opacity-100 focus-visible:opacity-100" />
      </div>
      <pre className="max-h-[480px] overflow-auto px-3.5 pb-3">
        {html !== null ? <code dangerouslySetInnerHTML={{ __html: html }} /> : <code>{props.code}</code>}
      </pre>
    </div>
  );
});

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
}

const COMPONENTS: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
  pre: ({ children }) => {
    const child = Children.toArray(children)[0];
    if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
      const language = /language-([\w+#-]+)/.exec(child.props.className ?? "")?.[1] ?? null;
      return <CodeBlock code={textOf(child.props.children).replace(/\n$/, "")} language={language} />;
    }
    return <pre>{children}</pre>;
  },
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

const PLUGINS = [remarkGfm];

/** Agent prose: GitHub-flavored markdown with highlighted code blocks. */
export const Markdown = memo(function Markdown(props: { text: string; className?: string }) {
  return (
    <div className={cn("prose-helicon", props.className)}>
      <ReactMarkdown remarkPlugins={PLUGINS} components={COMPONENTS}>
        {props.text}
      </ReactMarkdown>
    </div>
  );
});
