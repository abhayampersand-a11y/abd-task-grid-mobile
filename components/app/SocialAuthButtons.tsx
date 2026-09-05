import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import {
  ENABLED_PROVIDERS,
  PROVIDER_LABELS,
  signInWithProvider,
  type OAuthProviderId,
} from "@/lib/oauth";
import { useOauthProvidersQuery } from "@/store/api";

/** Ionicons ships these monochrome, so each gets its brand colour by hand. */
const MARKS: Record<
  OAuthProviderId,
  { icon: keyof typeof Ionicons.glyphMap; tint: string }
> = {
  google: { icon: "logo-google", tint: "#EA4335" },
  microsoft: { icon: "logo-microsoft", tint: "#00A4EF" },
  linkedin: { icon: "logo-linkedin", tint: "#0A66C2" },
};

interface Props {
  /** Called with the session token once a provider round trip succeeds. */
  onToken: (token: string) => void | Promise<void>;
  onError: (message: string) => void;
}

export function SocialAuthButtons({ onToken, onError }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { data } = useOauthProvidersQuery();
  const [pending, setPending] = useState<OAuthProviderId | null>(null);

  const providers = (data?.providers ?? []).filter((provider) =>
    ENABLED_PROVIDERS.includes(provider),
  );
  // Nothing to show until the server has confirmed at least one provider —
  // rendering buttons that 503 would be worse than a brief absence. This is now
  // the only control on the screen, so an empty render is a blank sign-in page;
  // that is still better than offering a button that cannot work.
  if (providers.length === 0) return null;

  async function start(provider: OAuthProviderId) {
    setPending(provider);
    try {
      const outcome = await signInWithProvider(provider);
      if (outcome.type === "success") await onToken(outcome.token);
      else if (outcome.type === "error") onError(outcome.message);
      // "cancelled" is the user changing their mind; say nothing.
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={styles.root}>
      {providers.map((provider) => {
        const mark = MARKS[provider];
        const busy = pending === provider;
        // One round trip at a time: two provider sheets racing would leave
        // whichever finished second overwriting the first one's session.
        const inactive = pending !== null;

        return (
          <Pressable
            key={provider}
            accessibilityRole="button"
            accessibilityState={{ disabled: inactive, busy }}
            onPress={() => void start(provider)}
            disabled={inactive}
            style={({ pressed }) => [
              styles.button,
              { opacity: inactive && !busy ? 0.5 : pressed ? 0.85 : 1 },
              pressed && !inactive && styles.pressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.inkSoft} />
            ) : (
              <>
                <Ionicons name={mark.icon} size={18} color={mark.tint} />
                <Text style={styles.buttonLabel}>
                  Continue with {PROVIDER_LABELS[provider]}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: { gap: spacing.sm },
  button: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  buttonLabel: { fontSize: 15, fontWeight: "600", color: colors.ink },
}));
