import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL } from "./config";

/**
 * The Privacy Policy and Terms of Service.
 *
 * They are pages of the web app rather than screens of this one, so there is a
 * single copy of each: the same URL the Play listing points at, the same one a
 * signed-out reviewer opens. Built off `API_BASE_URL` so a dev build shows the
 * local server's copy instead of production's.
 */
export const PRIVACY_URL = `${API_BASE_URL}/privacy`;
export const TERMS_URL = `${API_BASE_URL}/terms`;

/** Where Play's Data deletion field points, and what the profile screen links. */
export const DELETE_ACCOUNT_URL = `${PRIVACY_URL}#delete-account`;

/**
 * Opens one of them in the in-app browser rather than handing the user off to
 * Chrome — reading the terms mid-signup must not lose a half-filled form.
 *
 * Deliberately fire-and-forget: the promise resolves when the sheet is
 * dismissed, which no caller waits for, and a failure to open a document is not
 * worth an error dialog over the form.
 */
export function openLegal(url: string): void {
  void WebBrowser.openBrowserAsync(url).catch(() => undefined);
}
