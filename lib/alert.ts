import { Alert, Platform } from "react-native";

/**
 * Dialogs, routed around the one platform where `Alert` does not exist.
 *
 * `react-native-web` ships `Alert` as `class Alert { static alert() {} }` — an
 * empty body, not a partial implementation. On the web build every message the
 * app raises is silently swallowed, and worse, a confirm's `onPress` can never
 * fire, so the action *behind* the dialog never runs either. That is not a
 * cosmetic gap: it is a button that does nothing, with nothing logged.
 *
 * The browser's own `alert`/`confirm` stand in there. They block the JS thread
 * and cannot be styled, which is acceptable for precisely the reason the web
 * build exists at all — clicking the UI through during development (AGENTS.md).
 * Anything a user actually holds is native, where the real `Alert` runs.
 *
 * Always go through this module. A bare `Alert.alert` compiles and typechecks
 * on every platform, which is exactly what makes the web failure so quiet.
 */

const isWeb = Platform.OS === "web";

/** A message with a single dismiss — errors, mostly. */
export function notify(title: string, message?: string): void {
  if (!isWeb) {
    Alert.alert(title, message);
    return;
  }
  // Two lines in the native dialog, one string in the browser's.
  globalThis.alert?.(message ? `${title}\n\n${message}` : title);
}

/**
 * A confirm before something irreversible. `onConfirm` runs only on assent;
 * declining is silent, which is why there is no cancel callback.
 *
 * `confirmLabel` names the act rather than repeating "OK" — the button is the
 * last thing read before the thing happens, so it should say what happens.
 */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = "Delete",
): void {
  if (!isWeb) {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: confirmLabel, style: "destructive", onPress: onConfirm },
    ]);
    return;
  }
  if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
}
