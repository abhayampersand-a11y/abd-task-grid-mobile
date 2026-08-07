import { createContext, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, type View } from "react-native";
import { BlurTargetView } from "expo-blur";

/**
 * Android's blur is not a backdrop filter. `BlurView` there redraws a nominated
 * subtree and blurs the result, so it needs a ref to that subtree — the docs
 * call it the blur target (SDK 57's `expo-blur`, which replaced the old
 * `experimentalBlurMethod`-only API). iOS ignores the ref entirely and
 * `BlurTargetView` is a plain `View` there, so wrapping costs nothing.
 *
 * The whole routed app is the target: the tab bar floats over every screen, so
 * whatever is behind it at any moment is what it has to blur.
 */
const BlurTargetContext = createContext<React.RefObject<View | null> | null>(
  null,
);

/**
 * The blur target, or `null` while it is still being attached.
 *
 * Callers must render something else until this is non-null. A `BlurView` reads
 * `blurTarget` once on mount and again only when the *ref object* changes — a
 * ref filled in later is invisible to it, because both sides of its own
 * comparison read through the same mutable object. Handing out `null` first and
 * the ref second makes the consumer mount a fresh `BlurView` against a target
 * that already exists.
 */
export function useBlurTarget() {
  return useContext(BlurTargetContext);
}

export function BlurTargetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const target = useRef<View | null>(null);
  const [attached, setAttached] = useState(false);

  // Mount effects run after refs are attached, so `target.current` is set by
  // the time this fires.
  useEffect(() => setAttached(true), []);

  return (
    <BlurTargetContext.Provider value={attached ? target : null}>
      <BlurTargetView ref={target} style={styles.fill}>
        {children}
      </BlurTargetView>
    </BlurTargetContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
