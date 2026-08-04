import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { signUpSchema } from "@/lib/validation";
import { fieldErrorsFrom, mergeServerErrors, type FieldErrors } from "@/lib/form";
import { useAuth } from "@/lib/auth";
import { toApiError, useSignUpMutation } from "@/store/api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ErrorNote } from "@/components/ui/primitives";

export default function SignUp() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithToken } = useAuth();
  const [signUp, { isLoading }] = useSignUpMutation();
  const { colors } = useTheme();
  const styles = useStyles();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit() {
    setFormError(null);

    const parsed = signUpSchema.safeParse({
      fullName,
      email,
      mobile,
      password,
      confirmPassword,
      acceptTerms,
    });

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setErrors({});

    try {
      const result = await signUp(parsed.data).unwrap();
      await signInWithToken(result.token);
    } catch (error) {
      const api = toApiError(error);
      setErrors((current) => mergeServerErrors(current, api.fieldErrors));
      setFormError(api.message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Ionicons name="checkmark-done" size={26} color={colors.onBrand} />
          </View>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Join a group and start assigning work in minutes.
          </Text>
        </View>

        {formError ? <ErrorNote message={formError} /> : null}

        <TextField
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Alex Morgan"
          autoCapitalize="words"
          autoComplete="name"
          error={errors.fullName}
        />

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email}
        />

        <TextField
          label="Mobile"
          value={mobile}
          onChangeText={setMobile}
          placeholder="+1 555 019 2837"
          keyboardType="phone-pad"
          autoComplete="tel"
          error={errors.mobile}
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secure
          autoComplete="new-password"
          hint="Must include a letter and a number."
          error={errors.password}
        />

        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat your password"
          secure
          autoComplete="new-password"
          error={errors.confirmPassword}
        />

        <Pressable
          onPress={() => setAcceptTerms((value) => !value)}
          hitSlop={HIT_SLOP}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptTerms }}
          style={styles.termsRow}
        >
          <Switch
            value={acceptTerms}
            onValueChange={setAcceptTerms}
            trackColor={{ true: colors.brand200, false: colors.line }}
            thumbColor={acceptTerms ? colors.brandSolid : colors.surface}
          />
          <Text style={styles.termsText}>I accept the Terms of Service</Text>
        </Pressable>
        {errors.acceptTerms ? (
          <Text style={styles.error}>{errors.acceptTerms}</Text>
        ) : null}

        <Button
          label="Create account"
          onPress={submit}
          loading={isLoading}
          fullWidth
        />

        <Pressable
          onPress={() => router.replace("/sign-in")}
          style={styles.switchLink}
          accessibilityRole="link"
        >
          <Text style={styles.switchText}>
            Already registered?{" "}
            <Text style={styles.switchAccent}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
    width: 52,
    height: 52,
    borderRadius: radius.card,
    backgroundColor: colors.brandSolid,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 15, color: colors.inkMuted, lineHeight: 21 },
  termsRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  termsText: { flex: 1, fontSize: 14, color: colors.inkSoft },
  error: { fontSize: 12, color: colors.rose700, marginTop: -spacing.sm },
  switchLink: { alignItems: "center", paddingVertical: spacing.md },
  switchText: { fontSize: 14, color: colors.inkMuted },
  switchAccent: { color: colors.brandText, fontWeight: "600" },
}));
