# TaskFlow Pro — mobile

The Expo client for TaskFlow Pro. It is a **second front end, not a second
product**: it talks to the same Next.js API in `../my-app`, so there is one
database, one set of permission checks and one source of truth.

Runs in **Expo Go** — no custom native modules, no dev build required.

---

## What you have to do

### 1. Point the app at your API

The phone is not on your machine's loopback interface, so `localhost` will never
work. Create `.env` in this folder:

```
EXPO_PUBLIC_API_URL=http://192.168.1.23:3000
```

Use your machine's LAN IP (`ipconfig` → IPv4 Address on the Wi-Fi adapter), not
`127.0.0.1`. Phone and computer must be on the same network.

If you skip this, the app falls back to `extra.apiBaseUrl` in `app.json`, and
then to the host Metro is served from with port 3000. The sign-in screen prints
the origin it resolved, so a wrong value is visible immediately.

### 2. Let the Next.js dev server accept LAN connections

```bash
cd ../my-app
pnpm dev --hostname 0.0.0.0
```

Without `--hostname 0.0.0.0` Next binds to localhost only and the phone gets a
connection refused.

Windows Firewall will usually prompt the first time — allow Node on private
networks. If it never prompts and the phone still cannot connect, add the rule
manually for TCP 3000.

### 3. Start Expo and scan the QR code

```bash
npm install
npm start
```

Open **Expo Go** on the phone and scan the QR code. Same Wi-Fi as above; if the
networks are segregated (guest Wi-Fi, corporate VLAN), use `npm start --tunnel`
instead.

That is the whole setup. Sign in with any account that works on the web.

---

## What changed in the web app

Three additive edits, none of which alter existing behaviour:

| File | Change |
| --- | --- |
| `my-app/lib/session.ts` | `readSession()` falls back to `Authorization: Bearer` when there is no cookie; `createSessionCookie()` now returns the token it signed |
| `my-app/app/api/auth/sign-in/route.ts` | response body also carries `token` |
| `my-app/app/api/auth/sign-up/route.ts` | response body also carries `token` |

The browser still authenticates by httpOnly cookie and ignores the extra field.
React Native has no cookie jar, so the app stores that token in the device
keychain (`expo-secure-store`) and replays it as a bearer header. Both transports
carry the same signed JWT, so every route handler, permission check and admin
guard is untouched.

---

## Layout

```
app/                     expo-router routes
  _layout.tsx            providers + the signed-in/signed-out gate
  sign-in.tsx            sign-up.tsx
  (tabs)/                bottom tab bar — member and admin tabs
  group/[groupId].tsx    pushed on the root stack, so it covers the tabs
  task/[taskId].tsx
components/ui/           Button, TextField, Select, DateField, Sheet, Pagination, …
components/app/          TaskList, GroupCard, the create sheets, MemberInviteSearch,
                         AppearanceSection
lib/                     types, validation, theme, formatting, auth, token
store/                   Redux store and the RTK Query api slice
```

`lib/types.ts` and `lib/validation.ts` are **copies of the web app's files**.
They are the contract between the two clients — if you change one, change both.

## Theming

`lib/theme.ts` is the web app's `globals.css` tokens resolved to literal values —
both the base palette and the `.dark` overrides, as `lightColors` and
`darkColors`. There is no Tailwind here.

The palette changes at runtime, so **`StyleSheet.create` must not be called at
module scope**. Use `makeStyles` from `lib/theme-context.tsx` instead: it takes a
factory, calls it once per scheme, caches the result, and hands it back through a
hook.

```tsx
const useStyles = makeStyles(({ colors, shadow }) => ({
  card: { backgroundColor: colors.surface, ...shadow.soft },
}));

function Card() {
  const { colors } = useTheme(); // for inline props: icon tints, placeholders
  const styles = useStyles();
}
```

`useTheme()` also carries the colour-dependent tables that used to be module
constants — `statusMeta`, `priorityMeta`, `groupColor(key)` and `tintFor(seed)`.

