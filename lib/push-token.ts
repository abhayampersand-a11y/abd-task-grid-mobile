/**
 * The Expo push token this install is registered under.
 *
 * Its own module rather than a value inside `push.tsx` so that `auth.tsx` can
 * read it on sign-out without importing the notification layer — which imports
 * `auth.tsx` in turn, and a cycle between the two is exactly the kind of thing
 * that leaves a module half-initialised at startup.
 *
 * Held in memory only: it is worth nothing after a restart, when the OS is
 * asked for a fresh one anyway.
 */
let cached: string | null = null;

export function getCachedPushToken(): string | null {
  return cached;
}

export function setCachedPushToken(token: string | null): void {
  cached = token;
}
