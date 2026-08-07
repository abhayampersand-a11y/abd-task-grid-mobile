import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

/** Breathing room left between the focused field and the top of the keyboard. */
const REVEAL_GAP = 16;

/**
 * The scroller only gains the extra scroll range once the avoider's padding has
 * landed, so measuring on the same tick would scroll against the old bounds.
 * Well inside the keyboard's own ~250ms slide, so the two read as one motion.
 */
const REVEAL_DELAY = 80;

// A plain object rather than `StyleSheet.create` (AGENTS.md) — it carries no
// colour, so there is nothing here for a theme swap to stale.
const FILL: ViewStyle = { flex: 1 };

const RevealContext = createContext<() => void>(() => {});

/**
 * Asks the enclosing scroller to lift the focused field clear of the keyboard.
 * Call it from a `TextInput`'s `onFocus`; it is a no-op outside a
 * `KeyboardAwareScrollView`.
 */
export function useKeyboardReveal(): () => void {
  return useContext(RevealContext);
}

/**
 * Pads its own bottom by the keyboard height so nothing inside ends up
 * underneath the keyboard.
 *
 * `behavior` is set on Android too, deliberately. Edge-to-edge has been
 * mandatory since SDK 54, which stops the manifest's `adjustResize` from
 * shrinking the window, and RN's `KeyboardAvoidingView` renders a plain
 * pass-through `View` when `behavior` is undefined — between the two, every
 * Android form sat behind the keyboard.
 */
export function KeyboardAvoider({
  children,
  offset = 0,
  pointerEvents,
  style,
}: {
  children: React.ReactNode;
  /**
   * Distance between the top of the screen and this view. Every route here
   * hides the navigator header and starts at the window top, so the default of
   * 0 is right — pass a value only for a view mounted below a real header.
   */
  offset?: number;
  /** `box-none` when the avoider fills a surface it must not make tappable. */
  pointerEvents?: ViewProps["pointerEvents"];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={offset}
      pointerEvents={pointerEvents}
      style={[FILL, style]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

/**
 * A `ScrollView` that scrolls the focused input back into view when the
 * keyboard covers it.
 *
 * Shrinking the viewport (via `KeyboardAvoider`) is only half the job: the
 * field is then merely scrollable, not visible. Android never scrolls to it on
 * its own — `scrollsChildToFocus` fires at focus time, before the keyboard has
 * taken any space — so the reveal is measured here instead of left to either
 * platform.
 */
export function KeyboardAwareScrollView({
  children,
  onScroll,
  ...props
}: ScrollViewProps & { children: React.ReactNode }) {
  const scroller = useRef<ScrollView>(null);
  const offset = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdsFocus = useRef(false);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const node = TextInput.State.currentlyFocusedInput();
      const keyboard = Keyboard.metrics();
      if (!node || !scroller.current || !keyboard) return;

      node.measureInWindow((_x, y, _width, height) => {
        const overlap = y + height + REVEAL_GAP - keyboard.screenY;
        if (overlap > 1) {
          scroller.current?.scrollTo({
            y: offset.current + overlap,
            animated: true,
          });
        }
      });
    }, REVEAL_DELAY);
  }, []);

  const reveal = useCallback(() => {
    holdsFocus.current = true;
    schedule();
  }, [schedule]);

  useEffect(() => {
    // Focusing the first field is what opens the keyboard, and `metrics()` only
    // has an answer once it has opened — so run again when it lands. Later
    // field-to-field hops keep the keyboard up and are covered by `onFocus`.
    //
    // Keyboard events are global: without the ownership flag, a list sitting
    // behind an open sheet would scroll itself to the sheet's focused field.
    const shown = Keyboard.addListener("keyboardDidShow", () => {
      if (holdsFocus.current) schedule();
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      holdsFocus.current = false;
    });

    return () => {
      shown.remove();
      hidden.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [schedule]);

  const trackScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

  return (
    <RevealContext.Provider value={reveal}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        {...props}
        ref={scroller}
        onScroll={trackScroll}
        scrollEventThrottle={props.scrollEventThrottle ?? 16}
      >
        {children}
      </ScrollView>
    </RevealContext.Provider>
  );
}
