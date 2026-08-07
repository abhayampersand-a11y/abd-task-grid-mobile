import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth";

/**
 * Safety net for the social sign-in deep link.
 *
 * Normally `WebBrowser.openAuthSessionAsync` swallows the redirect and hands
 * the URL straight back to the screen that started it. But if the OS routes
 * `taskflow://oauth-callback` to the app instead — a cold start, or the
 * browser session already torn down — the link would otherwise land on a
 * missing route. This consumes it identically, so either path signs in.
 */
export default function OAuthCallback() {
  const router = useRouter();
  const { signInWithToken } = useAuth();
  const { token, error, cancelled } = useLocalSearchParams<{
    token?: string;
    error?: string;
    cancelled?: string;
  }>();
  const styles = useStyles();
  const { colors } = useTheme();

  // Strict-mode double invocation would otherwise replay the sign-in.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (token) {
      // The AuthGate takes over from here and routes to the right home screen.
      void signInWithToken(token);
      return;
    }

    // Backing out of the consent screen is not an error worth reporting.
    router.replace({
      pathname: "/sign-in",
      params: error && cancelled !== "1" ? { error } : {},
    });
  }, [token, error, cancelled, router, signInWithToken]);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={colors.brandSolid} />
      <Text style={styles.label}>Finishing sign-in…</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    backgroundColor: colors.canvas,
  },
  label: { fontSize: 14, color: colors.inkMuted },
}));
