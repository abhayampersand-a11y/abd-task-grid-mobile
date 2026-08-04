import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { tokensFor, type Tokens } from "./format";
import { readPref, writePref } from "./prefs";
import {
  PALETTES,
  shadowsFor,
  textFor,
  type Palette,
  type Scheme,
  type Shadows,
  type TextStyles,
} from "./theme";

/** Matches the web app's `ThemePreference` so both clients offer the same choice. */
export type ThemePreference = "light" | "dark" | "system";

/**
 * The web app stores this under `taskflow-theme` in `localStorage`. SecureStore
 * keys have to be alphanumeric plus `._-`, which this already is, so the two
 * clients can keep the same name.
 */
export const THEME_STORAGE_KEY = "taskflow-theme";

export interface Theme extends Tokens {
  scheme: Scheme;
  colors: Palette;
  shadow: Shadows;
  text: TextStyles;
}

interface ThemeValue extends Theme {
  /** What the user chose. */
  preference: ThemePreference;
  /** What that resolves to right now. */
  resolved: Scheme;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Building a theme walks three colour tables, so the result is cached per
 * scheme. There are only two, and they never change after the first build.
 */
const THEMES: Partial<Record<Scheme, Theme>> = {};

export function themeFor(scheme: Scheme): Theme {
  const cached = THEMES[scheme];
  if (cached) return cached;

  const colors = PALETTES[scheme];
  const built: Theme = {
    scheme,
    colors,
    shadow: shadowsFor(scheme),
    text: textFor(colors),
    ...tokensFor(colors),
  };
  THEMES[scheme] = built;
  return built;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }
  return value;
}

function isPreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // `useColorScheme` is the device setting, which is what "system" follows.
  const device = useColorScheme();
  const [preference, setStoredPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    void readPref(THEME_STORAGE_KEY).then((stored) => {
      if (!cancelled && isPreference(stored)) setStoredPreference(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    // Applied immediately; the write is fire-and-forget so the tap never waits
    // on the keychain.
    setStoredPreference(next);
    void writePref(THEME_STORAGE_KEY, next);
  }, []);

  const resolved: Scheme =
    preference === "system" ? (device === "dark" ? "dark" : "light") : preference;

  const value = useMemo<ThemeValue>(
    () => ({
      ...themeFor(resolved),
      preference,
      resolved,
      setPreference,
    }),
    [resolved, preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * `StyleSheet.create` runs once at module load, which is exactly wrong when the
 * colours can change at runtime. `makeStyles` defers it: the factory is called
 * once per scheme, the result cached, and components read it through the
 * returned hook.
 *
 *     const useStyles = makeStyles(({ colors }) => ({
 *       card: { backgroundColor: colors.surface },
 *     }));
 *
 *     function Card() {
 *       const styles = useStyles();
 *       ...
 *     }
 */
export function makeStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<unknown>,
>(
  // Mirrors `StyleSheet.create`'s own signature — the `NamedStyles<unknown>`
  // arm is what contextually types literals like `fontWeight: "600"` so they
  // don't widen to `string`.
  factory: (theme: Theme) => T & StyleSheet.NamedStyles<unknown>,
): () => T {
  const cache = new Map<Scheme, T>();

  return function useStyles(): T {
    const { scheme } = useTheme();
    let styles = cache.get(scheme);
    if (!styles) {
      styles = StyleSheet.create(factory(themeFor(scheme)));
      cache.set(scheme, styles);
    }
    return styles;
  };
}
