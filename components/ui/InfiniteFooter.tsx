import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";

interface Props {
  /** A page is in flight. */
  loading: boolean;
  /** More pages exist — the list keeps growing as it is scrolled. */
  hasMore: boolean;
  /** Rows loaded so far, for the end-of-list line. */
  count: number;
  /** Total the server reports, so the line can say "all of them". */
  total?: number;
  /** What is being counted, e.g. "tasks". */
  noun?: string;
  /**
   * Set when the last page failed. Scrolling alone will not retry — the end
   * trigger fires once per content height and the content did not grow — so
   * the footer has to offer the tap.
   */
  onRetry?: () => void;
}

/**
 * Tail of an infinite list: the spinner while the next page loads, a quiet
 * total once there is nothing left to fetch, and a retry when a page failed.
 *
 * The end-of-list line matters more here than it does on the web table it
 * replaces — a pager told you where you were, and without one the only signal
 * that a list has actually ended is this.
 */
export function InfiniteFooter({
  loading,
  hasMore,
  count,
  total,
  noun = "tasks",
  onRetry,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles();

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={colors.brand600} />
      </View>
    );
  }

  if (onRetry) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.failed}>Could not load more {noun}.</Text>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={`Retry loading more ${noun}`}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  // Nothing to say about a list that fits on one screen, or an empty one — the
  // empty state has already spoken for it.
  if (hasMore || count === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.done}>
        All {total ?? count} {noun} loaded
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrap: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  done: { fontSize: 12, color: colors.inkFaint },
  failed: { fontSize: 13, color: colors.inkMuted },
  retry: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  retryText: { fontSize: 13, fontWeight: "600", color: colors.brandText },
  pressed: { opacity: 0.7 },
}));
