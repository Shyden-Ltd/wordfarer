/**
 * Pemandu, the automation guide (M1 design §5, parent §4.4, #33).
 *
 * Pemandu opens at region 2, or one destination earlier with the stamp
 * upgrade. Both are judged on the route: the destination it opens at is the
 * first one in region `opensAtRegion` or later, and `reached` only ever
 * grows, so once open it stays open, even through a Mastery replay.
 *
 * Each tick buys one unit of the affordable Encounter that pays back
 * soonest: the lowest cost / Δrate, ties by id in code-unit order.
 */
import { BALANCE } from './balance';
import type { CourseData, Encounter } from './course';
import { Num } from './num';
import { rateGain, understandingNow } from './production';
import { regionsReached, route } from './route';
import type { GameState } from './state';
import { encounterPrice, upgradeLevel } from './upgrades';

/**
 * The route number of the destination Pemandu opens at, or `undefined` when
 * the course has no destination that far.
 */
export function automationOpensAt(
  course: CourseData,
  state: GameState,
): number | undefined {
  const first = route(course).findIndex(
    (stop) => stop.region >= BALANCE.automation.opensAtRegion - 1,
  );
  if (first === -1) return undefined;
  return upgradeLevel(state, 'pemanduEarly') > 0 ? first - 1 : first;
}

/** Whether the player has reached the destination Pemandu opens at. */
export function automationUnlocked(
  course: CourseData,
  state: GameState,
): boolean {
  const opensAt = automationOpensAt(course, state);
  return opensAt !== undefined && state.reached >= opensAt;
}

interface Candidate {
  readonly encounter: Encounter;
  readonly price: Num;
  readonly gain: Num;
}

/**
 * Whether `a` pays back sooner than `b`: a lower cost / Δrate, compared as
 * `price_a x gain_b < price_b x gain_a` so no gain is ever divided by, then
 * the lower id in code-unit order.
 */
function before(a: Candidate, b: Candidate): boolean {
  const order = Num.cmp(Num.mul(a.price, b.gain), Num.mul(b.price, a.gain));
  if (order !== 0) return order < 0;
  return a.encounter.id < b.encounter.id;
}

/**
 * The Encounter one Pemandu tick buys at the state's simulated time: of
 * those in the regions reached whose next unit the Understanding held pays
 * for, the one with the lowest cost / Δrate (design §5). `undefined` when
 * none is affordable.
 */
export function bestPayback(
  course: CourseData,
  state: GameState,
): string | undefined {
  const held = understandingNow(course, state);
  const gainOf = rateGain(course, state, state.sim);
  let best: Candidate | undefined;
  for (const region of course.regions.slice(0, regionsReached(course, state))) {
    for (const encounter of region.encounters) {
      const price = encounterPrice(state, encounter, 1);
      if (Num.cmp(price, held) > 0) continue;
      const candidate = { encounter, price, gain: gainOf(encounter) };
      if (best === undefined || before(candidate, best)) best = candidate;
    }
  }
  return best?.encounter.id;
}
