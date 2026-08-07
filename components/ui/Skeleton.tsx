import { useEffect } from "react";
import {
  Animated,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { radius, spacing } from "@/lib/theme";
import { makeStyles } from "@/lib/theme-context";

/* ---------------------------------------------------------------------------
   One shared pulse.

   A list of ten task cards is roughly 100 skeleton blocks. Giving each its own
   Animated.Value would mean 100 driver subscriptions and 100 loops that drift
   out of phase, which reads as noise rather than as loading. Instead a single
   module-level value drives every block, so they breathe together, and it is
   ref-counted so nothing animates once the last skeleton unmounts.

   This uses RN's own Animated rather than Reanimated deliberately: opacity on
   the native driver needs no worklets and no Babel plugin, and this project has
   no `babel.config.js` to add one to.
--------------------------------------------------------------------------- */

const pulse = new Animated.Value(1);
let mounted = 0;
let loop: Animated.CompositeAnimation | null = null;

function acquirePulse() {
  mounted += 1;
  if (loop) return;

  // Matches the web's `@keyframes shimmer`: 1 → 0.45 → 1 over 1.6s.
  loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 0.45,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]),
  );
  loop.start();
}

function releasePulse() {
  mounted -= 1;
  if (mounted > 0) return;
  loop?.stop();
  loop = null;
  pulse.setValue(1);
}

function usePulse() {
  useEffect(() => {
    acquirePulse();
    return releasePulse;
  }, []);
}

/** A single shimmering block. Everything below is built out of these. */
export function Skeleton({
  width,
  height = 12,
  round = false,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  /** Pill/circle rather than the default soft rectangle. */
  round?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  usePulse();

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.fill,
        { width, height, borderRadius: round ? height / 2 : radius.sm },
        { opacity: pulse },
        style,
      ]}
    />
  );
}

/** A skeleton sitting on the same card surface as the real thing. */
function SkeletonCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

function repeat(count: number, render: (index: number) => React.ReactNode) {
  return Array.from({ length: count }, (_, index) => render(index));
}

/* ── Shapes ──────────────────────────────────────────────────────────────
   Each of these mirrors the component it stands in for closely enough that
   nothing jumps when the real data lands.
------------------------------------------------------------------------- */

/** Stands in for `StatTile`. */
export function StatTileSkeleton() {
  const styles = useStyles();
  return (
    <SkeletonCard style={styles.tile}>
      <Skeleton width={32} height={32} style={styles.tileIcon} />
      <Skeleton width={44} height={22} />
      <Skeleton width="70%" height={12} />
    </SkeletonCard>
  );
}

