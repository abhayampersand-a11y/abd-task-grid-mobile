import { Easing } from "react-native";
import type { BottomTabNavigationOptions } from "expo-router/js-tabs";

/**
 * The two halves of a tab transition, as the bottom-tab navigator takes them:
 * the spec is *when* the progress value moves, the interpolator is *what* that
 * progress does to the scene.
 */
type TransitionSpec = NonNullable<BottomTabNavigationOptions["transitionSpec"]>;
type SceneStyleInterpolator = NonNullable<
  BottomTabNavigationOptions["sceneStyleInterpolator"]
>;

/**
 * How long a tab change takes, and its shape.
 *
 * Quick off the mark and settling at the end, so the change reads as a flick
 * that was thrown rather than a panel that was faded. Much past ~300ms a tab
 * change starts to feel like waiting; much under ~200ms and the slide is over
 * before the eye has followed it anywhere, which is no better than a cut.
 */
export const TAB_SWIPE_SPEC: TransitionSpec = {
  animation: "timing",
  config: { duration: 260, easing: Easing.out(Easing.cubic) },
};

/**
 * A tab change, drawn as a page swipe.
 *
 * The navigator ships three named animations — `none`, `fade` and `shift` — and
 * none of them is this. `shift` is the near miss: it slides the scenes by a
 * flat 50pt, which at phone width is a twitch at the edge of a screen that is
 * otherwise cutting, so the eye reads the cut and not the slide.
 *
 * What makes the pager feel available is that `current.progress` already
 * carries the *direction*. The navigator drives every scene's value to -1 while
 * it sits left of the focused tab, +1 while it sits right, and 0 while it is
 * the focused tab — so a screen leaving to make room for one on its right runs
 * 0 → -1, and the one arriving runs +1 → 0 over the same spec. Mapping that
 * onto `translateX` a full screen width either side is all a pager is: two
 * panes moving in step, the outgoing one leaving by the edge the incoming one
 * arrived from.
 *
 * The width has to be passed in because the interpolator is handed nothing but
 * the progress value — no layout, no dimensions.
 *
 * Deliberately no opacity: at the halfway point the two scenes occupy opposite
 * halves of the screen rather than overlapping, so fading them would not
 * cross-fade anything — it would just punch the canvas through both halves at
 * once. A pane in a pager is opaque the whole way across, and so is this.
 *
 * Only the outgoing and incoming scenes animate; the navigator snaps anything
 * else to its resting -1/+1, which is off-screen either way. So jumping from
 * the first tab to the last is still one slide, not four.
 */
export function tabSwipeInterpolator(width: number): SceneStyleInterpolator {
  return ({ current }) => ({
    sceneStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-width, 0, width],
          }),
        },
      ],
    },
  });
}

/**
 * The pop the selected disc makes when it takes over. A spring rather than a
 * curve: the small overshoot is what sells it as landing, and at this size a
 * timing curve just looks like the disc arrived late.
 */
export const TAB_DISC_SPRING = {
  stiffness: 320,
  damping: 22,
  mass: 0.7,
} as const;
