# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

Notes specific to this project:

- **There is no `babel.config.js`.** SDK 57 does not use one; adding a file that
  references `babel-preset-expo` breaks the Metro transformer, because that
  preset is not installed as a top-level package.
- `@expo/vector-icons` is **not** bundled with `expo` any more — it is an
  explicit dependency here.
- `.npmrc` sets `legacy-peer-deps=true`. `expo-router` pulls in web-only peers
  (vaul/radix want `react-dom`) that a native-only install never provides;
  without it, plain `npm install` fails on ERESOLVE.
- `lib/types.ts` and `lib/validation.ts` are copies of `../my-app/lib/*`. Keep
  them in sync — they are the contract with the API.
- **Never call `StyleSheet.create` at module scope.** The palette swaps at
  runtime with the light/dark preference, and a module-level stylesheet captures
  one theme's colours forever. Use `makeStyles` from `lib/theme-context.tsx`, and
  read `useTheme()` for colours passed as props (icon tints, placeholders).
- Colour-dependent tables (`statusMeta`, `priorityMeta`, `groupColor`, `tintFor`)
  come from `useTheme()`, not from `lib/format.ts` directly — `format.ts` only
  exports the factories that build them.
- **Never import `Alert` from `react-native`.** On the web build
  `react-native-web` ships it as `class Alert { static alert() {} }` — an empty
  body, so the dialog never appears *and* a confirm's `onPress` never fires,
  silently killing the action behind it. Use `notify` / `confirmDestructive`
  from `lib/alert.ts`, which fall back to the browser's own dialogs. A bare
  `Alert.alert` typechecks everywhere, which is what makes this so quiet.
- **Never import `react-native-google-mobile-ads` directly.** It resolves its
  native module at import time, so a static import throws during module
  evaluation in Expo Go — before any error boundary exists. `lib/ads.tsx` is the
  one file allowed to touch it, behind a guarded lazy `require`, and it has a
  `lib/ads.web.tsx` twin because the module is native-only. Everything else goes
  through `useAds()` and `<AdSlot />`, both of which are inert wherever the SDK
  is missing.
- **Social sign-in is brokered by the API, not by this app.** `lib/oauth.ts`
  only opens `/api/auth/oauth/{provider}/start` in a `WebBrowser` auth session
  and reads the session token off the `taskflow://oauth-callback` deep link —
  there is no provider SDK and no client secret here. LinkedIn cannot work any
  other way (it requires a secret on the token exchange and rejects PKCE). See
  `../my-app/SOCIAL-AUTH.md` for the console setup and the Expo Go caveat.
