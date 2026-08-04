import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth";
import { useInvitationsQuery, useNotificationsQuery } from "@/store/api";

/**
 * The bottom tab bar replaces the web app's off-canvas sidebar entirely
 * (MOBILE.md §1). Admins and members get different tabs — `href: null` removes
 * a screen from the bar without unregistering the route.
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
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: [
          styles.bar,
          { height: 58 + insets.bottom, paddingBottom: insets.bottom },
        ],
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          href: isAdmin ? null : "/dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: "Home",
          href: isAdmin ? "/admin" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          href: isAdmin ? null : "/groups",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          href: isAdmin ? "/users" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
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
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-unread" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          href: isAdmin ? null : "/notifications",
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 6,
    elevation: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: Platform.OS === "ios" ? 0 : -2,
  },
  item: { paddingVertical: 2 },
  badge: {
    backgroundColor: colors.rose500,
    color: colors.onBrand,
    fontSize: 10,
    fontWeight: "700",
  },
}));
