import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HIT_SLOP, radius, spacing } from "@/lib/theme";
import { makeStyles, useTheme } from "@/lib/theme-context";

interface Props {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  secure?: boolean;
  multiline?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  hint?: string;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secure = false,
  multiline = false,
  autoCapitalize = "none",
  autoComplete,
  keyboardType,
  editable = true,
  hint,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { colors, scheme } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          Boolean(error) && styles.fieldError,
          !editable && styles.fieldDisabled,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          // A white iOS keyboard under a dark form is the one thing that gives
          // a themed app away.
          keyboardAppearance={scheme}
          secureTextEntry={secure && !revealed}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          keyboardType={keyboardType}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.inputMultiline]}
        />

        {secure ? (
          <Pressable
            hitSlop={HIT_SLOP}
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={19}
              color={colors.inkMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  fieldMultiline: { minHeight: 110, alignItems: "flex-start" },
  fieldFocused: { borderColor: colors.brand600 },
  fieldError: { borderColor: colors.rose500 },
  fieldDisabled: { backgroundColor: colors.surfaceMuted },
  input: {
    flex: 1,
    // 16px minimum so iOS does not zoom the viewport on focus (MOBILE.md §5).
    fontSize: 16,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  inputMultiline: { textAlignVertical: "top" },
  error: { fontSize: 12, color: colors.rose700 },
  hint: { fontSize: 12, color: colors.inkMuted },
}));
