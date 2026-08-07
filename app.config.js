// Android size tuning. This lives here instead of app.json because the right
// answer differs per EAS profile, and `expo-build-properties` is otherwise a
// single global setting:
//
//   production  -> AAB. Play Store re-splits it per device, so shipping all
//                  four ABIs costs the user nothing and keeps device coverage
//                  maximal. Narrowing the ABI list here would only drop phones.
//   preview     -> one APK that people sideload. Every extra ABI is dead weight
//                  inside that single file, so build arm64-v8a only.
//   development -> dev client, frequently run on an x86_64 emulator. Keep every
//                  ABI, and leave R8 off so builds stay fast and stack traces
//                  stay readable.
//
// app.json is still the source of truth for everything else; Expo hands it to
// us as `config` and we only append to it.

const ALL_ABIS = ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"];

module.exports = ({ config }) => {
  // EAS sets this during a build. Locally it is undefined, and locally we are
  // always in the development case.
  const profile = process.env.EAS_BUILD_PROFILE ?? "development";
  const isDevelopment = profile === "development";

  return {
    ...config,
    plugins: [
      ...config.plugins,
      [
        "expo-build-properties",
        {
          android: {
            buildArchs: profile === "preview" ? ["arm64-v8a"] : ALL_ABIS,
            // shrinkResources is rejected by the plugin unless minify is on, so
            // these two always move together.
            enableMinifyInReleaseBuilds: !isDevelopment,
            enableShrinkResourcesInReleaseBuilds: !isDevelopment,
            enableBundleCompression: true,
          },
        },
      ],
    ],
  };
};
