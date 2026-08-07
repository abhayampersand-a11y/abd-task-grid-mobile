import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { notify } from "@/lib/alert";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import {
  toApiError,
  useRemoveAvatarMutation,
  useUploadAvatarMutation,
} from "@/store/api";
import { Avatar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { CurrentUser } from "@/lib/types";

/** Matches the API's allow-list; anything else is rejected server-side too. */
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * The picture on the profile screen, made tappable. A camera badge sits on the
 * corner because a bare avatar gives no hint that it does anything.
 *
 * The upload goes through the API rather than straight to storage: the phone
 * never holds a bucket credential, and the server is the only place that can
 * be trusted to check the size and the type.
 */
export function AvatarPicker({
  user,
  size = 64,
}: {
  user: CurrentUser;
  size?: number;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [uploadAvatar, { isLoading: uploading }] = useUploadAvatarMutation();
  const [removeAvatar, { isLoading: removing }] = useRemoveAvatarMutation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const busy = uploading || removing;

  async function pick(source: "library" | "camera") {
    setMenuOpen(false);

    // The browser asks for camera and file access itself, at the moment of
    // use. Calling the permission APIs there prompts twice or, for the photo
    // library, resolves against a concept the web has no equivalent of.
    if (Platform.OS !== "web") {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        notify(
          source === "camera" ? "Camera access needed" : "Photo access needed",
          "Grant access in Settings to change your profile picture.",
        );
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      // The avatar is drawn in a circle everywhere, so the crop is square —
      // letting a landscape photo through only to centre-crop it later is how
      // people end up with their forehead as their picture.
      allowsEditing: true,
      aspect: [1, 1],
      // Enough for a 64–96pt circle at 3x, and it keeps the request well under
      // the API's 4 MB ceiling without a second compression pass.
      quality: 0.6,
    };

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    const asset = result.canceled ? null : result.assets?.[0];
    if (asset) await send(asset);
  }

  async function send(asset: ImagePicker.ImagePickerAsset) {
    setFailed(null);

    // The editor writes a JPEG whatever went in, but `mimeType` is missing on
    // some Android providers — fall back to the extension, then to JPEG.
    const extension = asset.uri.split(".").pop()?.toLowerCase() ?? "";
    const type = asset.mimeType ?? MIME_BY_EXTENSION[extension] ?? "image/jpeg";
    const name = asset.fileName ?? `avatar.${extension || "jpg"}`;

    const form = new FormData();
    if (Platform.OS === "web") {
      // On the web the picker hands back a blob: URL, and FormData here is the
      // real browser one — it wants a Blob, not the {uri} descriptor below.
      const blob = await (await fetch(asset.uri)).blob();
      form.append("file", blob, name);
    } else {
      // React Native's FormData takes this {uri, name, type} shape in place of
      // a File and streams the local file itself — reading the bytes into JS
      // first would double the memory for no gain.
      form.append("file", { uri: asset.uri, name, type } as unknown as Blob);
    }

    try {
      await uploadAvatar(form).unwrap();
    } catch (error) {
      setFailed(toApiError(error).message);
    }
  }

  async function clear() {
    setMenuOpen(false);
    setFailed(null);
    try {
      await removeAvatar().unwrap();
    } catch (error) {
      setFailed(toApiError(error).message);
    }
  }

  return (
    <View>
      <Pressable
        onPress={() => !busy && setMenuOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Change profile picture"
        accessibilityState={{ busy }}
        style={({ pressed }) => (pressed && !busy ? styles.pressed : undefined)}
      >
        <Avatar user={user} size={size} />

        {/* Covering the face while the request is in flight; leaving the old
            picture up makes the change look like it did not take. */}
        {busy ? (
          <View style={[styles.busy, { borderRadius: size / 2 }]}>
            {/* Fixed white — the scrim under it is dark in both themes. */}
            <ActivityIndicator color="#ffffff" />
          </View>
        ) : (
          <View style={styles.badge}>
            <Ionicons name="camera" size={12} color={colors.surface} />
          </View>
        )}
      </Pressable>

      {/* Reported here rather than in the form's error slot below — that slot
          belongs to the field validation, and the two failing at once would
          overwrite each other. */}
      {failed ? <Text style={styles.error}>{failed}</Text> : null}

      {/* The app's own sheet rather than `ActionSheetIOS` or `Alert`: neither
          exists on the web build, where `Alert.alert` is a silent no-op and the
          menu would simply never appear. */}
      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Profile picture"
      >
        <View style={styles.menu}>
          {/* A desktop browser routes "take photo" through the same file
              dialog as the library, so offering both there is a dead end. */}
          {Platform.OS !== "web" ? (
            <Button
              label="Take photo"
              icon="camera-outline"
              variant="secondary"
              onPress={() => void pick("camera")}
              fullWidth
            />
          ) : null}
          <Button
            label={Platform.OS === "web" ? "Choose a file" : "Choose from library"}
            icon="images-outline"
            variant="secondary"
            onPress={() => void pick("library")}
            fullWidth
          />
          {user.avatarUrl ? (
            <Button
              label="Remove photo"
              icon="trash-outline"
              variant="danger"
              onPress={() => void clear()}
              fullWidth
            />
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  pressed: { opacity: 0.7 },
  busy: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.brand600,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { marginTop: 6, fontSize: 11, lineHeight: 15, color: colors.rose700 },
  menu: { gap: spacing.sm },
}));
