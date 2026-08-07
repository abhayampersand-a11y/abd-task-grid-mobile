import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_URL } from "@/lib/config";
import { getTokenSync } from "@/lib/token";
import type { OAuthProviderId } from "@/lib/oauth";
import type {
  AdminUserRow,
  CommentDto,
  CurrentUser,
  DashboardOverview,
  GroupDetail,
  GroupInvitationDto,
  GroupMemberDto,
  GroupSummary,
  LookupResult,
  NotificationDto,
  Paginated,
  SearchResults,
  TaskDetail,
  TaskSummary,
  UserSummary,
} from "@/lib/types";
import type {
  ChangePasswordInput,
  CreateGroupInput,
  CreateTaskInput,
  InvitationAction,
  SignInInput,
  SignUpInput,
  UpdateProfileInput,
  UpdateTaskInput,
} from "@/lib/validation";

export interface ApiErrorShape {
  message: string;
  fieldErrors?: Record<string, string[]>;
}

/** Narrows an RTK Query error into something a form can display. */
export function toApiError(error: unknown): ApiErrorShape {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data
  ) {
    return error.data as ApiErrorShape;
  }
  // A native client also has to explain the failure mode the browser never
  // hits: the phone cannot reach the dev machine at all.
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    error.status === "FETCH_ERROR"
  ) {
    return {
      message: `Cannot reach the server at ${API_URL}. Check that the Next.js app is running and that this device is on the same network.`,
    };
  }
  return { message: "Something went wrong. Please try again." };
}

