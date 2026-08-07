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
  canvas: "#f3f3f6",
  surface: "#ffffff",
  surfaceMuted: "#f7f7fa",

  line: "#eaeaf0",
  lineStrong: "#dadae3",

  ink: "#101014",
  inkSoft: "#44444f",
  inkMuted: "#71717e",
  inkFaint: "#9c9cab",

  brand50: "#f1eeff",
  brand100: "#e4dfff",
  brand200: "#cbc0ff",
  brand500: "#7b61ff",
  brand600: "#6544f5",
  brand700: "#4f2fdd",

  /**
   * `brand600` doubles as a fill and as a text colour on the web, and in dark
   * mode those two jobs pull in opposite directions: the text end lightens
   * while a fill has to stay saturated enough for white text. They are split
   * here so neither has to compromise.
   */
  brandSolid: "#6544f5",
  brandText: "#4f2fdd",

  white: "#ffffff",
  /** Always white — it labels a `brandSolid` fill, which is dark in both themes. */
  onBrand: "#ffffff",
  overlay: "rgba(10, 10, 13, 0.5)",

  /**
   * The floating tab bar's scrim, sitting *behind* its blur. Deliberately
   * translucent so the blur has something to work with, and deliberately not
   * transparent: it is the whole appearance wherever the blur cannot run
   * (Android below SDK 31), and a transparent view casts no iOS shadow.
   */
  glass: "rgba(255, 255, 255, 0.62)",
  /** The bright edge that separates glass from what it floats over. */
  glassLine: "rgba(15, 15, 20, 0.07)",

  // Tint stops borrowed from Tailwind for chips, dots and avatars.
  slate100: "#f1f1f5",
  slate400: "#a0a0ae",
  slate600: "#4c4c58",
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

/**
 * Near-black and neutral rather than blue-grey: the chrome stays out of the way
 * so the only saturated things on screen are the status dots and avatars. The
 * three greys below the canvas are deliberately close together — depth comes
 * from the radius and the shadow, not from a step in lightness.
 */
export const darkColors: Palette = {
  canvas: "#0a0a0d",
  surface: "#16161b",
  surfaceMuted: "#1e1e25",

  line: "#26262e",
  lineStrong: "#35353f",

  ink: "#f6f6f8",
  inkSoft: "#c6c6d0",
  inkMuted: "#8b8b98",
  inkFaint: "#66667a",

  brand50: "#191634",
  brand100: "#221d47",
  brand200: "#2f2866",
  brand500: "#7b61ff",
  brand600: "#b0a1ff",
  brand700: "#cbc0ff",

  brandSolid: "#7b61ff",
  brandText: "#cbc0ff",

  white: "#ffffff",
  onBrand: "#ffffff",
  overlay: "rgba(0, 0, 0, 0.7)",

  glass: "rgba(24, 24, 30, 0.55)",
  glassLine: "rgba(255, 255, 255, 0.09)",

  slate100: "#22222a",
  slate400: "#9a9aa8",
  slate600: "#b2b2c0",
  sky50: "#0a2130",
  sky100: "#0e2c40",
  sky500: "#0ea5e9",
  sky700: "#8adcf9",
  blue50: "#0c1c33",
  blue500: "#3b82f6",
  blue700: "#a5c8ff",
  indigo50: "#121633",
  indigo100: "#191d44",
  indigo500: "#6366f1",
  indigo700: "#c1beff",
  violet50: "#1c1433",
  violet100: "#261b45",
  violet500: "#8b5cf6",
  violet700: "#cbbaff",
  emerald50: "#0a251f",
  emerald100: "#0e3228",
  emerald500: "#10b981",
  emerald700: "#7cebbb",
  amber50: "#281d08",
  amber100: "#38280b",
  amber500: "#f59e0b",
  amber700: "#fcd383",
  rose50: "#281016",
  rose100: "#38151e",
  rose500: "#f43f5e",
  rose700: "#ffb3c1",
  teal100: "#0a2a2a",
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

/**
 * Generous by design — the whole layout reads as a stack of soft slabs, so a
 * card is nearer a squircle than a rectangle and anything interactive that is
 * not a card is a pill.
 */
export const radius = {
  sm: 10,
  md: 14,
  card: 22,
  lg: 28,
  pill: 999,
} as const;

/** MOBILE.md mandates a 44pt minimum hit area for anything tappable. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TAP = 44;

/**
 * The floating tab bar's geometry, in one place: the bar draws itself from it,
 * and every screen scrolls clear of it by the same numbers. They have to agree,
 * because the bar is out of the layout flow and pays nothing back to the scroll
 * view underneath it.
 */
export const TAB_BAR = {
  /** Height of the pill itself. */
  height: 64,
  /** Gap between the pill and the safe-area edge, on all three sides. */
  inset: spacing.md,
  /** The brand disc of the docked create button. */
  dock: 58,
  /**
   * The canvas-coloured collar around that disc. It is what makes the dock read
   * as punched out of the glass rather than laid on top of it, so it has to be
   * opaque and it has to be the canvas colour exactly.
   */
  dockRing: 5,
  /** How far the dock's centre rides above the bar's. */
  dockRaise: 12,
} as const;

/** Outer diameter of the dock, collar included. */
export const DOCK_SIZE = TAB_BAR.dock + TAB_BAR.dockRing * 2;

/**
 * How far the dock pokes out above the top edge of the pill — the extra room
 * every screen has to scroll clear of, on top of the bar's own height.
 */
export const DOCK_OVERHANG = DOCK_SIZE / 2 + TAB_BAR.dockRaise - TAB_BAR.height / 2;

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
    /** The one display size: large, heavy and tightly tracked. */
    title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6, color: colors.ink },
    heading: { fontSize: 19, fontWeight: "700", letterSpacing: -0.2, color: colors.ink },
    subheading: { fontSize: 16, fontWeight: "600", color: colors.ink },
    body: { fontSize: 15, fontWeight: "400", color: colors.inkSoft },
    label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
    meta: { fontSize: 12, fontWeight: "500", color: colors.inkMuted },
  };
}
