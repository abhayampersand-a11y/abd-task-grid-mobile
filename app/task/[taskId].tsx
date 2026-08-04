import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, MIN_TAP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import {
  formatBytes,
  formatDate,
  isOverdue,
  relativeTime,
  STATUS_ORDER,
} from "@/lib/format";
import type { TaskStatus } from "@/lib/types";
import {
  toApiError,
  useAddCommentMutation,
  useDeleteTaskMutation,
  useTaskQuery,
  useToggleChecklistItemMutation,
  useUpdateTaskMutation,
} from "@/store/api";
import { DetailBar, IconAction, Screen } from "@/components/ui/Screen";
import {
  Avatar,
  Card,
  Chip,
  Divider,
  ErrorNote,
  Loading,
  ProgressBar,
  SectionHeading,
} from "@/components/ui/primitives";
import { TaskDetailSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

export default function TaskDetail() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, scheme, groupColor, statusMeta, priorityMeta } = useTheme();
  const styles = useStyles();

  const [comment, setComment] = useState("");
  const [actionSheet, setActionSheet] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useTaskQuery(
    taskId,
    { skip: !taskId },
  );
  const [updateTask, { isLoading: updating }] = useUpdateTaskMutation();
  const [toggleItem] = useToggleChecklistItemMutation();
  const [addComment, { isLoading: posting }] = useAddCommentMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const task = data?.task;
  const canEdit = Boolean(task?.viewerIsAssignee || task?.viewerIsCreator);

  async function setStatus(status: TaskStatus) {
    if (!task || status === task.status) return;
    try {
      await updateTask({ taskId: task.id, status }).unwrap();
    } catch (err) {
      Alert.alert("Could not update", toApiError(err).message);
    }
  }

  async function postComment() {
    const body = comment.trim();
    if (!body || !task) return;
    try {
      await addComment({ taskId: task.id, body }).unwrap();
      setComment("");
    } catch (err) {
      Alert.alert("Could not post", toApiError(err).message);
    }
  }

  function confirmDelete() {
    setActionSheet(false);
    Alert.alert("Delete task", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteTask(taskId)
            .unwrap()
            .then(() => router.back())
            .catch((err) => Alert.alert("Could not delete", toApiError(err).message));
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <Screen>
        <DetailBar title="Task" />
        <ScrollView contentContainerStyle={styles.pad}>
          <TaskDetailSkeleton />
        </ScrollView>
      </Screen>
    );
  }

  if (isError || !task) {
    return (
      <Screen>
        <DetailBar title="Task" />
        <ScrollView contentContainerStyle={styles.pad}>
          <ErrorNote message={toApiError(error).message} />
        </ScrollView>
      </Screen>
    );
  }

  const overdue = isOverdue(task.dueDate, task.status);
  const tint = groupColor(task.group.colorKey);

  return (
    <Screen>
      <DetailBar
        title={task.title}
        subtitle={task.group.name}
        right={
          task.viewerIsCreator ? (
            <IconAction
              icon="ellipsis-horizontal"
              label="Task actions"
              onPress={() => setActionSheet(true)}
            />
          ) : null
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 44}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status is the one control worth a full-width row on a phone. */}
          <View style={styles.statusBlock}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_ORDER.map((status) => {
                const meta = statusMeta[status];
                const active = status === task.status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => setStatus(status)}
                    disabled={!canEdit || updating}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled: !canEdit }}
                    style={[
                      styles.statusChip,
                      { backgroundColor: active ? meta.bg : colors.surface },
                      active && { borderColor: meta.dot },
                      !canEdit && styles.statusDisabled,
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
                    <Text
                      style={[
                        styles.statusText,
                        active && { color: meta.fg, fontWeight: "700" },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Card style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Priority</Text>
              <Chip meta={priorityMeta[task.priority]} />
            </View>
            <Divider />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Group</Text>
              <View style={styles.groupPill}>
                <View style={[styles.groupDot, { backgroundColor: tint.dot }]} />
                <Text style={styles.groupName}>{task.group.name}</Text>
              </View>
            </View>
            <Divider />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Assignee</Text>
              {task.assignee ? (
                <View style={styles.person}>
                  <Avatar user={task.assignee} size={24} />
                  <Text style={styles.personName}>{task.assignee.fullName}</Text>
                </View>
              ) : (
                <Text style={styles.metaValue}>Unassigned</Text>
              )}
            </View>
            <Divider />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Assigned by</Text>
              <View style={styles.person}>
                <Avatar user={task.createdBy} size={24} />
                <Text style={styles.personName}>{task.createdBy.fullName}</Text>
              </View>
            </View>
            <Divider />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due</Text>
              <Text style={[styles.metaValue, overdue && styles.overdue]}>
                {task.dueDate ? formatDate(task.dueDate) : "No deadline"}
              </Text>
            </View>

            <View style={styles.progressBlock}>
              <View style={styles.progressLabels}>
                <Text style={styles.metaLabel}>Progress</Text>
                <Text style={styles.progressValue}>{task.progress}%</Text>
              </View>
              <ProgressBar
                value={task.progress}
                tint={
                  task.status === "COMPLETED"
                    ? colors.emerald500
                    : colors.brandSolid
                }
              />
            </View>
          </Card>

          {task.description ? (
            <Card style={styles.block}>
              <SectionHeading title="Description" />
              <Text style={styles.body}>{task.description}</Text>
            </Card>
          ) : null}

          {task.checklist.length > 0 ? (
            <Card style={styles.block}>
              <SectionHeading
                title={`Checklist (${task.checklistDone}/${task.checklistTotal})`}
              />
              <View style={styles.checklist}>
                {task.checklist.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      canEdit &&
                      void toggleItem({
                        taskId: task.id,
                        itemId: item.id,
                        done: !item.done,
                      })
                    }
                    disabled={!canEdit}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.done }}
                    style={styles.checkRow}
                  >
                    <View style={[styles.checkbox, item.done && styles.checkboxOn]}>
                      {item.done ? (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.onBrand}
                        />
                      ) : null}
                    </View>
                    <Text
                      style={[styles.checkLabel, item.done && styles.checkLabelDone]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          ) : null}

          {task.attachments.length > 0 ? (
            <View style={styles.block}>
              <SectionHeading title="Attachments" />
              {/* Horizontal snap strip — reads as a carousel (MOBILE.md §5). */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={styles.strip}
              >
                {task.attachments.map((attachment) => (
                  <Card key={attachment.id} style={styles.attachment}>
                    <Ionicons
                      name="document-outline"
                      size={22}
                      color={colors.brand600}
                    />
                    <Text style={styles.attachmentName} numberOfLines={2}>
                      {attachment.name}
                    </Text>
                    <Text style={styles.attachmentMeta}>
                      {formatBytes(attachment.sizeBytes)}
                    </Text>
                  </Card>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {task.activities.length > 0 ? (
            <Card style={styles.block}>
              <SectionHeading title="Activity" />
              <View style={styles.timeline}>
                {task.activities.map((activity) => (
                  <View key={activity.id} style={styles.activityRow}>
                    <Avatar user={activity.actor} size={26} />
                    <View style={styles.activityText}>
                      <Text style={styles.activityMessage}>
                        <Text style={styles.activityActor}>
                          {activity.actor.fullName}
                        </Text>{" "}
                        {activity.message}
                      </Text>
                      <Text style={styles.time}>
                        {relativeTime(activity.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          <Card style={styles.block}>
            <SectionHeading title={`Comments (${task.comments.length})`} />
            {task.comments.length === 0 ? (
              <Text style={styles.none}>No comments yet.</Text>
            ) : (
              <View style={styles.timeline}>
                {task.comments.map((item) => (
                  <View key={item.id} style={styles.activityRow}>
                    <Avatar user={item.author} size={30} />
                    <View style={styles.activityText}>
                      <Text style={styles.activityActor}>
                        {item.author.fullName}
                      </Text>
                      <Text style={styles.body}>{item.body}</Text>
                      <Text style={styles.time}>
                        {relativeTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* A refetch, not a first load — the content is already on screen, so
              this stays a spinner rather than replacing it with a skeleton. */}
          {isFetching ? <Loading /> : null}
        </ScrollView>

        {/* Composer pinned above the home indicator so it is always reachable. */}
        <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write a comment"
            placeholderTextColor={colors.inkFaint}
            keyboardAppearance={scheme}
            multiline
            style={styles.composerInput}
          />
          <Pressable
            onPress={postComment}
            disabled={!comment.trim() || posting}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Post comment"
            style={[
              styles.send,
              (!comment.trim() || posting) && styles.sendDisabled,
            ]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onBrand} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Sheet
        visible={actionSheet}
        onClose={() => setActionSheet(false)}
        title={task.title}
      >
        <Button
          label="Refresh"
          variant="secondary"
          icon="refresh-outline"
          onPress={() => {
            setActionSheet(false);
            void refetch();
          }}
          fullWidth
        />
        <Button
          label="Delete task"
          variant="danger"
          icon="trash-outline"
          onPress={confirmDelete}
          fullWidth
        />
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing["3xl"] },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  statusBlock: { gap: spacing.sm },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statusDisabled: { opacity: 0.6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600", color: colors.inkMuted },
  metaCard: { gap: spacing.md },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  metaLabel: { fontSize: 13, fontWeight: "600", color: colors.inkMuted },
  metaValue: { fontSize: 14, color: colors.ink },
  overdue: { color: colors.rose700, fontWeight: "700" },
  groupPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupName: { fontSize: 14, color: colors.ink },
  person: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  personName: { fontSize: 14, color: colors.ink },
  progressBlock: { gap: 6, marginTop: spacing.xs },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressValue: { fontSize: 13, fontWeight: "700", color: colors.ink },
  block: { gap: spacing.sm },
  body: { fontSize: 14, color: colors.inkSoft, lineHeight: 21 },
  none: { fontSize: 13, color: colors.inkMuted },
  checklist: { gap: 2 },
  checkRow: {
    minHeight: MIN_TAP,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.emerald500, borderColor: colors.emerald500 },
  checkLabel: { flex: 1, fontSize: 14, color: colors.ink },
  checkLabelDone: { color: colors.inkFaint, textDecorationLine: "line-through" },
  strip: { gap: spacing.md, paddingRight: spacing.lg },
  attachment: { width: 132, gap: 6 },
  attachmentName: { fontSize: 13, fontWeight: "600", color: colors.ink },
  attachmentMeta: { fontSize: 11, color: colors.inkMuted },
  timeline: { gap: spacing.lg },
  activityRow: { flexDirection: "row", gap: spacing.md },
  activityText: { flex: 1, gap: 3 },
  activityMessage: { fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
  activityActor: { fontSize: 13, fontWeight: "700", color: colors.ink },
  time: { fontSize: 11, color: colors.inkFaint },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  composerInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: MIN_TAP,
    fontSize: 16,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandSolid,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendDisabled: { opacity: 0.4 },
}));
