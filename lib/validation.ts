import { z } from "zod";

/** Accepts +country codes, spaces, dashes and parentheses; 10–15 digits. */
export const mobileSchema = z
  .string()
  .trim()
  .min(1, "Mobile number is required.")
  .refine(
    (value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    },
    { message: "Enter a valid mobile number (10–15 digits)." },
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .regex(/[a-zA-Z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name.")
      .max(80, "Name is too long."),
    email: z.email("Enter a valid email address.").trim().toLowerCase(),
    mobile: mobileSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine((v) => v, "You must accept the Terms of Service."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your email or mobile number."),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean().optional().default(false),
});

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Group name must be at least 2 characters.")
    .max(60, "Group name is too long."),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
  colorKey: z.string().default("indigo"),
  memberIds: z.array(z.string()).default([]),
});

export const updateGroupSchema = createGroupSchema.partial().omit({
  memberIds: true,
});

/** `memberIds` on a group are invitations — nobody joins without accepting. */
export const inviteMembersSchema = z.object({
  memberIds: z.array(z.string()).min(1, "Invite at least one person."),
});

export const invitationResponseSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
});

export const taskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const taskStatusEnum = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
]);

export const createTaskSchema = z.object({
  groupId: z.string().min(1, "Select a group."),
  title: z
    .string()
    .trim()
    .min(3, "Task title must be at least 3 characters.")
    .max(140, "Task title is too long."),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  assigneeId: z.string().min(1, "Choose who this task is for."),
  priority: taskPriorityEnum.default("MEDIUM"),
  status: taskStatusEnum.default("TODO"),
  dueDate: z.string().optional().nullable(),
  checklist: z.array(z.string().trim().min(1)).max(20).default([]),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        sizeBytes: z.number().int().nonnegative().default(0),
        mimeType: z.string().default("application/octet-stream"),
      }),
    )
    .max(10)
    .default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  assigneeId: z.string().nullable().optional(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().nullable().optional(),
});

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something before posting.")
    .max(2000, "Comment is too long."),
});

export const checklistToggleSchema = z.object({ done: z.boolean() });

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(80),
  jobTitle: z.string().trim().max(80).optional().or(z.literal("")),
  // Optional because accounts created through a social provider start without
  // a number; clearing the field is how such a user leaves it unset.
  mobile: mobileSchema.optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  avatarUrl: z.string().trim().max(500).optional().nullable(),
});

export const changePasswordSchema = z
  .object({
    // A social-only account has no password to confirm, so the requirement is
    // enforced by the API against the stored hash rather than by this schema.
    currentPassword: z.string().optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const adminUserActionSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]),
});

/**
 * A device registering itself for push. The shape is validated rather than
 * trusted because the token is echoed straight back to Expo — anything that is
 * not an `ExponentPushToken[…]` could only ever earn an error ticket.
 */
export const pushTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .max(255)
    .regex(
      /^Expo(nent)?PushToken\[[^\]]+\]$/,
      "That is not an Expo push token.",
    ),
  platform: z.enum(["ios", "android"]),
  deviceName: z.string().trim().max(120).optional().nullable(),
});

export type InvitationAction = z.infer<
  typeof invitationResponseSchema
>["action"];

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInInput = z.input<typeof signInSchema>;
export type CreateGroupInput = z.input<typeof createGroupSchema>;
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type PushTokenInput = z.input<typeof pushTokenSchema>;
