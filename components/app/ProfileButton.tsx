import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { HIT_SLOP, MIN_TAP, radius } from "@/lib/theme";
import { makeStyles } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/primitives";

/**
 * The way into the profile screen from every tab root, sitting at the end of
 * the header actions. It replaces the profile tab: the bar is for the places
 * you move between all day, and the account is not one of them.
 *
 * It is the same 44pt circle as `IconAction` so the two line up, but ringed in
 * brand rather than the neutral line — it is the only header action that is a
 * person rather than a verb, and the ring is what says so at 20pt.
 */
export function ProfileButton() {
  const router = useRouter();
  const { user } = useAuth();
  const styles = useStyles();

  if (!user) return null;

  return (
    <Pressable
      onPress={() => router.push("/profile")}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Your profile"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {/* Two points shy of the ring's inner edge, so the ring reads as a ring
          rather than as a border drawn on the avatar itself. */}
      <Avatar user={user} size={MIN_TAP - RING * 2 - 2} />
    </Pressable>
  );
}

/** Thickness of the brand ring around the face. */
const RING = 2;

const useStyles = makeStyles(({ colors, shadow }) => ({
  button: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: RING,
    borderColor: colors.brand200,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  pressed: { opacity: 0.6, transform: [{ scale: 0.96 }] },
}));
