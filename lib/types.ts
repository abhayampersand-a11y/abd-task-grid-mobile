/**
 * Plain, serialisable domain types shared between the API layer and the client.
 * Deliberately independent of the generated Prisma types so client bundles never
 * pull in the ORM.
 */

export type Role = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "PENDING" | "DISABLED";
export type GroupVisibility = "PUBLIC" | "PRIVATE";
export type GroupRole = "OWNER" | "MEMBER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "TASK_COMPLETED"
  | "NEW_COMMENT"
  | "GROUP_INVITATION";

export type ActivityType =
  | "TASK_CREATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "PROGRESS_UPDATED"
  | "ASSIGNEE_CHANGED"
  | "DUE_DATE_CHANGED"
  | "DESCRIPTION_UPDATED"
  | "COMMENT_ADDED"
  | "ATTACHMENT_ADDED"
  | "MEMBER_ADDED"
  | "GROUP_CREATED";

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
}

export interface CurrentUser extends UserSummary {
  mobile: string;
  bio: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface AdminUserRow extends UserSummary {
  mobile: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  groupCount: number;
  taskCount: number;
}

export interface GroupMemberDto {
  id: string;
  role: GroupRole;
  joinedAt: string;
  user: UserSummary;
}

export interface GroupInvitationDto {
  id: string;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
  group: {
    id: string;
    name: string;
    description: string | null;
    colorKey: string;
    memberCount: number;
  };
  invitedBy: UserSummary;
  invitee: UserSummary;
}

/** What an email lookup says about the person behind the address. */
export type InviteeState = "AVAILABLE" | "SELF" | "MEMBER" | "INVITED";

export interface LookupResult {
  user: UserSummary | null;
  state: InviteeState | null;
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  colorKey: string;
  createdAt: string;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  myRole: GroupRole;
  members: UserSummary[];
}

export interface GroupDetail extends GroupSummary {
  createdBy: UserSummary;
  allMembers: GroupMemberDto[];
  /** Invitations still waiting on an answer. Empty for non-owners. */
  pendingInvitations: GroupInvitationDto[];
  activeTaskCount: number;
  overdueTaskCount: number;
}

export interface ChecklistItemDto {
  id: string;
  label: string;
  done: boolean;
  position: number;
}

export interface AttachmentDto {
  id: string;
  name: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: UserSummary;
}

export interface CommentDto {
  id: string;
  body: string;
  createdAt: string;
  author: UserSummary;
}

export interface ActivityDto {
  id: string;
  type: ActivityType;
  message: string;
  createdAt: string;
  actor: UserSummary;
}

export interface TaskSummary {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  group: { id: string; name: string; colorKey: string };
  assignee: UserSummary | null;
  createdBy: UserSummary;
  commentCount: number;
  attachmentCount: number;
  checklistTotal: number;
  checklistDone: number;
}

export interface TaskDetail extends TaskSummary {
  comments: CommentDto[];
  attachments: AttachmentDto[];
  checklist: ChecklistItemDto[];
  activities: ActivityDto[];
  viewerIsAssignee: boolean;
  viewerIsCreator: boolean;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  assignedByMe: number;
  assignedToMe: number;
  dueToday: number;
  dueThisWeek: number;
  groupCount: number;
  completionRate: number;
}

export interface DashboardOverview {
  stats: DashboardStats;
  groups: GroupSummary[];
  upcoming: TaskSummary[];
  recentActivity: ActivityDto[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SearchResults {
  groups: { id: string; name: string; description: string | null }[];
  tasks: { id: string; title: string; status: TaskStatus; groupName: string }[];
  members: UserSummary[];
}
