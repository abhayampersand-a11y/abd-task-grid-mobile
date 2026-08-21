import { useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { ImageSource } from "@/lib/pick-image";

/**
 * Any picture the user can replace: it renders whatever it wraps, puts a
 * camera badge on the corner because a bare image gives no hint that it does
 * anything, and opens the take/choose/remove menu on a tap.
 *
 * It owns no upload of its own — the caller decides what a chosen source or a
 * removal does, which is the only part that differs between a profile picture
 * and a group icon.
 */
export function ImageEditButton({
  children,
  title,
  accessibilityLabel,
  size,
  rounded = false,
  busy,
  canRemove,
  removeLabel = "Remove photo",
  onChoose,
  onRemove,
}: {
  children: ReactNode;
  /** Heading on the menu sheet. */
  title: string;
  accessibilityLabel: string;
  size: number;
  /** True for a circular picture, false for the rounded tile a group gets. */
  rounded?: boolean;
  busy: boolean;
  canRemove: boolean;
  removeLabel?: string;
  onChoose: (source: ImageSource) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [menuOpen, setMenuOpen] = useState(false);

  function pick(source: ImageSource) {
    setMenuOpen(false);
    void onChoose(source);
  }

  return (
    <View>
      <Pressable
        onPress={() => !busy && setMenuOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy }}
        style={({ pressed }) => (pressed && !busy ? styles.pressed : undefined)}
      >
        {children}

        {/* Covering the picture while the request is in flight; leaving the old
            one up makes the change look like it did not take. */}
        {busy ? (
          <View
            style={[
              styles.busy,
              { borderRadius: rounded ? size / 2 : radius.md },
            ]}
          >
            {/* Fixed white — the scrim under it is dark in both themes. */}
            <ActivityIndicator color="#ffffff" />
          </View>
        ) : (
          <View style={styles.badge}>
            <Ionicons name="camera" size={12} color={colors.surface} />
          </View>
        )}
      </Pressable>

      {/* The app's own sheet rather than `ActionSheetIOS` or `Alert`: neither
          exists on the web build, where `Alert.alert` is a silent no-op and the
          menu would simply never appear. */}
      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={title}
      >
        <View style={styles.menu}>
          {/* A desktop browser routes "take photo" through the same file
              dialog as the library, so offering both there is a dead end. */}
          {Platform.OS !== "web" ? (
            <Button
              label="Take photo"
              icon="camera-outline"
              variant="secondary"
              onPress={() => pick("camera")}
              fullWidth
            />
          ) : null}
          <Button
            label={Platform.OS === "web" ? "Choose a file" : "Choose from library"}
            icon="images-outline"
            variant="secondary"
            onPress={() => pick("library")}
            fullWidth
          />
          {canRemove ? (
            <Button
              label={removeLabel}
              icon="trash-outline"
              variant="danger"
              onPress={() => {
                setMenuOpen(false);
                void onRemove();
              }}
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
  menu: { gap: spacing.sm },
}));
