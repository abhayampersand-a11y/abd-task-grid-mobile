import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIsFocused } from "expo-router";
import type { Ionicons } from "@expo/vector-icons";

/**
 * The create button is docked in the middle of the tab bar, but *what* it
 * creates belongs to the screen on top of it — a task on the dashboard, a group
 * on the groups tab. Each screen publishes its action here while it is focused
 * and the bar renders whatever is published, which keeps one button in one
 * place instead of a floating action button per screen.
 */
export interface CreateAction {
  /** What the button announces; the glyph alone cannot say it. */
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface Published {
  /**
   * The screen that published it. A screen that blurs after its replacement has
   * already published must not clear the newer entry, and the owner is how the
   * registry tells those two apart.
   */
  owner: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Stable across the publisher's renders — see `useCreateAction`. */
  run: () => void;
}

interface Registry {
  action: Published | null;
  publish: (entry: Published) => void;
  withdraw: (owner: string) => void;
}

const CreateActionContext = createContext<Registry | null>(null);

export function CreateActionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [action, setAction] = useState<Published | null>(null);

  const publish = useCallback((entry: Published) => setAction(entry), []);
  const withdraw = useCallback((owner: string) => {
    setAction((current) => (current?.owner === owner ? null : current));
  }, []);

  const value = useMemo<Registry>(
    () => ({ action, publish, withdraw }),
    [action, publish, withdraw],
  );

  return (
    <CreateActionContext.Provider value={value}>
      {children}
    </CreateActionContext.Provider>
  );
}

function useRegistry(): Registry {
  const value = useContext(CreateActionContext);
  if (!value) {
    throw new Error("Create actions need a CreateActionProvider above them.");
  }
  return value;
}

/** Read by the tab bar. `null` means no focused screen claimed the button. */
export function usePublishedCreateAction(): Published | null {
  return useRegistry().action;
}

/**
 * Publishes this screen's create action for as long as the screen is focused.
 * Pass `null` when the screen has nothing to create — the bar falls back to a
 * new task rather than showing a dead button.
 */
export function useCreateAction(action: CreateAction | null) {
  const { publish, withdraw } = useRegistry();
  const owner = useId();
  const focused = useIsFocused();

  /**
   * `onPress` closes over the screen's state, so it is a new function on every
   * render — publishing it directly would push a new entry on every keystroke.
   * The bar gets a stable wrapper that reads the newest one instead.
   */
  const handler = useRef(action?.onPress);
  useEffect(() => {
    handler.current = action?.onPress;
  });

  const label = action?.label ?? null;
  const icon = action?.icon ?? "add";

  useEffect(() => {
    if (!focused || !label) return;
    publish({ owner, label, icon, run: () => handler.current?.() });
    return () => withdraw(owner);
  }, [focused, label, icon, owner, publish, withdraw]);
}
