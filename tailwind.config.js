/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Vars hold the dark-theme values (see index.css :root). paper/ink/grid
        // expose the <alpha-value> channel so Tailwind opacity modifiers
        // (text-ink/55, bg-ink/[0.04], …) keep working on top of CSS vars.
        paper: "rgb(var(--paper-rgb) / <alpha-value>)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        panel: "var(--panel)",
        danger: "#ff4d4d",
        warn: "#ffb84d",
        ok: "#3ddc84",
        info: "#4d7cff",
        violet: "#8b5cf6",
        muted: "#8a8a80",
        grid: "var(--grid)",
      },
      boxShadow: {
        // Light shadows: low-opacity ink offset, NOT colored — keeps the
        // neo-brutalist tactility on the dark canvas.
        brut: "4px 4px 0 rgba(232, 230, 223, 0.08)",
        "brut-lg": "6px 6px 0 rgba(232, 230, 223, 0.10)",
        glow: "0 0 0 1px var(--glow-color), 0 0 16px var(--glow-color)",
      },
      fontFamily: {
        sans: ['"Inter Tight"', "Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
