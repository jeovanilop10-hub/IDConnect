/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light corporate theme, matched to the IDara admin portal reference.
        // bg/brand read from CSS variables (RGB triplets, Tailwind's
        // <alpha-value> pattern so bg-brand/10 etc. keep working) with these
        // exact values as fallback — a flow's public kiosk screen can set
        // --kiosk-bg-rgb/--kiosk-brand-*-rgb on its own wrapper to reskin
        // just that screen, without touching the rest of the app (which
        // never sets those variables).
        bg: "rgb(var(--kiosk-bg-rgb, 245 247 250) / <alpha-value>)",
        surface: "#FFFFFF",
        "surface-alt": "#EEF1F6",
        border: "#E1E5ED",
        ink: "#1A1D1F",
        muted: "#68707B",
        brand: {
          DEFAULT: "rgb(var(--kiosk-brand-rgb, 31 75 59) / <alpha-value>)",
          dim: "rgb(var(--kiosk-brand-dim-rgb, 23 58 45) / <alpha-value>)",
        },
        sage: {
          DEFAULT: "#5C7566",
          dim: "#4A5F53",
        },
        teal: {
          DEFAULT: "#3E8C82",
          dim: "#2F6E66",
        },
        maroon: "#8A2A44",
        warning: "#C9862E",
        danger: "#C13B3B",
        success: "#2F8F5B",
      },
      fontFamily: {
        display: ["'Inter'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
