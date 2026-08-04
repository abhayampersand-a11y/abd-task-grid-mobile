import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { initials, type Meta } from "@/lib/format";
import type { UserSummary } from "@/lib/types";

/** The surface every list item sits on: hairline border, restrained lift. */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Status, priority and group pills — all driven by a `Meta` from format.ts. */
export function Chip({
  meta,
  showDot = true,
  small = false,
}: {
  meta: Meta;
  showDot?: boolean;
  small?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.chip, { backgroundColor: meta.bg }]}>
      {showDot ? (
        <View style={[styles.dot, { backgroundColor: meta.dot }]} />
      ) : null}
      <Text
        style={[styles.chipText, small && { fontSize: 11 }, { color: meta.fg }]}
      >
        {meta.label}
      </Text>
    </View>
  );
}

export function Avatar({
  user,
  size = 36,
}: {
  user: Pick<UserSummary, "fullName" | "avatarUrl">;
  size?: number;
}) {
  const { tintFor } = useTheme();
  const styles = useStyles();
  const tint = tintFor(user.fullName);
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (user.avatarUrl) {
    return <Image source={{ uri: user.avatarUrl }} style={box} />;
  }

  return (
    <View style={[styles.avatar, box, { backgroundColor: tint.bg }]}>
      <Text
        style={{
          color: tint.fg,
          fontSize: size * 0.38,
          fontWeight: "700",
        }}
      >
        {initials(user.fullName)}
      </Text>
    </View>
  );
}

export function ProgressBar({
  value,
  tint,
}: {
  value: number;
  tint?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: tint ?? colors.brandSolid,
          },
        ]}
      />
    </View>
  );
}

/**
 * A counter tile. Passing `onPress` turns it into the web board's filter
 * shortcut — tapping "Overdue" narrows the list to overdue work — and adds the
 * explicit pressed state a touch target needs in place of `:hover`.
 *
 * `compact` is the phone layout the web board uses: value and label on one
 * line, sized to sit in a horizontally scrolling strip so the list beneath it
 * starts near the top of the viewport rather than below a grid of tiles.
 */
export function StatTile({
  label,
  value,
  icon,
  tint,
  onPress,
  active = false,
  compact = false,
}: {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: Meta;
  onPress?: () => void;
  active?: boolean;
  compact?: boolean;
}) {
  const styles = useStyles();

  const body = compact ? (
    <>
      <Text style={styles.chipValue}>{value}</Text>
      <View style={[styles.chipDot, { backgroundColor: tint.dot }]} />
      <Text style={styles.chipLabel} numberOfLines={1}>
        {label}
      </Text>
    </>
  ) : (
    <>
      <View style={[styles.tileIcon, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={17} color={tint.fg} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  const shell = compact ? styles.statChip : styles.tile;

  if (!onPress) {
    return <Card style={[shell, active && styles.tileActive]}>{body}</Card>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [
        styles.card,
        shell,
        active && styles.tileActive,
        pressed && styles.tilePressed,
      ]}
    >
      {body}
    </Pressable>
  );
}

export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.brand600} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.brand600} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function ErrorNote({ message }: { message: string }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.errorNote}>
      <Ionicons name="alert-circle" size={17} color={colors.rose700} />
      <Text style={styles.errorNoteText}>{message}</Text>
    </View>
  );
}

export function Divider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    ...shadow.soft,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  avatar: { alignItems: "center", justifyContent: "center" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
  tile: { flex: 1, gap: 6, padding: spacing.md },
  tileActive: { borderColor: colors.brand200, backgroundColor: colors.brand50 },
  tilePressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  chipValue: { fontSize: 18, fontWeight: "700", color: colors.ink },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.inkSoft,
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  tileValue: { fontSize: 22, fontWeight: "700", color: colors.ink },
  tileLabel: { fontSize: 12, fontWeight: "500", color: colors.inkMuted },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  empty: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  emptyBody: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyAction: { marginTop: spacing.sm, alignSelf: "stretch" },
  loading: { paddingVertical: spacing["3xl"], alignItems: "center", gap: 10 },
  loadingLabel: { fontSize: 13, color: colors.inkMuted },
  errorNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.rose50,
    borderWidth: 1,
    borderColor: colors.rose100,
  },
  errorNoteText: { flex: 1, fontSize: 13, color: colors.rose700, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.line },
}));
