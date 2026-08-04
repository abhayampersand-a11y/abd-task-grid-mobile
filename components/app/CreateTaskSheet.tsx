import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { PRIORITY_ORDER, STATUS_ORDER } from "@/lib/format";
import { createTaskSchema } from "@/lib/validation";
import { fieldErrorsFrom, mergeServerErrors, type FieldErrors } from "@/lib/form";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import {
  toApiError,
  useCreateTaskMutation,
  useGroupMembersQuery,
  useGroupsQuery,
} from "@/store/api";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { DateField } from "@/components/ui/DateField";
import { ErrorNote } from "@/components/ui/primitives";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Preselected when opened from a group's detail screen. */
  groupId?: string;
}

export function CreateTaskSheet({ visible, onClose, groupId }: Props) {
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const { data: groupData } = useGroupsQuery();
  const { colors, statusMeta, priorityMeta } = useTheme();
  const styles = useStyles();

  const [selectedGroup, setSelectedGroup] = useState(groupId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [dueDate, setDueDate] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Members are per-group, so the assignee must reset whenever the group does.
  const { data: memberData } = useGroupMembersQuery(selectedGroup, {
    skip: !selectedGroup,
  });

  useEffect(() => {
    setAssigneeId("");
  }, [selectedGroup]);

  useEffect(() => {
    if (visible && groupId) setSelectedGroup(groupId);
  }, [visible, groupId]);

  const groupOptions = useMemo(
    () =>
      (groupData?.groups ?? []).map((group) => ({
        value: group.id,
        label: group.name,
      })),
    [groupData],
  );

  const memberOptions = useMemo(
    () =>
      (memberData?.members ?? []).map((member) => ({
        value: member.user.id,
        label: member.user.fullName,
      })),
    [memberData],
  );

  function reset() {
    setSelectedGroup(groupId ?? "");
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setPriority("MEDIUM");
    setStatus("TODO");
    setDueDate("");
    setChecklist([]);
    setChecklistDraft("");
    setErrors({});
    setFormError(null);
  }

  function addChecklistItem() {
    const value = checklistDraft.trim();
    if (!value || checklist.length >= 20) return;
    setChecklist((items) => [...items, value]);
    setChecklistDraft("");
  }

  async function submit() {
    setFormError(null);

    const parsed = createTaskSchema.safeParse({
      groupId: selectedGroup,
      title,
      description,
      assigneeId,
      priority,
      status,
      dueDate: dueDate || null,
      checklist,
      attachments: [],
    });

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setErrors({});

    try {
      await createTask(parsed.data).unwrap();
      reset();
      onClose();
    } catch (error) {
      const api = toApiError(error);
      setErrors((current) => mergeServerErrors(current, api.fieldErrors));
      setFormError(api.message);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Assign a task"
      footer={
        <Button label="Create task" onPress={submit} loading={isLoading} fullWidth />
      }
    >
      {formError ? <ErrorNote message={formError} /> : null}

      <Select
        label="Group"
        value={selectedGroup}
        onChange={setSelectedGroup}
        options={groupOptions}
        placeholder="Choose a group"
        error={errors.groupId}
      />

      <TextField
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="What needs doing?"
        autoCapitalize="sentences"
        error={errors.title}
      />

      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Add any detail the assignee needs"
        autoCapitalize="sentences"
        multiline
        error={errors.description}
      />

      <Select
        label="Assign to"
        value={assigneeId}
        onChange={setAssigneeId}
        options={memberOptions}
        placeholder={selectedGroup ? "Choose a member" : "Pick a group first"}
        error={errors.assigneeId}
      />

      <Select
        label="Priority"
        value={priority}
        onChange={setPriority}
        options={PRIORITY_ORDER.map((key) => ({
          value: key,
          label: priorityMeta[key].label,
        }))}
      />

      <Select
        label="Status"
        value={status}
        onChange={setStatus}
        options={STATUS_ORDER.map((key) => ({
          value: key,
          label: statusMeta[key].label,
        }))}
      />

      <DateField label="Due date" value={dueDate} onChange={setDueDate} />

      <View style={styles.checklist}>
        <Text style={styles.label}>Checklist</Text>

        {checklist.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.checklistRow}>
            <Ionicons name="ellipse-outline" size={17} color={colors.inkFaint} />
            <Text style={styles.checklistText} numberOfLines={2}>
              {item}
            </Text>
            <Pressable
              hitSlop={HIT_SLOP}
              onPress={() =>
                setChecklist((items) => items.filter((_, i) => i !== index))
              }
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item}`}
            >
              <Ionicons name="close" size={17} color={colors.inkMuted} />
            </Pressable>
          </View>
        ))}

        <View style={styles.checklistAdd}>
          <View style={styles.checklistInput}>
            <TextField
              label=""
              value={checklistDraft}
              onChangeText={setChecklistDraft}
              placeholder="Add a step"
              autoCapitalize="sentences"
            />
          </View>
          <Button
            label="Add"
            variant="secondary"
            onPress={addChecklistItem}
            style={styles.checklistButton}
          />
        </View>
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  checklist: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
  },
  checklistText: { flex: 1, fontSize: 14, color: colors.ink },
  checklistAdd: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  checklistInput: { flex: 1 },
  checklistButton: { minWidth: 72 },
}));
