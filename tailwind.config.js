/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light theme in the Ameba "product paper" register, using IDara's palette:
        // white panels with hairlines for content, the dark forest-green shell for
        // navigation, cyan reserved for the primary action.
        // bg/brand read from CSS variables (RGB triplets, Tailwind's
        // <alpha-value> pattern so bg-brand/10 etc. keep working) with these
        // exact values as fallback — a flow's public kiosk screen can set
        // --kiosk-bg-rgb/--kiosk-brand-*-rgb on its own wrapper to reskin
        // just that screen, without touching the rest of the app (which
        // never sets those variables).
        bg: "rgb(var(--kiosk-bg-rgb, 246 255 245) / <alpha-value>)",
        surface: "#FFFFFF",
        "surface-alt": "#F0FBF8", // IDara mint #C3EDE2 at 25% on white
        border: "#E2E5E4", // ink at 12% on white
        ink: "#112921",
        muted: "#5D6E68", // ink at 68% on white; >= 4.5:1 on every light surface
        brand: {
          DEFAULT: "rgb(var(--kiosk-brand-rgb, 46 78 67) / <alpha-value>)",
          dim: "rgb(var(--kiosk-brand-dim-rgb, 23 54 43) / <alpha-value>)",
        },
        // The only action color. Never as text on light surfaces (1.6:1 on white).
        accent: "#90DAE6",
        // Dark navigation shell (IDara official tones).
        shell: {
          deep: "#112921",
          mid: "#17362B",
          nav: "#2E4E43",
          text: "#F6FFF5",
          mint: "#C3EDE2",
          body: "#DCF2EB",
          muted: "#B3D7CD",
        },
        // Kept for existing markup; folded into the monochrome green palette.
        sage: {
          DEFAULT: "#2E4E43",
          dim: "#17362B",
        },
        teal: {
          DEFAULT: "#2E4E43",
          dim: "#17362B",
        },
        maroon: "#A8443F",
        // Status colors, muted to sit with the palette; always paired with text or an icon.
        warning: "#8F6420",
        danger: "#A8443F",
        success: "#2F6E4E",
      },
      fontFamily: {
        display: ["'Poppins'", "'Inter'", "sans-serif"],
        body: ["'Poppins'", "'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