Two brand tokens are worth knowing about. `brand600` is a **text** colour and
lightens in the dark theme, matching the web. Anything that *fills* with the
brand and puts white on top uses `brandSolid` / `onBrand` instead, which stay
dark-on-light in both themes.

The preference (light / dark / system) lives under `taskflow-theme` — the same
key the web app uses — and is set from Profile → Theme.

## Loading states

Every first load is a **skeleton**, not a spinner — `components/ui/Skeleton.tsx`
holds one shape per screen (`TaskListSkeleton`, `GroupDetailSkeleton`,
`UserListSkeleton`, …), each laid out to match the real component closely enough
that nothing jumps when the data lands. Add a new screen, add its shape.

Spinners are kept for the three cases a skeleton would be wrong: the launch
splash, a button mid-submit, and a refetch where the content is already on
screen.

All the blocks share **one** `Animated.Value`, ref-counted in that module, so a
list of ten cards is one animation rather than a hundred drifting out of phase.
It uses RN's `Animated` rather than Reanimated on purpose — opacity on the native
driver needs no worklets and no Babel plugin, and this project has no
`babel.config.js`.

## Navigation

Members get Home / Groups / Requests / Alerts / Profile. Admins get Home / Users
/ Profile.
Both sets are declared in `app/(tabs)/_layout.tsx`; `href: null` hides the tabs
that do not apply without unregistering the route.

Routing is convenience only — every API route re-checks the session and the
user's role server-side, exactly as it does for the web app.

## Push notifications

A task assigned, a comment posted or a group invitation sent reaches the phone
whether or not the app is running.

Nothing new decides *when* to notify. The API already funnels every alert
through `notify()` in `../my-app/lib/events.ts`; that function now also calls
`../my-app/lib/push.ts`, which addresses Expo's push service. So the tray copy
and the in-app Alerts list can never disagree — one call produces both.

Delivery is brokered by Expo, exactly as social sign-in is brokered by the API:
there are no FCM or APNs credentials in this repo. The Expo project that builds
the app owns them, and `ExponentPushToken[…]` is the only address the server
handles.

- `lib/push.tsx` — `<PushSync />`, mounted once in `app/_layout.tsx`. Requests
  permission, registers the device on sign-in, refreshes the cache when a
  notification lands in the foreground, and opens the task or group a tapped
  notification is about (including when the tap is what launched the app).
- `lib/push-token.ts` — the token in memory, kept apart so `lib/auth.tsx` can
  unregister the device on sign-out without importing the notification layer.
- `lib/links.ts` — one translation from the API's web-shaped links
  (`/tasks/:id`) to native routes (`/task/:id`), shared by the Alerts list and
  the tap handler.

**Requires a development or release build.** Expo Go on Android dropped remote
push in SDK 53, and the iOS simulator has no push service at all — in both the
token request fails quietly and the app falls back to in-app alerts only:

```bash
npx eas build --profile development --platform android
```

The server needs the `PushToken` table, so run `npm run db:deploy` in
`../my-app` after pulling this. `EXPO_ACCESS_TOKEN` is optional there — set it
only once push security is enabled on the Expo project.

## Conventions

Interaction rules follow `../my-app/MOBILE.md`: 44pt minimum hit areas, modals
as bottom sheets, dropdowns as action sheets, tables as stacked cards, filters
collapsed behind one button, 16px minimum input font so iOS does not zoom.

## Checks

```bash
npm run typecheck                  # tsc --noEmit
npx expo-doctor                    # dependency and config health
npx expo export --platform android # proves the bundle builds
```

## Not built

File upload from the device, offline support and gesture navigation. Attachments
are listed and readable but cannot be added from the phone — the create-task
form sends an empty `attachments` array.

Push receipts are not polled. Expo's tickets are checked synchronously for
`DeviceNotRegistered` so dead tokens get deleted, but the 15-minute receipt
lookup that reports per-device delivery failures is not wired up.
