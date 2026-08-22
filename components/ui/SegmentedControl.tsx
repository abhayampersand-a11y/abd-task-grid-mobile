import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";

export interface Segment<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Underlined web tabs become a pill container (MOBILE.md §4). */
  scrollable?: boolean;
}

/** Where a segment sits inside the container, as its own layout reported it. */
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The same beat as a bottom-tab change, so the two read as one idea of "moving
 * between tabs" rather than two unrelated effects.
 *
 * On the JS driver, unavoidably: `width` and `color` are the two things being
 * animated and neither has a native counterpart. It is one pill and a handful
 * of labels, and the alternative — position on the UI thread, width off it — is
 * worse than either, because the pill would visibly out-run its own edge
 * whenever the JS thread hitched.
 */
const SLIDE = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  useNativeDriver: false,
} as const;

/**
 * One tab. It owns its own label fade because the colour has to cross under the
 * pill on the pill's timing — swapped instantly, the label would turn
 * canvas-coloured while the pill was still two segments away, and spend the
 * whole slide invisible against the container.
 */
function SegmentButton({
  label,
  active,
  onPress,
  onLayout,
  fill,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  /** Equal-width segments; the scrollable variant sizes to its text instead. */
  fill: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  const on = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(on, { toValue: active ? 1 : 0, ...SLIDE }).start();
  }, [active, on]);

  const color = on.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.inkMuted, colors.canvas],
  });

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.segment, fill && styles.segmentFlex]}
    >
      <Animated.Text numberOfLines={1} style={[styles.label, { color }]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  scrollable = false,
}: Props<T>) {
  const styles = useStyles();

  // Measured rather than computed: the equal-width case could be divided out of
  // the container, but the scrollable one is sized by its own text and only the
  // layout pass knows how wide that came out.
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [placed, setPlaced] = useState(false);

  const left = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;

  // What the pill was last put behind. Distinguishes a real tab change from a
  // re-measure — counts landing from the server widen a label, and the pill
  // should follow that edge immediately rather than drift to it.
  const behind = useRef<T | null>(null);

  const target = boxes[value] as Box | undefined;
  const targetX = target?.x;
  const targetWidth = target?.width;

  useEffect(() => {
    if (targetX === undefined || targetWidth === undefined) return;

    const changed = behind.current !== null && behind.current !== value;
    behind.current = value;

    if (!changed) {
      left.setValue(targetX);
      width.setValue(targetWidth);
      setPlaced(true);
      return;
    }

    Animated.parallel([
      Animated.timing(left, { toValue: targetX, ...SLIDE }),
      Animated.timing(width, { toValue: targetWidth, ...SLIDE }),
    ]).start();
  }, [value, targetX, targetWidth, left, width]);

  const items = segments.map((segment) => (
    <SegmentButton
      key={segment.value}
      label={
        segment.count === undefined
          ? segment.label
          : `${segment.label} ${segment.count}`
      }
      active={segment.value === value}
      fill={!scrollable}
      onPress={() => onChange(segment.value)}
      onLayout={(event) => {
        const { x, y, width: w, height } = event.nativeEvent.layout;
        setBoxes((current) => {
          const previous = current[segment.value];
          if (
            previous &&
            previous.x === x &&
            previous.y === y &&
            previous.width === w &&
            previous.height === height
          ) {
            // Layout fires on every re-render, and a new object each time would
            // restart the effect above for nothing.
            return current;
          }
          return { ...current, [segment.value]: { x, y, width: w, height } };
        });
      }}
    />
  ));

  const indicator = (
    <Animated.View
      // Behind the labels and inert: the segments themselves take the taps, and
      // the pill only has to be under whichever one is selected.
      pointerEvents="none"
      style={[
        styles.indicator,
        {
          left,
          width,
          top: target?.y ?? 0,
          height: target?.height ?? 0,
          // Held back until the first measurement lands, so it never shows up
          // as a sliver at the container's left edge on the way in.
          opacity: placed ? 1 : 0,
        },
      ]}
    />
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {indicator}
        {items}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {indicator}
      {items}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: {
    flexDirection: "row",
    gap: 4,
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segment: {
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentFlex: { flex: 1 },
  /** Inverted, like the selected tab — the same "you are here" everywhere. */
  indicator: {
    position: "absolute",
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  /**
   * One weight for both states. The selected label used to be heavier, but a
   * weight that changes mid-slide re-measures the segment underneath the pill,
   * and in the scrollable variant that moves the very edge the pill is trying
   * to land on. The pill is emphasis enough.
   */
  label: { fontSize: 13, fontWeight: "600" },
}));
