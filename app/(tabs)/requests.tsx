import { useState } from "react";
import { Text, View } from "react-native";
import { notify } from "@/lib/alert";
import { useRouter } from "expo-router";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { relativeTime } from "@/lib/format";
import type { GroupInvitationDto } from "@/lib/types";
import type { InvitationAction } from "@/lib/validation";
import {
  toApiError,
  useInvitationsQuery,
  useRespondToInvitationMutation,
} from "@/store/api";
import { Body, BrandBar, Screen } from "@/components/ui/Screen";
import { Avatar, EmptyState, ErrorNote } from "@/components/ui/primitives";
import { RequestListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ProfileButton } from "@/components/app/ProfileButton";

export default function Requests() {
  const router = useRouter();
  const { groupColor } = useTheme();
  const styles = useStyles();
  const { data, isLoading, isFetching, isError, error, refetch } =
    useInvitationsQuery();
  const [respond] = useRespondToInvitationMutation();
  const [busy, setBusy] = useState<{
    id: string;
    action: InvitationAction;
  } | null>(null);

  const list = data?.invitations ?? [];

  async function answer(
    invitation: GroupInvitationDto,
    action: InvitationAction,
  ) {
    setBusy({ id: invitation.id, action });
    try {
      await respond({ invitationId: invitation.id, action }).unwrap();
      if (action === "ACCEPT") router.push(`/group/${invitation.group.id}`);
    } catch (requestError) {
      notify("Could not answer", toApiError(requestError).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <BrandBar
        title="Requests"
        subtitle={
          list.length > 0
            ? `${list.length} waiting on you`
            : "Nothing to answer"
        }
        right={<ProfileButton />}
      />

      <Body refreshing={isFetching && !isLoading} onRefresh={refetch}>
        {isLoading ? (
          <RequestListSkeleton count={3} />
        ) : isError ? (
          <ErrorNote message={toApiError(error).message} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="mail-open-outline"
            title="No pending requests"
            body="When somebody invites you to a group, the request lands here for you to accept or decline."
          />
        ) : (
          <View style={styles.list}>
            {list.map((invitation) => {
              const tint = groupColor(invitation.group.colorKey);
              const answering = busy?.id === invitation.id;

              return (
                <View key={invitation.id} style={styles.card}>
                  <View style={styles.head}>
                    <View style={[styles.badge, { backgroundColor: tint.bg }]}>
                      <View
                        style={[styles.dot, { backgroundColor: tint.dot }]}
                      />
                    </View>
                    <View style={styles.headText}>
                      <Text style={styles.group} numberOfLines={1}>
                        {invitation.group.name}
                      </Text>
                      <Text style={styles.meta}>
                        {invitation.group.memberCount} member
                        {invitation.group.memberCount === 1 ? "" : "s"} ·{" "}
                        {relativeTime(invitation.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inviter}>
                    <Avatar user={invitation.invitedBy} size={28} />
                    <Text style={styles.inviterText} numberOfLines={2}>
                      <Text style={styles.inviterName}>
                        {invitation.invitedBy.fullName}
                      </Text>{" "}
                      created this group and asked you to join.
                    </Text>
                  </View>

                  {invitation.group.description ? (
                    <Text style={styles.description} numberOfLines={3}>
                      {invitation.group.description}
                    </Text>
                  ) : null}

                  <View style={styles.actions}>
                    <Button
                      label="Decline"
                      variant="secondary"
                      onPress={() => answer(invitation, "DECLINE")}
                      loading={answering && busy?.action === "DECLINE"}
                      disabled={answering}
                      style={styles.action}
                    />
                    <Button
                      label="Accept"
                      icon="checkmark"
                      onPress={() => answer(invitation, "ACCEPT")}
                      loading={answering && busy?.action === "ACCEPT"}
                      disabled={answering}
                      style={styles.action}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Body>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  list: { gap: spacing.md },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  headText: { flex: 1, gap: 2 },
  group: { fontSize: 16, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.inkFaint },
  inviter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  inviterText: { flex: 1, fontSize: 13, color: colors.inkMuted, lineHeight: 18 },
  inviterName: { fontWeight: "700", color: colors.inkSoft },
  description: { fontSize: 13, color: colors.inkMuted, lineHeight: 18 },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { flex: 1 },
}));
