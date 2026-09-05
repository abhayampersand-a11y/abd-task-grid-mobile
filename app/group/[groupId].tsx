import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { confirmDestructive, notify } from "@/lib/alert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { formatDate } from "@/lib/format";
import type { UserSummary } from "@/lib/types";
import {
  toApiError,
  useCancelInvitationMutation,
  useDeleteGroupMutation,
  useGroupQuery,
  useInviteGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useTaskFeedInfiniteQuery,
  type TaskFeedFilters,
} from "@/store/api";
import { Body, DetailBar, Fab, IconAction, Screen } from "@/components/ui/Screen";
import {
  Avatar,
  Card,
  Chip,
  EmptyState,
  ErrorNote,
  ProgressBar,
  StatTile,
} from "@/components/ui/primitives";
import {
  GroupDetailSkeleton,
  TaskListSkeleton,
} from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { InfiniteFooter } from "@/components/ui/InfiniteFooter";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TaskList } from "@/components/app/TaskList";
import { TaskFilterBar } from "@/components/app/TaskFilterBar";
import { CreateTaskSheet } from "@/components/app/CreateTaskSheet";
import { MemberInviteSearch } from "@/components/app/MemberInviteSearch";
import { GroupIconPicker } from "@/components/app/GroupIconPicker";
import { AdSlot } from "@/components/app/AdSlot";

type Tab = "tasks" | "members";

