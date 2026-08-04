import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { relativeTime } from "@/lib/format";
import type { NotificationDto, NotificationType } from "@/lib/types";
import {
  toApiError,
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/store/api";
import { Body, BrandBar, Screen } from "@/components/ui/Screen";
import { EmptyState, ErrorNote } from "@/components/ui/primitives";
import { NotificationListSkeleton } from "@/components/ui/Skeleton";

const ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  TASK_ASSIGNED: "clipboard-outline",
  TASK_UPDATED: "sync-outline",
  TASK_COMPLETED: "checkmark-circle-outline",
  NEW_COMMENT: "chatbubble-outline",
  GROUP_INVITATION: "people-outline",
};

export default function Notifications() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const { data, isLoading, isFetching, isError, error, refetch } =
    useNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [remove] = useDeleteNotificationMutation();

  const list = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  function open(notification: NotificationDto) {
    if (!notification.read) void markRead(notification.id);

    // Links come from the web app as `/tasks/:id` and `/groups/:id`; the native
    // routes are singular, so translate rather than duplicating them here.
    const link = notification.link;
    if (!link) return;

    if (link === "/requests") {
      router.push("/requests");
      return;
    }

    const task = link.match(/^\/tasks\/([^/]+)/);
    if (task) {
      router.push(`/task/${task[1]}`);
      return;
    }

    const group = link.match(/^\/groups\/([^/]+)/);
    if (group) router.push(`/group/${group[1]}`);
  }

  return (
    <Screen>
      <BrandBar
        title="Alerts"
        subtitle={unread > 0 ? `${unread} unread` : "All caught up"}
        right={
          unread > 0 ? (
            <Pressable
              onPress={() => void markAllRead()}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              style={styles.markAll}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : null
        }
      />

      <Body refreshing={isFetching && !isLoading} onRefresh={refetch}>
        {isLoading ? (
          <NotificationListSkeleton count={6} />
        ) : isError ? (
          <ErrorNote message={toApiError(error).message} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No alerts"
            body="Assignments, comments and status changes will show up here."
          />
        ) : (
          <View style={styles.list}>
            {list.map((notification) => (
              // Dismiss is a sibling of the row's tap target rather than a
              // child of it — a button inside a button is invalid on web and
              // ambiguous to press anywhere.
              <View
                key={notification.id}
                style={[styles.row, !notification.read && styles.rowUnread]}
              >
                <Pressable
                  onPress={() => open(notification)}
                  accessibilityRole="button"
                  accessibilityLabel={notification.title}
                  style={({ pressed }) => [
                    styles.target,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.icon,
                      !notification.read && styles.iconUnread,
                    ]}
                  >
                    <Ionicons
                      name={ICONS[notification.type]}
                      size={19}
                      color={
                        notification.read ? colors.inkMuted : colors.brand600
                      }
                    />
                  </View>

                  <View style={styles.text}>
                    <Text
                      style={[
                        styles.title,
                        !notification.read && styles.titleUnread,
                      ]}
                      numberOfLines={2}
                    >
                      {notification.title}
                    </Text>
                    <Text style={styles.body} numberOfLines={3}>
                      {notification.body}
                    </Text>
                    <Text style={styles.time}>
                      {relativeTime(notification.createdAt)}
                    </Text>
                  </View>
                </Pressable>

                {/* Dismiss stays an explicit button — no swipe required. */}
                <Pressable
                  onPress={() => void remove(notification.id)}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={`Dismiss ${notification.title}`}
                  style={styles.dismiss}
                >
                  <Ionicons name="close" size={18} color={colors.inkFaint} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Body>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  markAll: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  markAllText: { fontSize: 13, fontWeight: "600", color: colors.brandText },
  list: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  rowUnread: { borderColor: colors.brand100, backgroundColor: colors.brand50 },
  target: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  pressed: { opacity: 0.75 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  iconUnread: { backgroundColor: colors.surface },
  text: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: "600", color: colors.inkSoft },
  titleUnread: { color: colors.ink },
  body: { fontSize: 13, color: colors.inkMuted, lineHeight: 18 },
  time: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  dismiss: { padding: 2 },
}));
