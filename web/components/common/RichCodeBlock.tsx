"use client";

import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

const MONOSPACE =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const PLAIN_LANGS = new Set(["", "text", "txt", "plain", "plaintext", "none"]);

/**
 * Subtle code-block surfaces — code should feel embedded in the page, not
 * bolted on. Light mode: a small step down from the page; dark mode: a
 * small step up. Either way, no harsh contrast.
 */
const SURFACE_LIGHT = "oklch(0.94 0.012 75)";
const SURFACE_DARK = "oklch(0.205 0.006 60)";
const HEADER_FG_LIGHT = "oklch(0.50 0.012 60)";
const HEADER_FG_DARK = "oklch(0.65 0.008 65)";
const PLAIN_FG_LIGHT = "oklch(0.25 0.008 50)";
const PLAIN_FG_DARK = "oklch(0.92 0.006 75)";

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

  const surface = isDark ? SURFACE_DARK : SURFACE_LIGHT;
  const headerFg = isDark ? HEADER_FG_DARK : HEADER_FG_LIGHT;
  const plainFg = isDark ? PLAIN_FG_DARK : PLAIN_FG_LIGHT;
  const syntaxTheme = isDark ? oneDark : oneLight;

  return (
    <div
      className={`md-code-block overflow-hidden rounded-xl ${className || ""}`}
      style={{ background: surface }}
    >
      {!isPlain ? (
        <div
          className="border-b border-[var(--border)] px-3 py-2 text-[11px] font-medium uppercase tracking-wider"
          style={{ color: headerFg }}
        >
          {normalizedLang}
        </div>
      ) : null}
      {isPlain ? (
        // Skip the highlighter entirely for unlabeled / plain blocks so we
        // don't trigger Prism "unknown language" warnings and keep a tidy
        // monospace presentation that matches the highlighted variant.
        <pre
          className="overflow-x-auto p-4 text-sm leading-[1.7]"
          style={{ margin: 0, fontFamily: MONOSPACE, color: plainFg }}
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
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: surface,
            padding: "1rem",
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
  );
}
