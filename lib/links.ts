import type { Href } from "expo-router";

/**
 * Notification links are written by the API for the web app — `/tasks/:id`,
 * `/groups/:id`, `/requests` — and the native routes are singular. Translating
 * in one place keeps the alerts list and a tapped push notification landing on
 * the same screen.
 *
 * Returns `null` for a link this app has no screen for, so the caller can leave
 * the user where they are rather than pushing a dead route.
 */
export function toAppRoute(link: string | null | undefined): Href | null {
  if (!link) return null;

  if (link === "/requests") return "/requests";

  const task = link.match(/^\/tasks\/([^/?#]+)/);
  if (task) return `/task/${task[1]}`;

  const group = link.match(/^\/groups\/([^/?#]+)/);
  if (group) return `/group/${group[1]}`;

  return null;
}
