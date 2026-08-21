import { useState } from "react";
import { Text, View } from "react-native";
import { pickImageUpload } from "@/lib/pick-image";
import { makeStyles } from "@/lib/theme-context";
import {
  toApiError,
  useRemoveGroupIconMutation,
  useUploadGroupIconMutation,
} from "@/store/api";
import { GroupIcon } from "@/components/ui/primitives";
import { ImageEditButton } from "@/components/app/ImageEditButton";
import type { GroupSummary } from "@/lib/types";

/**
 * The group's picture on its own screen, tappable for the owner. Everyone else
 * sees the same tile without the badge — a group's face is a group-wide edit,
 * in the same bracket as renaming it, so only the owner may change it and the
 * API refuses anybody else regardless of what the UI offers.
 */
export function GroupIconPicker({
  group,
  canEdit,
  size = 44,
}: {
  group: Pick<GroupSummary, "id" | "name" | "colorKey" | "iconUrl">;
  canEdit: boolean;
  size?: number;
}) {
  const styles = useStyles();
  const [uploadIcon, { isLoading: uploading }] = useUploadGroupIconMutation();
  const [removeIcon, { isLoading: removing }] = useRemoveGroupIconMutation();
  const [failed, setFailed] = useState<string | null>(null);

  if (!canEdit) return <GroupIcon group={group} size={size} />;

  async function choose(source: "library" | "camera") {
    setFailed(null);
    const form = await pickImageUpload(source, {
      purpose: "the group icon",
      fileStem: "group-icon",
    });
    if (!form) return;

    try {
      await uploadIcon({ groupId: group.id, body: form }).unwrap();
    } catch (error) {
      setFailed(toApiError(error).message);
    }
  }

  async function clear() {
    setFailed(null);
    try {
      await removeIcon(group.id).unwrap();
    } catch (error) {
      setFailed(toApiError(error).message);
    }
  }

  return (
    <View>
      <ImageEditButton
        title="Group icon"
        accessibilityLabel={`Change the icon for ${group.name}`}
        size={size}
        busy={uploading || removing}
        canRemove={Boolean(group.iconUrl)}
        removeLabel="Remove icon"
        onChoose={choose}
        onRemove={clear}
      >
        <GroupIcon group={group} size={size} />
      </ImageEditButton>

      {failed ? <Text style={styles.error}>{failed}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  error: { marginTop: 6, fontSize: 11, lineHeight: 15, color: colors.rose700 },
}));
