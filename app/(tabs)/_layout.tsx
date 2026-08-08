import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DOCK_SIZE, radius, spacing, TAB_BAR } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { useBlurTarget } from "@/lib/blur-target";
import { useAuth } from "@/lib/auth";
import {
  CreateActionProvider,
  usePublishedCreateAction,
} from "@/lib/create-action";
import { useInvitationsQuery, useNotificationsQuery } from "@/store/api";
import { CreateTaskSheet } from "@/components/app/CreateTaskSheet";

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
 * Android is excluded on purpose, and must stay that way until the bar moves.
 * The blur there is not a backdrop filter: `BlurView` redraws the nominated
 * `blurTarget` subtree and blurs the result — and this bar lives *inside* that
 * subtree, because `BlurTargetProvider` wraps the whole router in
 * `app/_layout.tsx`. Blurring a tree that contains the blurring view is a cycle,
 * so libhwui's `prepareTreeImpl`/`prepareListAndChildren` recurse until the
 * RenderThread's stack overflows: a native SIGSEGV, past any JS error boundary,
 * killing the app the moment the tabs mount. It only bites from SDK 31 up —
 * below that `dimezisBlurViewSdk31Plus` falls back to no blur rather than pay
 * the RenderScript cost, which is why older phones never saw it. Re-enable only
 * after the bar is a sibling of the target rather than a descendant.
 *
 * The other degrade cases end at the same scrim: the target is not attached yet,
 * or the blur is unsupported. In every case `colors.glass` alone still reads as
 * a translucent pill.
 */
function TabBarGlass() {
  const { scheme } = useTheme();
  const target = useBlurTarget();
  const styles = useStyles();

  if (Platform.OS === "android" || !target) {
    return <View style={styles.glass} />;
  }

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
 * The create button, docked in the middle slot of the bar.
 *
 * It is drawn *over* the bar rather than inside it: Android clips a child that
 * paints outside its parent's bounds, so a button that rides above the pill's
 * top edge cannot be a tab item. The `create` route holds the slot open
 * underneath it and this is what the user actually presses.
 *
 * What it creates comes from whichever screen is focused (`lib/create-action`).
 * Screens that create nothing — alerts, requests — fall through to a new task,
 * so the button is never a dead end.
 */
function CreateDock() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const action = usePublishedCreateAction();
  const [fallback, setFallback] = useState(false);

  return (
    <>
      {/* Full-width so the button can centre itself on the bar; `box-none` so
          the rest of that width still passes taps through to the screen. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.dockLayer,
          {
            bottom:
              insets.bottom +
              TAB_BAR.inset +
              TAB_BAR.height / 2 +
              TAB_BAR.dockRaise -
              DOCK_SIZE / 2,
          },
        ]}
      >
        <Pressable
          onPress={() => (action ? action.run() : setFallback(true))}
          accessibilityRole="button"
          accessibilityLabel={action?.label ?? "Create a task"}
          style={({ pressed }) => [styles.dock, pressed && styles.dockPressed]}
        >
          <View style={styles.dockDisc}>
            <Ionicons
              name={action?.icon ?? "add"}
              size={28}
              color={colors.onBrand}
            />
          </View>
        </Pressable>
      </View>

      <CreateTaskSheet visible={fallback} onClose={() => setFallback(false)} />
    </>
  );
}

/**
 * The bottom tab bar replaces the web app's off-canvas sidebar entirely
 * (MOBILE.md §1). Admins and members get different tabs — `href: null` removes
 * a screen from the bar without unregistering the route.
 *
 * It floats: a pill inset from all three edges with the content scrolling under
 * it, which is why `TAB_BAR_CLEARANCE` pads every screen body past its height.
 *
 * The account is not in it. It is one tap from every header instead
 * (`ProfileButton`), which buys the middle slot for the create button — the
 * thing you reach for many times a day, at the one place on a phone your thumb
 * rests anyway.
 */
function TabsChrome() {
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
    <View style={styles.root}>
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
            tabBarIcon: ({ focused }) => (
              <TabIcon name="home" focused={focused} />
            ),
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

        {/*
          Declared in the middle so it lands in the middle: two member tabs
          before it, two after. Admins have no create action anywhere, so for
          them the slot and the dock both go.
        */}
        <Tabs.Screen
          name="create"
          options={{
            title: "Create",
            // `href` is what every other screen hides itself with, but expo-router
            // throws if it is paired with `tabBarButton` — so this slot hides the
            // way `href: null` does under the hood, by collapsing the item.
            tabBarItemStyle: isAdmin ? styles.hidden : styles.item,
            // An inert spacer. The dock floats over this slot, and a pressable
            // underneath it would only steal the edges of its hit area.
            tabBarButton: (props) => (
              <View pointerEvents="none" style={props.style} />
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

        {/* Reached from the header, not from the bar — but still a tab route,
            so switching to it keeps the bar and the other tabs' state. */}
        <Tabs.Screen name="profile" options={{ title: "Profile", href: null }} />
      </Tabs>

      {isAdmin ? null : <CreateDock />}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <CreateActionProvider>
      <TabsChrome />
    </CreateActionProvider>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  root: { flex: 1, backgroundColor: colors.canvas },
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
  /** What `href: null` resolves to internally; see the `create` screen. */
  hidden: { display: "none" },
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
  dockLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    // Above the bar in both stacking models. The layer has no background, so
    // the elevation buys z-order and casts nothing of its own.
    zIndex: 12,
    elevation: 12,
  },
  /**
   * The collar: canvas-coloured and opaque, so the disc looks punched out of
   * the glass instead of dropped on top of it, and the pill's own edge appears
   * to bend around it.
   */
  dock: {
    width: DOCK_SIZE,
    height: DOCK_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  dockDisc: {
    width: TAB_BAR.dock,
    height: TAB_BAR.dock,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSolid,
    alignItems: "center",
    justifyContent: "center",
    // A brand-tinted glow rather than the neutral drop shadow the bar casts —
    // it is the one saturated thing in the chrome and it should look lit.
    shadowColor: colors.brandSolid,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dockPressed: { transform: [{ scale: 0.92 }] },
}));
