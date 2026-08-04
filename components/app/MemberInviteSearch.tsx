import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, MIN_TAP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { useLookupUserQuery } from "@/store/api";
import type { UserSummary } from "@/lib/types";
import { Avatar } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/Skeleton";

/** Deliberately strict: the box only answers to a complete address. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const BLOCKED: Record<string, string> = {
  QUEUED: "Already in your invite list.",
  SELF: "That is your own account.",
  MEMBER: "Already a member of this group.",
  INVITED: "Invitation already pending.",
};

interface Props {
  label: string;
  /** People queued for (or already holding) an invitation. */
  invited: UserSummary[];
  onInvite: (user: UserSummary) => void;
  onRemove: (userId: string) => void;
  /** Pass on an existing group so the lookup can flag members and invitees. */
  groupId?: string;
}

export function MemberInviteSearch({
  label,
  invited,
  onInvite,
  onRemove,
  groupId,
}: Props) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const { colors, scheme } = useTheme();
  const styles = useStyles();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const isEmail = EMAIL.test(debounced);
  const { data, isFetching } = useLookupUserQuery(
    { email: debounced, groupId },
    { skip: !isEmail },
  );

  const match = isEmail ? (data?.user ?? null) : null;
  const queued = match ? invited.some((user) => user.id === match.id) : false;
  const state = queued ? "QUEUED" : (data?.state ?? null);

  function invite() {
    if (!match || state !== "AVAILABLE") return;
    onInvite(match);
    setTerm("");
    setDebounced("");
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {invited.length > 0 ? (
          <Text style={styles.count}>{invited.length} invited</Text>
        ) : null}
      </View>

      <View style={styles.search}>
        <Ionicons name="mail-outline" size={17} color={colors.inkMuted} />
        <TextInput
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={invite}
          placeholder="teammate@company.com"
          placeholderTextColor={colors.inkFaint}
          keyboardAppearance={scheme}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="done"
          accessibilityLabel="Invite by email address"
          style={styles.searchInput}
        />
      </View>

      {/* ── Lookup result ───────────────────────────────────────────────── */}
      {!debounced ? (
        <Text style={styles.hint}>
          Type the complete email address of a registered account. Matches are
          not listed — you can only invite an address you already know.
        </Text>
      ) : !isEmail ? (
        <Text style={styles.hint}>
          Keep typing — enter the full email address.
        </Text>
      ) : isFetching ? (
        // The result row is a known shape, so show it rather than a line of text.
        <View style={styles.result}>
          <Skeleton width={38} height={38} round />
          <View style={styles.resultText}>
            <Skeleton width="52%" height={14} />
            <Skeleton width="74%" height={12} style={styles.skeletonGap} />
          </View>
          <Skeleton width={78} height={36} round />
        </View>
      ) : !match ? (
        <Text style={styles.none}>
          No signed-up account matches {debounced}.
        </Text>
      ) : (
        <View style={[styles.result, state === "AVAILABLE" && styles.resultOk]}>
          <Avatar user={match} size={38} />
          <View style={styles.resultText}>
            <Text style={styles.name} numberOfLines={1}>
              {match.fullName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {match.email}
            </Text>
          </View>

          {state === "AVAILABLE" ? (
            <Pressable
              onPress={invite}
              accessibilityRole="button"
              accessibilityLabel={`Invite ${match.fullName}`}
              style={({ pressed }) => [styles.invite, pressed && styles.pressed]}
            >
              <Ionicons name="person-add" size={15} color={colors.onBrand} />
              <Text style={styles.inviteText}>Invite</Text>
            </Pressable>
          ) : (
            <Text style={styles.blocked}>{BLOCKED[state ?? ""]}</Text>
          )}
        </View>
      )}

      {/* ── Queued invitations ──────────────────────────────────────────── */}
      {invited.length > 0 ? (
        <View style={styles.list}>
          {invited.map((user) => (
            <View key={user.id} style={styles.row}>
              <Avatar user={user} size={30} />
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {user.fullName}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
              <Pressable
                onPress={() => onRemove(user.id)}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${user.fullName}`}
                style={styles.remove}
              >
                <Ionicons name="close" size={18} color={colors.inkFaint} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: spacing.sm },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  count: { fontSize: 12, fontWeight: "600", color: colors.brandText },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  hint: { fontSize: 12, color: colors.inkMuted, lineHeight: 17 },
  none: { fontSize: 13, color: colors.inkMuted, paddingVertical: spacing.xs },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  resultOk: { borderColor: colors.brand100, backgroundColor: colors.brand50 },
  resultText: { flex: 1, gap: 1 },
  skeletonGap: { marginTop: 5 },
  invite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    height: MIN_TAP - 8,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSolid,
  },
  inviteText: { fontSize: 13, fontWeight: "700", color: colors.onBrand },
  pressed: { opacity: 0.75 },
  blocked: { flex: 1, fontSize: 12, color: colors.inkMuted, textAlign: "right" },
  list: { gap: 2 },
  row: {
    minHeight: MIN_TAP,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
  },
  rowText: { flex: 1, gap: 1 },
  name: { fontSize: 14, fontWeight: "600", color: colors.ink },
  email: { fontSize: 12, color: colors.inkMuted },
  remove: { padding: 2 },
}));
