/**
 * Pemandu, the automation guide (M1 design §5, parent §4.4, #33).
 *
 * Pemandu opens at region 2, or one destination earlier with the stamp
 * upgrade. Both are judged on the route: the destination it opens at is the
 * first one in region `opensAtRegion` or later, and `reached` only ever
 * grows, so once open it stays open, even through a Mastery replay.
 */
import { BALANCE } from './balance';
import type { CourseData } from './course';
import { route } from './route';
import type { GameState } from './state';
import { upgradeLevel } from './upgrades';

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
