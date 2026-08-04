import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { TOKEN_KEY } from "./config";

interface TokenStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  remove(): Promise<void>;
}

const keychain: TokenStore = {
  read: () => SecureStore.getItemAsync(TOKEN_KEY),
  write: (token) => SecureStore.setItemAsync(TOKEN_KEY, token),
  remove: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

/**
 * `expo-secure-store` ships no web implementation — its web module is an empty
 * object, so every call throws. Web exists here only so the UI can be clicked
 * through in a browser during development, and `localStorage` is emphatically
 * not a keychain: it is readable by any script on the origin and survives until
 * something clears it. Do not ship a web build on the strength of this.
 */
const browser: TokenStore = {
  async read() {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  },
  async write(token) {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
  },
  async remove() {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
  },
};

const store = Platform.OS === "web" ? browser : keychain;

/**
 * The session token lives in the device keychain rather than a cookie jar.
 *
 * A synchronous mirror is kept alongside it because RTK Query's
 * `prepareHeaders` runs on every request and reading the keychain there would
 * add an async hop to each one. The mirror is primed once at startup.
 */
let cached: string | null = null;

export function getTokenSync(): string | null {
  return cached;
}

export async function loadToken(): Promise<string | null> {
  try {
    cached = await store.read();
  } catch {
    // A corrupt keychain entry should log the user out, not crash the app.
    cached = null;
  }
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  await store.write(token);
}

export async function clearToken(): Promise<void> {
  cached = null;
  await store.remove();
}
