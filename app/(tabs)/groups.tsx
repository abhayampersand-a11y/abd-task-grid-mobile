import { useState } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@/lib/theme";
import { makeStyles } from "@/lib/theme-context";
import { toApiError, useGroupsQuery } from "@/store/api";
import { Body, BrandBar, Fab, Screen } from "@/components/ui/Screen";
import {
  Card,
  EmptyState,
  ErrorNote,
  ProgressBar,
} from "@/components/ui/primitives";
import { GroupListSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { GroupCard } from "@/components/app/GroupCard";
import { CreateGroupSheet } from "@/components/app/CreateGroupSheet";

export default function Groups() {
  const [sheet, setSheet] = useState(false);
  const styles = useStyles();
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGroupsQuery();

  const groups = data?.groups ?? [];
  const totals = groups.reduce(
    (acc, group) => ({
      tasks: acc.tasks + group.taskCount,
      done: acc.done + group.completedTaskCount,
    }),
    { tasks: 0, done: 0 },
  );
  const completion =
    totals.tasks === 0 ? 0 : Math.round((totals.done / totals.tasks) * 100);

  return (
    <Screen>
      <BrandBar
        title="Groups"
        subtitle={`${groups.length} group${groups.length === 1 ? "" : "s"}`}
      />

      {/* The roll-up stays put; only the list of groups scrolls under it. */}
      <Body
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
        sticky={
          !isLoading && !isError && groups.length > 0 ? (
            <Card style={styles.banner}>
              <View style={styles.bannerRow}>
                <Text style={styles.bannerTitle}>Across all groups</Text>
                <Text style={styles.bannerValue}>{completion}%</Text>
              </View>
              <ProgressBar value={completion} />
              <Text style={styles.bannerMeta}>
                {totals.done} of {totals.tasks} tasks complete
              </Text>
            </Card>
          ) : undefined
        }
      >
        {isLoading ? (
          <>
            <Card style={styles.banner}>
              <View style={styles.bannerRow}>
                <Skeleton width="46%" height={14} />
                <Skeleton width={38} height={18} />
              </View>
              <Skeleton height={6} round />
              <Skeleton width="52%" height={12} />
            </Card>
            <GroupListSkeleton count={3} />
          </>
        ) : isError ? (
          <ErrorNote message={toApiError(error).message} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No groups yet"
            body="Create a group to start assigning tasks to the people you work with."
            action={
              <Button
                label="Create a group"
                icon="add"
                onPress={() => setSheet(true)}
                fullWidth
              />
            }
          />
        ) : (
          <View style={styles.list}>
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </View>
        )}
      </Body>

      <Fab label="Create a group" onPress={() => setSheet(true)} />

      <CreateGroupSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  banner: { gap: spacing.sm, borderRadius: radius.card },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  bannerValue: { fontSize: 18, fontWeight: "700", color: colors.brandText },
  bannerMeta: { fontSize: 12, color: colors.inkMuted },
  list: { gap: spacing.md },
}));
