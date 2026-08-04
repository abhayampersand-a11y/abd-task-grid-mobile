import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { GROUP_COLOR_KEYS } from "@/lib/format";
import { createGroupSchema } from "@/lib/validation";
import { fieldErrorsFrom, mergeServerErrors, type FieldErrors } from "@/lib/form";
import type { UserSummary } from "@/lib/types";
import { toApiError, useCreateGroupMutation } from "@/store/api";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { ErrorNote } from "@/components/ui/primitives";
import { MemberInviteSearch } from "./MemberInviteSearch";

export function CreateGroupSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [createGroup, { isLoading }] = useCreateGroupMutation();
  const { groupColor } = useTheme();
  const styles = useStyles();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [colorKey, setColorKey] = useState("indigo");
  const [invited, setInvited] = useState<UserSummary[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setVisibility("PRIVATE");
    setColorKey("indigo");
    setInvited([]);
    setErrors({});
    setFormError(null);
  }

  async function submit() {
    setFormError(null);

    const parsed = createGroupSchema.safeParse({
      name,
      description,
      visibility,
      colorKey,
      memberIds: invited.map((user) => user.id),
    });

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setErrors({});

    try {
      await createGroup(parsed.data).unwrap();
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
      title="New group"
      footer={
        <Button
          label="Create group"
          onPress={submit}
          loading={isLoading}
          fullWidth
        />
      }
    >
      {formError ? <ErrorNote message={formError} /> : null}

      <TextField
        label="Group name"
        value={name}
        onChangeText={setName}
        placeholder="Design team"
        autoCapitalize="words"
        error={errors.name}
      />

      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="What is this group for?"
        autoCapitalize="sentences"
        multiline
        error={errors.description}
      />

      <Select
        label="Visibility"
        value={visibility}
        onChange={setVisibility}
        options={[
          { value: "PRIVATE", label: "Private — invited members only" },
          { value: "PUBLIC", label: "Public — anyone can find it" },
        ]}
        error={errors.visibility}
      />

      <View style={styles.colors}>
        <Text style={styles.label}>Colour</Text>
        <View style={styles.swatches}>
          {GROUP_COLOR_KEYS.map((key) => {
            const tint = groupColor(key);
            const active = key === colorKey;
            return (
              <Pressable
                key={key}
                onPress={() => setColorKey(key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tint.label}
                style={[
                  styles.swatch,
                  { backgroundColor: tint.dot },
                  active && styles.swatchActive,
                ]}
              />
            );
          })}
        </View>
      </View>

      <MemberInviteSearch
        label="Invite members"
        invited={invited}
        onInvite={(user) => setInvited((current) => [...current, user])}
        onRemove={(userId) =>
          setInvited((current) => current.filter((user) => user.id !== userId))
        }
      />

      <Text style={styles.note}>
        You are the owner. Everybody else gets a join request they can accept or
        decline — they appear in the group only after accepting.
      </Text>
    </Sheet>
  );
}

/** Shared confirm helper so destructive actions read the same everywhere. */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}

const useStyles = makeStyles(({ colors }) => ({
  colors: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  swatches: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: "transparent",
  },
  swatchActive: { borderColor: colors.ink },
  note: { fontSize: 12, color: colors.inkMuted, lineHeight: 17 },
}));
