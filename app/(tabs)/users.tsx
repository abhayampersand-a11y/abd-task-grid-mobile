import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, MIN_TAP, radius, spacing, type Palette } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { formatDate } from "@/lib/format";
import type { AdminUserRow, UserStatus } from "@/lib/types";
import {
  toApiError,
  useAdminUsersQuery,
  useDeleteUserMutation,
  useSetUserStatusMutation,
  type AdminUserFilters,
} from "@/store/api";
import { Body, BrandBar, Screen } from "@/components/ui/Screen";
import {
  Avatar,
  Card,
  Chip,
  EmptyState,
  ErrorNote,
} from "@/components/ui/primitives";
import { UserListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type Tint = { label: string; bg: string; fg: string; dot: string };

function statusTints(colors: Palette): Record<UserStatus, Tint> {
  return {
    ACTIVE: {
      label: "Active",
      bg: colors.emerald50,
      fg: colors.emerald700,
      dot: colors.emerald500,
    },
    PENDING: {
      label: "Pending",
      bg: colors.amber50,
      fg: colors.amber700,
      dot: colors.amber500,
    },
    DISABLED: {
      label: "Disabled",
      bg: colors.rose50,
      fg: colors.rose700,
      dot: colors.rose500,
    },
  };
}

export default function AdminUsers() {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const tints = statusTints(colors);

  const [filters, setFilters] = useState<AdminUserFilters>({ page: 1 });
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useAdminUsersQuery(filters);
  const [setStatus] = useSetUserStatusMutation();
  const [deleteUser] = useDeleteUserMutation();

  const rows = data?.items ?? [];
  const totals = data?.totals;

  function toggleStatus(user: AdminUserRow) {
    const next: "ACTIVE" | "DISABLED" =
      user.status === "DISABLED" ? "ACTIVE" : "DISABLED";
    setSelected(null);
    void setStatus({ userId: user.id, status: next })
      .unwrap()
      .catch((err) => Alert.alert("Could not update", toApiError(err).message));
  }

  function confirmDelete(user: AdminUserRow) {
    setSelected(null);
    Alert.alert(
      "Delete user",
      `Permanently delete ${user.fullName}? Their groups and tasks go with them.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteUser(user.id)
              .unwrap()
              .catch((err) =>
                Alert.alert("Could not delete", toApiError(err).message),
              );
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <BrandBar
        title="Users"
        subtitle={totals ? `${totals.all} in the directory` : undefined}
      />

      <Body refreshing={isFetching && !isLoading} onRefresh={refetch}>
        <View style={styles.controls}>
          <View style={styles.search}>
            <Ionicons name="search" size={17} color={colors.inkMuted} />
            <TextInput
              value={filters.q ?? ""}
              onChangeText={(value) =>
                setFilters((current) => ({ ...current, q: value, page: 1 }))
              }
              placeholder="Search name or email"
              placeholderTextColor={colors.inkFaint}
              keyboardAppearance={scheme}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />
          </View>

          <SegmentedControl
            segments={[
              { value: "", label: "All", count: totals?.all },
              { value: "ACTIVE", label: "Active", count: totals?.active },
              { value: "DISABLED", label: "Disabled", count: totals?.disabled },
            ]}
            value={filters.status ?? ""}
            onChange={(value) =>
              setFilters((current) => ({ ...current, status: value, page: 1 }))
            }
            scrollable
          />
        </View>

        {isLoading ? (
          <UserListSkeleton count={6} />
        ) : isError ? (
          <ErrorNote message={toApiError(error).message} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="person-outline"
            title="No users match"
            body="Try a different search or filter."
          />
        ) : (
          <>
            <View style={styles.list}>
              {rows.map((user) => (
                <Card key={user.id} style={styles.row}>
                  <Avatar user={user} size={42} />

                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {user.fullName}
                    </Text>
                    <Text style={styles.email} numberOfLines={1}>
                      {user.email}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {user.groupCount} group{user.groupCount === 1 ? "" : "s"} ·{" "}
                      {user.taskCount} task{user.taskCount === 1 ? "" : "s"} ·{" "}
                      {formatDate(user.createdAt)}
                    </Text>
                    <View style={styles.chips}>
                      <Chip meta={tints[user.status]} />
                      {user.role === "ADMIN" ? (
                        <Chip
                          meta={{
                            label: "Admin",
                            bg: colors.brand50,
                            fg: colors.brand700,
                            dot: colors.brand600,
                          }}
                          showDot={false}
                        />
                      ) : null}
                    </View>
                  </View>

                  {/* Row actions live in a sheet — no hover row to reveal them. */}
                  <Pressable
                    hitSlop={HIT_SLOP}
                    onPress={() => setSelected(user)}
                    accessibilityRole="button"
                    accessibilityLabel={`Actions for ${user.fullName}`}
                    style={styles.overflow}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={19}
                      color={colors.inkMuted}
                    />
                  </Pressable>
                </Card>
              ))}
            </View>

            {data && data.totalPages > 1 ? (
              <View style={styles.pager}>
                <Button
                  label="Previous"
                  variant="secondary"
                  size="sm"
                  disabled={data.page <= 1}
                  onPress={() =>
                    setFilters((current) => ({
                      ...current,
                      page: Math.max(1, (current.page ?? 1) - 1),
                    }))
                  }
                />
                <Text style={styles.pagerText}>
                  Page {data.page} of {data.totalPages}
                </Text>
                <Button
                  label="Next"
                  variant="secondary"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onPress={() =>
                    setFilters((current) => ({
                      ...current,
                      page: (current.page ?? 1) + 1,
                    }))
                  }
                />
              </View>
            ) : null}
          </>
        )}
      </Body>

      <Sheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.fullName ?? ""}
      >
        {selected ? (
          <>
            <Button
              label={selected.status === "DISABLED" ? "Enable account" : "Disable account"}
              variant="secondary"
              icon={selected.status === "DISABLED" ? "checkmark-circle-outline" : "ban-outline"}
              onPress={() => toggleStatus(selected)}
              fullWidth
            />
            <Button
              label="Delete user"
              variant="danger"
              icon="trash-outline"
              onPress={() => confirmDelete(selected)}
              fullWidth
            />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  controls: { gap: spacing.md },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  email: { fontSize: 13, color: colors.inkMuted },
  meta: { fontSize: 11, color: colors.inkFaint },
  chips: { flexDirection: "row", gap: 6, marginTop: 6 },
  overflow: {
    width: MIN_TAP - 12,
    height: MIN_TAP - 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  pagerText: { fontSize: 13, fontWeight: "600", color: colors.inkMuted },
}));
