import Constants from "expo-constants";

/**
 * Where the Next.js API lives.
 *
 * A phone running Expo Go is not on the same loopback interface as the dev
 * machine, so `localhost` never works — this has to be a LAN IP, a tunnel URL
 * or a deployed origin. Resolution order:
 *
 *   1. EXPO_PUBLIC_API_URL (inlined at build time from .env)
 *   2. `extra.apiBaseUrl` in app.json
 *   3. the host Metro itself is served from, with port 3000 — right whenever
 *      the Next dev server runs on the same machine as Metro
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl as
    | string
    | undefined;
  if (fromExtra) return fromExtra.replace(/\/+$/, "");

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:3000`;

  return "http://localhost:3000";
}

export const API_BASE_URL = resolveBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

/** SecureStore key holding the signed session JWT. */
export const TOKEN_KEY = "taskflow_session_token";
