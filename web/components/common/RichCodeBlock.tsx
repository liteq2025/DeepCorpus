"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { ICON_SM } from "@/lib/icon-sizes";

const MONOSPACE =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const PLAIN_LANGS = new Set(["", "text", "txt", "plain", "plaintext", "none"]);

/**
 * Code-block surface — shares the visual language with ModelThinkingCard
 * (`border-[var(--border)]/60` + `bg-[var(--card)]/40`) so reasoning and
 * code feel like siblings inside the assistant flow, not separate widgets.
 *
 * Iteration 4: the language tag is rendered with a very faint
 * `text-[var(--muted-foreground)]/60` — present, but barely above the
 * surrounding chrome — and paired with a hover-revealed copy button on
 * the right. Tall blocks cap at MAX_HEIGHT and scroll internally.
 *
 * Line numbers stay on for highlighted blocks (user requirement carried
 * over from iteration 3). The two oklch constants below only feed the
 * gutter color since `react-syntax-highlighter` writes inline styles and
 * cannot resolve CSS variables — every other color uses tokens.
 */
const LINE_NUMBER_FG_LIGHT = "oklch(0.70 0.005 60)";
const LINE_NUMBER_FG_DARK = "oklch(0.45 0.003 60)";

/** Cap inline blocks so a runaway fence doesn't blow out the message thread. */
const MAX_HEIGHT = "480px";

/**
 * Track whether the document currently has the `dark` class on <html>.
 * The initial value is read synchronously so the first paint matches the
 * theme that ThemeScript applied pre-hydration; a MutationObserver keeps
 * the value in sync with later theme switches in /settings.
 */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  useEffect(() => {
    const target = document.documentElement;
    const update = () => setIsDark(target.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(target, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable; fail quietly */
    }
  }, [text]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]"
    >
      {copied ? (
        <Check size={ICON_SM} strokeWidth={2} />
      ) : (
        <Copy size={ICON_SM} strokeWidth={1.8} />
      )}
    </button>
  );
}

export default function RichCodeBlock({
  raw,
  lang,
  className,
}: {
  raw: string;
  lang: string;
  className?: string;
}) {
  const normalizedLang = (lang || "").toLowerCase();
  const isPlain = PLAIN_LANGS.has(normalizedLang);
  const isDark = useIsDark();

  const lineNumberFg = isDark ? LINE_NUMBER_FG_DARK : LINE_NUMBER_FG_LIGHT;
  const syntaxTheme = isDark ? oneDark : oneLight;

  return (
    <div
      className={`md-code-block group/code my-3 overflow-hidden rounded-xl border border-[var(--border)]/60 bg-[var(--card)]/40 transition-colors hover:border-[var(--border)] ${className || ""}`}
    >
      {!isPlain ? (
        <div className="flex items-center justify-between gap-2 px-3 py-1 text-2xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          <span>{normalizedLang}</span>
          <CopyButton text={raw} />
        </div>
      ) : null}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: MAX_HEIGHT }}
      >
        {isPlain ? (
          <pre
            className="overflow-x-auto p-4 text-sm leading-[1.7]"
            style={{
              margin: 0,
              fontFamily: MONOSPACE,
              color: "var(--foreground)",
            }}
          >
            <code
              className="md-code-block__code"
              style={{ fontFamily: MONOSPACE }}
            >
              {raw}
            </code>
          </pre>
        ) : (
          <SyntaxHighlighter
            language={normalizedLang}
            style={syntaxTheme}
            PreTag="pre"
            showLineNumbers
            lineNumberStyle={{
              minWidth: "2.25em",
              paddingRight: "1em",
              textAlign: "right",
              color: lineNumberFg,
              userSelect: "none",
              opacity: 0.7,
              fontSize: "0.75rem",
            }}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              background: "transparent",
              padding: "1rem 1rem 1rem 0.75rem",
              fontSize: "0.875rem",
              lineHeight: "1.7",
            }}
            codeTagProps={{
              className: "md-code-block__code",
              style: { fontFamily: MONOSPACE },
            }}
            wrapLongLines={false}
          >
            {raw}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}
