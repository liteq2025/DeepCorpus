import nextConfig from "eslint-config-next";
import i18nPlugin from "./eslint/i18n-plugin.mjs";
import overlayRulesPlugin from "./eslint/overlay-rules-plugin.mjs";

const config = [
  ...nextConfig,
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    plugins: {
      i18n: i18nPlugin,
      "overlay-rules": overlayRulesPlugin,
    },
    rules: {
      // During migration keep as warning; change to "error" once phase2/3 complete.
      "i18n/no-literal-ui-text": "warn",
      // Overlay discipline — see docs/refactor/overlay-rules.md.
      // `no-interactive-in-tooltip` starts as warn; `no-window-confirm-alert`
      // is warn until Phase 0.5.7 codemod migrates the 11 existing usages
      // to AlertDialog (then promote both to "error").
      "overlay-rules/no-interactive-in-tooltip": "warn",
      "overlay-rules/no-window-confirm-alert": "warn",
    },
  },
  {
    // The React Hooks rules below were tightened in eslint-config-next 16 /
    // React 19. The existing (pre-fork) codebase has ~15 inherited
    // violations across 5 files. Downgrade to warn so `npm run check`
    // doesn't block on inherited debt while still surfacing the issues.
    //
    // Tracked as P3 cleanup in docs/refactor/PLAN.md — revisit after
    // Phase 2 (mega-page decomposition), since most violations live in
    // settings/page.tsx, BookChatPanel, AppShellContext, etc.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**"],
  },
];

export default config;
