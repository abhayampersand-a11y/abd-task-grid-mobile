import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import { store } from "@/store";
import { AuthProvider, useAuth } from "@/lib/auth";
import { BlurTargetProvider } from "@/lib/blur-target";
import { makeStyles, ThemeProvider, useTheme } from "@/lib/theme-context";

// `oauth-callback` counts as an auth screen so the gate leaves it alone long
// enough to read the token off the deep link.
const AUTH_ROUTES = ["sign-in", "sign-up", "oauth-callback"];

/**
 * Mirrors `proxy.ts` on the web: signed-out users land on sign-in, signed-in
 * users never see it, and admins start on their own overview. Every API route
 * still re-checks the session, so this is convenience, not enforcement.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  useEffect(() => {
    if (!ready) return;

    const onAuthScreen = AUTH_ROUTES.includes(segments[0] ?? "");

    if (!user && !onAuthScreen) {
      router.replace("/sign-in");
    } else if (user && onAuthScreen) {
      router.replace(user.role === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [ready, user, segments, router]);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.onBrand} />
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Split out so it can read the theme — the provider itself has to sit above
 * anything that calls `useTheme`.
 */
function ThemedApp() {
  const { colors, scheme } = useTheme();

  return (
    <>
      {/* Light content on a dark bar, and vice versa. */}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AuthGate>
        {/* Everything routed sits inside the blur target, because the floating
            tab bar blurs whichever screen happens to be under it. */}
        <BlurTargetProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.canvas },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="sign-up" />
            <Stack.Screen name="oauth-callback" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="group/[groupId]" />
            <Stack.Screen name="task/[taskId]" />
          </Stack>
        </BlurTargetProvider>
      </AuthGate>
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSolid,
  },
}));
