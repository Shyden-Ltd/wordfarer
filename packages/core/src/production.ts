/**
 * Production over simulated time (M1 design §2.2).
 *
 * The rate is constant inside each clock hour. In #27 nothing varies it
 * between events at all (there are no word or global multipliers yet), so
 * production over any span between two events is the rate times its length.
 * #28 makes the rate vary by hour bucket (each word's mean retrievability over
 * the bucket) and sums bucket by bucket from there.
 */
import type { SimMs } from './clock';
import type { CourseData } from './course';
import { encounterOutput } from './encounters';
import { Num } from './num';
import { ownedCount, type GameState } from './state';

const THOUSAND = Num.from(1000);

/** Understanding per second from every owned Encounter (parent §3.2). */
export function encounterRate(course: CourseData, state: GameState): Num {
  let rate = Num.from(0);
  for (const region of course.regions) {
    for (const encounter of region.encounters) {
      const owned = ownedCount(state, encounter.id);
      if (owned > 0) rate = Num.add(rate, encounterOutput(encounter, owned));
    }
  }
  return rate;
}

/** Understanding produced over `[from, to)` by the state's owned Encounters. */
export function producedBetween(
  course: CourseData,
  state: GameState,
  from: SimMs,
  to: SimMs,
): Num {
  if (to < from) {
    throw new RangeError(
      `producedBetween: ${String(to)} is before ${String(from)}`,
    );
  }
  const rate = encounterRate(course, state);
  return Num.div(Num.mul(rate, Num.from(to - from)), THOUSAND);
}
