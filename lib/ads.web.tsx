/**
 * The web build's copy of `lib/ads.tsx`: the same exports, all inert.
 *
 * `react-native-google-mobile-ads` is native-only — there is no web entry point
 * for Metro to resolve and no view for `react-native-web` to render — so the
 * whole layer is stubbed rather than guarded at each call site. Metro picks
 * this file for `@/lib/ads` on web automatically, so screens import one name
 * and get whichever of the two applies.
 *
 * Every slot reads `useAds().ready`, which is permanently false here, so no
 * screen renders an ad frame and no layout reserves space for one.
 */

export const BANNER_UNIT_ID: string | null = null;
export const INTERSTITIAL_UNIT_ID: string | null = null;
export const BANNER_SIZE = "LARGE_ANCHORED_ADAPTIVE_BANNER";

interface AdsValue {
  ready: boolean;
  showInterstitial: () => void;
}

const INERT: AdsValue = { ready: false, showInterstitial: () => {} };

export function useAds(): AdsValue {
  return INERT;
}

export function AdsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function bannerComponent(): null {
  return null;
}
