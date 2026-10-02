import { describe, expect, it } from 'vitest';
import * as core from '../src/index';

/**
 * The words and memory API (#28) and the upgrades API (#29) are reachable
 * from the package entry point, which is all the UI and the pacing bots
 * import.
 */
describe('the package entry point', () => {
  for (const name of [
    'pickUpWord',
    'answerReview',
    'answerPractice',
    'pickUpCost',
    'pickedWord',
    'rateAt',
    'wordMultiplier',
    'buyUpgrade',
    'upgradeCatalogue',
    'findUpgrade',
    'upgradeLevel',
    'phrasebookId',
    'offlineCapMs',
    'encounterCostFactor',
    'journeyDurationFactor',
    'journeySlots',
    'pemanduIntervalsMs',
    'startingUnderstanding',
    'globalMultiplier',
    'rateBreakdown',
    'totalRate',
    'milestoneFactor',
  ] as const)
    it(`exports ${name}`, () => {
      expect(core[name]).toBeTypeOf('function');
    });

  it('exports the five ranks in order', () => {
    expect(core.RANKS).toEqual([
      'heard',
      'recognised',
      'recalled',
      'fluent',
      'mastered',
    ]);
  });
});
