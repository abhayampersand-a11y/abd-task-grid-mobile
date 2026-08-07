import { useCallback, useRef } from "react";
import {
  Pressable,
  RefreshControl,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  DOCK_OVERHANG,
  HIT_SLOP,
  MIN_TAP,
  radius,
  spacing,
  TAB_BAR,
} from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import {
  KeyboardAvoider,
  KeyboardAwareScrollView,
} from "@/components/ui/KeyboardAvoider";

/**
 * Clears the floating tab bar (MOBILE.md §6): its height, the gap it floats in,
 * the create dock riding above its top edge, and a gutter so the last row stops
 * short of the glass rather than sliding under it half-read. `Body` adds the
 * bottom safe-area inset on top, which is device-specific and so cannot live in
 * a constant.
 */
export const TAB_BAR_CLEARANCE =
  TAB_BAR.height + TAB_BAR.inset + DOCK_OVERHANG + spacing.xl;

/**
 * How close to the bottom `onEndReached` fires, in points — roughly two rows,
 * so the next page is usually in hand before the user reaches the end of this
 * one. The tab-bar clearance is part of the content, so the threshold has to
 * clear it or the callback only fires once the list has already run out.
 */
const END_REACHED_THRESHOLD = TAB_BAR_CLEARANCE + 220;

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

/**
 * Tab-root header: display title on the left, actions on the right. It sits
 * directly on the canvas with no rule under it — the header and the body are
 * one surface, and the cards below supply all the edges the eye needs.
 */
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
    <View style={[styles.bar, { paddingTop: insets.top + spacing.md }]}>
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
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={21} color={colors.ink} />
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
      <Ionicons name={icon} size={19} color={colors.inkSoft} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Body scroller with pull-to-refresh, enough bottom padding to clear the tab
 * bar, and keyboard avoidance — every tab screen with a field in it goes
 * through here.
 */
export function Body({
  children,
  refreshing,
  onRefresh,
  padded = true,
  sticky,
  onEndReached,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  /**
   * Controls that stay put while `children` scroll underneath them — the
   * search box, segmented control and filter row a list is read through. The
   * scroller takes whatever height is left, so the page itself never moves.
   *
   * This block sits outside the scroller, so `useKeyboardReveal` no-ops in it.
   * Nothing here needs revealing: the avoider shrinks the scroller from the
   * bottom and leaves the pinned block where it is, at the top of the screen.
   */
  sticky?: React.ReactNode;
  /**
   * Asks for the next page as the bottom comes into range. Fires at most once
   * per content height, so a page that is still in flight is never requested
   * twice; omit it on a screen that is not an infinite list.
   */
  onEndReached?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  const viewport = useRef(0);
  const content = useRef(0);
  const offset = useRef(0);
  /**
   * The content height the last request went out at. `FlatList` guards the same
   * way: without it every frame of an overscroll asks for the same page, and
   * the guard has to lift on its own once taller content arrives — the user may
   * never scroll again if that content still does not fill the screen.
   */
  const requestedAt = useRef(0);

  const checkEnd = useCallback(() => {
    if (!onEndReached) return;
    const remaining = content.current - viewport.current - offset.current;
    if (remaining > END_REACHED_THRESHOLD) return;
    if (requestedAt.current === content.current) return;
    requestedAt.current = content.current;
    onEndReached();
  }, [onEndReached]);

  const trackScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      offset.current = contentOffset.y;
      content.current = contentSize.height;
      viewport.current = layoutMeasurement.height;
      checkEnd();
    },
    [checkEnd],
  );

  // A first page shorter than the viewport never produces a scroll event, so
  // the size and layout callbacks have to be able to start the next fetch too.
  const trackContent = useCallback(
    (_width: number, height: number) => {
      content.current = height;
      checkEnd();
    },
    [checkEnd],
  );

  const trackViewport = useCallback(
    (event: LayoutChangeEvent) => {
      viewport.current = event.nativeEvent.layout.height;
      checkEnd();
    },
    [checkEnd],
  );

  return (
    <KeyboardAvoider>
      {sticky ? (
        <View style={padded ? styles.sticky : undefined}>{sticky}</View>
      ) : null}

      <KeyboardAwareScrollView
        style={styles.body}
        contentContainerStyle={[
          padded && styles.bodyPadded,
          // The pinned block has already paid for the gutter above the list.
          padded && Boolean(sticky) && styles.bodyBelowSticky,
          // The bar floats above the home indicator, so the inset is on top of
          // the clearance rather than part of it.
          { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
        onScroll={onEndReached ? trackScroll : undefined}
        onContentSizeChange={onEndReached ? trackContent : undefined}
        onLayout={onEndReached ? trackViewport : undefined}
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
      </KeyboardAwareScrollView>
    </KeyboardAvoider>
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
        // Sits a gap above the floating bar rather than on top of it.
        { bottom: insets.bottom + TAB_BAR.height + TAB_BAR.inset * 2 },
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.canvas,
  },
  back: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  barText: { flex: 1, gap: 2 },
  barTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.ink,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  barSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: colors.inkMuted,
  },
  barActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  /** A circular chip, so the header's only two shapes are the pill and the word. */
  iconAction: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  badge: {
    position: "absolute",
    top: 3,
    right: 1,
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
  sticky: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  bodyBelowSticky: { paddingTop: 0 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSolid,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.float,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
}));
