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
    ],
  };
};
