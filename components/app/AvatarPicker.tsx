import { useState } from "react";
import { Text, View } from "react-native";
import { pickImageUpload } from "@/lib/pick-image";
import {
  toApiError,
  useRemoveAvatarMutation,
  useUploadAvatarMutation,
} from "@/store/api";
import { Avatar } from "@/components/ui/primitives";
import { ImageEditButton } from "@/components/app/ImageEditButton";
import { makeStyles } from "@/lib/theme-context";
import type { CurrentUser } from "@/lib/types";

/**
 * The picture on the profile screen, made tappable. The tap-to-change plumbing
 * — badge, menu, busy state — lives in `ImageEditButton`, which the group icon
 * uses as well; what stays here is which endpoints the choice reaches.
 */
export function AvatarPicker({
  user,
  size = 64,
}: {
  user: CurrentUser;
  size?: number;
}) {
  const styles = useStyles();
  const [uploadAvatar, { isLoading: uploading }] = useUploadAvatarMutation();
  const [removeAvatar, { isLoading: removing }] = useRemoveAvatarMutation();
  const [failed, setFailed] = useState<string | null>(null);

  async function choose(source: "library" | "camera") {
    setFailed(null);
    const form = await pickImageUpload(source, {
      purpose: "your profile picture",
      fileStem: "avatar",
    });
    if (!form) return;

    try {
      await uploadAvatar(form).unwrap();
    } catch (error) {
      setFailed(toApiError(error).message);
    }
  }

  async function clear() {
    setFailed(null);
    try {
      await removeAvatar().unwrap();
    } catch (error) {
      setFailed(toApiError(error).message);
    }
  }

  return (
    <View>
      <ImageEditButton
        title="Profile picture"
        accessibilityLabel="Change profile picture"
        size={size}
        rounded
        busy={uploading || removing}
        canRemove={Boolean(user.avatarUrl)}
        onChoose={choose}
        onRemove={clear}
      >
        <Avatar user={user} size={size} />
      </ImageEditButton>

      {/* Reported here rather than in the form's error slot below — that slot
          belongs to the field validation, and the two failing at once would
          overwrite each other. */}
      {failed ? <Text style={styles.error}>{failed}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  error: { marginTop: 6, fontSize: 11, lineHeight: 15, color: colors.rose700 },
}));
