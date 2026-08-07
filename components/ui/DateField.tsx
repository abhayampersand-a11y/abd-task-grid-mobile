import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { formatDate, toDateInputValue } from "@/lib/format";

interface Props {
  label: string;
  /** `YYYY-MM-DD`, or empty for no deadline. */
  value: string;
  onChange: (value: string) => void;
}

export function DateField({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { colors, scheme } = useTheme();
  const styles = useStyles();

  // Parsing as UTC-noon keeps the displayed day stable either side of the
  // timezone boundary.
  const asDate = value ? new Date(`${value}T12:00:00`) : new Date();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.field}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${value ? formatDate(value) : "No deadline"}`}
          style={styles.trigger}
        >
          <Ionicons name="calendar-outline" size={17} color={colors.inkMuted} />
          <Text style={[styles.value, !value && styles.placeholder]}>
            {value ? formatDate(value) : "No deadline"}
          </Text>
        </Pressable>

        {value ? (
          <Pressable
            onPress={() => onChange("")}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Clear due date"
          >
            <Ionicons name="close-circle" size={19} color={colors.inkFaint} />
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <DateTimePicker
          value={asDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          // iOS draws this natively, so it follows the *device* theme unless
          // told otherwise — which is wrong whenever the app's own preference
          // differs from the device's.
          themeVariant={scheme}
          accentColor={colors.brandSolid}
          onChange={(event, selected) => {
            // Android fires once and dismisses itself; iOS stays inline.
            if (Platform.OS !== "ios") setOpen(false);
            if (event.type === "dismissed") return;
            if (selected) onChange(toDateInputValue(selected.toISOString()));
          }}
        />
      ) : null}

      {open && Platform.OS === "ios" ? (
        <Pressable onPress={() => setOpen(false)} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: 7 },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkMuted },
  field: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceMuted,
  },
  trigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  value: { fontSize: 16, color: colors.ink },
  placeholder: { color: colors.inkFaint },
  done: { alignSelf: "flex-end", padding: spacing.sm },
  doneText: { fontSize: 15, fontWeight: "600", color: colors.brandText },
}));
