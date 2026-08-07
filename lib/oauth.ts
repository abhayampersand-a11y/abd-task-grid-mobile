import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "./config";

/**
 * Social sign-in, driven entirely by the API.
 *
 * The app never holds a provider client secret and never talks to Google,
 * Microsoft or LinkedIn itself. It opens `/api/auth/oauth/{provider}/start` in
 * a system browser session, the server runs the code exchange, and the browser
 * is redirected back to this app's deep link carrying the same session token
 * `/api/auth/sign-in` would have returned.
 */

export const OAUTH_PROVIDERS = ["google", "microsoft", "linkedin"] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<OAuthProviderId, string> = {
  google: "Google",
  microsoft: "Microsoft",
  linkedin: "LinkedIn",
};

/**
 * Which buttons this build is willing to show.
 *
 * The server already hides any provider it has no credentials for; this is a
 * second, app-side gate so a provider can be held back even once its console
 * setup is done. Uncomment a line to bring that button back — the rest of the
 * flow stays wired up either way.
 */
export const ENABLED_PROVIDERS: readonly OAuthProviderId[] = [
  "google",
  // "microsoft",
  // "linkedin",
];

/**
 * Where the provider hands control back.
 *
 * `Linking.createURL` resolves to `taskflow://oauth-callback` in a build and
 * to Metro's `exp://…/--/oauth-callback` under Expo Go, which is why the
 * server takes this as a parameter instead of hardcoding the scheme.
 */
export function callbackUrl(): string {
  return Linking.createURL("oauth-callback");
}

export type OAuthOutcome =
  | { type: "success"; token: string }
  | { type: "cancelled" }
  | { type: "error"; message: string };

export async function signInWithProvider(
  provider: OAuthProviderId,
): Promise<OAuthOutcome> {
  const redirect = callbackUrl();
  const start =
    `${API_URL}/auth/oauth/${provider}/start` +
    `?mode=native&redirect=${encodeURIComponent(redirect)}`;

  let result: WebBrowser.WebBrowserAuthSessionResult;
  try {
    result = await WebBrowser.openAuthSessionAsync(start, redirect, {
      // Reusing the browser's cookies is the point: it is what lets somebody
      // already signed in to Google finish in one tap.
      preferEphemeralSession: false,
    });
  } catch (error) {
    return {
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not open the sign-in page.",
    };
  }

  // "dismiss" is the user swiping the sheet away; "cancel" is the OS closing
  // it. Neither is a failure worth shouting about.
  if (result.type !== "success") return { type: "cancelled" };

  return readCallback(result.url);
}

/**
 * Pulls the outcome out of the deep link the server redirected to.
 *
 * Exported because the link can also arrive through the router when the OS
 * hands it to a cold app instead of to the waiting browser session.
 */
export function readCallback(url: string): OAuthOutcome {
  const { queryParams } = Linking.parse(url);

  const token = queryParams?.token;
  if (typeof token === "string" && token) return { type: "success", token };

  // The server flags a backed-out consent screen explicitly, so nothing here
  // depends on matching its wording.
  if (queryParams?.cancelled === "1") return { type: "cancelled" };

  const error = queryParams?.error;
  return {
    type: "error",
    message:
      typeof error === "string" && error
        ? error
        : "Sign-in did not complete. Please try again.",
  };
}