/** A grid of stat tiles, `perRow` across. */
export function StatTilesSkeleton({
  count = 4,
  perRow = 2,
}: {
  count?: number;
  perRow?: number;
}) {
  const styles = useStyles();
  const rows = Math.ceil(count / perRow);

  return (
    <View style={styles.tiles}>
      {repeat(rows, (row) => (
        <View key={row} style={styles.tileRow}>
          {repeat(Math.min(perRow, count - row * perRow), (column) => (
            <StatTileSkeleton key={column} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Stands in for the dashboard's horizontal strip of compact stat chips. */
export function StatStripSkeleton({ count = 4 }: { count?: number }) {
  const styles = useStyles();
  const widths = [96, 116, 108, 100];

  return (
    <View style={styles.strip}>
      {repeat(count, (index) => (
        <Skeleton
          key={index}
          width={widths[index % widths.length]}
          height={40}
          style={styles.chip}
        />
      ))}
    </View>
  );
}

/** Stands in for `SegmentedControl`. */
export function SegmentedSkeleton({ segments = 3 }: { segments?: number }) {
  const styles = useStyles();
  return (
    <View style={styles.segmented}>
      {repeat(segments, (index) => (
        <Skeleton key={index} height={28} style={styles.segment} />
      ))}
    </View>
  );
}

/** Stands in for `TaskFilterBar` — the heading with its two icon buttons. */
export function FilterBarSkeleton({ titled = true }: { titled?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.filterRow}>
      {titled ? <Skeleton width={62} height={16} /> : null}
      <View style={styles.grow} />
      <Skeleton width={44} height={44} style={styles.filterButton} />
      <Skeleton width={44} height={44} style={styles.filterButton} />
    </View>
  );
}

/**
 * Stands in for `TaskList` — the hairline-separated rows, on the same single
 * card surface, so the list does not change height when the data lands.
 */
export function TaskListSkeleton({ count = 6 }: { count?: number }) {
  const styles = useStyles();

  // Varied widths, but fixed per index: random ones would reshuffle on every
  // re-render and turn a calm placeholder into a flicker.
  const titles: DimensionValue[] = ["78%", "56%", "88%", "64%", "72%", "50%"];
  const groups: DimensionValue[] = ["46%", "62%", "38%", "54%", "44%", "58%"];

  return (
    <View style={styles.rowsCard}>
      {repeat(count, (index) => (
        <View
          key={index}
          style={[styles.taskRow, index > 0 && styles.divided]}
        >
          <Skeleton width={3} height={32} round />

          <View style={styles.taskRowBody}>
            <View style={styles.between}>
              <Skeleton width={titles[index % titles.length]} height={14} />
              <Skeleton width={34} height={11} />
            </View>
            <View style={styles.rowMeta}>
              <Skeleton width={6} height={6} round />
              <Skeleton width={groups[index % groups.length]} height={11} />
            </View>
          </View>

          <Skeleton width={24} height={24} round />
          <Skeleton width={16} height={16} />
        </View>
      ))}
    </View>
  );
}

/** Stands in for `GroupCard`. */
export function GroupCardSkeleton() {
  const styles = useStyles();

  return (
    <SkeletonCard style={styles.groupCard}>
      <View style={styles.rowCentreWide}>
        <Skeleton width={40} height={40} style={styles.badge} />
        <View style={styles.grow}>
          <Skeleton width="55%" height={15} />
          <Skeleton width="75%" height={12} style={styles.gapTop} />
        </View>
        <Skeleton width={8} height={16} />
      </View>

      <Skeleton height={13} />
      <Skeleton width="70%" height={13} />

      <View style={styles.progress}>
        <View style={styles.between}>
          <Skeleton width="45%" height={11} />
          <Skeleton width={28} height={11} />
        </View>
        <Skeleton height={6} round />
      </View>

      <View style={styles.avatars}>
        {repeat(4, (index) => (
          <Skeleton
            key={index}
            width={26}
            height={26}
            round
            style={index > 0 ? styles.avatarOverlap : undefined}
          />
        ))}
      </View>
    </SkeletonCard>
  );
}

export function GroupListSkeleton({ count = 3 }: { count?: number }) {
  const styles = useStyles();
  return (
    <View style={styles.list}>
      {repeat(count, (index) => (
        <GroupCardSkeleton key={index} />
      ))}
    </View>
  );
}

/** Stands in for a notification row. */
export function NotificationListSkeleton({ count = 6 }: { count?: number }) {
  const styles = useStyles();

  return (
    <View style={styles.tightList}>
      {repeat(count, (index) => (
        <SkeletonCard key={index} style={styles.notification}>
          <Skeleton width={36} height={36} style={styles.badge} />
          <View style={styles.grow}>
            <Skeleton width="62%" height={14} />
            <Skeleton height={13} style={styles.gapTop} />
            <Skeleton width="48%" height={13} style={styles.gapTop} />
            <Skeleton width={54} height={11} style={styles.gapTop} />
          </View>
          <Skeleton width={18} height={18} round />
        </SkeletonCard>
      ))}
    </View>
  );
}

/** Stands in for an invitation card on the Requests tab. */
export function RequestListSkeleton({ count = 3 }: { count?: number }) {
  const styles = useStyles();

  return (
    <View style={styles.list}>
      {repeat(count, (index) => (
        <SkeletonCard key={index} style={styles.request}>
          <View style={styles.rowCentreWide}>
            <Skeleton width={40} height={40} style={styles.badge} />
            <View style={styles.grow}>
              <Skeleton width="58%" height={16} />
              <Skeleton width="42%" height={12} style={styles.gapTop} />
            </View>
          </View>

          <View style={styles.rowCentre}>
            <Skeleton width={28} height={28} round />
            <Skeleton width="72%" height={13} />
          </View>

          <View style={styles.actions}>
            <Skeleton height={44} style={styles.action} />
            <Skeleton height={44} style={styles.action} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}

/** Stands in for an admin user row. */
export function UserListSkeleton({ count = 6 }: { count?: number }) {
  const styles = useStyles();

  return (
    <View style={styles.list}>
      {repeat(count, (index) => (
        <SkeletonCard key={index} style={styles.userRow}>
          <Skeleton width={42} height={42} round />
          <View style={styles.grow}>
            <Skeleton width="50%" height={15} />
            <Skeleton width="68%" height={13} style={styles.gapTop} />
            <Skeleton width="58%" height={11} style={styles.gapTop} />
            <View style={[styles.chips, styles.gapTop]}>
              <Skeleton width={62} height={22} round />
            </View>
          </View>
          <Skeleton width={4} height={18} round />
        </SkeletonCard>
      ))}
    </View>
  );
}

/** Stands in for the whole Profile body. */
export function ProfileSkeleton() {
  const styles = useStyles();

  return (
    <>
      <SkeletonCard style={styles.identity}>
        <Skeleton width={64} height={64} round />
        <View style={styles.grow}>
          <Skeleton width="60%" height={17} />
          <Skeleton width="78%" height={13} style={styles.gapTop} />
          <Skeleton width="52%" height={12} style={styles.gapTop} />
        </View>
      </SkeletonCard>

      <SegmentedSkeleton segments={3} />

      <SkeletonCard style={styles.form}>
        {repeat(4, (index) => (
          <View key={index} style={styles.field}>
            <Skeleton width={84} height={13} />
            <Skeleton height={48} style={styles.input} />
          </View>
        ))}
        <Skeleton height={44} style={styles.input} />
      </SkeletonCard>
    </>
  );
}

/** Stands in for the admin overview body. */
export function AdminOverviewSkeleton() {
  const styles = useStyles();

  return (
    <>
      <View style={styles.section}>
        <Skeleton width={72} height={16} />
        <StatTilesSkeleton count={4} />
      </View>

      <View style={styles.section}>
        <Skeleton width={92} height={16} />
        <StatTilesSkeleton count={2} />
      </View>

      <SkeletonCard style={styles.block}>
        <View style={styles.between}>
          <Skeleton width="42%" height={14} />
          <Skeleton width={44} height={18} />
        </View>
        <Skeleton height={6} round />
        <Skeleton width="56%" height={12} />
      </SkeletonCard>

      <SkeletonCard style={styles.block}>
        <Skeleton width="52%" height={13} />
        <Skeleton width={64} height={28} />
        <Skeleton width="46%" height={12} />
      </SkeletonCard>
    </>
  );
}

/** Stands in for the group detail body. */
export function GroupDetailSkeleton() {
  const styles = useStyles();

  return (
    <>
      <SkeletonCard style={styles.block}>
        <View style={styles.rowCentreWide}>
          <Skeleton width={44} height={44} style={styles.badge} />
          <View style={styles.grow}>
            <Skeleton width="58%" height={16} />
            <Skeleton width="80%" height={12} style={styles.gapTop} />
          </View>
        </View>
        <Skeleton height={14} />
        <Skeleton width="66%" height={14} />
        <View style={styles.progress}>
          <View style={styles.between}>
            <Skeleton width="46%" height={12} />
            <Skeleton width={28} height={12} />
          </View>
          <Skeleton height={6} round />
        </View>
      </SkeletonCard>

      <View style={styles.tileRow}>
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
      </View>

      <SegmentedSkeleton segments={2} />
      <FilterBarSkeleton titled={false} />
      <TaskListSkeleton count={4} />
    </>
  );
}

/** Stands in for the task detail body. */
export function TaskDetailSkeleton() {
  const styles = useStyles();

  return (
    <>
      <View style={styles.section}>
        <Skeleton width={52} height={13} />
        <View style={styles.chips}>
          {[86, 74, 96, 88, 98].map((width, index) => (
            <Skeleton key={index} width={width} height={38} round />
          ))}
        </View>
      </View>

      <SkeletonCard style={styles.block}>
        {repeat(5, (index) => (
          <View key={index} style={styles.between}>
            <Skeleton width={78} height={13} />
            <Skeleton width={index % 2 === 0 ? 96 : 120} height={16} />
          </View>
        ))}
        <View style={styles.progress}>
          <View style={styles.between}>
            <Skeleton width={68} height={13} />
            <Skeleton width={34} height={13} />
          </View>
          <Skeleton height={6} round />
        </View>
      </SkeletonCard>

      <SkeletonCard style={styles.block}>
        <Skeleton width={92} height={16} />
        <Skeleton height={14} />
        <Skeleton height={14} />
        <Skeleton width="58%" height={14} />
      </SkeletonCard>

      <SkeletonCard style={styles.block}>
        <Skeleton width={110} height={16} />
        {repeat(2, (index) => (
          <View key={index} style={styles.rowTop}>
            <Skeleton width={30} height={30} round />
            <View style={styles.grow}>
              <Skeleton width="38%" height={13} />
              <Skeleton height={14} style={styles.gapTop} />
              <Skeleton width={54} height={11} style={styles.gapTop} />
            </View>
          </View>
        ))}
      </SkeletonCard>
    </>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  /** The shimmering fill itself — a hairline tone that reads as "not content". */
  fill: { backgroundColor: colors.line },

  block: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.soft,
  },
  section: { gap: spacing.md },
  list: { gap: spacing.md },
  tightList: { gap: spacing.sm },
  grow: { flex: 1 },
  gapTop: { marginTop: 6 },
  rowCentre: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowCentreWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: { borderRadius: radius.pill },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  progress: { gap: 6 },

  tiles: { gap: spacing.md },
  tileRow: { flexDirection: "row", gap: spacing.md },
  tile: { flex: 1, gap: 8, padding: spacing.lg },
  tileIcon: { borderRadius: radius.pill },

  segmented: {
    flexDirection: "row",
    gap: 4,
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segment: { flex: 1, borderRadius: radius.pill },

  strip: { flexDirection: "row", gap: spacing.sm, overflow: "hidden" },
  chip: { borderRadius: radius.pill },

  filterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterButton: { borderRadius: radius.pill },

  rowsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.soft,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  taskRowBody: { flex: 1, paddingVertical: 10, gap: 6 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 5 },

  groupCard: { gap: spacing.md },
  avatars: { flexDirection: "row", alignItems: "center" },
  avatarOverlap: { marginLeft: -8 },

  notification: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  request: { gap: spacing.md },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { flex: 1, borderRadius: radius.pill },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  identity: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  form: { gap: spacing.lg },
  field: { gap: 6 },
  input: { borderRadius: radius.card },
}));
