import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, MIN_TAP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";

/** Clears the tab bar and the home indicator (MOBILE.md §6). */
export const TAB_BAR_CLEARANCE = 96;

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return <View style={[styles.screen, style]}>{children}</View>;
}

/** Tab-root header: title on the left, actions on the right. */
export function BrandBar({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.barText}>
        {subtitle ? <Text style={styles.barSubtitle}>{subtitle}</Text> : null}
        <Text style={styles.barTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ? <View style={styles.barActions}>{right}</View> : null}
    </View>
  );
}

/** Detail-route header: back arrow, truncated record title, primary action. */
export function DetailBar({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>

      <View style={styles.barText}>
        <Text style={styles.detailTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.barSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.barActions}>{right}</View> : null}
    </View>
  );
}

export function IconAction({
  icon,
  onPress,
  label,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  badge?: number;
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={21} color={colors.inkSoft} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Body scroller with pull-to-refresh and enough bottom padding to clear the
 * tab bar.
 */
export function Body({
  children,
  refreshing,
  onRefresh,
  padded = true,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={[
        padded && styles.bodyPadded,
        { paddingBottom: TAB_BAR_CLEARANCE },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.brand600}
            colors={[colors.brand600]}
            // Android draws the spinner on its own disc, which defaults to
            // white and would punch a hole in a dark screen.
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Duplicates an existing create action; never introduces a new one. */
export function Fab({
  onPress,
  label,
  icon = "add",
}: {
  onPress: () => void;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.fab,
        { bottom: insets.bottom + 78 },
        pressed && styles.fabPressed,
      ]}
    >
      <Ionicons name={icon} size={26} color={colors.onBrand} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  screen: { flex: 1, backgroundColor: colors.canvas },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  back: {
    width: MIN_TAP,
    height: MIN_TAP,
    marginLeft: -spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  barText: { flex: 1, gap: 1 },
  barTitle: { fontSize: 22, fontWeight: "700", color: colors.ink },
  detailTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  barSubtitle: { fontSize: 12, fontWeight: "500", color: colors.inkMuted },
  barActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  iconAction: {
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  badge: {
    position: "absolute",
    top: 6,
    right: 4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.rose500,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { fontSize: 9, fontWeight: "700", color: colors.onBrand },
  body: { flex: 1 },
  bodyPadded: { padding: spacing.lg, gap: spacing.lg },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandSolid,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.float,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
}));
