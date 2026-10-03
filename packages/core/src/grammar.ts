/**
 * Grammar nodes (parent §4.3, design §5, #32).
 *
 * A node is content: the roots it attaches to and the words it derives. It is
 * bought with Insight once grammar has opened (region 2) and the node's own
 * region is reached, as Encounters are. The next node costs
 * costC0 x costGrowth^n, `n` being the nodes already owned, so the player
 * chooses the order and the price follows the count.
 * Buying one is an action, so `buyGrammarNode` is in `sim.ts` with the
 * others.
 */
import { BALANCE } from './balance';
import type { CourseData, GrammarNode } from './course';
import { Num } from './num';

const COST_C0 = Num.from(BALANCE.grammar.costC0);
const COST_GROWTH = Num.from(BALANCE.grammar.costGrowth);

/** The Insight cost of the next node when `owned` nodes are owned. */
export function grammarNodeCost(owned: number): Num {
  if (!Number.isSafeInteger(owned) || owned < 0) {
    throw new RangeError(
      `owned must be a safe non-negative integer, got ${String(owned)}`,
    );
  }
  return Num.mul(COST_C0, Num.pow(COST_GROWTH, owned));
}

/** Node `id` and the index of the region that holds it, if the course has it. */
export function findGrammarNode(
  course: CourseData,
  id: string,
): { readonly node: GrammarNode; readonly region: number } | undefined {
  for (const [region, { grammarNodes }] of course.regions.entries()) {
    const node = grammarNodes.find((n) => n.id === id);
    if (node !== undefined) return { node, region };
  }
  return undefined;
}
