import { Redirect } from "expo-router";

/**
 * The middle slot of the tab bar. Nothing ever routes here — the layout renders
 * an inert spacer for this screen and docks the create button over the space it
 * holds open — but the navigator needs a real route to reserve that slot, and a
 * deep link that reaches it should still land somewhere useful.
 */
export default function CreateSlot() {
  return <Redirect href="/dashboard" />;
}
