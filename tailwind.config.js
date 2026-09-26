/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f5f3ee",
        ink: "#0a0a0a",
        danger: "#ff4d4d",
        warn: "#ffb84d",
        ok: "#3ddc84",
        info: "#4d7cff",
        violet: "#8b5cf6",
        muted: "#a3a3a3",
        grid: "#d9d6cf",
      },
      boxShadow: {
        brut: "4px 4px 0 0 #0a0a0a",
        "brut-lg": "6px 6px 0 0 #0a0a0a",
      },
      fontFamily: {
        sans: ['"Inter Tight"', "Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
