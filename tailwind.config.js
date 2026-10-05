/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Official IDara BrandBook 2025 palette, in the Ameba "product paper" layout:
        // white panels with hairlines for content, the dark Verde Core → Obsidiana shell
        // for navigation, Azul Quantum reserved for the primary action.
        // Base colors: Verde Core #0a4032, Verde Síntegra #b7eee2, Verde Obsidiana #020f0a,
        // Verde Bruma #f4fff4, Azul Quantum #77dce8. Derived tones are those colors over white.
        // bg/brand read from CSS variables (RGB triplets, Tailwind's
        // <alpha-value> pattern so bg-brand/10 etc. keep working) with these
        // exact values as fallback — a flow's public kiosk screen can set
        // --kiosk-bg-rgb/--kiosk-brand-*-rgb on its own wrapper to reskin
        // just that screen, without touching the rest of the app (which
        // never sets those variables).
        bg: "rgb(var(--kiosk-bg-rgb, 244 255 244) / <alpha-value>)", // Verde Bruma
        surface: "#FFFFFF",
        "surface-alt": "#EDFBF8", // Síntegra at 25% on white
        border: "#E2E8E6", // Verde Core at 12% on white
        ink: "#0A4032", // Verde Core
        muted: "#4F756B", // Verde Core at 72% on white; >= 4.5:1 on every light surface
        brand: {
          DEFAULT: "rgb(var(--kiosk-brand-rgb, 10 64 50) / <alpha-value>)", // Verde Core
          dim: "rgb(var(--kiosk-brand-dim-rgb, 2 15 10) / <alpha-value>)", // Verde Obsidiana
        },
        // Azul Quantum: the only action color. Never as text on light surfaces.
        accent: "#77DCE8",
        // Dark navigation shell.
        shell: {
          deep: "#020F0A", // Verde Obsidiana
          mid: "#0A4032", // Verde Core
          nav: "#0A4032",
          text: "#F4FFF4", // Verde Bruma
          mint: "#B7EEE2", // Verde Síntegra
          body: "#F4FFF4",
          muted: "#B2CABE", // Bruma at 72% on Verde Core
        },
        // Kept for existing markup; folded into Verde Core.
        sage: {
          DEFAULT: "#0A4032",
          dim: "#020F0A",
        },
        teal: {
          DEFAULT: "#0A4032",
          dim: "#020F0A",
        },
        maroon: "#A8443F",
        // Status colors are functional (not part of the brand palette): muted, always with text or an icon.
        warning: "#8F6420",
        danger: "#A8443F",
        success: "#2F6E4E",
      },
      fontFamily: {
        // BrandBook: IBM Plex Sans for titles, Roboto for body. Only these two families,
        // so data labels and IDs ("font-mono") use IBM Plex Sans with tabular figures.
        display: ["'IBM Plex Sans'", "'Segoe UI'", "Arial", "sans-serif"],
        body: ["'Roboto'", "'Segoe UI'", "Arial", "sans-serif"],
        mono: ["'IBM Plex Sans'", "'Segoe UI'", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
