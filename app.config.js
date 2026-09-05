// Android size tuning. This lives here instead of app.json because the right
// answer differs per EAS profile, and `expo-build-properties` is otherwise a
// single global setting:
//
//   production  -> AAB. Play Store re-splits it per device, so shipping all
//                  four ABIs costs the user nothing and keeps device coverage
//                  maximal. Narrowing the ABI list here would only drop phones.
//   preview     -> one APK that people sideload. Every extra ABI is dead weight
//                  inside that single file, so build arm64-v8a only.
//   development -> dev client, frequently run on an x86_64 emulator, so it
//                  needs every ABI too.
//
// app.json is still the source of truth for everything else; Expo hands it to
// us as `config` and we only append to it.

const ALL_ABIS = ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"];

/**
 * AdMob *app* IDs — the `~`-separated ones, one per platform, which the plugin
 * writes into `AndroidManifest.xml` and `Info.plist`. They are a build-time
 * value, which is why they live here rather than in `lib/ads.tsx` alongside the
 * unit IDs.
 *
 * Google's public sample app IDs are the fallback so that a checkout with no
 * `.env` still builds and runs. They serve test ads only. Set the two variables
 * (in `.env` locally, as EAS environment variables for a real build) before
 * shipping anything you expect to earn from — the Android app crashes on start
 * if the manifest carries an app ID that AdMob does not recognise, so a wrong
 * value is louder than a missing one.
 */
const SAMPLE_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const SAMPLE_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

module.exports = ({ config }) => {
  // EAS sets this during a build. Locally it is undefined, and locally we are
  // always in the development case.
  const profile = process.env.EAS_BUILD_PROFILE ?? "development";

  return {
    ...config,
    plugins: [
      ...config.plugins,
      [
        "expo-build-properties",
        {
          android: {
            buildArchs: profile === "preview" ? ["arm64-v8a"] : ALL_ABIS,
            // R8 and resource shrinking are OFF on purpose. Turning them on
            // crashed the release build the moment `lib/push.tsx` asked for
            // notification permission: expo-notifications resolves its icon and
            // accent colour by name at runtime, which the resource shrinker
            // cannot see as a reference, so it strips them and the lookup blows
            // up natively — past the try/catch, which only guards JS.
            //
            // They were never where the size came from anyway. `buildArchs`
            // above does effectively all of the work; these two were worth a
            // few MB against a target we already clear. Do not re-enable them
            // without a `keep.xml` for the notification resources and matching
            // `extraProguardRules`, and without re-testing sign-in and push.
            enableMinifyInReleaseBuilds: false,
            enableShrinkResourcesInReleaseBuilds: false,
            enableBundleCompression: true,
          },
        },
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId:
            process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ??
            SAMPLE_ANDROID_APP_ID,
          iosAppId:
            process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? SAMPLE_IOS_APP_ID,
          // App Tracking Transparency. iOS shows this string in the system
          // prompt the UMP form raises; without it the prompt cannot be
          // presented and every iOS user is treated as having refused.
          userTrackingUsageDescription:
            "Allow Taskgrid to use this identifier so the ads you see are more relevant to you.",
          // Starts the SDK on a background thread, so the ad stack never sits
          // in front of the first frame.
          optimizeInitialization: true,
          optimizeAdLoading: true,
        },
      ],
    ],
  };
};
