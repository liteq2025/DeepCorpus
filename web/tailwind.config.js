/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      // Canonical typography scale — see globals.css preamble §⑥.
      // Legacy Tailwind defaults (xs/sm/base/lg/xl/2xl) are kept
      // unchanged so existing usage doesn't shift; we ADD endpoints
      // (2xs, hero) that the codebase needed but had to reach for via
      // arbitrary `text-[Npx]`.
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1.5" }], // 11px
        hero: ["2.25rem", { lineHeight: "1.2" }], // 36px
      },
      // Canonical z-index ladder for the 9-layer overlay stack.
      // See docs/refactor/phase-0.5-layout.md §2.
      //
      // Each layer is reserved with a 10-unit gap so future layers can
      // be inserted without renumbering. Use the named tokens
      // (z-base / z-sheet / z-dialog / z-popover / z-tooltip / z-toast)
      // — never raw numbers in component code.
      zIndex: {
        base: "10", // Layer 0/1/2/3/4 (page chrome surfaces)
        sheet: "40", // Layer 5 (Sheet — slide-in side panel)
        dialog: "50", // Layer 6 (Dialog / AlertDialog — modal)
        popover: "60", // Layer 7 (Popover / DropdownMenu — anchored)
        tooltip: "70", // Layer 8 (Tooltip)
        toast: "80", // Layer 9 (Toaster — top of the world)
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
