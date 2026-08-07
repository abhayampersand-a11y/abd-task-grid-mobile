import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, MIN_TAP, radius, spacing, type Palette } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { formatDate } from "@/lib/format";
import type { AdminUserRow, UserStatus } from "@/lib/types";
import {
  toApiError,
  useAdminUserFeedInfiniteQuery,
  useDeleteUserMutation,
  useSetUserStatusMutation,
  type AdminUserFeedFilters,
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
import { InfiniteFooter } from "@/components/ui/InfiniteFooter";
import { Sheet } from "@/components/ui/Sheet";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProfileButton } from "@/components/app/ProfileButton";

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

/**
 * Pinned above the scroller by `<Body sticky>`, so it needs no keyboard reveal
 * of its own — the avoider takes the space out of the list below it.
 */
function UserSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.search}>
      <Ionicons name="search" size={17} color={colors.inkMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search name or email"
        placeholderTextColor={colors.inkFaint}
        keyboardAppearance={scheme}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInput}
      />
    </View>
  );
}

export default function AdminUsers() {
  const { colors } = useTheme();
  const styles = useStyles();
  const tints = statusTints(colors);

  const [filters, setFilters] = useState<AdminUserFeedFilters>({});
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
    refetch,
  } = useAdminUserFeedInfiniteQuery(filters);
  const [setStatus] = useSetUserStatusMutation();
  const [deleteUser] = useDeleteUserMutation();

  const pages = data?.pages;
  const rows = pages?.flatMap((page) => page.items) ?? [];
  // Each page restates the directory counts; the newest one is the least stale.
  const last = pages?.[pages.length - 1];
  const totals = last?.totals;

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
        right={<ProfileButton />}
      />

      {/* Search and status stay put; only the directory below them scrolls. */}
      <Body
        // Paging is not refreshing — without the guard, reaching the bottom
        // spins the pull-to-refresh control at the top of the list.
        refreshing={isFetching && !isLoading && !isFetchingNextPage}
        onRefresh={refetch}
        onEndReached={hasNextPage ? () => void fetchNextPage() : undefined}
        sticky={
          <>
            <UserSearch
              value={filters.q ?? ""}
              onChange={(value) =>
                setFilters((current) => ({ ...current, q: value }))
              }
            />

            <SegmentedControl
              segments={[
                { value: "", label: "All", count: totals?.all },
                { value: "ACTIVE", label: "Active", count: totals?.active },
                {
                  value: "DISABLED",
                  label: "Disabled",
                  count: totals?.disabled,
                },
              ]}
              value={filters.status ?? ""}
              onChange={(value) =>
                setFilters((current) => ({ ...current, status: value }))
              }
              scrollable
            />
          </>
        }
      >
        {isLoading ? (
          <UserListSkeleton count={6} />
        ) : isError && rows.length === 0 ? (
          // A later page failing keeps the rows already loaded on screen; the
          // footer offers the retry rather than the list vanishing.
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

            <InfiniteFooter
              loading={isFetchingNextPage}
              hasMore={hasNextPage}
              count={rows.length}
              total={last?.total}
              noun="users"
              onRetry={isError ? () => void fetchNextPage() : undefined}
            />
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
}));
