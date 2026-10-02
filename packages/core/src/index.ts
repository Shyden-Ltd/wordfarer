/**
 * @wordfarer/core: every rule that moves a number (M1 design §1). Pure
 * TypeScript with no DOM, timers, network or system clock, so the same code
 * runs in browsers, Electron, Capacitor and Workers and replays identically.
 */
export { exp, expm1, ln, log10, log1p, pow } from './det-math';
export { Num, type NumTuple } from './num';
export {
  bucketEnd,
  bucketStart,
  gridTicksBetween,
  HOUR_MS,
  nextGridTick,
  simMs,
  wallMs,
  type SimMs,
  type WallMs,
} from './clock';
export {
  createStreams,
  drawFrom,
  nextFloat,
  nextInt,
  nextU32,
  seedRng,
  type Draw,
  type RngState,
  type RngStreams,
} from './rng';
export {
  BALANCE,
  type Balance,
  type InsightUpgradeId,
  type Rank,
  type StampUpgradeId,
} from './balance';
export {
  encounterOutput,
  milestoneFactor,
  milestonesReached,
  purchaseCost,
} from './encounters';
export {
  encounterRate,
  producedBetween,
  rateAt,
  rateBreakdown,
  totalRate,
  wordMultiplier,
  type EncounterRate,
  type RateLine,
} from './production';
export {
  encounterCostFactor,
  findUpgrade,
  globalMultiplier,
  journeyDurationFactor,
  journeySlots,
  offlineCapMs,
  pemanduIntervalsMs,
  phrasebookId,
  startingUnderstanding,
  upgradeCatalogue,
  upgradeLevel,
  type Upgrade,
  type UpgradeCurrency,
} from './upgrades';
export {
  RANKS,
  type MemoryCard,
  type QueueItem,
  type WordMemory,
} from './memory';
export { pickUpCost } from './words';
export {
  advance,
  answerPractice,
  answerReview,
  buyEncounter,
  buyUpgrade,
  integrate,
  listen,
  pickUpWord,
  understandingNow,
  view,
  type AdvanceSummary,
  type Rejection,
  type Result,
  type View,
} from './sim';
export {
  initialState,
  ownedCount,
  pickedWord,
  type Anchor,
  type GameState,
} from './state';
export type {
  CardSet,
  Cefr,
  CourseData,
  CultureCard,
  Destination,
  Encounter,
  FestivalWindow,
  GrammarNode,
  LexiconItem,
  Region,
} from './course';
