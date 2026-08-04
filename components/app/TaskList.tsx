import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { formatShortDate, isOverdue } from "@/lib/format";
import type { TaskSummary } from "@/lib/types";
import { toApiError, useDeleteTaskMutation } from "@/store/api";
import { Avatar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/**
 * The task list as it appears on phones: one hairline-separated row per task
 * rather than a card, so a screenful shows ten tasks instead of three. This is
 * the native counterpart of the web's `TaskListRow`, and carries the same
 * fields in the same order — priority as the leading accent bar, then title and
 * due date, then status, group and one trailing counter.
 */
function TaskListRow({
  task,
  onActions,
}: {
  task: TaskSummary;
  /** Omitted where the row is read-only; the overflow button then disappears. */
  onActions?: (task: TaskSummary) => void;
}) {
  const router = useRouter();
  const { colors, statusMeta, priorityMeta } = useTheme();
  const styles = useStyles();

  const overdue = isOverdue(task.dueDate, task.status);
  const status = statusMeta[task.status];
  const priority = priorityMeta[task.priority];

  // One trailing counter only — a second one crowds the row on a narrow phone.
  const trailing =
    task.checklistTotal > 0
      ? `${task.checklistDone}/${task.checklistTotal}`
      : task.progress > 0 && task.status !== "COMPLETED"
        ? `${task.progress}%`
        : null;
  const comments = !trailing && task.commentCount > 0;

  return (
    // The overflow button is a *sibling* of the row's tap target, not a child
    // of it: one button inside another is invalid on the web build, and a
    // nested press target is ambiguous everywhere else.
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push(`/task/${task.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}. ${status.label}, ${priority.label} priority, in ${task.group.name}${overdue ? ", overdue" : ""}`}
        style={({ pressed }) => [styles.target, pressed && styles.pressed]}
      >
        <View style={[styles.priorityBar, { backgroundColor: priority.dot }]} />

        <View style={styles.body}>
          <View style={styles.line}>
            <Text style={styles.title} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={[styles.due, overdue && styles.dueOverdue]}>
              {task.dueDate ? formatShortDate(task.dueDate) : "—"}
            </Text>
          </View>

          <View style={[styles.line, styles.lineMeta]}>
            <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
            <Text style={styles.status}>{status.label}</Text>
            <Text style={styles.group} numberOfLines={1}>
              · {task.group.name}
            </Text>
            {trailing ? (
              <Text style={styles.trailing}>{trailing}</Text>
            ) : comments ? (
              <View style={styles.trailingRow}>
                <Ionicons
                  name="chatbubble-outline"
                  size={11}
                  color={colors.inkMuted}
                />
                <Text style={styles.trailing}>{task.commentCount}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {task.assignee ? (
          <Avatar user={task.assignee} size={24} />
        ) : (
          <View style={styles.unassigned}>
            <Text style={styles.unassignedMark}>?</Text>
          </View>
        )}
      </Pressable>

      {onActions ? (
        <Pressable
          onPress={() => onActions(task)}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`Actions for ${task.title}`}
          style={({ pressed }) => [styles.overflow, pressed && styles.pressed]}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={17}
            color={colors.inkFaint}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The rows plus the surface they sit on. The action sheet lives here rather
 * than in each row so a page of tasks mounts one Modal, not ten.
 */
export function TaskList({
  tasks,
  showActions = false,
}: {
  tasks: TaskSummary[];
  showActions?: boolean;
}) {
  const router = useRouter();
  const styles = useStyles();
  const [selected, setSelected] = useState<TaskSummary | null>(null);
  const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();

  function confirmDelete(task: TaskSummary) {
    setSelected(null);
    Alert.alert(
      "Delete this task?",
      `"${task.title}" and all of its comments, attachments and history will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteTask(task.id)
              .unwrap()
              .catch((error) =>
                Alert.alert("Could not delete", toApiError(error).message),
              );
          },
        },
      ],
    );
  }

  return (
    <>
      <View style={styles.container}>
        {tasks.map((task, index) => (
          <View key={task.id} style={index > 0 ? styles.divided : undefined}>
            <TaskListRow
              task={task}
              onActions={showActions ? setSelected : undefined}
            />
          </View>
        ))}
      </View>

      {showActions ? (
        <Sheet
          visible={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={selected?.title ?? ""}
        >
          {selected ? (
            <>
              <Button
                label="View details"
                variant="secondary"
                icon="open-outline"
                onPress={() => {
                  const { id } = selected;
                  setSelected(null);
                  router.push(`/task/${id}`);
                }}
                fullWidth
              />
              <Button
                label="Delete task"
                variant="danger"
                icon="trash-outline"
                onPress={() => confirmDelete(selected)}
                loading={deleting}
                fullWidth
              />
            </>
          ) : null}
        </Sheet>
      ) : null}
    </>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.soft,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  /** The row's own tap target, sized to leave the overflow button clear of it. */
  target: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pressed: { backgroundColor: colors.surfaceMuted },

  /** Priority reads as a colour here, so it needs no label of its own. */
  priorityBar: { width: 3, height: 32, borderRadius: 2 },

  body: { flex: 1, paddingVertical: 10, gap: 4 },
  line: { flexDirection: "row", alignItems: "center", gap: 6 },
  lineMeta: { gap: 5 },

  title: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink },
  due: { fontSize: 11, fontWeight: "500", color: colors.inkFaint },
  dueOverdue: { fontWeight: "700", color: colors.rose700 },

  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 11, color: colors.inkMuted },
  group: { flex: 1, fontSize: 11, color: colors.inkMuted },
  trailing: { fontSize: 11, fontWeight: "600", color: colors.inkMuted },
  trailingRow: { flexDirection: "row", alignItems: "center", gap: 3 },

  unassigned: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  unassignedMark: { fontSize: 10, fontWeight: "700", color: colors.inkFaint },

  overflow: {
    width: 32,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
}));
