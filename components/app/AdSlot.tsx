import { useState } from "react";
import {
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { radius, spacing } from "@/lib/theme";
import { makeStyles } from "@/lib/theme-context";
import {
  BANNER_SIZE,
  BANNER_UNIT_ID,
  bannerComponent,
  useAds,
} from "@/lib/ads";

/**
 * One banner, framed as a card so it reads as a slab in the same stack as
 * everything else on the screen rather than as something pasted over it.
 *
 * It is self-collapsing in every failure case — Expo Go, the web build, an
 * unconfigured release, a declined consent, a no-fill — so a screen can place
 * one unconditionally and never end up with an empty gap where the ad would
 * have been. That is why there is no `loading` state and no placeholder: an ad
 * that is still in flight occupies nothing, and the content below it settles
 * once rather than twice.
 *
 * The frame carries a "Sponsored" caption. AdMob requires an ad to be
 * distinguishable from the app's own content, and on a screen that is otherwise
 * all cards a bare banner is exactly what would be mistaken for one.
 */
export function AdSlot({ style }: { style?: StyleProp<ViewStyle> }) {
  const { ready } = useAds();
  const { width } = useWindowDimensions();
  const styles = useStyles();
  const [failed, setFailed] = useState(false);

  const BannerAd = bannerComponent();
  if (!ready || failed || !BannerAd || !BANNER_UNIT_ID) return null;

  return (
    <View style={[styles.frame, style]}>
      <Text style={styles.label}>Sponsored</Text>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BANNER_SIZE}
        // An anchored adaptive banner is device-width by default, which would
        // run under the body's own gutters and be clipped by the frame. The
        // width it is actually given is the one it has to size itself against.
        width={width - spacing.lg * 2}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  /**
   * No shadow, unlike `Card`. The slot is the one thing on the page that should
   * not compete with the content for attention, so it sits flat on the canvas
   * with only its hairline to separate it.
   */
  frame: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  label: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.inkFaint,
  },
}));
