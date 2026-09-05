import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { API_BASE_URL } from "@/lib/config";
import { PRIVACY_URL, TERMS_URL, openLegal } from "@/lib/legal";
import { useAuth } from "@/lib/auth";
import { ErrorNote } from "@/components/ui/primitives";
import { SocialAuthButtons } from "@/components/app/SocialAuthButtons";

/**
 * The only way into the app.
 *
 * No form, no keyboard, so none of the keyboard-avoidance scaffolding the
 * screen used to need: a provider button is the whole interaction, and the
 * account is created on first use rather than filled in here.
 */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { signInWithToken } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();

  // A social sign-in that failed after the app was backgrounded comes back
  // through `/oauth-callback`, which forwards the reason here.
  const { error: routedError } = useLocalSearchParams<{ error?: string }>();
  const [formError, setFormError] = useState<string | null>(routedError ?? null);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing["3xl"], paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Ionicons name="checkmark-done" size={26} color={colors.onBrand} />
        </View>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to pick up your tasks where you left off.
        </Text>
      </View>

      {formError ? <ErrorNote message={formError} /> : null}

      <SocialAuthButtons onToken={signInWithToken} onError={setFormError} />

      <Text style={styles.hint}>
        No account yet? Signing in creates one — there is nothing to fill in.
      </Text>

      <View style={styles.spacer} />

      <Text style={styles.legal}>
        By continuing you agree to our{" "}
        <Text style={styles.legalLink} onPress={() => openLegal(TERMS_URL)}>
          Terms of Service
        </Text>{" "}
        and{" "}
        <Text style={styles.legalLink} onPress={() => openLegal(PRIVACY_URL)}>
          Privacy Policy
        </Text>
        .
      </Text>

      <Text style={styles.host} numberOfLines={1}>
        Server: {API_BASE_URL}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  brand: { gap: spacing.sm, marginBottom: spacing.sm },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSolid,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: colors.ink,
  },
  subtitle: { fontSize: 15, color: colors.inkMuted, lineHeight: 22 },
  hint: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  spacer: { flex: 1 },
  legal: {
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: "center",
    lineHeight: 18,
  },
  legalLink: { color: colors.inkMuted, fontWeight: "600" },
  host: {
    fontSize: 11,
    color: colors.inkFaint,
    textAlign: "center",
  },
}));
