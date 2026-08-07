import { Tabs } from "expo-router";
import { View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing, TAB_BAR } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { useBlurTarget } from "@/lib/blur-target";
import { useAuth } from "@/lib/auth";
import { useInvitationsQuery, useNotificationsQuery } from "@/store/api";

/** Diameter of the selected disc. */
const DISC = 48;

/**
 * The padding the navigator puts inside every tab item. It is baked into the
 * library's own stylesheet, so the only way to work with it is to know it.
 */
const ITEM_PADDING = 5;

/**
 * The frosted pane behind the tabs. It is a sibling of the tab items rather
 * than a background colour on the bar, because a blur has to be a real view
 * with the content it samples behind it.
 *
 * Three things can go wrong and all three degrade to the same scrim: the target
 * is not attached yet, the device is an Android below SDK 31 (where
 * `dimezisBlurViewSdk31Plus` falls back to no blur rather than pay the
 * RenderScript cost), or the blur is simply not supported. In every case
 * `colors.glass` alone still reads as a translucent pill.
 */
function TabBarGlass() {
  const { scheme } = useTheme();
  const target = useBlurTarget();
  const styles = useStyles();

  if (!target) return <View style={styles.glass} />;

  return (
    <BlurView
      blurTarget={target}
      blurMethod="dimezisBlurViewSdk31Plus"
      tint={scheme === "dark" ? "dark" : "light"}
      intensity={scheme === "dark" ? 55 : 70}
      style={styles.glass}
    />
  );
}

/**
 * The selected tab is a filled disc rather than a tinted glyph — at this size a
 * colour change alone is easy to miss, and the disc is what carries the shape
 * language of the bar it sits in. It inverts (`ink` on `canvas`) so it reads the
 * same way in both themes without needing a colour of its own.
 */
function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.icon, focused && { backgroundColor: colors.ink }]}>
      <Ionicons
        name={name}
        size={22}
        // Unselected glyphs sit on glass with moving content behind it, so they
        // take the stronger of the two muted tones.
        color={focused ? colors.canvas : colors.inkSoft}
      />
    </View>
  );
}

/**
 * The bottom tab bar replaces the web app's off-canvas sidebar entirely
 * (MOBILE.md §1). Admins and members get different tabs — `href: null` removes
 * a screen from the bar without unregistering the route.
 *
 * It floats: a pill inset from all three edges with the content scrolling under
 * it, which is why `TAB_BAR_CLEARANCE` pads every screen body past its height.
 */
export default function TabsLayout() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  // Admins never see the alerts or requests tabs, so those badge queries are
  // theirs to skip.
  const { data } = useNotificationsQuery(undefined, {
    skip: isAdmin,
    pollingInterval: 60_000,
  });
  const { data: requests } = useInvitationsQuery(undefined, {
    skip: isAdmin,
    pollingInterval: 60_000,
  });
  const unread = data?.unreadCount ?? 0;
  const pendingRequests = requests?.pendingCount ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkMuted,
        // The label is dropped: with the selected disc doing the work, seven
        // 11pt captions are noise, and the bar can be a pill without them.
        tabBarShowLabel: false,
        tabBarStyle: [styles.bar, { bottom: insets.bottom + TAB_BAR.inset }],
        tabBarItemStyle: styles.item,
        tabBarIconStyle: styles.iconSlot,
        tabBarBadgeStyle: styles.badge,
        tabBarBackground: () => <TabBarGlass />,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          href: isAdmin ? null : "/dashboard",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: "Home",
          href: isAdmin ? "/admin" : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="stats-chart" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          href: isAdmin ? null : "/groups",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="people" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          href: isAdmin ? "/users" : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person-circle" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          href: isAdmin ? null : "/requests",
          tabBarBadge:
            pendingRequests > 0
              ? pendingRequests > 99
                ? "99+"
                : pendingRequests
              : undefined,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="mail-unread" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          href: isAdmin ? null : "/notifications",
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="notifications" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  bar: {
    position: "absolute",
    // The bar is pinned `start: 0, end: 0` by the navigator, so the inset has to
    // come from a margin — a `left`/`right` here would lose to those.
    marginHorizontal: spacing.lg,
    height: TAB_BAR.height,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    // Transparent would kill the iOS shadow and leave nothing behind the blur;
    // `glass` is the scrim the blur sits on and the fallback if it never runs.
    backgroundColor: colors.glass,
    // A closed 1pt edge in place of the navigator's top-only hairline, which
    // would otherwise cut a straight line across the top of the pill.
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.glassLine,
    ...shadow.float,
  },
  // `borderRadius` alone does not clip a native blur — SDK 57 documents
  // `overflow: 'hidden'` as the fix.
  glass: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  /**
   * `flex` is read off this style and handed to the pressable *inside* the
   * item, which is otherwise sized by its content and would sit at the top of
   * the bar. This is what makes that pressable fill the full height.
   */
  item: { flex: 1, height: TAB_BAR.height },
  /**
   * The box the navigator reserves for `tabBarIcon`, normally 31×28 and pinned
   * to the top of the item under a `justifyContent: 'flex-start'` that no
   * public option can reach — it assumes a label sits underneath. Sizing the
   * slot to the whole content box instead (the item less its fixed 5pt padding)
   * puts the slot's centre on the bar's centre, and the icon is centred in the
   * slot from there.
   */
  iconSlot: { width: DISC, height: TAB_BAR.height - ITEM_PADDING * 2 },
  icon: {
    width: DISC,
    height: DISC,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: colors.rose500,
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
    // Pulled in from the slot's corner so it reads as attached to the glyph
    // rather than floating at the edge of the enlarged slot.
    top: 6,
    end: 4,
  },
}));
