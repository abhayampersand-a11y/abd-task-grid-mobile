import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { API_BASE_URL } from "@/lib/config";
import { signInSchema } from "@/lib/validation";
import { fieldErrorsFrom, mergeServerErrors, type FieldErrors } from "@/lib/form";
import { useAuth } from "@/lib/auth";
import { toApiError, useSignInMutation } from "@/store/api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ErrorNote } from "@/components/ui/primitives";
import { SocialAuthButtons } from "@/components/app/SocialAuthButtons";
import {
  KeyboardAvoider,
  KeyboardAwareScrollView,
} from "@/components/ui/KeyboardAvoider";

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithToken } = useAuth();
  const [signIn, { isLoading }] = useSignInMutation();
  const { colors } = useTheme();
  const styles = useStyles();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  // A social sign-in that failed after the app was backgrounded comes back
  // through `/oauth-callback`, which forwards the reason here.
  const { error: routedError } = useLocalSearchParams<{ error?: string }>();
  const [formError, setFormError] = useState<string | null>(routedError ?? null);

  async function submit() {
    setFormError(null);

    const parsed = signInSchema.safeParse({ identifier, password, remember });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setErrors({});

    try {
      const result = await signIn(parsed.data).unwrap();
      // Storing the token is what actually signs the app in; the AuthGate
      // reacts to it and routes to the right home screen.
      await signInWithToken(result.token);
    } catch (error) {
      const api = toApiError(error);
      setErrors((current) => mergeServerErrors(current, api.fieldErrors));
      setFormError(api.message);
    }
  }

  return (
    <KeyboardAvoider style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing["3xl"] },
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

        <TextField
          label="Email or mobile"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="you@company.com"
          keyboardType="email-address"
          autoComplete="username"
          error={errors.identifier}
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secure
          autoComplete="current-password"
          error={errors.password}
        />

        <View style={styles.rememberRow}>
          <Text style={styles.rememberLabel}>Keep me signed in</Text>
          <Switch
            value={remember}
            onValueChange={setRemember}
            trackColor={{ true: colors.brand200, false: colors.line }}
            thumbColor={remember ? colors.brandSolid : colors.surface}
          />
        </View>

        <Button
          label="Sign in"
          onPress={submit}
          loading={isLoading}
          fullWidth
        />

        <SocialAuthButtons
          disabled={isLoading}
          onToken={signInWithToken}
          onError={setFormError}
        />

        <Pressable
          onPress={() => router.push("/sign-up")}
          style={styles.switchLink}
          accessibilityRole="link"
        >
          <Text style={styles.switchText}>
            No account yet? <Text style={styles.switchAccent}>Create one</Text>
          </Text>
        </Pressable>

        <Text style={styles.host} numberOfLines={1}>
          Server: {API_BASE_URL}
        </Text>
      </KeyboardAwareScrollView>
    </KeyboardAvoider>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing["3xl"],
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
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  rememberLabel: { fontSize: 14, color: colors.inkSoft },
  switchLink: { alignItems: "center", paddingVertical: spacing.md },
  switchText: { fontSize: 14, color: colors.inkMuted },
  switchAccent: { color: colors.brandText, fontWeight: "600" },
  // Surfacing the resolved origin turns "nothing loads" into a one-glance fix.
  host: { fontSize: 11, color: colors.inkFaint, textAlign: "center" },
}));
