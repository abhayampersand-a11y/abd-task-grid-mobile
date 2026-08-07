import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter, useSegments } from "expo-router";
import { api, useRegisterPushTokenMutation } from "@/store/api";
import { useAppDispatch } from "@/store/hooks";
import { useAuth } from "./auth";
import { toAppRoute } from "./links";
import { setCachedPushToken } from "./push-token";

/**
 * Push notifications — the copy of an alert that reaches the phone while the app
 * is closed.
 *
 * The server owns delivery (see `../../my-app/lib/push.ts`); this side only has
 * to do three things: hand the API a device token, decide what a notification
 * looks like when it lands while the app is open, and open the right screen when
 * one is tapped.
 *
 * Remote push needs a development build or a release build. Expo Go on Android
 * has not supported it since SDK 53, so a token request there fails and the app
 * simply carries on with in-app alerts only.
 */

/** Web exists here only so the UI can be clicked through in a browser. */
const SUPPORTED = Platform.OS !== "web";

/**
 * What happens to a notification that arrives while the app is in the
 * foreground. Set at module scope deliberately: a handler registered inside a
 * component would miss anything delivered before that component mounts.
 */
if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Asks the OS for permission and Expo for a token.
 *
 * Returns `null` — never throws — whenever push cannot work here: the web
 * build, a simulator with no push service, a declined prompt, or Expo Go. None
 * of those are errors worth interrupting the user for.
 */
async function requestPushToken(): Promise<string | null> {
  // A simulator has no push service, so there is no token to be had.
  if (!SUPPORTED || !Device.isDevice) return null;

  try {
    // Android drops any notification addressed to a channel that does not
    // exist, and the server always sends `channelId: "default"`. Creating it
    // before the token exists means the first notification cannot arrive early.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Task alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6544f5",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const granted = existing.granted
      ? true
      : (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;

    // `getExpoPushTokenAsync` needs the EAS project the credentials belong to.
    // In a build it comes off the embedded config; app.json carries it for dev.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("[push] no EAS projectId — cannot request a token.");
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (error) {
    console.warn("[push] token unavailable", error);
    return null;
  }
}

/**
 * Keeps the device registration and the notification handlers in step with the
 * session. Renders nothing — mount it once, inside `AuthProvider`.
 *
 * The split is what keeps the browser out of `expo-notifications` entirely:
 * `Platform.OS` cannot change while the app is running, so the inner component
 * either mounts for the whole session or never does, and its hooks are never
 * conditional.
 */
export function PushSync() {
  return SUPPORTED ? <NativePushSync /> : null;
}

function NativePushSync() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const [registerPushToken] = useRegisterPushTokenMutation();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);

  const userId = user?.id ?? null;

  // Registration runs on every sign-in rather than only the first, because the
  // OS may have rotated the token and the phone may have changed hands.
  useEffect(() => {
    if (!userId) return;
    let active = true;

    void (async () => {
      const token = await requestPushToken();
      if (!active || !token) return;
      setCachedPushToken(token);

      try {
        await registerPushToken({
          token,
          platform: Platform.OS === "ios" ? "ios" : "android",
          deviceName: Device.deviceName ?? null,
        }).unwrap();
      } catch (error) {
        // Nothing the user can act on: they keep in-app alerts either way, and
        // the next launch tries again.
        console.warn("[push] registration failed", error);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, registerPushToken]);

  // A notification landing while the app is open means the server has data the
  // cache does not. Refetch the lists it could have changed.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      dispatch(
        api.util.invalidateTags([
          "Notification",
          "Dashboard",
          "TaskList",
          "Invitation",
        ]),
      );
    });
    return () => subscription.remove();
  }, [dispatch]);

  // Tapping a notification should land on the thing it is about — including
  // when the tap is what launched the app, which is why this reads the *last*
  // response rather than only listening for new ones.
  useEffect(() => {
    if (!lastResponse || !userId) return;

    // The gate is still deciding where a signed-in user belongs until the tab
    // navigator is the active route; pushing before then gets replaced.
    if (segments[0] !== "(tabs)") return;

    const id = lastResponse.notification.request.identifier;
    if (handledResponse.current === id) return;
    handledResponse.current = id;

    const link = lastResponse.notification.request.content.data?.link;
    const route = toAppRoute(typeof link === "string" ? link : null);

    dispatch(api.util.invalidateTags(["Notification"]));
    router.push(route ?? "/notifications");
  }, [lastResponse, userId, segments, router, dispatch]);

  return null;
}

/** Clears the icon badge — the alerts screen calls this once it has been seen. */
export function clearPushBadge(): void {
  if (!SUPPORTED) return;
  void Notifications.setBadgeCountAsync(0).catch(() => {});
}
