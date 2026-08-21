import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, useMeQuery } from "@/store/api";
import { useAppDispatch } from "@/store/hooks";
import { clearToken, loadToken, saveToken } from "./token";
import { getCachedPushToken, setCachedPushToken } from "./push-token";
import type { CurrentUser } from "./types";

interface AuthValue {
  user: CurrentUser | null;
  /** False until the keychain has been read — hold navigation until then. */
  ready: boolean;
  isAdmin: boolean;
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Tears the session down locally without telling the server anything.
   *
   * `signOut` is the wrong call after an account deletion: the row it would
   * revoke a session and a push token against is already gone, so both
   * requests can only 401, and the 2s race would just delay the redirect for
   * nothing.
   */
  endSessionLocally: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [hasToken, setHasToken] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;
    loadToken().then((token) => {
      if (!active) return;
      setHasToken(Boolean(token));
      setRestored(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Without a token there is nobody to fetch, and the request would only 401.
  //
  // `currentData`, not `data`: RTK Query deliberately keeps handing back the
  // last result once a query starts skipping, so after sign-out `data` would
  // still be the signed-out user and the gate would never redirect.
  // `currentData` is the live cache entry, which `resetApiState` empties.
  const { currentData, isLoading, isError } = useMeQuery(undefined, {
    skip: !restored || !hasToken,
  });

  const signInWithToken = useCallback(
    async (token: string) => {
      await saveToken(token);
      setHasToken(true);
      // The token changed, so every cached response belongs to the previous
      // session — drop the lot rather than reasoning about which survives.
      dispatch(api.util.resetApiState());
    },
    [dispatch],
  );

  /**
   * Ends the session on this device. Touches no network and never rejects —
   * being signed out is a local fact, and nothing about it may depend on the
   * server being reachable.
   */
  const clearSession = useCallback(async () => {
    setCachedPushToken(null);
    try {
      await clearToken();
    } catch {
      // A keychain that will not delete must not strand the user in a
      // half-signed state: the in-memory mirror is already null, so no further
      // request carries the token either way.
    }
    setHasToken(false);
    dispatch(api.util.resetApiState());
  }, [dispatch]);

  const signOut = useCallback(async () => {
    // Both revocations need the session they are revoking, so they go before
    // the token does. Unregistering the push token matters: skipping it would
    // leave this handset receiving the previous account's task alerts until the
    // next person signs in on it.
    //
    // Bounded, though. `fetchBaseQuery` sets no timeout, so a server the phone
    // cannot reach would otherwise leave the tap doing nothing for a minute.
    // The server call is a courtesy; `clearSession` is the sign-out.
    const pushToken = getCachedPushToken();
    const revoked = Promise.all([
      dispatch(api.endpoints.signOut.initiate())
        .unwrap()
        .catch(() => undefined),
      pushToken
        ? dispatch(api.endpoints.unregisterPushToken.initiate(pushToken))
            .unwrap()
            .catch(() => undefined)
        : undefined,
    ]);

    await Promise.race([
      revoked,
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);

    await clearSession();
  }, [dispatch, clearSession]);

  // A token that no longer verifies (expired, or AUTH_SECRET rotated) should
  // drop the user to sign-in rather than leave the app in a half-signed state.
  // Nothing to revoke here — the server has already rejected the session — so
  // this clears directly rather than waiting on a call that can only 401.
  useEffect(() => {
    if (hasToken && isError) void clearSession();
  }, [hasToken, isError, clearSession]);

  const value = useMemo<AuthValue>(() => {
    // No token means signed out, whatever the query happens to still hold.
    const user = hasToken ? (currentData?.user ?? null) : null;
    return {
      user,
      ready: restored && !(hasToken && isLoading),
      isAdmin: user?.role === "ADMIN",
      signInWithToken,
      signOut,
      endSessionLocally: clearSession,
    };
  }, [
    currentData,
    restored,
    hasToken,
    isLoading,
    signInWithToken,
    signOut,
    clearSession,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
