/**
 * CourseData: the typed shape a course must produce for core (M1 design §3).
 *
 * A course is data, not code (parent §5.1): core never branches on a language.
 * This type holds only what moves a number; text, translations, audio and the
 * review block stay in the content pack, and M2's Zod schema targets this
 * shape. It is plain, readonly data, so it serialises and deep-compares.
 *
 * Shape: a course has regions (parent §4.4); a region has destinations, each
 * with its lexicon in curriculum order, plus the region's Encounters, culture
 * cards and their sets, and grammar nodes. Tags are shared across the whole
 * course, so words from an earlier region keep paying on later Encounters
 * (parent §3.3).
 */

export type Cefr = 'A1' | 'A2' | 'B1';

/** A word or phrase the player can pick up (parent §5.2, the fields core needs). */
export interface LexiconItem {
  readonly id: string;
  readonly tags: readonly string[];
  readonly cefr: Cefr;
  /** The grammar root this item derives from, when a grammar node can attach to it. */
  readonly root?: string;
}

/** A generator (parent §3.2): the n-th purchase costs c0 x growth^n, output scales with p0. */
export interface Encounter {
  readonly id: string;
  readonly tags: readonly string[];
  /** Understanding cost of the first purchase. */
  readonly c0: number;
  /** Understanding per second from one owned, before multipliers. */
  readonly p0: number;
}

/** A wall-clock window [startWallMs, endWallMs) in which a festival is live. */
export interface FestivalWindow {
  readonly startWallMs: number;
  readonly endWallMs: number;
}

/** A culture card a Journey returns (parent §4.2). */
export interface CultureCard {
  readonly id: string;
  readonly setId: string;
  readonly tags: readonly string[];
  /** Permanent production bonus on the card's tags while held. */
  readonly bonus: number;
  /** Words the card adds to the pick-up pool once held (parent §4.2). */
  readonly phrasePack: readonly LexiconItem[];
  /** A real-calendar festival: the card's bonus is raised while a window is live. */
  readonly festival?: { readonly windows: readonly FestivalWindow[] };
}

/** A set of cards; holding every card in it grants the set bonus. */
export interface CardSet {
  readonly id: string;
  readonly bonus: number;
}

/** A grammar node (parent §4.3): multiplies words on its roots and teaches derived words. */
export interface GrammarNode {
  readonly id: string;
  readonly roots: readonly string[];
  /** Words the node adds to the pick-up pool. */
  readonly derived: readonly LexiconItem[];
}

export interface Destination {
  readonly id: string;
  /** Picked up in this order, CEFR A1 first (parent §3.3). */
  readonly lexicon: readonly LexiconItem[];
}

export interface Region {
  readonly id: string;
  readonly destinations: readonly Destination[];
  readonly encounters: readonly Encounter[];
  readonly cardSets: readonly CardSet[];
  readonly cultureCards: readonly CultureCard[];
  readonly grammarNodes: readonly GrammarNode[];
}

export interface CourseData {
  readonly id: string;
  /** Every tag used anywhere in the course. */
  readonly tags: readonly string[];
  readonly regions: readonly Region[];
}
