/** Darkens a #rrggbb hex color by the given fraction (0-1). Falls back to the input if it can't be parsed. */
export function darkenHex(hex: string, amount = 0.22): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return hex;

  const num = parseInt(match[1], 16);
  const r = Math.round(((num >> 16) & 0xff) * (1 - amount));
  const g = Math.round(((num >> 8) & 0xff) * (1 - amount));
  const b = Math.round((num & 0xff) * (1 - amount));

  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Converts #rrggbb to a space-separated "R G B" triplet — the format
 * Tailwind's `rgb(var(--x) / <alpha-value>)` pattern expects, so opacity
 * modifiers like `bg-brand/10` keep working with a CSS-variable-driven color.
 */
export function hexToRgbTriplet(hex: string): string | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const num = parseInt(match[1], 16);
  return `${(num >> 16) & 0xff} ${(num >> 8) & 0xff} ${num & 0xff}`;
}
