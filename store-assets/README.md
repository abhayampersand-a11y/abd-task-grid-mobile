# Play Store assets & listing — Taskgrid

Everything Google Play asks for at upload time, plus the copy for the listing.
The icon files the app itself ships live in `../assets/`; only the two Play
Console uploads live here.

The mark is a task list: three cards stacked across a blue disc, each with a
checkbox at its left — yellow and green ticked, red still open — and the bottom
row trimmed to the disc on its left while the card overhangs it on the right.

**The master is vector**, at `../../my-app/public/brand/taskgrid-mark.svg` (the
same artwork is served as the web favicon from `my-app/app/icon.svg` and inlined
in `my-app/components/ui/taskgrid-icon.tsx`, so the web header, the browser tab
and the store icon are one mark). Every raster here and in `../assets/` is a
render of that SVG at the size it ships, not a resample of another PNG —
`source-icon.png` is a 1024px export for convenience, not the source of truth.

The mark ships in two forms:

- **Full bleed, no plate** — the web favicon and PWA icons, the Expo web
  favicon and the splash, all on transparency. Nothing crops these, so the
  artwork uses the whole canvas.
- **Inset on white** — iOS, Play and the Android adaptive foreground, all of
  which apply their own corner mask. iOS and Play take 88% of the canvas; the
  adaptive foreground takes 66% and the web maskable copy 78%, which are the
  safe zones those two crops promise. `android-icon-background.png` is plain
  white to match, and `app.json`'s `adaptiveIcon.backgroundColor` with it.

The one asset that is *not* a render of the mark is the Android **monochrome**
layer. A themed icon has its colour thrown away and its alpha tinted, and this
mark — a filled disc under filled cards — flattens into one featureless slab
under that. It is drawn separately as three outlined checkbox rows, which
survive being reduced to one colour. It does not need to register with the
other layers: a themed icon *replaces* the icon rather than compositing with
it, and only foreground and background are ever stacked on each other.

| File | Where it goes | Spec |
| --- | --- | --- |
| `source-icon.png` | 1024px export of the master SVG, not uploaded | 1024×1024 |
| `play-icon-512.png` | Play Console → Store listing → App icon | 512×512, 32-bit PNG, ≤1 MB |
| `play-feature-graphic-1024x500.png` | Play Console → Store listing → Feature graphic | 1024×500, no alpha |

---

## The package name is `com.taskflowpro.app` — resolved, do not change it

It was briefly renamed to `com.taskgrid.app` to match the new listing title.
That rename broke every Android build, because `google-services.json` is issued
against the old id and the Google Services Gradle plugin fails on the mismatch:

```
Execution failed for task ':app:processReleaseGoogleServices'.
> No matching client found for package name 'com.taskgrid.app'
```

(EAS build `c5f22324`, 21 Aug 2026, `preview` — the two `preview` builds before
the rename both finished.)

It was reverted rather than fixed in Firebase, and that is the end of it:

- **The package name is invisible to users.** It shows in the Play URL and in
  Android's app-info screen, nowhere else. The listing title stays *Taskgrid*;
  `app.json`'s `name` is still `Taskgrid` and was never part of the problem.
- **It is permanent after the first release.** Play will not let a published app
  change its `applicationId` ever, so this had to be settled *before* upload —
  which is exactly where it was caught.
- **Everything already lines up with it**: `google-services.json`, the FCM
  credentials EAS holds, the `taskflow-pro` slug, the `taskflow` scheme, and the
  two legal pages, which name the package and must keep matching the listing.

`com.taskgrid.customer` is taken on Play by an unrelated home-services app, and
`com.taskgrid.app` was the workaround for that. Neither matters now: Play only
requires package ids to be globally unique, listing *titles* may repeat, and
`Taskgrid` is still the title regardless of the id underneath.

**Push needs no re-credentialing.** It worked under this package before, and the
FCM V1 service account key EAS holds is scoped to the Firebase project, not to
one Android app. Still verify it on the built APK rather than assuming: a token
only comes back from a development or release build, never from Expo Go, so a
silent fallback to in-app alerts is easy to miss.

## Left alone on purpose

- **`slug` is still `taskflow-pro`.** It is bound to EAS project
  `23c6292b-…`, is invisible to users, and renaming it means renaming the
  project on expo.dev first. Not worth coupling to a store release.
- **`scheme` is still `taskflow`.** `../my-app/lib/oauth-state.ts` hardcodes
  `taskflow://oauth-callback` as the social sign-in fallback redirect. Changing
  the scheme here without changing it there breaks Google and LinkedIn sign-in.
