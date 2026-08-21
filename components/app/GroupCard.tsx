import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import type { GroupSummary } from "@/lib/types";
import { Avatar, GroupIcon, ProgressBar } from "@/components/ui/primitives";

export function GroupCard({ group }: { group: GroupSummary }) {
  const router = useRouter();
  const { colors, groupColor } = useTheme();
  const styles = useStyles();
  const tint = groupColor(group.colorKey);
  const completion =
    group.taskCount === 0
      ? 0
      : Math.round((group.completedTaskCount / group.taskCount) * 100);

  return (
    <Pressable
      onPress={() => router.push(`/group/${group.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open group ${group.name}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <GroupIcon group={group} size={40} />

        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {group.memberCount} member{group.memberCount === 1 ? "" : "s"} ·{" "}
            {group.taskCount} task{group.taskCount === 1 ? "" : "s"}
            {group.myRole === "OWNER" ? " · Owner" : ""}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={19} color={colors.inkFaint} />
      </View>

      {group.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {group.description}
        </Text>
      ) : null}

      <View style={styles.progress}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {group.completedTaskCount} of {group.taskCount} complete
          </Text>
          <Text style={styles.progressValue}>{completion}%</Text>
        </View>
        <ProgressBar value={completion} tint={tint.dot} />
      </View>

      {group.members.length > 0 ? (
        <View style={styles.avatars}>
          {group.members.slice(0, 5).map((member, index) => (
            <View
              key={member.id}
              style={[styles.avatarSlot, index > 0 && styles.avatarOverlap]}
            >
              <Avatar user={member} size={26} />
            </View>
          ))}
          {group.memberCount > 5 ? (
            <View style={[styles.avatarSlot, styles.avatarOverlap, styles.more]}>
              <Text style={styles.moreText}>+{group.memberCount - 5}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.soft,
  },
  pressed: { backgroundColor: colors.surfaceMuted, transform: [{ scale: 0.995 }] },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, fontWeight: "500", color: colors.inkMuted },
  description: { fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
  progress: { gap: 6 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { fontSize: 11, fontWeight: "500", color: colors.inkMuted },
  progressValue: { fontSize: 11, fontWeight: "700", color: colors.ink },
  avatars: { flexDirection: "row", alignItems: "center" },
  avatarSlot: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarOverlap: { marginLeft: -8 },
  more: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: { fontSize: 10, fontWeight: "700", color: colors.inkMuted },
}));
