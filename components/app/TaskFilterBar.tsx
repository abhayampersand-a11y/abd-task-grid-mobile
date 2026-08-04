import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, MIN_TAP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { PRIORITY_ORDER, STATUS_ORDER } from "@/lib/format";
import type { UserSummary } from "@/lib/types";
import { useDirectoryQuery, type TaskFilters } from "@/store/api";
import { Sheet } from "@/components/ui/Sheet";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface Props {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  /**
   * Who can appear in the two people filters. A group screen passes its own
   * members; the dashboard leaves it out and falls back to the directory, which
   * is what the web board does.
   */
  people?: UserSummary[];
  /** Section heading to absorb, so the list does not pay for two rows. */
  title?: string;
  count?: number;
}

const DUE_OPTIONS = [
  { value: "", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Due this week" },
  { value: "none", label: "No deadline" },
];

/**
 * The values GET /api/tasks actually understands. Anything else falls through
 * to `newest`, so the labels have to name real sorts.
 */
const SORT_OPTIONS = [
  { value: "", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "due-soon", label: "Due soonest" },
  { value: "priority", label: "Highest priority" },
];

/** The filters the count badge and "Clear all" consider, excluding sort. */
const FILTER_KEYS = [
  "status",
  "priority",
  "assigneeId",
  "assignedBy",
  "due",
] as const;

/**
 * Every filter collapses into one button that opens a sheet (MOBILE.md §4), and
 * search sits behind a toggle beside it rather than holding a permanent
 * full-width row — the web board does the same on phones so the list starts
 * near the top of the viewport instead of below a stack of controls. Both write
 * to the same filter object the list already reads, so there is no duplicate
 * state.
 */
export function TaskFilterBar({
  filters,
  onChange,
  people,
  title,
  count,
}: Props) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { colors, scheme, statusMeta, priorityMeta } = useTheme();
  const styles = useStyles();

  // Only fetched when the caller has no roster of its own to offer.
  const { data: directory } = useDirectoryQuery(undefined, {
    skip: Boolean(people),
  });
  const roster = people ?? directory?.users ?? [];

  const activeCount = FILTER_KEYS.filter((key) => filters[key]).length;
  const dirty = activeCount > 0 || Boolean(filters.q) || Boolean(filters.sort);

  function set(patch: Partial<TaskFilters>) {
    onChange({ ...filters, ...patch, page: 1 });
  }

  function clearAll() {
    onChange({
      ...filters,
      status: "",
      priority: "",
      assigneeId: "",
      assignedBy: "",
      due: "",
      sort: "",
      q: "",
      page: 1,
    });
  }

  const peopleOptions = [
    { value: "", label: "Anyone" },
    ...roster.map((person) => ({ value: person.id, label: person.fullName })),
  ];

  const searching = searchOpen || Boolean(filters.q);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {title ? (
          <>
            <Text style={styles.title}>{title}</Text>
            {count === undefined ? null : (
              <Text style={styles.count}>{count}</Text>
            )}
          </>
        ) : null}

        <View style={styles.spacer} />

        <Pressable
          onPress={() => {
            // Closing the box clears the term with it — leaving a hidden filter
            // applied is how a list ends up looking broken.
            if (searching) set({ q: "" });
            setSearchOpen((value) => !value);
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: searching }}
          accessibilityLabel="Search tasks"
          style={({ pressed }) => [
            styles.iconButton,
            searching && styles.iconButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={searching ? "close" : "search"}
            size={19}
            color={searching ? colors.brandText : colors.inkSoft}
          />
        </Pressable>

        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Filter. ${activeCount} active`}
          style={({ pressed }) => [
            styles.iconButton,
            activeCount > 0 && styles.iconButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={19}
            color={activeCount > 0 ? colors.brandText : colors.inkSoft}
          />
          {activeCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {searching ? (
        <View style={styles.search}>
          <Ionicons name="search" size={17} color={colors.inkMuted} />
          <TextInput
            autoFocus
            value={filters.q ?? ""}
            onChangeText={(value) => set({ q: value })}
            placeholder="Search tasks"
            placeholderTextColor={colors.inkFaint}
            keyboardAppearance={scheme}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {filters.q ? (
            <Pressable
              onPress={() => set({ q: "" })}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={17} color={colors.inkFaint} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Filter tasks"
        footer={
          <>
            <Button label="Show results" onPress={() => setOpen(false)} fullWidth />
            {dirty ? (
              <Button
                label="Clear all"
                variant="ghost"
                onPress={clearAll}
                fullWidth
              />
            ) : null}
          </>
        }
      >
        <Select
          label="Status"
          value={filters.status ?? ""}
          onChange={(value) => set({ status: value })}
          options={[
            { value: "", label: "Any status" },
            ...STATUS_ORDER.map((key) => ({
              value: key as string,
              label: statusMeta[key].label,
            })),
          ]}
        />

        <Select
          label="Priority"
          value={filters.priority ?? ""}
          onChange={(value) => set({ priority: value })}
          options={[
            { value: "", label: "Any priority" },
            ...PRIORITY_ORDER.map((key) => ({
              value: key as string,
              label: priorityMeta[key].label,
            })),
          ]}
        />

        <Select
          label="Assigned to"
          value={filters.assigneeId ?? ""}
          onChange={(value) => set({ assigneeId: value })}
          options={peopleOptions}
        />

        <Select
          label="Assigned by"
          value={filters.assignedBy ?? ""}
          onChange={(value) => set({ assignedBy: value })}
          options={peopleOptions}
        />

        <Select
          label="Due date"
          value={filters.due ?? ""}
          onChange={(value) => set({ due: value })}
          options={DUE_OPTIONS}
        />

        <Select
          label="Sort by"
          value={filters.sort ?? ""}
          onChange={(value) => set({ sort: value })}
          options={SORT_OPTIONS}
        />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  count: { fontSize: 13, fontWeight: "600", color: colors.inkMuted },
  spacer: { flex: 1 },
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
  iconButton: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    borderColor: colors.brand200,
    backgroundColor: colors.brand50,
  },
  pressed: { opacity: 0.7 },
  countBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSolid,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 10, fontWeight: "700", color: colors.onBrand },
}));
