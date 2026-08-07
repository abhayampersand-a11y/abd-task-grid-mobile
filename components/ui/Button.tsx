import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, type Palette } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

function fillFor(
  colors: Palette,
): Record<Variant, { bg: string; fg: string; border: string }> {
  return {
    // `brandSolid` rather than `brand600`: this is a fill carrying white text,
    // and the dark theme lightens `brand600` for use as a text colour.
    primary: {
      bg: colors.brandSolid,
      fg: colors.onBrand,
      border: colors.brandSolid,
    },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
    ghost: { bg: "transparent", fg: colors.inkSoft, border: "transparent" },
    danger: { bg: colors.rose50, fg: colors.rose700, border: colors.rose100 },
  };
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: Props) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const fill = fillFor(colors)[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      android_ripple={{
        color:
          scheme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(15,18,34,0.08)",
      }}
      style={({ pressed }) => [
        styles.base,
        size === "sm" && styles.small,
        {
          backgroundColor: fill.bg,
          borderColor: fill.border,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
        // A pressed state has to be explicit — there is no :hover to lean on.
        pressed && !inactive && styles.pressed,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fill.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={size === "sm" ? 15 : 17}
              color={fill.fg}
            />
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              size === "sm" && styles.labelSmall,
              { color: fill.fg },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  // Fully rounded at both sizes: every control in this design is either a pill
  // or a slab, and a button is never the latter.
  base: {
    minHeight: 50,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  fullWidth: { alignSelf: "stretch" },
  pressed: { transform: [{ scale: 0.98 }] },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: { fontSize: 15, fontWeight: "700", letterSpacing: -0.1 },
  labelSmall: { fontSize: 13 },
}));
