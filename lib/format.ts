import type { Palette } from "./theme";
import type { TaskPriority, TaskStatus } from "./types";

/**
 * The web app's `lib/utils.ts`, with every Tailwind class string swapped for
 * literal colours. The date, initials and overdue logic is unchanged so both
 * clients label the same record identically.
 *
 * Anything that resolves to a colour is a function of the palette rather than a
 * constant, because the palette now changes at runtime with the theme. The
 * built tables are memoised per palette in `lib/theme-context.tsx` and reached
 * through `useTheme()`, so call sites still read a plain object.
 */

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export interface Tint {
  bg: string;
  fg: string;
}

export interface Meta {
  label: string;
  bg: string;
  fg: string;
  dot: string;
}

/** Deterministic avatar tint so a user looks the same everywhere. */
function avatarTints(colors: Palette): Tint[] {
  return [
    { bg: colors.indigo100, fg: colors.indigo700 },
    { bg: colors.emerald100, fg: colors.emerald700 },
    { bg: colors.amber100, fg: colors.amber700 },
    { bg: colors.rose100, fg: colors.rose700 },
    { bg: colors.sky100, fg: colors.sky700 },
    { bg: colors.violet100, fg: colors.violet700 },
    { bg: colors.teal100, fg: colors.teal700 },
  ];
}

function hash(seed: string) {
  let value = 0;
  for (let i = 0; i < seed.length; i += 1) {
    value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return value;
}

export function groupColorsFor(colors: Palette): Record<string, Meta> {
  return {
    indigo: {
      label: "Indigo",
      bg: colors.indigo50,
      fg: colors.indigo700,
      dot: colors.indigo500,
    },
    emerald: {
      label: "Emerald",
      bg: colors.emerald50,
      fg: colors.emerald700,
      dot: colors.emerald500,
    },
    amber: {
      label: "Amber",
      bg: colors.amber50,
      fg: colors.amber700,
      dot: colors.amber500,
    },
    rose: {
      label: "Rose",
      bg: colors.rose50,
      fg: colors.rose700,
      dot: colors.rose500,
    },
    sky: {
      label: "Sky",
      bg: colors.sky50,
      fg: colors.sky700,
      dot: colors.sky500,
    },
    violet: {
      label: "Violet",
      bg: colors.violet50,
      fg: colors.violet700,
      dot: colors.violet500,
    },
  };
}

/** Stable across themes — only the swatch behind each key changes. */
export const GROUP_COLOR_KEYS = [
  "indigo",
  "emerald",
  "amber",
  "rose",
  "sky",
  "violet",
];

export function priorityMetaFor(colors: Palette): Record<TaskPriority, Meta> {
  return {
    LOW: {
      label: "Low",
      bg: colors.slate100,
      fg: colors.slate600,
      dot: colors.slate400,
    },
    MEDIUM: {
      label: "Medium",
      bg: colors.sky50,
      fg: colors.sky700,
      dot: colors.sky500,
    },
    HIGH: {
      label: "High",
      bg: colors.amber50,
      fg: colors.amber700,
      dot: colors.amber500,
    },
    URGENT: {
      label: "Urgent",
      bg: colors.rose50,
      fg: colors.rose700,
      dot: colors.rose500,
    },
  };
}

export function statusMetaFor(colors: Palette): Record<TaskStatus, Meta> {
  return {
    BACKLOG: {
      label: "Backlog",
      bg: colors.slate100,
      fg: colors.slate600,
      dot: colors.slate400,
    },
    TODO: {
      label: "To Do",
      bg: colors.indigo50,
      fg: colors.indigo700,
      dot: colors.indigo500,
    },
    IN_PROGRESS: {
      label: "In Progress",
      bg: colors.blue50,
      fg: colors.blue700,
      dot: colors.blue500,
    },
    IN_REVIEW: {
      label: "In Review",
      bg: colors.violet50,
      fg: colors.violet700,
      dot: colors.violet500,
    },
    COMPLETED: {
      label: "Completed",
      bg: colors.emerald50,
      fg: colors.emerald700,
      dot: colors.emerald500,
    },
  };
}

/** The colour half of the theme — everything that had to wait for a palette. */
export interface Tokens {
  groupColors: Record<string, Meta>;
  groupColor: (key: string) => Meta;
  statusMeta: Record<TaskStatus, Meta>;
  priorityMeta: Record<TaskPriority, Meta>;
  tintFor: (seed: string) => Tint;
}

export function tokensFor(colors: Palette): Tokens {
  const groupColors = groupColorsFor(colors);
  const tints = avatarTints(colors);

  return {
    groupColors,
    groupColor: (key) => groupColors[key] ?? groupColors.indigo!,
    statusMeta: statusMetaFor(colors),
    priorityMeta: priorityMetaFor(colors),
    tintFor: (seed) => tints[hash(seed) % tints.length]!,
  };
}

export const PRIORITY_ORDER: TaskPriority[] = [
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
];

export const STATUS_ORDER: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
];

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return "No deadline";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relativeTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;

  return formatDate(date);
}

export function isOverdue(dueDate: string | null, status: TaskStatus) {
  if (!dueDate || status === "COMPLETED") return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

/** `2024-10-24`, the shape the API expects for due dates. */
export function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * The dashboard tiles each count a bucket of statuses, not a single one, so a
 * tile's filter has to ask the API for that same bucket — otherwise
 * "In progress: 2" opens a list with one row in it. `GET /api/tasks` reads
 * `status` as a comma-separated list.
 */
export const STATUS_GROUP_PARAM = {
  PENDING: "BACKLOG,TODO",
  ACTIVE: "IN_PROGRESS,IN_REVIEW",
} as const;

export const STATUS_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: STATUS_GROUP_PARAM.PENDING, label: "Pending (Backlog + To Do)" },
  { value: STATUS_GROUP_PARAM.ACTIVE, label: "In Progress (+ In Review)" },
];