export interface TaskFilters {
  scope?: "assigned-to-me" | "assigned-by-me" | "all";
  groupId?: string;
  status?: string;
  priority?: string;
  assignedBy?: string;
  assigneeId?: string;
  /** overdue | today | week | none */
  due?: string;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface TaskListResponse {
  tasks: TaskSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * What an infinite list is keyed by: everything except the page, which the
 * endpoint supplies itself. Leaving `page` in would make every scroll a new
 * cache entry and throw away the pages already loaded.
 */
export type TaskFeedFilters = Omit<TaskFilters, "page">;

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface AdminUserFilters {
  q?: string;
  status?: string;
  sort?: string;
  page?: number;
}

export type AdminUserFeedFilters = Omit<AdminUserFilters, "page">;

type AdminUsersResponse = Paginated<AdminUserRow> & {
  totals: { all: number; active: number; disabled: number; pending: number };
};

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  newThisMonth: number;
  joinedToday: number;
  totalGroups: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  growthRate: number;
}

/** Sign-in and sign-up hand native clients the raw token to persist. */
export interface AuthResponse {
  user: CurrentUser;
  token: string;
}

/** Drops empty values so the querystring stays readable. */
function clean(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== "" && value !== null,
    ),
  );
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers) => {
      const token = getTokenSync();
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
    "Session",
    "Group",
    "GroupList",
    "Task",
    "TaskList",
    "Notification",
    "Invitation",
    "Dashboard",
    "AdminUsers",
    "Directory",
  ],
  endpoints: (build) => ({
    // ── Auth ──────────────────────────────────────────────────────────────
    me: build.query<{ user: CurrentUser }, void>({
      query: () => "/auth/me",
      providesTags: ["Session"],
    }),
    signUp: build.mutation<AuthResponse, SignUpInput>({
      query: (body) => ({ url: "/auth/sign-up", method: "POST", body }),
      invalidatesTags: ["Session"],
    }),
    signIn: build.mutation<AuthResponse, SignInInput>({
      query: (body) => ({ url: "/auth/sign-in", method: "POST", body }),
      invalidatesTags: ["Session"],
    }),
    signOut: build.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/auth/sign-out", method: "POST" }),
      invalidatesTags: ["Session"],
    }),
    /**
     * Which social providers the server has credentials for. Asking beats
     * hardcoding three buttons and letting the user find the missing
     * configuration halfway through a browser round trip.
     */
    oauthProviders: build.query<{ providers: OAuthProviderId[] }, void>({
      query: () => "/auth/oauth/providers",
    }),

    // ── Dashboard ─────────────────────────────────────────────────────────
    dashboard: build.query<DashboardOverview, void>({
      query: () => "/dashboard",
      providesTags: ["Dashboard", "GroupList"],
    }),

    // ── Groups ────────────────────────────────────────────────────────────
    groups: build.query<{ groups: GroupSummary[] }, void>({
      query: () => "/groups",
      providesTags: ["GroupList"],
    }),
    group: build.query<{ group: GroupDetail }, string>({
      query: (groupId) => `/groups/${groupId}`,
      providesTags: (_r, _e, groupId) => [{ type: "Group", id: groupId }],
    }),
    groupMembers: build.query<{ members: GroupMemberDto[] }, string>({
      query: (groupId) => `/groups/${groupId}/members`,
      providesTags: (_r, _e, groupId) => [{ type: "Group", id: groupId }],
    }),
    createGroup: build.mutation<
      { group: { id: string; name: string }; invited: number },
      CreateGroupInput
    >({
      query: (body) => ({ url: "/groups", method: "POST", body }),
      invalidatesTags: ["GroupList", "Dashboard"],
    }),
    updateGroup: build.mutation<
      { group: { id: string; name: string } },
      { groupId: string } & Partial<CreateGroupInput>
    >({
      query: ({ groupId, ...body }) => ({
        url: `/groups/${groupId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: "Group", id: groupId },
        "GroupList",
      ],
    }),
    deleteGroup: build.mutation<{ success: boolean }, string>({
      query: (groupId) => ({ url: `/groups/${groupId}`, method: "DELETE" }),
      invalidatesTags: ["GroupList", "Dashboard", "TaskList"],
    }),
    inviteGroupMembers: build.mutation<
      { invited: number },
      { groupId: string; memberIds: string[] }
    >({
      query: ({ groupId, memberIds }) => ({
        url: `/groups/${groupId}/members`,
        method: "POST",
        body: { memberIds },
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: "Group", id: groupId },
        "GroupList",
      ],
    }),
    removeGroupMember: build.mutation<
      { success: boolean },
      { groupId: string; userId: string }
    >({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: "Group", id: groupId },
        "GroupList",
      ],
    }),

    // ── Directory ─────────────────────────────────────────────────────────
    directory: build.query<{ users: UserSummary[] }, string | void>({
      query: (q) => ({ url: "/users", params: clean({ q: q ?? undefined }) }),
      providesTags: ["Directory"],
    }),
    /** Exact-email lookup behind the invite box. No partial matching. */
    lookupUser: build.query<LookupResult, { email: string; groupId?: string }>({
      query: ({ email, groupId }) => ({
        url: "/users/lookup",
        params: clean({ email, groupId }),
      }),
      providesTags: ["Directory", "Invitation"],
    }),

    // ── Invitations ───────────────────────────────────────────────────────
    invitations: build.query<
      { invitations: GroupInvitationDto[]; pendingCount: number },
      void
    >({
      query: () => "/invitations",
      providesTags: ["Invitation"],
    }),
    respondToInvitation: build.mutation<
      { invitation: GroupInvitationDto },
      { invitationId: string; action: InvitationAction }
    >({
      query: ({ invitationId, action }) => ({
        url: `/invitations/${invitationId}`,
        method: "PATCH",
        body: { action },
      }),
      invalidatesTags: ["Invitation", "GroupList", "Dashboard", "Notification"],
    }),
    cancelInvitation: build.mutation<
      { success: boolean },
      { invitationId: string; groupId: string }
    >({
      query: ({ invitationId }) => ({
        url: `/invitations/${invitationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: "Group", id: groupId },
        "Invitation",
      ],
    }),

    // ── Tasks ─────────────────────────────────────────────────────────────
    tasks: build.query<TaskListResponse, TaskFilters>({
      query: (filters) => ({ url: "/tasks", params: clean({ ...filters }) }),
      providesTags: ["TaskList"],
    }),
    /**
     * The list every task screen actually reads: pages accumulate as the user
     * scrolls rather than replacing each other. `getNextPageParam` returning
     * `undefined` on the last page is what turns `hasNextPage` off, so the
     * footer knows when to stop asking.
     *
     * A "TaskList" invalidation refetches every page that has been loaded, so
     * creating or editing a task still lands in a long list correctly.
     */
    taskFeed: build.infiniteQuery<TaskListResponse, TaskFeedFilters, number>({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: "/tasks",
        params: clean({ ...queryArg, page: pageParam }),
      }),
      providesTags: ["TaskList"],
    }),
    taskStats: build.query<TaskStats, TaskFilters>({
      query: (filters) => ({
        url: "/tasks/stats",
        params: clean({ ...filters }),
      }),
      providesTags: ["TaskList"],
    }),
    task: build.query<{ task: TaskDetail }, string>({
      query: (taskId) => `/tasks/${taskId}`,
      providesTags: (_r, _e, taskId) => [{ type: "Task", id: taskId }],
    }),
    createTask: build.mutation<{ task: TaskSummary }, CreateTaskInput>({
      query: (body) => ({ url: "/tasks", method: "POST", body }),
      invalidatesTags: ["TaskList", "Dashboard", "GroupList", "Notification"],
    }),
    updateTask: build.mutation<
      { task: TaskSummary },
      { taskId: string } & UpdateTaskInput
    >({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { taskId }) => [
        { type: "Task", id: taskId },
        "TaskList",
        "Dashboard",
        "Notification",
      ],
    }),
    deleteTask: build.mutation<{ success: boolean }, string>({
      query: (taskId) => ({ url: `/tasks/${taskId}`, method: "DELETE" }),
      invalidatesTags: ["TaskList", "Dashboard", "GroupList"],
    }),
    addComment: build.mutation<
      { comment: CommentDto },
      { taskId: string; body: string }
    >({
      query: ({ taskId, body }) => ({
        url: `/tasks/${taskId}/comments`,
        method: "POST",
        body: { body },
      }),
      invalidatesTags: (_r, _e, { taskId }) => [
        { type: "Task", id: taskId },
        "Notification",
      ],
    }),
    toggleChecklistItem: build.mutation<
      { item: { id: string; done: boolean } },
      { taskId: string; itemId: string; done: boolean }
    >({
      query: ({ taskId, itemId, done }) => ({
        url: `/tasks/${taskId}/checklist/${itemId}`,
        method: "PATCH",
        body: { done },
      }),
      invalidatesTags: (_r, _e, { taskId }) => [
        { type: "Task", id: taskId },
        "TaskList",
      ],
    }),

    // ── Notifications ─────────────────────────────────────────────────────
    notifications: build.query<
      { notifications: NotificationDto[]; unreadCount: number },
      void
    >({
      query: () => "/notifications",
      providesTags: ["Notification"],
    }),
    markNotificationRead: build.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: "PATCH" }),
      invalidatesTags: ["Notification"],
    }),
    deleteNotification: build.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: "DELETE" }),
      invalidatesTags: ["Notification"],
    }),
    markAllNotificationsRead: build.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/notifications", method: "PATCH" }),
      invalidatesTags: ["Notification"],
    }),

    // ── Search ────────────────────────────────────────────────────────────
    search: build.query<SearchResults, string>({
      query: (q) => ({ url: "/search", params: { q } }),
    }),

    // ── Profile ───────────────────────────────────────────────────────────
    updateProfile: build.mutation<{ user: CurrentUser }, UpdateProfileInput>({
      query: (body) => ({ url: "/profile", method: "PATCH", body }),
      invalidatesTags: ["Session"],
    }),
    changePassword: build.mutation<{ success: boolean }, ChangePasswordInput>({
      query: (body) => ({ url: "/profile/password", method: "POST", body }),
    }),

    // ── Admin ─────────────────────────────────────────────────────────────
    adminUsers: build.query<AdminUsersResponse, AdminUserFilters>({
      query: (filters) => ({
        url: "/admin/users",
        params: clean({ ...filters }),
      }),
      providesTags: ["AdminUsers"],
    }),
    adminUserFeed: build.infiniteQuery<
      AdminUsersResponse,
      AdminUserFeedFilters,
      number
    >({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: "/admin/users",
        params: clean({ ...queryArg, page: pageParam }),
      }),
      providesTags: ["AdminUsers"],
    }),
    adminStats: build.query<AdminStats, void>({
      query: () => "/admin/stats",
      providesTags: ["AdminUsers"],
    }),
    setUserStatus: build.mutation<
      { success: boolean },
      { userId: string; status: "ACTIVE" | "DISABLED" }
    >({
      query: ({ userId, status }) => ({
        url: `/admin/users/${userId}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["AdminUsers"],
    }),
    deleteUser: build.mutation<{ success: boolean }, string>({
      query: (userId) => ({ url: `/admin/users/${userId}`, method: "DELETE" }),
      invalidatesTags: ["AdminUsers"],
    }),
  }),
});

export const {
  useMeQuery,
  useSignUpMutation,
  useSignInMutation,
  useSignOutMutation,
  useOauthProvidersQuery,
  useDashboardQuery,
  useGroupsQuery,
  useGroupQuery,
  useGroupMembersQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useInviteGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useDirectoryQuery,
  useLookupUserQuery,
  useInvitationsQuery,
  useRespondToInvitationMutation,
  useCancelInvitationMutation,
  useTasksQuery,
  useTaskFeedInfiniteQuery,
  useTaskStatsQuery,
  useTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAddCommentMutation,
  useToggleChecklistItemMutation,
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useSearchQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useAdminUsersQuery,
  useAdminUserFeedInfiniteQuery,
  useAdminStatsQuery,
  useSetUserStatusMutation,
  useDeleteUserMutation,
} = api;
