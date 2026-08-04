import { Pressable, ScrollView, Text, View } from "react-native";
import { radius, spacing } from "@/lib/theme";
import { makeStyles } from "@/lib/theme-context";

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

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  scrollable = false,
}: Props<T>) {
  const styles = useStyles();

  const items = segments.map((segment) => {
    const active = segment.value === value;
    return (
      <Pressable
        key={segment.value}
        onPress={() => onChange(segment.value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={[
          styles.segment,
          !scrollable && styles.segmentFlex,
          active && styles.segmentActive,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.label, active && styles.labelActive]}
        >
          {segment.label}
          {segment.count === undefined ? "" : ` ${segment.count}`}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {items}
      </ScrollView>
    );
  }

  return <View style={styles.container}>{items}</View>;
}

const useStyles = makeStyles(({ colors }) => ({
  container: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segment: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentFlex: { flex: 1 },
  segmentActive: { backgroundColor: colors.surface },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkMuted },
  labelActive: { color: colors.brandText },
}));
