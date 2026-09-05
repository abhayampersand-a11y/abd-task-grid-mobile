import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { confirmDestructive, notify } from "@/lib/alert";
import { spacing } from "@/lib/theme";
import { makeStyles } from "@/lib/theme-context";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { openLegal, PRIVACY_URL, TERMS_URL } from "@/lib/legal";
import { updateProfileSchema } from "@/lib/validation";
import { fieldErrorsFrom, mergeServerErrors, type FieldErrors } from "@/lib/form";
import {
  toApiError,
  useSignOutEverywhereMutation,
  useDeleteAccountMutation,
  useUpdateProfileMutation,
} from "@/store/api";
import { Body, DetailBar, Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Card, ErrorNote } from "@/components/ui/primitives";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AppearanceSection } from "@/components/app/AppearanceSection";
import { AvatarPicker } from "@/components/app/AvatarPicker";

type Section = "details" | "security" | "appearance";

export default function Profile() {
  const { user, signOut, endSessionLocally, replaceToken } = useAuth();
  const styles = useStyles();
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [signOutEverywhere, { isLoading: signingOutAll }] =
    useSignOutEverywhereMutation();
  const [deleteAccount, { isLoading: deletingAccount }] =
    useDeleteAccountMutation();

  const [section, setSection] = useState<Section>("details");

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [mobile, setMobile] = useState("");
  const [bio, setBio] = useState("");
  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [signOutAllMessage, setSignOutAllMessage] = useState<string | null>(
    null,
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  /** The account's own email address, typed back to confirm the deletion. */
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function signOutEverywhereNow() {
    setSignOutAllMessage(null);
    try {
      // This handset keeps its session — the point of the button is the ones
      // the user is not holding. The server revokes everything and hands back a
      // replacement for this device, which has to be stored before anything
      // else fires a request with the token that just died.
      const { token } = await signOutEverywhere({
        keepThisDevice: true,
      }).unwrap();
      if (token) await replaceToken(token);
      setSignOutAllMessage("Signed out on all other devices.");
    } catch (error) {
      setSignOutAllMessage(toApiError(error).message);
    }
  }

  async function deleteAccountNow() {
    if (!user) return;
    setDeleteError(null);

    try {
      await deleteAccount({ confirmEmail: deleteConfirmation }).unwrap();
    } catch (error) {
      setDeleteError(toApiError(error).message);
      return;
    }

    // Only past the await: a failed confirmation must leave the session alone
    // so the sheet can show why and be tried again.
    setDeleteOpen(false);
    setDeleteConfirmation("");
    await endSessionLocally();
    notify("Account deleted", "Your account and its data have been removed.");
  }

  function confirmSignOut() {
    confirmDestructive(
      "Sign out",
      "You will need to sign in again on this device.",
      // `signOut` owns the whole sequence — bounded server revocation first,
      // then the local teardown that cannot fail. Nothing to add here.
      () => void signOut(),
      "Sign out",
    );
  }

  if (!user) {
    return (
      <Screen>
        <DetailBar title="Profile" />
        <Body>
          <ProfileSkeleton />
        </Body>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Reached from a header rather than from the bar, so it gets a way back
          — the tab bar no longer has a lit tab to say where you are. */}
      <DetailBar title="Profile" />

      {/* Identity and the section switcher stay put; the form scrolls. */}
      <Body
        sticky={
          <>
            <Card style={styles.identity}>
              <AvatarPicker user={user} size={64} />
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
          <>
          <Card style={styles.form}>
            <Text style={styles.sectionTitle}>How you sign in</Text>
            <Text style={styles.passwordIntro}>
              {user.email}
            </Text>
            <Text style={styles.passwordIntro}>
              There is no password to manage — sign-in is handled by your
              provider, so your password lives with them and never with us.
            </Text>

            {signOutAllMessage ? (
              <Text style={styles.success}>{signOutAllMessage}</Text>
            ) : null}
            <Button
              label="Sign out on all other devices"
              variant="secondary"
              onPress={signOutEverywhereNow}
              loading={signingOutAll}
              fullWidth
            />
          </Card>

          {/* Play requires an app that creates accounts to offer deletion from
              inside the app, not only by writing to support. */}
          <Card style={styles.danger}>
            <Text style={styles.dangerTitle}>Danger zone</Text>
            <Text style={styles.dangerBody}>
              Deleting your account permanently removes your profile, your
              comments and attachments, the groups you created and every task
              inside them. This cannot be undone.
            </Text>
            {user.role === "ADMIN" ? (
              <Text style={styles.dangerNote}>
                Administrator accounts cannot be deleted here — another
                administrator has to remove them.
              </Text>
            ) : (
              <Button
                label="Delete my account"
                variant="danger"
                icon="trash-outline"
                onPress={() => {
                  setDeleteConfirmation("");
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
                fullWidth
              />
            )}
          </Card>
          </>
        )}

        <Button
          label="Sign out"
          variant="danger"
          icon="log-out-outline"
          onPress={confirmSignOut}
          fullWidth
        />

        {/* Both documents reachable from inside the app, not only from the
            store listing — this is where a reviewer looks for them. */}
        <View style={styles.legalRow}>
          <Text
            style={styles.legalLink}
            onPress={() => openLegal(PRIVACY_URL)}
            accessibilityRole="link"
          >
            Privacy Policy
          </Text>
          <Text style={styles.legalDot}>·</Text>
          <Text
            style={styles.legalLink}
            onPress={() => openLegal(TERMS_URL)}
            accessibilityRole="link"
          >
            Terms of Service
          </Text>
        </View>
      </Body>

      {/* A sheet rather than `confirmDestructive`: the confirmation needs a
          typed secret, and a native alert cannot take input on Android. */}
      <Sheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        footer={
          <Button
            label="Delete permanently"
            variant="danger"
            onPress={deleteAccountNow}
            loading={deletingAccount}
            disabled={!deleteConfirmation.trim()}
            fullWidth
          />
        }
      >
        <View style={styles.deleteBody}>
          {deleteError ? <ErrorNote message={deleteError} /> : null}

          <Text style={styles.dangerBody}>
            This is permanent and takes effect immediately. It removes your
            profile and sign-ins, your comments, attachments and notifications,
            the groups you created and every task inside them.
          </Text>
          <Text style={styles.dangerNote}>
            Tasks assigned to you in groups you do not own stay with that group
            and become unassigned.
          </Text>

          <TextField
            label="Type your email address to confirm"
            value={deleteConfirmation}
            onChangeText={(value) => {
              setDeleteConfirmation(value);
              setDeleteError(null);
            }}
            placeholder={user.email}
            keyboardType="email-address"
            autoCapitalize="none"
            hint="There is no password to confirm with — your provider holds it, not us."
          />
        </View>
      </Sheet>
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
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  success: { fontSize: 13, fontWeight: "600", color: colors.emerald700 },
  passwordIntro: { fontSize: 13, lineHeight: 19, color: colors.inkMuted },
  danger: {
    gap: spacing.md,
    borderColor: colors.rose100,
    backgroundColor: colors.rose50,
  },
  dangerTitle: { fontSize: 15, fontWeight: "700", color: colors.rose700 },
  dangerBody: { fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  dangerNote: { fontSize: 13, lineHeight: 19, color: colors.inkMuted },
  deleteBody: { gap: spacing.lg },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  legalLink: { fontSize: 13, fontWeight: "600", color: colors.brand600 },
  legalDot: { fontSize: 13, color: colors.inkFaint },
}));
