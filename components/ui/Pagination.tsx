import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MIN_TAP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";

interface Props {
  page: number;
  totalPages: number;
  /** Row count across every page, for the summary line. */
  total: number;
  onChange: (page: number) => void;
  /** What is being counted, e.g. "tasks". */
  noun?: string;
}

/**
 * The web table's pager, reduced to what fits a phone: two arrows either side
 * of the position, with the record count underneath. Numbered page links are
 * dropped — they are well under the 44pt minimum by the time there are more
 * than a handful.
 */
export function Pagination({
  page,
  totalPages,
  total,
  onChange,
  noun = "tasks",
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles();

  if (totalPages <= 1) return null;

  const first = page <= 1;
  const last = page >= totalPages;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(page - 1)}
          disabled={first}
          accessibilityRole="button"
          accessibilityLabel="Previous page"
          accessibilityState={{ disabled: first }}
          style={({ pressed }) => [
            styles.button,
            first && styles.buttonDisabled,
            pressed && !first && styles.pressed,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={19}
            color={first ? colors.inkFaint : colors.inkSoft}
          />
        </Pressable>

        <Text style={styles.position}>
          Page {page} of {totalPages}
        </Text>

        <Pressable
          onPress={() => onChange(page + 1)}
          disabled={last}
          accessibilityRole="button"
          accessibilityLabel="Next page"
          accessibilityState={{ disabled: last }}
          style={({ pressed }) => [
            styles.button,
            last && styles.buttonDisabled,
            pressed && !last && styles.pressed,
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={19}
            color={last ? colors.inkFaint : colors.inkSoft}
          />
        </Pressable>
      </View>

      <Text style={styles.summary}>
        {total} {noun} in total
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: 6, alignItems: "center", paddingTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  button: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.45 },
  pressed: { backgroundColor: colors.surfaceMuted },
  position: { fontSize: 13, fontWeight: "600", color: colors.ink },
  summary: { fontSize: 12, color: colors.inkMuted },
}));
