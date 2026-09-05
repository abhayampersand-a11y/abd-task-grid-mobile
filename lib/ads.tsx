import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Google AdMob, wrapped so that nothing else in the app has to know whether the
 * SDK is actually there.
 *
 * Three things can each independently make ads unavailable, and every one of
 * them is a normal state rather than an error:
 *
 *   1. **Expo Go and the web build.** The library ships custom native code, so
 *      it does not exist in the Go client, and `react-native-web` has nothing
 *      to render it with. The web build takes `ads.web.tsx` instead — the same
 *      exports, all inert — and Expo Go falls through the `require` guard below.
 *   2. **No unit IDs.** A build made before the AdMob account is wired up runs
 *      with ads switched off rather than with somebody else's inventory.
 *   3. **Consent.** Under the GDPR/UMP rules a user who is asked and declines
 *      leaves `canRequestAds` false, and no ad may be requested at all after
 *      that.
 *
 * `useAds().ready` is the single answer to all three: false means every slot
 * renders nothing and takes no space.
 */

/** Typed, but never imported for real — see `sdk()`. */
type AdsSdk = typeof import("react-native-google-mobile-ads");
type Interstitial = import("react-native-google-mobile-ads").InterstitialAd;

// Metro's own `require`. Declared here because this project pulls in no Node
// types, and it is the only way to reach a module that may not be linked in.
declare const require: (path: string) => unknown;

const IN_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cached: AdsSdk | null | undefined;

/**
 * The native module, or `null` where it is not linked in.
 *
 * The import has to be lazy and guarded: `react-native-google-mobile-ads`
 * resolves its native module at import time, so a static `import` would throw
 * during module evaluation in Expo Go — before any error boundary exists, and
 * for every screen that transitively imports this file, which is most of them.
 */
function sdk(): AdsSdk | null {
  if (cached !== undefined) return cached;
  if (IN_EXPO_GO) {
    cached = null;
    return cached;
  }
  try {
    cached = require("react-native-google-mobile-ads") as AdsSdk;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * Ad unit IDs come from the environment so a build can be pointed at a
 * different AdMob account without a code change, and so the real IDs stay out
 * of the repository. `.env.example` lists the four names.
 *
 * In development they are ignored outright in favour of Google's test units:
 * requesting a live ad from a debug build is invalid traffic, and AdMob
 * suspends accounts for it. The corollary is that an unconfigured *release*
 * build shows nothing at all rather than quietly serving test ads to real
 * users.
 */
const CONFIGURED = {
  banner: Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
  }),
  interstitial: Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
    ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
  }),
};

function unitId(slot: keyof typeof CONFIGURED): string | null {
  const available = sdk();
  if (!available) return null;

  if (__DEV__) {
    return slot === "banner"
      ? available.TestIds.ADAPTIVE_BANNER
      : available.TestIds.INTERSTITIAL;
  }

  return CONFIGURED[slot] || null;
}

export const BANNER_UNIT_ID = unitId("banner");
export const INTERSTITIAL_UNIT_ID = unitId("interstitial");

/**
 * `BannerAd`'s `size` takes the `BannerAdSize` enum or the bare string it
 * resolves to. The string is what lets this constant live outside the guarded
 * import.
 *
 * Anchored rather than inline: an inline adaptive banner is variable-height and
 * may grow to the height of the screen, which inside a task list would push the
 * content the user came for off the bottom of it.
 */
export const BANNER_SIZE = "LARGE_ANCHORED_ADAPTIVE_BANNER";

/**
 * The shortest gap between two interstitials. Google's own guidance is that
 * these belong at natural pauses and not on every action; the clock below
 * enforces the pause even where a call site forgets.
 */
const INTERSTITIAL_COOLDOWN_MS = 4 * 60_000;

interface AdsValue {
  /**
   * Whether an ad may be rendered at all: the SDK is present, initialised, and
   * consent (where it is required) allows a request.
   */
  ready: boolean;
  /**
   * Shows a full-screen ad if one is loaded and the cooldown has elapsed, and
   * queues the next one either way. Safe to call unconditionally — it is a
   * no-op whenever ads are unavailable, which is what keeps the call sites free
   * of ad logic.
   */
  showInterstitial: () => void;
}

