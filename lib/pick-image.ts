import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { notify } from "@/lib/alert";

/** Matches the API's allow-list; anything else is rejected server-side too. */
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type ImageSource = "library" | "camera";

/**
 * Picks one square picture and packs it into the multipart body every image
 * endpoint expects. Shared by the profile picture and the group icon: both are
 * a circle-or-tile of the same size, cropped the same way, sent to routes that
 * enforce the same limits, so the only thing that differs between them is the
 * wording of the permission prompt.
 *
 * Returns null when the user backs out or refuses access — the caller has
 * nothing to do in either case, and the refusal has already been explained.
 *
 * The upload goes through the API rather than straight to storage: the phone
 * never holds a bucket credential, and the server is the only place that can
 * be trusted to check the size and the type.
 */
export async function pickImageUpload(
  source: ImageSource,
  { purpose, fileStem }: { purpose: string; fileStem: string },
): Promise<FormData | null> {
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
        `Grant access in Settings to change ${purpose}.`,
      );
      return null;
    }
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    // The picture is drawn in a circle or a rounded tile everywhere, so the
    // crop is square — letting a landscape photo through only to centre-crop
    // it later is how people end up with their forehead as their picture.
    allowsEditing: true,
    aspect: [1, 1],
    // Enough for a 64–96pt tile at 3x, and it keeps the request well under
    // the API's 4 MB ceiling without a second compression pass.
    quality: 0.6,
  };

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;

  // The editor writes a JPEG whatever went in, but `mimeType` is missing on
  // some Android providers — fall back to the extension, then to JPEG.
  const extension = asset.uri.split(".").pop()?.toLowerCase() ?? "";
  const type = asset.mimeType ?? MIME_BY_EXTENSION[extension] ?? "image/jpeg";
  const name = asset.fileName ?? `${fileStem}.${extension || "jpg"}`;

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

  return form;
}
