import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/lib/theme";
import {
  makeStyles,
  useTheme,
  type ThemePreference,
} from "@/lib/theme-context";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "light", label: "Light", hint: "Always use the light theme.", icon: "sunny-outline" },
  { value: "dark", label: "Dark", hint: "Always use the dark theme.", icon: "moon-outline" },
  {
    value: "system",
    label: "System",
    hint: "Follow your device setting.",
    icon: "phone-portrait-outline",
  },
];

/**
 * Miniature app preview so the choice is visible before it is applied — the
 * same idea as the web's SVG version, drawn with plain Views because there is
 * no SVG renderer in this app and one option is not worth a dependency.
 */
function Preview({ dark }: { dark: boolean }) {
  const canvas = dark ? "#0c0e15" : "#f6f7f9";
  const surface = dark ? "#151823" : "#ffffff";
  const line = dark ? "#262b3a" : "#e6e8ee";
  const bar = dark ? "#353b4e" : "#d5d8e2";

  const panel = {
    backgroundColor: surface,
    borderColor: line,
    borderWidth: 1,
    borderRadius: 4,
  };

  return (
    <View
      style={{
        width: 108,
        height: 68,
        borderRadius: 7,
        backgroundColor: canvas,
        padding: 6,
        flexDirection: "row",
        gap: 5,
      }}
    >
      {/* Sidebar */}
      <View style={[panel, { width: 26, padding: 4, gap: 5 }]}>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: "#4f39f6" }} />
        <View style={{ height: 3, width: 14, borderRadius: 2, backgroundColor: bar }} />
        <View style={{ height: 3, width: 11, borderRadius: 2, backgroundColor: bar }} />
        <View style={{ height: 3, width: 13, borderRadius: 2, backgroundColor: bar }} />
      </View>

      {/* Content rows */}
      <View style={{ flex: 1, gap: 4 }}>
        {[22, 30, 18].map((width, index) => (
          <View
            key={index}
            style={[panel, { flex: 1, justifyContent: "center", paddingLeft: 5 }]}
          >
            <View
              style={{ height: 3, width, borderRadius: 2, backgroundColor: bar }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The web app's Appearance card. The preference is stored per device, exactly
 * as it is per browser on the web.
 */
export function AppearanceSection() {
  const { preference, resolved, setPreference, colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Appearance</Text>
        <Text style={styles.description}>
          Choose how TaskFlow Pro looks on this device. The setting is saved to
          this device only.
        </Text>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const active = preference === option.value;
          const previewDark =
            option.value === "dark" ||
            (option.value === "system" && resolved === "dark");

          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${option.label}. ${option.hint}`}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.preview}>
                <Preview dark={previewDark} />
              </View>

              <View style={styles.optionText}>
                <View style={styles.optionLabelRow}>
                  <Ionicons
                    name={option.icon}
                    size={15}
                    color={active ? colors.brandText : colors.inkSoft}
                  />
                  <Text
                    style={[styles.optionLabel, active && styles.optionLabelActive]}
                  >
                    {option.label}
                  </Text>
                </View>
                <Text style={styles.optionHint}>{option.hint}</Text>
              </View>

              {active ? (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={13} color={colors.onBrand} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.note}>
        Currently showing the{" "}
        <Text style={styles.noteStrong}>{resolved}</Text> theme
        {preference === "system" ? " (matched to your device)" : ""}.
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: spacing.md },
  header: { gap: 4 },
  title: { fontSize: 15, fontWeight: "700", color: colors.ink },
  description: { fontSize: 13, color: colors.inkMuted, lineHeight: 18 },
  options: { gap: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.brand200, backgroundColor: colors.brand50 },
  pressed: { opacity: 0.8 },
  preview: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  optionText: { flex: 1, gap: 2 },
  optionLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  optionLabel: { fontSize: 14, fontWeight: "600", color: colors.ink },
  optionLabelActive: { color: colors.brandText },
  optionHint: { fontSize: 12, color: colors.inkMuted },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brandSolid,
    alignItems: "center",
    justifyContent: "center",
  },
  note: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  noteStrong: { fontWeight: "700", color: colors.ink },
}));
