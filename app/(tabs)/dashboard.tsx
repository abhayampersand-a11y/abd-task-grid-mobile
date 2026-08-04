import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth";
import {
  toApiError,
  useDashboardQuery,
  useNotificationsQuery,
  useTasksQuery,
  useTaskStatsQuery,
  type TaskFilters,
} from "@/store/api";
import {
  Body,
  BrandBar,
  Fab,
  IconAction,
  Screen,
} from "@/components/ui/Screen";
import { EmptyState, ErrorNote, StatTile } from "@/components/ui/primitives";
import {
  FilterBarSkeleton,
  SegmentedSkeleton,
  StatStripSkeleton,
  TaskListSkeleton,
} from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TaskList } from "@/components/app/TaskList";
import { TaskFilterBar } from "@/components/app/TaskFilterBar";
import { CreateTaskSheet } from "@/components/app/CreateTaskSheet";
import { CreateGroupSheet } from "@/components/app/CreateGroupSheet";

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
  const [filters, setFilters] = useState<TaskFilters>({
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [taskSheet, setTaskSheet] = useState(false);
  const [groupSheet, setGroupSheet] = useState(false);

  const query = useMemo(
    () => ({ ...filters, scope, pageSize: PAGE_SIZE }),
    [filters, scope],
  );

  const overview = useDashboardQuery();
  const notifications = useNotificationsQuery();
  const tasks = useTasksQuery(query);

  /**
   * The tiles are the status breakdown of whatever the list is showing, so they
   * take the same query. `/tasks/stats` drops `status` and `due` itself — the
   * two filters the tiles represent — which is what keeps a tile's own filter
   * from zeroing out its neighbours.
   */
  const stats = useTaskStatsQuery(query);

  const hasGroups = (overview.data?.groups.length ?? 0) > 0;
  const list = tasks.data?.tasks ?? [];
  const counts = stats.data;

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
      page: 1,
    }));
  }

  function toggleOverdue() {
    setFilters((current) => ({
      ...current,
      due: current.due === "overdue" ? "" : "overdue",
      status: "",
      page: 1,
    }));
  }

  return (
    <Screen>
      <BrandBar
        subtitle={greeting()}
        title={user?.fullName.split(" ")[0] ?? "TaskFlow"}
        right={
          <IconAction
            icon="notifications-outline"
            label="Notifications"
            badge={notifications.data?.unreadCount}
            onPress={() => router.push("/notifications")}
          />
        }
      />

      <Body
        refreshing={overview.isFetching && !overview.isLoading}
        onRefresh={refresh}
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

            <View style={styles.section}>
              <SegmentedControl<Scope>
                segments={[
                  { value: "assigned-to-me", label: "To me" },
                  { value: "assigned-by-me", label: "By me" },
                  { value: "all", label: "All" },
                ]}
                value={scope}
                onChange={(next) => {
                  setScope(next);
                  setFilters((current) => ({ ...current, page: 1 }));
                }}
              />

              {/* Heading and controls share one row. */}
              <TaskFilterBar
                filters={filters}
                onChange={setFilters}
                title="Tasks"
                count={tasks.data?.total}
              />

              {tasks.isLoading ? (
                <TaskListSkeleton count={4} />
              ) : tasks.isError ? (
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

                  <Pagination
                    page={tasks.data?.page ?? 1}
                    totalPages={tasks.data?.totalPages ?? 1}
                    total={tasks.data?.total ?? 0}
                    onChange={(page) =>
                      setFilters((current) => ({ ...current, page }))
                    }
                  />
                </>
              )}
            </View>
          </>
        )}
      </Body>

      {hasGroups ? (
        <Fab label="Create a task" onPress={() => setTaskSheet(true)} />
      ) : null}

      <CreateTaskSheet visible={taskSheet} onClose={() => setTaskSheet(false)} />
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