const AdsContext = createContext<AdsValue>({
  ready: false,
  showInterstitial: () => {},
});

export function useAds(): AdsValue {
  return useContext(AdsContext);
}

/**
 * Gathers consent, starts the SDK, and keeps one interstitial warm.
 *
 * It sits above the router in `app/_layout.tsx` rather than inside the auth
 * gate: consent is asked for once per install and has nothing to do with who is
 * signed in, and the form has to be able to appear over the sign-in screen.
 */
export function AdsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  /** Guards against a second `initialize()` when the two start paths race. */
  const started = useRef(false);
  const interstitial = useRef<Interstitial | null>(null);
  const shownAt = useRef(0);

  useEffect(() => {
    const available = sdk();
    if (!available) return;

    let cancelled = false;

    async function start(module: AdsSdk) {
      // `canRequestAds` is false only where the user was asked and said no.
      // Outside the EEA it is true from the first call, which is why the
      // unconditional start below is not a shortcut past the consent form.
      const { canRequestAds } = await module.AdsConsent.getConsentInfo();
      if (!canRequestAds || started.current || cancelled) return;
      started.current = true;

      await module.default().setRequestConfiguration({
        // Emulators identify themselves, so a debug run never counts as a real
        // impression even if a live unit ID somehow reaches one.
        testDeviceIdentifiers: __DEV__ ? ["EMULATOR"] : [],
        maxAdContentRating: module.MaxAdContentRating.PG,
      });
      await module.default().initialize();
      if (!cancelled) setReady(true);
    }

    // Two paths on purpose, per Google's reference flow: the form is presented
    // where it is required, and everyone else — the majority — starts without
    // waiting on that round trip. `start` is idempotent, so whichever arrives
    // second does nothing.
    available.AdsConsent.gatherConsent()
      .then(() => start(available))
      // A consent failure is not fatal: the user keeps whatever status they
      // already had, and `start` re-reads it rather than assuming.
      .catch(() => start(available))
      .catch(() => {});
    void start(available).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  /** Builds the next full-screen ad and starts loading it. */
  const preload = useCallback(() => {
    const available = sdk();
    if (!available || !INTERSTITIAL_UNIT_ID) return;

    const ad = available.InterstitialAd.createForAdRequest(
      INTERSTITIAL_UNIT_ID,
    );
    interstitial.current = ad;

    // A closed ad is a spent one — an instance cannot be shown twice, so the
    // replacement is built the moment the user comes back from this one.
    ad.addAdEventListener(available.AdEventType.CLOSED, () => {
      ad.removeAllListeners();
      preload();
    });
    ad.addAdEventListener(available.AdEventType.ERROR, () => {
      // No retry loop: a no-fill now usually means a no-fill for the next few
      // seconds too, and the next close or mount asks again anyway.
    });

    ad.load();
  }, []);

  useEffect(() => {
    if (!ready) return;
    preload();
    return () => {
      interstitial.current?.removeAllListeners();
      interstitial.current = null;
    };
  }, [ready, preload]);

  const showInterstitial = useCallback(() => {
    const ad = interstitial.current;
    // `loaded` is the SDK's own view of it, which stays right across an ad that
    // expired between loading and now.
    if (!ready || !ad?.loaded) return;

    const now = Date.now();
    if (now - shownAt.current < INTERSTITIAL_COOLDOWN_MS) return;
    shownAt.current = now;

    void ad.show().catch(() => {
      // Nothing was shown, so the cooldown should not have started.
      shownAt.current = 0;
      ad.removeAllListeners();
      preload();
    });
  }, [ready, preload]);

  const value = useMemo<AdsValue>(
    () => ({ ready, showInterstitial }),
    [ready, showInterstitial],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

/**
 * The banner component itself, or `null` where the SDK is absent. `AdSlot` is
 * what screens use; this is the guarded hatch it renders through.
 */
export function bannerComponent(): AdsSdk["BannerAd"] | null {
  return sdk()?.BannerAd ?? null;
}
