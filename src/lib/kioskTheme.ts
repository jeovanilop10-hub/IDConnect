import type { FlowTheme } from "../api/types";

// IDara BrandBook defaults for every public kiosk: Verde Core as the brand
// color on a white page. A flow's own theme (flow builder) overrides them.
export const KIOSK_DEFAULT_PRIMARY = "#0A4032";
export const KIOSK_DEFAULT_BG = "#FFFFFF";

// Defaults from before the BrandBook alignment. The flow builder always saved
// both colors, so most flows carry these values without anyone choosing them:
// treat them as "no custom theme" so those kiosks get the official look too.
const LEGACY_PRIMARY = "#2E4A46";
const LEGACY_BG = "#F2F6F5";

function same(a: string | null | undefined, b: string): boolean {
  return (a ?? "").trim().toLowerCase() === b.toLowerCase();
}

export function resolveKioskTheme(theme?: FlowTheme | null): { primaryColor: string; backgroundColor: string } {
  const primary = theme?.primaryColor;
  const background = theme?.backgroundColor;
  return {
    primaryColor: !primary || same(primary, LEGACY_PRIMARY) ? KIOSK_DEFAULT_PRIMARY : primary,
    backgroundColor: !background || same(background, LEGACY_BG) ? KIOSK_DEFAULT_BG : background,
  };
}
