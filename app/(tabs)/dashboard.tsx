import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth";
import { useCreateAction } from "@/lib/create-action";
import {
  toApiError,
  useDashboardQuery,
  useNotificationsQuery,
  useTaskFeedInfiniteQuery,
  useTaskStatsQuery,
  type TaskFeedFilters,
} from "@/store/api";
import { Body, BrandBar, IconAction, Screen } from "@/components/ui/Screen";
import { EmptyState, ErrorNote, StatTile } from "@/components/ui/primitives";
import {
  FilterBarSkeleton,
  SegmentedSkeleton,
  StatStripSkeleton,
  TaskListSkeleton,
} from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { InfiniteFooter } from "@/components/ui/InfiniteFooter";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TaskList } from "@/components/app/TaskList";
import { TaskFilterBar } from "@/components/app/TaskFilterBar";
import { CreateTaskSheet } from "@/components/app/CreateTaskSheet";
import { CreateGroupSheet } from "@/components/app/CreateGroupSheet";
import { ProfileButton } from "@/components/app/ProfileButton";

type Scope = "assigned-to-me" | "assigned-by-me" | "all";

const PAGE_SIZE = 10;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { statusMeta, priorityMeta } = useTheme();
  const styles = useStyles();

  const [scope, setScope] = useState<Scope>("assigned-to-me");
  const [filters, setFilters] = useState<TaskFeedFilters>({});
  const [taskSheet, setTaskSheet] = useState(false);
  const [groupSheet, setGroupSheet] = useState(false);

  const overview = useDashboardQuery();
  const groups = overview.data?.groups;

  /**
   * A group left or deleted in another session would otherwise keep filtering
   * the feed by an id the API answers with a 403, so the id only survives while
   * the picker can still name it.
   */
  const groupId =
    filters.groupId && groups?.some((group) => group.id === filters.groupId)
      ? filters.groupId
      : "";

  const query = useMemo(
    () => ({ ...filters, groupId, scope, pageSize: PAGE_SIZE }),
    [filters, groupId, scope],
  );

  const notifications = useNotificationsQuery();
  /**
   * Changing a filter changes the cache key, so the feed drops back to a single
   * page on its own — there is no scroll position to reset by hand.
   */
  const tasks = useTaskFeedInfiniteQuery(query);

  /**
   * The tiles are the status breakdown of whatever the list is showing, so they
   * take the same query. `/tasks/stats` drops `status` and `due` itself — the
   * two filters the tiles represent — which is what keeps a tile's own filter
   * from zeroing out its neighbours.
   */
  const stats = useTaskStatsQuery(query);

  const hasGroups = (groups?.length ?? 0) > 0;
  const pages = tasks.data?.pages;
  const list = useMemo(
    () => pages?.flatMap((page) => page.tasks) ?? [],
    [pages],
  );
  // The newest page carries the freshest total; page one's may be minutes old.
  const total = pages?.[pages.length - 1]?.total;
  const counts = stats.data;

  /**
   * The pinned controls only mean anything once there is a list to steer, so
   * loading, error and the no-groups empty state all scroll as one page.
   */
  const showControls = !overview.isLoading && !overview.isError && hasGroups;

  /**
   * The tab bar's create button is this screen's while it is focused. With no
   * group there is nothing to file a task under, so the button offers the step
   * that comes first instead — the same swap the empty state makes.
   */
  useCreateAction(
    hasGroups
      ? { label: "Create a task", onPress: () => setTaskSheet(true) }
      : { label: "Create a group", onPress: () => setGroupSheet(true) },
  );

  function refresh() {
    void overview.refetch();
    void tasks.refetch();
    void stats.refetch();
  }

  /** Tapping a tile filters by it, tapping the active one clears it again. */
  function toggleStatus(status: string) {
    setFilters((current) => ({
      ...current,
      status: current.status === status ? "" : status,
      due: "",
    }));
  }

  function toggleOverdue() {
    setFilters((current) => ({
      ...current,
      due: current.due === "overdue" ? "" : "overdue",
      status: "",
    }));
  }

  return (
    <Screen>
      <BrandBar
        subtitle={greeting()}
        title={user?.fullName.split(" ")[0] ?? "TaskFlow"}
        right={
          <>
            <IconAction
              icon="notifications-outline"
              label="Notifications"
              badge={notifications.data?.unreadCount}
              onPress={() => router.push("/notifications")}
            />
            <ProfileButton />
          </>
        }
      />

      {/* Tiles, scope and filters stay put; only the task list scrolls. */}
      <Body
        refreshing={overview.isFetching && !overview.isLoading}
        onRefresh={refresh}
        onEndReached={
          tasks.hasNextPage ? () => void tasks.fetchNextPage() : undefined
        }
        sticky={
          showControls ? (
            <>
              {!counts ? (
                <StatStripSkeleton />
              ) : (
                /* One scrolling row of compact chips rather than a 2×2 grid of
                   tiles, so the list starts near the top of the viewport — the
                   same trade the web board makes on phones. */
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.stripOuter}
                  contentContainerStyle={styles.strip}
                >
                  <StatTile
                    compact
                    label="Pending"
                    value={counts.pending}
                    icon="ellipse-outline"
                    tint={statusMeta.TODO}
                    active={filters.status === "TODO"}
                    onPress={() => toggleStatus("TODO")}
                  />
                  <StatTile
                    compact
                    label="In progress"
                    value={counts.inProgress}
                    icon="play-circle-outline"
                    tint={statusMeta.IN_PROGRESS}
                    active={filters.status === "IN_PROGRESS"}
                    onPress={() => toggleStatus("IN_PROGRESS")}
                  />
                  <StatTile
                    compact
                    label="Completed"
                    value={counts.completed}
                    icon="checkmark-circle-outline"
                    tint={statusMeta.COMPLETED}
                    active={filters.status === "COMPLETED"}
                    onPress={() => toggleStatus("COMPLETED")}
                  />
                  <StatTile
                    compact
                    label="Overdue"
                    value={counts.overdue}
                    icon="alert-circle-outline"
                    tint={priorityMeta.URGENT}
                    active={filters.due === "overdue"}
                    onPress={toggleOverdue}
                  />
                </ScrollView>
              )}

              <SegmentedControl<Scope>
                segments={[
                  { value: "assigned-to-me", label: "To me" },
                  { value: "assigned-by-me", label: "By me" },
                  { value: "all", label: "All" },
                ]}
                value={scope}
                onChange={setScope}
              />

              {/* Heading and controls share one row. */}
              <TaskFilterBar
                filters={filters}
                onChange={setFilters}
                groups={groups}
                title="All groups"
                count={total}
              />
            </>
          ) : undefined
        }
      >
        {overview.isLoading ? (
          <>
            <StatStripSkeleton />
            <View style={styles.section}>
              <SegmentedSkeleton segments={3} />
              <FilterBarSkeleton />
              <TaskListSkeleton count={6} />
            </View>
          </>
        ) : overview.isError ? (
          <ErrorNote message={toApiError(overview.error).message} />
        ) : !hasGroups ? (
          <EmptyState
            icon="people-outline"
            title="You are not in a group yet"
            body="Tasks live inside groups. Create one and invite the people you work with, and assignments will show up here."
            action={
              <Button
                label="Create a group"
                icon="add"
                onPress={() => setGroupSheet(true)}
                fullWidth
              />
            }
          />
        ) : (
          <View style={styles.section}>
            {tasks.isLoading ? (
              <TaskListSkeleton count={4} />
            ) : tasks.isError && list.length === 0 ? (
              // A later page failing keeps the pages already loaded on screen;
              // the footer offers the retry rather than the list vanishing.
              <ErrorNote message={toApiError(tasks.error).message} />
            ) : list.length === 0 ? (
              <EmptyState
                icon="checkmark-done-outline"
                title="Nothing here"
                body="No tasks match this view. Try a different scope or clear your filters."
              />
            ) : (
              <>
                <TaskList tasks={list} showActions />

                <InfiniteFooter
                  loading={tasks.isFetchingNextPage}
                  hasMore={tasks.hasNextPage}
                  count={list.length}
                  total={total}
                  onRetry={
                    tasks.isError ? () => void tasks.fetchNextPage() : undefined
                  }
                />
              </>
            )}
          </View>
        )}
      </Body>

      {/* Creating from a group-filtered feed starts on that group. */}
      <CreateTaskSheet
        visible={taskSheet}
        groupId={groupId || undefined}
        onClose={() => setTaskSheet(false)}
      />
      <CreateGroupSheet visible={groupSheet} onClose={() => setGroupSheet(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  // Bleeds past the body gutter so the strip scrolls edge to edge, then pads
  // itself back in — the RN equivalent of the web's `-mx-4 px-4`.
  stripOuter: { marginHorizontal: -spacing.lg },
  strip: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  section: { gap: spacing.md },
}));
