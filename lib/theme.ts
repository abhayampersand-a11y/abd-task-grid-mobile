/**
 * The web app's design tokens (`app/globals.css`) resolved to literal values.
 *
 * There is no Tailwind here, so the ramps the web app leans on are inlined as
 * the handful of stops actually used. Both themes are declared side by side and
 * picked at runtime by `lib/theme-context.tsx` — the web app redefines the same
 * CSS variables under `.dark`, and these two objects are that same swap.
 *
 * The dark values follow the web's rule: the light end of each ramp (50–200)
 * becomes a dark tint, the dark end (600–900) becomes a light tone, and the mid
 * tones (300–500) are left alone so solid dots and fills stay vivid.
 */

export type Scheme = "light" | "dark";

export const lightColors = {
  canvas: "#f6f7f9",
  surface: "#ffffff",
  surfaceMuted: "#fafbfc",

  line: "#e6e8ee",
  lineStrong: "#d5d8e2",

  ink: "#0f1222",
  inkSoft: "#4a4f63",
  inkMuted: "#767c92",
  inkFaint: "#9aa0b4",

  brand50: "#eef0ff",
  brand100: "#e0e3ff",
  brand200: "#c6cbff",
  brand500: "#6650f2",
  brand600: "#4f39f6",
  brand700: "#4127d9",

  /**
   * `brand600` doubles as a fill and as a text colour on the web, and in dark
   * mode those two jobs pull in opposite directions: the text end lightens
   * while a fill has to stay saturated enough for white text. They are split
   * here so neither has to compromise.
   */
  brandSolid: "#4f39f6",
  brandText: "#4127d9",

  white: "#ffffff",
  /** Always white — it labels a `brandSolid` fill, which is dark in both themes. */
  onBrand: "#ffffff",
  overlay: "rgba(15, 18, 34, 0.45)",

  // Tint stops borrowed from Tailwind for chips, dots and avatars.
  slate100: "#f1f5f9",
  slate400: "#94a3b8",
  slate600: "#475569",
  sky50: "#f0f9ff",
  sky100: "#e0f2fe",
  sky500: "#0ea5e9",
  sky700: "#0369a1",
  blue50: "#eff6ff",
  blue500: "#3b82f6",
  blue700: "#1d4ed8",
  indigo50: "#eef2ff",
  indigo100: "#e0e7ff",
  indigo500: "#6366f1",
  indigo700: "#4338ca",
  violet50: "#f5f3ff",
  violet100: "#ede9fe",
  violet500: "#8b5cf6",
  violet700: "#6d28d9",
  emerald50: "#ecfdf5",
  emerald100: "#d1fae5",
  emerald500: "#10b981",
  emerald700: "#047857",
  amber50: "#fffbeb",
  amber100: "#fef3c7",
  amber500: "#f59e0b",
  amber700: "#b45309",
  rose50: "#fff1f2",
  rose100: "#ffe4e6",
  rose500: "#f43f5e",
  rose700: "#be123c",
  teal100: "#ccfbf1",
  teal700: "#0f766e",
};

/** Every colour the app can name. Both palettes must supply all of them. */
export type Palette = typeof lightColors;

export const darkColors: Palette = {
  canvas: "#0c0e15",
  surface: "#151823",
  surfaceMuted: "#1c2030",

  line: "#262b3a",
  lineStrong: "#353b4e",

  ink: "#eef1f6",
  inkSoft: "#c2c8d4",
  inkMuted: "#8d94a4",
  inkFaint: "#6a7183",

  brand50: "#171a35",
  brand100: "#1e2246",
  brand200: "#2a2f60",
  brand500: "#6650f2",
  brand600: "#a5a0ff",
  brand700: "#c1beff",

  brandSolid: "#6650f2",
  brandText: "#c1beff",

  white: "#ffffff",
  onBrand: "#ffffff",
  overlay: "rgba(0, 0, 0, 0.62)",

  slate100: "#1f2430",
  slate400: "#94a3b8",
  slate600: "#a8b0c0",
  sky50: "#0d2231",
  sky100: "#112e42",
  sky500: "#0ea5e9",
  sky700: "#8adcf9",
  blue50: "#0f1e35",
  blue500: "#3b82f6",
  blue700: "#a5c8ff",
  indigo50: "#141833",
  indigo100: "#1c2046",
  indigo500: "#6366f1",
  indigo700: "#c1beff",
  violet50: "#1e1633",
  violet100: "#281d45",
  violet500: "#8b5cf6",
  violet700: "#cbbaff",
  emerald50: "#0d2620",
  emerald100: "#113329",
  emerald500: "#10b981",
  emerald700: "#7cebbb",
  amber50: "#2a1f0a",
  amber100: "#3a2a0d",
  amber500: "#f59e0b",
  amber700: "#fcd383",
  rose50: "#2a1218",
  rose100: "#3a1720",
  rose500: "#f43f5e",
  rose700: "#ffb3c1",
  teal100: "#0d2b2b",
  teal700: "#6fe3d8",
};

export const PALETTES: Record<Scheme, Palette> = {
  light: lightColors,
  dark: darkColors,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  card: 16,
  lg: 20,
  pill: 999,
} as const;

/** MOBILE.md mandates a 44pt minimum hit area for anything tappable. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TAP = 44;

export interface Shadows {
  soft: object;
  raise: object;
  float: object;
}

/**
 * A drop shadow carries almost nothing on a near-black surface, so the dark
 * theme trades softness for depth — same geometry, pure black, more opacity —
 * and leans on the hairline borders for separation, exactly as the web does.
 */
export function shadowsFor(scheme: Scheme): Shadows {
  const dark = scheme === "dark";
  const color = dark ? "#000000" : "#0f1222";

  return {
    soft: {
      shadowColor: color,
      shadowOpacity: dark ? 0.4 : 0.05,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    raise: {
      shadowColor: color,
      shadowOpacity: dark ? 0.45 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    float: {
      shadowColor: color,
      shadowOpacity: dark ? 0.6 : 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  };
}

export interface TextStyles {
  title: object;
  heading: object;
  subheading: object;
  body: object;
  label: object;
  meta: object;
}

export function textFor(colors: Palette): TextStyles {
  return {
    /** Headlines step down one notch on phones, per MOBILE.md. */
    title: { fontSize: 24, fontWeight: "700", color: colors.ink },
    heading: { fontSize: 19, fontWeight: "700", color: colors.ink },
    subheading: { fontSize: 16, fontWeight: "600", color: colors.ink },
    body: { fontSize: 15, fontWeight: "400", color: colors.inkSoft },
    label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
    meta: { fontSize: 12, fontWeight: "500", color: colors.inkMuted },
  };
}
