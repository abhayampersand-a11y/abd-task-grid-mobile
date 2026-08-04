import { Text, View } from "react-native";
import { spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth";
import { toApiError, useAdminStatsQuery } from "@/store/api";
import { Body, BrandBar, Screen } from "@/components/ui/Screen";
import {
  Card,
  ErrorNote,
  ProgressBar,
  SectionHeading,
  StatTile,
} from "@/components/ui/primitives";
import { AdminOverviewSkeleton } from "@/components/ui/Skeleton";

export default function AdminOverview() {
  const { user } = useAuth();
  const { statusMeta, priorityMeta } = useTheme();
  const styles = useStyles();
  const { data, isLoading, isFetching, isError, error, refetch } =
    useAdminStatsQuery();

  return (
    <Screen>
      <BrandBar
        subtitle="Administration"
        title={user?.fullName.split(" ")[0] ?? "Admin"}
      />

      <Body refreshing={isFetching && !isLoading} onRefresh={refetch}>
        {isLoading ? (
          <AdminOverviewSkeleton />
        ) : isError || !data ? (
          <ErrorNote message={toApiError(error).message} />
        ) : (
          <>
            <View style={styles.section}>
              <SectionHeading title="People" />
              <View style={styles.grid}>
                <View style={styles.row}>
                  <StatTile
                    label="Total users"
                    value={data.totalUsers}
                    icon="people-outline"
                    tint={statusMeta.TODO}
                  />
                  <StatTile
                    label="Active"
                    value={data.activeUsers}
                    icon="checkmark-circle-outline"
                    tint={statusMeta.COMPLETED}
                  />
                </View>
                <View style={styles.row}>
                  <StatTile
                    label="Disabled"
                    value={data.disabledUsers}
                    icon="ban-outline"
                    tint={priorityMeta.URGENT}
                  />
                  <StatTile
                    label="Joined today"
                    value={data.joinedToday}
                    icon="person-add-outline"
                    tint={statusMeta.IN_REVIEW}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <SectionHeading title="Workload" />
              <View style={styles.grid}>
                <View style={styles.row}>
                  <StatTile
                    label="Groups"
                    value={data.totalGroups}
                    icon="albums-outline"
                    tint={statusMeta.IN_PROGRESS}
                  />
                  <StatTile
                    label="Tasks"
                    value={data.totalTasks}
                    icon="clipboard-outline"
                    tint={statusMeta.BACKLOG}
                  />
                </View>
              </View>
            </View>

            <Card style={styles.completion}>
              <View style={styles.completionHead}>
                <Text style={styles.completionTitle}>Completion rate</Text>
                <Text style={styles.completionValue}>{data.completionRate}%</Text>
              </View>
              <ProgressBar value={data.completionRate} />
              <Text style={styles.completionMeta}>
                {data.completedTasks} of {data.totalTasks} tasks complete
              </Text>
            </Card>

            <Card style={styles.growth}>
              <Text style={styles.growthLabel}>New users this month</Text>
              <Text style={styles.growthValue}>{data.newThisMonth}</Text>
              <Text style={styles.growthMeta}>
                {data.growthRate >= 0 ? "+" : ""}
                {data.growthRate}% versus last month
              </Text>
            </Card>
          </>
        )}
      </Body>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  section: { gap: spacing.sm },
  grid: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  completion: { gap: spacing.sm },
  completionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completionTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  completionValue: { fontSize: 18, fontWeight: "700", color: colors.brandText },
  completionMeta: { fontSize: 12, color: colors.inkMuted },
  growth: { gap: 2 },
  growthLabel: { fontSize: 13, fontWeight: "600", color: colors.inkMuted },
  growthValue: { fontSize: 28, fontWeight: "700", color: colors.ink },
  growthMeta: { fontSize: 12, color: colors.inkMuted },
}));