export default function GroupDetail() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { colors, groupColor, statusMeta, priorityMeta } = useTheme();
  const styles = useStyles();

  const [tab, setTab] = useState<Tab>("tasks");
  const [filters, setFilters] = useState<TaskFeedFilters>({ pageSize: 20 });
  const [taskSheet, setTaskSheet] = useState(false);
  const [memberSheet, setMemberSheet] = useState(false);
  const [actionSheet, setActionSheet] = useState(false);
  const [invited, setInvited] = useState<UserSummary[]>([]);

  const group = useGroupQuery(groupId, { skip: !groupId });
  const tasks = useTaskFeedInfiniteQuery(
    { ...filters, groupId, scope: "all" },
    { skip: !groupId },
  );
  const [inviteMembers, { isLoading: inviting }] =
    useInviteGroupMembersMutation();
  const [cancelInvitation] = useCancelInvitationMutation();
  const [removeMember] = useRemoveGroupMemberMutation();
  const [deleteGroup] = useDeleteGroupMutation();

  const detail = group.data?.group;
  const isOwner = detail?.myRole === "OWNER";
  const tint = groupColor(detail?.colorKey ?? "indigo");
  const completion =
    !detail || detail.taskCount === 0
      ? 0
      : Math.round((detail.completedTaskCount / detail.taskCount) * 100);

  async function sendInvites() {
    if (invited.length === 0) return;
    try {
      const { invited: sent } = await inviteMembers({
        groupId,
        memberIds: invited.map((user) => user.id),
      }).unwrap();
      setInvited([]);
      setMemberSheet(false);
      notify(
        `${sent} invitation${sent === 1 ? "" : "s"} sent`,
        "They join the group once they accept the request.",
      );
    } catch (error) {
      notify("Could not send invitations", toApiError(error).message);
    }
  }

  function confirmWithdraw(invitationId: string, name: string) {
    confirmDestructive(
      "Withdraw invitation",
      `Cancel the request sent to ${name}?`,
      () => {
        void cancelInvitation({ invitationId, groupId })
          .unwrap()
          .catch((error) =>
            notify("Could not withdraw", toApiError(error).message),
          );
      },
      "Withdraw",
    );
  }

  function confirmRemoveMember(userId: string, name: string) {
    confirmDestructive(
      "Remove member",
      `Remove ${name} from ${detail?.name}?`,
      () => {
        void removeMember({ groupId, userId })
          .unwrap()
          .catch((error) =>
            notify("Could not remove", toApiError(error).message),
          );
      },
      "Remove",
    );
  }

  function confirmDeleteGroup() {
    setActionSheet(false);
    confirmDestructive(
      "Delete group",
      `This permanently deletes ${detail?.name} and every task in it.`,
      () => {
        void deleteGroup(groupId)
          .unwrap()
          .then(() => router.back())
          .catch((error) => notify("Could not delete", toApiError(error).message));
      },
    );
  }

  if (group.isLoading) {
    return (
      <Screen>
        <DetailBar title="Group" />
        <Body>
          <GroupDetailSkeleton />
        </Body>
      </Screen>
    );
  }

  if (group.isError || !detail) {
    return (
      <Screen>
        <DetailBar title="Group" />
        <Body>
          <ErrorNote message={toApiError(group.error).message} />
        </Body>
      </Screen>
    );
  }

  const pages = tasks.data?.pages;
  const list = pages?.flatMap((page) => page.tasks) ?? [];
  const total = pages?.[pages.length - 1]?.total;

  return (
    <Screen>
      <DetailBar
        title={detail.name}
        subtitle={`${detail.memberCount} member${detail.memberCount === 1 ? "" : "s"}`}
        right={
          isOwner ? (
            <IconAction
              icon="ellipsis-horizontal"
              label="Group actions"
              onPress={() => setActionSheet(true)}
            />
          ) : null
        }
      />

      <Body
        refreshing={group.isFetching && !group.isLoading}
        onRefresh={() => {
          void group.refetch();
          void tasks.refetch();
        }}
        // The members tab is a complete roster in one response — only the task
        // tab has pages left to ask for.
        onEndReached={
          tab === "tasks" && tasks.hasNextPage
            ? () => void tasks.fetchNextPage()
            : undefined
        }
      >
        <Card style={styles.summary}>
          <View style={styles.summaryHead}>
            {/* Tappable for the owner — the same gesture as the profile
                picture, on the same kind of tile. */}
            <GroupIconPicker group={detail} canEdit={isOwner} size={46} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>{detail.name}</Text>
              <Text style={styles.summaryMeta}>
                Created by {detail.createdBy.fullName} ·{" "}
                {formatDate(detail.createdAt)}
              </Text>
            </View>
          </View>

          {detail.description ? (
            <Text style={styles.description}>{detail.description}</Text>
          ) : null}

          <View style={styles.progressBlock}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>
                {detail.completedTaskCount} of {detail.taskCount} complete
              </Text>
              <Text style={styles.progressValue}>{completion}%</Text>
            </View>
            <ProgressBar value={completion} tint={tint.dot} />
          </View>
        </Card>

        <View style={styles.tileRow}>
          <StatTile
            label="Active"
            value={detail.activeTaskCount}
            icon="play-circle-outline"
            tint={statusMeta.IN_PROGRESS}
          />
          <StatTile
            label="Overdue"
            value={detail.overdueTaskCount}
            icon="alert-circle-outline"
            tint={priorityMeta.URGENT}
          />
          <StatTile
            label="Done"
            value={detail.completedTaskCount}
            icon="checkmark-circle-outline"
            tint={statusMeta.COMPLETED}
          />
        </View>

        <SegmentedControl<Tab>
          segments={[
            { value: "tasks", label: "Tasks", count: detail.taskCount },
            { value: "members", label: "Members", count: detail.memberCount },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "tasks" ? (
          <View style={styles.section}>
            {/* Only this group's members can own one of its tasks, so the
                people filters are scoped to them rather than the directory. */}
            <TaskFilterBar
              filters={filters}
              onChange={setFilters}
              people={detail.allMembers.map((member) => member.user)}
            />

            {tasks.isLoading ? (
              <TaskListSkeleton count={3} />
            ) : tasks.isError && list.length === 0 ? (
              // A later page failing keeps the pages already loaded on screen;
              // the footer offers the retry rather than the list vanishing.
              <ErrorNote message={toApiError(tasks.error).message} />
            ) : list.length === 0 ? (
              <EmptyState
                icon="clipboard-outline"
                title="No tasks here yet"
                body="Assign the first task to someone in this group."
                action={
                  <Button
                    label="Assign a task"
                    icon="add"
                    onPress={() => setTaskSheet(true)}
                    fullWidth
                  />
                }
              />
            ) : (
              <>
                <TaskList tasks={list} showActions />

                <InfiniteFooter
                  loading={tasks.isFetchingNextPage}
                  hasMore={tasks.hasNextPage}
                  count={list.length}
                  total={total}
                  onRetry={
                    tasks.isError ? () => void tasks.fetchNextPage() : undefined
                  }
                />
              </>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            {isOwner ? (
              <Button
                label="Invite members"
                icon="person-add-outline"
                variant="secondary"
                onPress={() => setMemberSheet(true)}
                fullWidth
              />
            ) : null}

            {isOwner && detail.pendingInvitations.length > 0 ? (
              <View style={styles.list}>
                <Text style={styles.pendingHeading}>
                  Awaiting a response ({detail.pendingInvitations.length})
                </Text>
                {detail.pendingInvitations.map((invitation) => (
                  <Card key={invitation.id} style={styles.memberRow}>
                    <Avatar user={invitation.invitee} size={38} />
                    <View style={styles.memberText}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {invitation.invitee.fullName}
                      </Text>
                      <Text style={styles.memberMeta} numberOfLines={1}>
                        {invitation.invitee.email}
                      </Text>
                    </View>
                    <Chip
                      meta={{
                        label: "Pending",
                        bg: colors.amber50,
                        fg: colors.amber700,
                        dot: colors.amber500,
                      }}
                    />
                    <Pressable
                      hitSlop={HIT_SLOP}
                      onPress={() =>
                        confirmWithdraw(
                          invitation.id,
                          invitation.invitee.fullName,
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Withdraw invitation to ${invitation.invitee.fullName}`}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={21}
                        color={colors.inkMuted}
                      />
                    </Pressable>
                  </Card>
                ))}
              </View>
            ) : null}

            <View style={styles.list}>
              {detail.allMembers.map((member) => (
                <Card key={member.id} style={styles.memberRow}>
                  <Avatar user={member.user} size={38} />
                  <View style={styles.memberText}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.user.fullName}
                    </Text>
                    <Text style={styles.memberMeta} numberOfLines={1}>
                      {member.user.jobTitle ?? member.user.email}
                    </Text>
                  </View>

                  {member.role === "OWNER" ? (
                    <Chip
                      meta={{
                        label: "Owner",
                        bg: colors.brand50,
                        fg: colors.brand700,
                        dot: colors.brand600,
                      }}
                      showDot={false}
                    />
                  ) : isOwner ? (
                    <Pressable
                      hitSlop={HIT_SLOP}
                      onPress={() =>
                        confirmRemoveMember(member.user.id, member.user.fullName)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${member.user.fullName}`}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={21}
                        color={colors.inkMuted}
                      />
                    </Pressable>
                  ) : null}
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Foot of whichever tab is open. The FAB floats over the bottom-right
            of this screen, so the slot has the body's own gutter between it and
            anything pressable. */}
        <AdSlot />
      </Body>

      <Fab label="Assign a task" onPress={() => setTaskSheet(true)} />

      <CreateTaskSheet
        visible={taskSheet}
        onClose={() => setTaskSheet(false)}
        groupId={groupId}
      />

      <Sheet
        visible={memberSheet}
        onClose={() => {
          setInvited([]);
          setMemberSheet(false);
        }}
        title="Invite members"
        footer={
          <Button
            label={
              invited.length
                ? `Send ${invited.length} invitation${invited.length === 1 ? "" : "s"}`
                : "Send invitations"
            }
            onPress={sendInvites}
            loading={inviting}
            disabled={invited.length === 0}
            fullWidth
          />
        }
      >
        <MemberInviteSearch
          label="Invite by email"
          groupId={groupId}
          invited={invited}
          onInvite={(user) => setInvited((current) => [...current, user])}
          onRemove={(userId) =>
            setInvited((current) => current.filter((user) => user.id !== userId))
          }
        />
      </Sheet>

      <Sheet
        visible={actionSheet}
        onClose={() => setActionSheet(false)}
        title={detail.name}
      >
        <Button
          label="Delete group"
          variant="danger"
          icon="trash-outline"
          onPress={confirmDeleteGroup}
          fullWidth
        />
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  summary: { gap: spacing.md },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  summaryMeta: { fontSize: 12, color: colors.inkMuted },
  description: { fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
  progressBlock: { gap: 6 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { fontSize: 12, color: colors.inkMuted },
  progressValue: { fontSize: 12, fontWeight: "700", color: colors.ink },
  tileRow: { flexDirection: "row", gap: spacing.md },
  section: { gap: spacing.md },
  list: { gap: spacing.md },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pendingHeading: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.inkFaint,
  },
  memberText: { flex: 1, gap: 2 },
  memberName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  memberMeta: { fontSize: 12, color: colors.inkMuted },
}));
