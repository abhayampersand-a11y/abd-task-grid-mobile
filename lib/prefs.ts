import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Small, non-secret device preferences.
 *
 * `expo-secure-store` is already a dependency and is the only key/value store
 * installed, so it doubles as the preference store on native — the keychain is
 * heavier than this needs, but it avoids pulling in a second dependency for one
 * string. Web falls back to `localStorage`, which is where the browser build of
 * the web app keeps the same setting.
 */

const store = {
  async read(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return globalThis.localStorage?.getItem(key) ?? null;
    }
    return SecureStore.getItemAsync(key);
  },
  async write(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
};

export async function readPref(key: string): Promise<string | null> {
  try {
    return await store.read(key);
  } catch {
    // A missing or unreadable entry just means "no preference yet".
    return null;
  }
}

export async function writePref(key: string, value: string): Promise<void> {
  try {
    await store.write(key, value);
  } catch {
    // Not persisting is better than crashing on a settings tap.
  }
}
