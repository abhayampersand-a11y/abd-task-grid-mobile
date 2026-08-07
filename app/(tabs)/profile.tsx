import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { spacing } from "@/lib/theme";
import { makeStyles } from "@/lib/theme-context";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validation";
import { fieldErrorsFrom, mergeServerErrors, type FieldErrors } from "@/lib/form";
import {
  toApiError,
  useChangePasswordMutation,
  useSignOutMutation,
  useUpdateProfileMutation,
} from "@/store/api";
import { Body, BrandBar, Screen } from "@/components/ui/Screen";
import { Avatar, Card, ErrorNote } from "@/components/ui/primitives";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AppearanceSection } from "@/components/app/AppearanceSection";

type Section = "details" | "security" | "appearance";

export default function Profile() {
  const { user, signOut } = useAuth();
  const styles = useStyles();
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: savingPassword }] =
    useChangePasswordMutation();
  const [signOutRequest] = useSignOutMutation();

  const [section, setSection] = useState<Section>("details");

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [mobile, setMobile] = useState("");
  const [bio, setBio] = useState("");
  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Seed the form once the session resolves, and again if it is refetched.
  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setJobTitle(user.jobTitle ?? "");
    setMobile(user.mobile ?? "");
    setBio(user.bio ?? "");
  }, [user]);

  async function saveProfile() {
    setProfileError(null);
    setProfileMessage(null);

    const parsed = updateProfileSchema.safeParse({
      fullName,
      jobTitle,
      mobile,
      bio,
      avatarUrl: user?.avatarUrl ?? null,
    });

    if (!parsed.success) {
      setProfileErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setProfileErrors({});

    try {
      await updateProfile(parsed.data).unwrap();
      setProfileMessage("Profile updated.");
    } catch (error) {
      const api = toApiError(error);
      setProfileErrors((current) => mergeServerErrors(current, api.fieldErrors));
      setProfileError(api.message);
    }
  }

  async function savePassword() {
    setPasswordError(null);
    setPasswordMessage(null);

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!parsed.success) {
      setPasswordErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setPasswordErrors({});

    try {
      await changePassword(parsed.data).unwrap();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed.");
    } catch (error) {
      const api = toApiError(error);
      setPasswordErrors((current) => mergeServerErrors(current, api.fieldErrors));
      setPasswordError(api.message);
    }
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "You will need to sign in again on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          // Clearing the local token is what matters; the cookie call is
          // best-effort and must not block sign-out if the server is down.
          void signOutRequest()
            .unwrap()
            .catch(() => undefined)
            .finally(() => void signOut());
        },
      },
    ]);
  }

  if (!user) {
    return (
      <Screen>
        <BrandBar title="Profile" />
        <Body>
          <ProfileSkeleton />
        </Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <BrandBar title="Profile" />

      {/* Identity and the section switcher stay put; the form scrolls. */}
      <Body
        sticky={
          <>
            <Card style={styles.identity}>
              <Avatar user={user} size={64} />
              <View style={styles.identityText}>
                <Text style={styles.name}>{user.fullName}</Text>
                <Text style={styles.email}>{user.email}</Text>
                <Text style={styles.since}>
                  {user.role === "ADMIN" ? "Administrator" : "Member"} · joined{" "}
                  {formatDate(user.createdAt)}
                </Text>
              </View>
            </Card>

            <SegmentedControl<Section>
              segments={[
                { value: "details", label: "Details" },
                { value: "security", label: "Security" },
                { value: "appearance", label: "Theme" },
              ]}
              value={section}
              onChange={setSection}
            />
          </>
        }
      >
        {section === "appearance" ? (
          <Card style={styles.form}>
            <AppearanceSection />
          </Card>
        ) : section === "details" ? (
          <Card style={styles.form}>
            {profileError ? <ErrorNote message={profileError} /> : null}
            {profileMessage ? (
              <Text style={styles.success}>{profileMessage}</Text>
            ) : null}

            <TextField
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              error={profileErrors.fullName}
            />
            <TextField
              label="Job title"
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="Product designer"
              autoCapitalize="words"
              error={profileErrors.jobTitle}
            />
            <TextField
              label="Mobile"
              value={mobile}
              onChangeText={setMobile}
              placeholder="+1 555 019 2837"
              keyboardType="phone-pad"
              autoComplete="tel"
              hint={
                user?.mobile
                  ? undefined
                  : "Optional — social sign-in does not provide one."
              }
              error={profileErrors.mobile}
            />
            <TextField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="A line about what you do"
              autoCapitalize="sentences"
              multiline
              error={profileErrors.bio}
            />

            <Button
              label="Save changes"
              onPress={saveProfile}
              loading={savingProfile}
              fullWidth
            />
          </Card>
        ) : (
          <Card style={styles.form}>
            {passwordError ? <ErrorNote message={passwordError} /> : null}
            {passwordMessage ? (
              <Text style={styles.success}>{passwordMessage}</Text>
            ) : null}

            {/* A social-only account has no password to confirm — it is
                setting its first one. */}
            {user?.hasPassword ? (
              <TextField
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secure
                autoComplete="current-password"
                error={passwordErrors.currentPassword}
              />
            ) : (
              <Text style={styles.passwordIntro}>
                You signed up with a social provider. Adding a password lets you
                sign in with your email as well.
              </Text>
            )}
            <TextField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secure
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number."
              error={passwordErrors.newPassword}
            />
            <TextField
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secure
              autoComplete="new-password"
              error={passwordErrors.confirmPassword}
            />

            <Button
              label={user?.hasPassword ? "Change password" : "Set password"}
              onPress={savePassword}
              loading={savingPassword}
              fullWidth
            />
          </Card>
        )}

        <Button
          label="Sign out"
          variant="danger"
          icon="log-out-outline"
          onPress={confirmSignOut}
          fullWidth
        />
      </Body>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  identityText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: "700", color: colors.ink },
  email: { fontSize: 13, color: colors.inkMuted },
  since: { fontSize: 12, color: colors.inkFaint },
  form: { gap: spacing.lg },
  success: { fontSize: 13, fontWeight: "600", color: colors.emerald700 },
  passwordIntro: { fontSize: 13, lineHeight: 19, color: colors.inkMuted },
}));
