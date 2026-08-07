import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import {
  KeyboardAvoider,
  KeyboardAwareScrollView,
} from "@/components/ui/KeyboardAvoider";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Pinned below the scroll area so the primary action never scrolls away. */
  footer?: React.ReactNode;
}

/**
 * The mobile stand-in for the web app's centred dialog: full width, rounded top
 * corners, slides up, backdrop dismiss, sticky footer (MOBILE.md §2).
 */
export function Sheet({ visible, onClose, title, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close"
        />

        {/* The dock spans the whole modal so the sheet's `maxHeight` has a
            definite basis to shrink against once the keyboard takes its space —
            `box-none` keeps the backdrop tappable underneath it. */}
        <KeyboardAvoider style={styles.dock} pointerEvents="box-none">
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={colors.inkMuted} />
              </Pressable>
            </View>

            <KeyboardAwareScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              // Stops a scroll gesture inside the sheet dragging the page behind it.
              overScrollMode="never"
            >
              {children}
            </KeyboardAwareScrollView>

            {footer ? (
              <View
                style={[
                  styles.footer,
                  { paddingBottom: spacing.lg + insets.bottom },
                ]}
              >
                {footer}
              </View>
            ) : (
              <View style={{ height: insets.bottom }} />
            )}
          </View>
        </KeyboardAvoider>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  dock: { justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg + 6,
    borderTopRightRadius: radius.lg + 6,
    borderTopWidth: 1,
    borderColor: colors.line,
    maxHeight: "88%",
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.lineStrong,
    alignSelf: "center",
    marginTop: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  // `flexShrink` is 0 by default in RN, which would let a tall form push the
  // header and footer off the sheet once the keyboard claims half the screen.
  // Shrinking the scroller instead keeps both pinned and the fields reachable.
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
}));
