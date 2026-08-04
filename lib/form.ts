import { z } from "zod";

export type FieldErrors = Record<string, string | undefined>;

/**
 * Zod gives an array of messages per field; a mobile form only has room for
 * one line under each input, so keep the first.
 */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const flat = z.flattenError(error).fieldErrors as Record<string, string[]>;
  return Object.fromEntries(
    Object.entries(flat).map(([key, messages]) => [key, messages?.[0]]),
  );
}

/** Merges server-side `fieldErrors` into the same shape the form renders. */
export function mergeServerErrors(
  current: FieldErrors,
  server: Record<string, string[]> | undefined,
): FieldErrors {
  if (!server) return current;
  const mapped = Object.fromEntries(
    Object.entries(server).map(([key, messages]) => [key, messages?.[0]]),
  );
  return { ...current, ...mapped };
}
