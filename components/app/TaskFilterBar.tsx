import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, MIN_TAP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { PRIORITY_ORDER, STATUS_ORDER } from "@/lib/format";
import type { GroupSummary, UserSummary } from "@/lib/types";
import { useDirectoryQuery, type TaskFeedFilters } from "@/store/api";
import { Sheet } from "@/components/ui/Sheet";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useKeyboardReveal } from "@/components/ui/KeyboardAvoider";

interface Props {
  filters: TaskFeedFilters;
  onChange: (next: TaskFeedFilters) => void;
  /**
   * Who can appear in the two people filters. A group screen passes its own
   * members; the dashboard leaves it out and falls back to the directory, which
   * is what the web board does.
   */
  people?: UserSummary[];
  /**
   * The groups the feed may be narrowed to. Passing them turns the heading into
   * a dropdown that writes `filters.groupId`; a screen already scoped to one
   * group (the group detail page) leaves it out and keeps the plain title.
   */
  groups?: GroupSummary[];
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
  groups,
  title,
  count,
}: Props) {
  const [open, setOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { colors, scheme, statusMeta, priorityMeta, groupColor } = useTheme();
  const reveal = useKeyboardReveal();
  const styles = useStyles();

  // Only fetched when the caller has no roster of its own to offer.
  const { data: directory } = useDirectoryQuery(undefined, {
    skip: Boolean(people),
  });
  const roster = people ?? directory?.users ?? [];

  const activeCount = FILTER_KEYS.filter((key) => filters[key]).length;
  const dirty = activeCount > 0 || Boolean(filters.q) || Boolean(filters.sort);

  // No page to reset: the lists this drives are infinite, and a changed filter
  // is a new cache key, which starts them back at page one by itself.
  function set(patch: Partial<TaskFeedFilters>) {
    onChange({ ...filters, ...patch });
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
    });
  }

  const peopleOptions = [
    { value: "", label: "Anyone" },
    ...roster.map((person) => ({ value: person.id, label: person.fullName })),
  ];

  const searching = searchOpen || Boolean(filters.q);

  // A group that has since been left or deleted leaves an id with nothing to
  // name it; the picker reads as "All groups" and the dashboard drops the id.
  const activeGroup = groups?.find((group) => group.id === filters.groupId);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {groups ? (
          /* The heading doubles as the group picker, so narrowing by group
             costs no extra row above the list. */
          <Pressable
            onPress={() => setGroupOpen(true)}
            accessibilityRole="button"
            accessibilityState={{ expanded: groupOpen }}
            accessibilityLabel={`Group. ${activeGroup?.name ?? "All groups"}`}
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: activeGroup
                    ? groupColor(activeGroup.colorKey).dot
                    : colors.inkFaint,
                },
              ]}
            />
            <Text numberOfLines={1} style={styles.title}>
              {activeGroup?.name ?? title ?? "All groups"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.inkMuted} />
          </Pressable>
        ) : title ? (
          <Text style={styles.title}>{title}</Text>
        ) : null}

        {title === undefined || count === undefined ? null : (
          <Text style={styles.count}>{count}</Text>
        )}

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
            onFocus={reveal}
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
        visible={groupOpen}
        onClose={() => setGroupOpen(false)}
        title="Show tasks from"
      >
        <View style={styles.options}>
          {[undefined, ...(groups ?? [])].map((group) => {
            const active = group ? group.id === filters.groupId : !activeGroup;
            const tint = group ? groupColor(group.colorKey) : undefined;

            return (
              <Pressable
                key={group?.id ?? "all"}
                onPress={() => {
                  set({ groupId: group?.id ?? "" });
                  setGroupOpen(false);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.option,
                  active && styles.optionActive,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: tint?.dot ?? colors.inkFaint },
                  ]}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.optionText, active && styles.optionTextActive]}
                >
                  {group?.name ?? "All groups"}
                </Text>
                {group ? (
                  <Text style={styles.optionMeta}>{group.taskCount}</Text>
                ) : null}
                {active ? (
                  <Ionicons name="checkmark" size={19} color={colors.brand600} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

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
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Shrinks before the icons do, so a long group name truncates rather than
  // pushing search and filter off the row.
  picker: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: MIN_TAP,
  },
  dot: { width: 9, height: 9, borderRadius: radius.pill },
  title: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  count: { fontSize: 13, fontWeight: "600", color: colors.inkMuted },
  spacer: { flex: 1 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceMuted,
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
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    borderColor: colors.brand500,
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
  options: { gap: 4 },
  option: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  optionActive: { backgroundColor: colors.brand50 },
  optionText: { flex: 1, fontSize: 15, color: colors.ink },
  optionTextActive: { fontWeight: "600", color: colors.brandText },
  optionMeta: { fontSize: 13, color: colors.inkMuted },
}));