- **Firebase project id** — cosmetic, and renaming it would invalidate every
  existing config file.

---

## Listing copy

**App name** (30 char limit — this is 27):

```
Taskgrid: Team Task Manager
```

**Short description** (80 char limit — this is 74):

```
Assign tasks, run team groups, and never miss a deadline. Alerts included.
```

**Full description** (4000 char limit):

```
Taskgrid keeps a team's work in one place — who is doing what, where it stands,
and what is due next.

Built for small teams who have outgrown a shared spreadsheet but do not want a
heavyweight project tool.

WORK IN GROUPS
Create a group per team, project or client. Invite people by name or email,
keep it public for anyone in your workspace or private to the members you pick.
Every group has its own task board, its own members and its own activity trail.

TASKS WITH REAL DETAIL
Give a task an assignee, a due date, a priority from low to urgent, and a status
across Backlog, To Do, In Progress, In Review and Completed. Track progress as a
percentage, discuss it in comments, and open any file already attached to it.

NOTHING GETS MISSED
A task assigned to you, a comment on your work, or an invitation to a group
arrives as a notification on your phone — whether or not the app is open. The
in-app alerts list always matches what reached your tray, because both come from
the same event.

INVITATIONS AND REQUESTS
Ask to join a group, approve or decline the people asking to join yours, and see
every pending request in one screen instead of chasing it in chat.

FOR ADMINS
Admins get a separate view of every account: status, role and activity, with the
controls to enable, disable or promote a member.

ONE ACCOUNT, TWO SCREENS
Taskgrid on the phone is the same account and the same data as Taskgrid on the
web. Sign in with an email and password, or with Google or LinkedIn.

BUILT TO STAY OUT OF THE WAY
Light and dark themes that follow your device, screens that load without
spinners, and a layout designed for one hand.
```

**Category:** Business (secondary fit: Productivity)
**Tags:** task management, team collaboration, project tracking
**Contact email:** abdtech.apps@gmail.com — the developer account's own address,
and the one both legal pages publish. Keep the three in step: a policy whose
contact does not match the listing is a thing review checks.

**Developer name:** ABD Tech (personal account, legal name Abhay M Desai, Surat).
The legal pages name both, because Play publishes both for a personal account.

---

## Still needed before you can publish

Assets and copy are done; these are account-level and cannot be generated here.

- [x] **Privacy policy URL** — done. Live at
      `https://abd-task-grid.vercel.app/privacy`, on the same Vercel domain as
      the API, with the Terms alongside it at `/terms`. Both live in
      `../my-app/app/(marketing)/(legal)/` and are listed in `proxy.ts`'s
      `PUBLIC_ROUTES`, so they resolve signed-out — a policy URL that redirects
      to a sign-in page is rejected. Paste `/privacy` into Play Console → Store
      listing, and `/privacy#delete-account` into App content → Data deletion.

- [x] **Account deletion** — done, and Play wants both halves. In-app:
      Profile → Security → Danger zone → *Delete my account*, confirmed with
      the password or, for a social-only account, by retyping the email. Web
      URL for the Data deletion form: the `#delete-account` anchor above.
      `DELETE /api/profile` does the work; cascades take the groups the user
      created and every task inside them, and R2 objects are swept after.
      Administrator accounts are excluded on purpose — deleting the only admin
      would leave nobody able to manage users, so that one is email-only.
- [ ] **Data safety form** — declare: email, name, photo (optional), and the
      push token, all tied to an account, all sent to your own server.
- [ ] **Phone screenshots** — minimum 2, 16:9 or 9:16, at least 320px on the
      short side. Dashboard, a group board, task detail and the alerts list are
      the four worth shipping.
- [ ] **Content rating questionnaire** — the app has user-to-user comments, so
      answer the user-generated-content questions honestly.
- [ ] **Target audience** — 18+ keeps you out of the Families policy program.
- [ ] **App access** — sign-in is required, so Play needs demo credentials to
      review it. Create a throwaway account with a group and a few tasks in it.

### One build-config note

`app.json` has no `android.versionCode`, so every production build ships
version code 1 and Play rejects the second upload. Before the *second* release,
either set it by hand or let EAS own it:

```jsonc
// eas.json
"cli": { "version": ">= 21.0.0", "appVersionSource": "remote" },
"build": { "production": { "autoIncrement": true, … } }
```

Not changed here, because it alters how the first build is numbered.
