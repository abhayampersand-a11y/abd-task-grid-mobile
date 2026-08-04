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
import type { CurrentUser } from "./types";

interface AuthValue {
  user: CurrentUser | null;
  /** False until the keychain has been read — hold navigation until then. */
  ready: boolean;
  isAdmin: boolean;
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  const { data, isLoading, isError } = useMeQuery(undefined, {
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

  const signOut = useCallback(async () => {
    await clearToken();
    setHasToken(false);
    dispatch(api.util.resetApiState());
  }, [dispatch]);

  // A token that no longer verifies (expired, or AUTH_SECRET rotated) should
  // drop the user to sign-in rather than leave the app in a half-signed state.
  useEffect(() => {
    if (hasToken && isError) void signOut();
  }, [hasToken, isError, signOut]);

  const value = useMemo<AuthValue>(() => {
    const user = data?.user ?? null;
    return {
      user,
      ready: restored && !(hasToken && isLoading),
      isAdmin: user?.role === "ADMIN",
      signInWithToken,
      signOut,
    };
  }, [data, restored, hasToken, isLoading, signInWithToken, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
