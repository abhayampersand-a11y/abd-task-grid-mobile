import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MIN_TAP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { Sheet } from "./Sheet";

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
}

/**
 * An anchored popover is fiddly at thumb size, so the web app's dropdown
 * becomes a full-width action sheet (MOBILE.md §2).
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Select…",
  error,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const styles = useStyles();
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected?.label ?? placeholder}`}
        style={[styles.field, Boolean(error) && styles.fieldError]}
      >
        <Text
          numberOfLines={1}
          style={[styles.value, !selected && styles.placeholder]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={17} color={colors.inkMuted} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.options}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  active && styles.optionActive,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {option.label}
                </Text>
                {active ? (
                  <Ionicons name="checkmark" size={19} color={colors.brand600} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  field: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  fieldError: { borderColor: colors.rose500 },
  value: { flex: 1, fontSize: 16, color: colors.ink },
  placeholder: { color: colors.inkFaint },
  error: { fontSize: 12, color: colors.rose700 },
  options: { gap: 4 },
  option: {
    minHeight: MIN_TAP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.brand50 },
  optionPressed: { backgroundColor: colors.canvas },
  optionText: { fontSize: 15, color: colors.ink },
  optionTextActive: { fontWeight: "600", color: colors.brandText },
}));
