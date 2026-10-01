# M1: Core Simulation and Pacing Bots — Design

- **Status:** Reviewed to zero findings in 5 passes (§10) and self-approved under the house rule on 2026-10-01. Scope decided by the operator on 2026-10-01: **the whole v1 economy** in M1 (all three regions, automation, grammar, finale), so every §12.2 pacing target is live from M1. Technical choices were delegated: "I am relying on you. So go do some extensive research and answer your own question." They are decided below on measurements (§2).
- **Parent spec:** [`2026-10-01-wordfarer-design.md`](2026-10-01-wordfarer-design.md). This document refines §3, §4, §6.2 and §12.1–§12.2 of it for `packages/core`. Where the two disagree, this one wins for `core`, and §9 below lists the amendments made to the parent.
- **Epic:** #6.

---

## 1. Scope

**In:** a pure TypeScript package `@wordfarer/core` holding every rule that moves a number, plus the pacing bots that play it.

- Encounters, Understanding, the manual **Listen** action, bulk buy, milestones.
- Words: pick-up, tags, ranks, the retrievability-weighted bonus and its floor.
- FSRS review: the 10-item queue, Insight, practice mode.
- Insight upgrades and Passport Stamp upgrades.
- Journeys and culture cards: slots, durations, seeded no-duplicate order, set bonuses, seasonal in-season bonus.
- Set Sail: goals, stamps, 3 regions × 4 destinations, destination order, the Mudik finale gate, and Mastery mode with scaling goals.
- Grammar nodes and Pemandu automation.
- The offline cap (24 h, upgradable to 72 h) and clock clamping (DN21).
- The unfold state: which tabs and features are revealed (DN7), as data for the UI.
- The typed event log and a state hash, ready for ranked replay (M5).

**Out:** UI, saves and migrations (M4), the Worker replay endpoint (M5), real content (M2), achievements and Immersion's label mapping (no number moves; `core` only exposes the set of Mastered item IDs), entitlements (a `Platform` concern; `core` takes the set of playable regions as input).

## 2. Research and decisions

All figures below were measured on 2026-10-01 on the operator's laptop, under Node 24 (V8) and macOS JavaScriptCore (the engine in Safari and on every iPhone). The probe scripts are kept in the git-ignored `.superpowers/sdd/m1/research/`; the guarantees they establish are re-asserted by tests in M1 itself (§7), so the scripts are not load-bearing.

### 2.1 Arithmetic must be identical on every engine

ECMAScript leaves `Math.pow`, `exp`, `log` and `**` implementation-approximated. Only `+ − × ÷` and `sqrt` are correctly rounded everywhere. Ranked verification (§10.2 of the parent) replays an iPhone's events on Cloudflare's V8, so any difference can flip a purchase and diverge the replay.

| Operation, same inputs on both engines           | Results whose bits differ |
| ------------------------------------------------ | ------------------------- |
| `Math.pow(1.15, n)`, integer `n` (cost)          | 49,204 / 100,000          |
| `Math.exp`                                       | 9,854 / 100,000           |
| `Math.log`                                       | 877 / 100,000             |
| `Math.pow(10, n)`, integer `n`                   | 15,744 / 50,000           |
| `break_infinity` `Decimal.pow(1.15, n)`          | 49,204 / 100,000          |
| `break_infinity` add, sub, mul, div              | 0 / 50,000 each           |
| `Math.expm1`                                     | 18,535 / 200,000          |
| `Math.log1p`                                     | 4,037 / 200,000           |
| `@stdlib` pure-JS `pow` (3 input shapes)         | 0 / 2,000,000 each        |
| `@stdlib` `exp`, `ln`, `log10`, `expm1`, `log1p` | 0 / 200,000 each          |
| `ts-fsrs` `forgetting_curve`                     | 0 / 2,000,000             |
| `ts-fsrs` scheduler (3,000 cards × 25)           | 0 / 75,000 states         |

**Decision D-M1-1.** Every transcendental function in `core` goes through one module, `det-math.ts`, built on the `@stdlib/math-base-special-*` pure-JS ports (Apache-2.0, compatible with our licence; their licence text joins the third-party notices of every shipped build). An ESLint rule bans `Math.pow`, `Math.exp`, `Math.expm1`, `Math.log`, `Math.log1p`, `Math.log10`, `Math.log2`, `Math.cbrt`, `Math.hypot`, the trigonometric functions and the `**` operator in `packages/core/src`, and `Decimal.pow`, `Decimal.exp`, `Decimal.log*` and their instance forms. `Num` (break_infinity) is used only for its measured-safe arithmetic, and powers are built as `Decimal.fromMantissaExponent` from a `det-math` base-10 logarithm. Its normalisation is not used: break_infinity normalises with `Math.floor(Math.log10(|m|))`, and its `add` leaves the mantissa below 1 for the integer mantissas 999999999999999 and 999999999999998 on V8 and JavaScriptCore alike (measured 2026-10-01 in #26; the two engines agreed on all 2,527 boundary floors tried), so one value could be stored as two tuples. `Num` brings every result back to `1 ≤ |m| < 10` with comparisons alone, and `Num.from` takes its exponent from `det-math`. `ts-fsrs` stays (the parent spec's choice): its 8-decimal rounding absorbs the engine differences.

### 2.2 Integration: anchored state, integer clock, hourly rate buckets

Four variants were tried against a toy economy (50 and 450 words with mixed stabilities, automation buying on a fixed grid):

| Method                                                                          | `advance(a)+advance(b)` vs `advance(a+b)`                              | 24 h offline, 450 words, 1 s automation |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| Exact continuous integral, integrating from wherever the last call stopped      | 1,359 / 20,000 not bit-identical                                       | 12 s (138 µs per evaluation)            |
| Same, but state held at its last event (an **anchor**), time as float days      | 1 / 2,000 (a tick revisited through float rounding: a double purchase) | same per-evaluation cost as row 1       |
| Anchor, **integer-millisecond** clock                                           | 0 / 20,000                                                             | same per-evaluation cost as row 1       |
| Anchor, integer clock, **hourly buckets** with each word's exact mean R (below) | 0 / 3,000                                                              | 9 ms (101 buys); 58 ms (86,400 buys)    |

**Decision D-M1-2: the time model.**

1. **Integer milliseconds.** All simulated time is an integer count of milliseconds (`SimMs`, a branded number, always a safe integer). There are no fractional days anywhere in state.
2. **Anchored state.** The stored state holds every quantity at its **anchor**: the time of the last event or internal event. Values at "now" are derived (`view(state, wallMs)`) and never stored. Splitting an interval therefore cannot change any stored arithmetic, which is what makes associativity exact rather than approximate.
3. **Hourly rate buckets.** Production inside one clock hour (`[h·3,600,000, (h+1)·3,600,000)` on the simulated clock) is constant. Each word's bonus in that bucket uses the word's **exact mean retrievability over the bucket**, computed in closed form from the FSRS-6 curve, so while Encounter counts are unchanged a whole hour's total equals the continuous model's. A review or pick-up mid-bucket recomputes that word's mean from the event onward. A purchase changes only the Encounter factor of the rate, so the bucket's per-word means are reused and a purchase costs O(Encounters), not O(words).
4. **Closed-form mean R.** FSRS-6 gives `R(t) = (1 + F·t/S)^(−d)` with `d = 0.1542` and `F = 0.9^(−1/d) − 1`. Its integral is `∫₀ᵀ R = (S / (F·(1−d))) · expm1((1−d) · log1p(F·T/S))`. The textbook form `((1+x)^(1−d) − 1)` loses precision on short gaps (worst relative error 9.0e-6 at `T` = 1e-9 d, `S` = 365 d, against a 60-digit reference); the `expm1`/`log1p` form's worst is 1.3e-15.
5. **Internal events fall on the absolute clock.** Automation ticks fall on a fixed grid of the simulated clock, and journey returns at fixed times on the same clock. When the next purchase becomes affordable, its tick is solved in O(1) from the bucket's linear rate, then confirmed by evaluating the tick and the one before it, so the result never depends on how far `advance` was asked to go.

The parent's wording "closed-form integration between events" still holds: each bucket is integrated in closed form.

### 2.3 Wall clock and simulated clock

`core` keeps two clocks. `sim` (integer ms) drives the economy: production, journeys, automation and buckets. `wall` (integer ms, the latest wall-clock time seen) drives **memory and the calendar**: FSRS due times, retrievability and ranks, and seasonal festivals. Forgetting happens in real time, so a month away must age every word by a month even though the economy only credits the offline cap.

`advance(state, wallMs)` computes `elapsed = clamp(wallMs − state.wall, 0, offlineCap)`, adds it to `sim`, and sets `wall = max(state.wall, wallMs)`. A backwards jump advances nothing and a forward jump is capped (parent §10.3). The difference `skew = wall − sim` changes only at such a clamp, which is an anchor, so inside a bucket a word's retrievability is evaluated at wall time `t + skew` and the closed form of §2.2 still applies. The pure, uncapped primitive is `integrate(state, elapsedMs)`, which moves both clocks by the same amount; the associativity property is stated over it.

The pacing bots start their wall clock at **2027-01-04 00:00 UTC**, so festival windows fall on the same simulated days in every run.

## 3. Package shape

```
packages/core/src
  num.ts           Num type over break_infinity: arithmetic only, powers via det-math
  det-math.ts      pow, exp, ln, log10, expm1, log1p over @stdlib; nothing else in core calls Math.* transcendentals
  clock.ts         SimMs brand, buckets, grids, clamp
  rng.ts           seeded PRNG (xoshiro128**, four 32-bit integers of state, serialisable)
  balance.ts       every tunable number, one table (parent §3)
  course.ts        CourseData: the typed shape content must produce (M2's Zod schema targets it)
  state.ts         GameState, the anchor, initial state
  events.ts        the GameEvent union and its validator
  encounters.ts    costs, bulk buy, milestones, base rates
  words.ts         pick-up, tags, rank bonus, floor, per-encounter word multiplier
  memory.ts        ts-fsrs wrapper, ranks from stability, queue, Insight, practice
  production.ts    bucket rates and the closed-form mean R
  upgrades.ts      Insight and stamp upgrade catalogues and effects
  journeys.ts      slots, durations, seeded card order, sets, seasons
  sail.ts          goals, stamp gain, destination order, finale, Mastery mode
  grammar.ts       nodes and their multipliers
  automation.ts    Pemandu: best-payback choice and its grid
  unfold.ts        which features are revealed (DN7), from state alone
  sim.ts           integrate, advance, apply(event), view, stateHash
  index.ts         the public API
packages/core/test   unit, property and determinism tests
packages/core/fixtures/synthetic-course.ts   the generated course the bots play
packages/bots        personas, the open scheduler, the pacing report, and the CI assertions
```

`core` has no dependency on DOM, timers, network or the system clock. An ESLint rule enforces this: `Date.now`, a zero-argument `new Date()`, `setTimeout`, `setInterval`, `fetch`, `window`, `document`, `performance`, `crypto` and `Math.random` are banned. `memory.ts` may build `new Date(wallMs)` from an explicit argument, because `ts-fsrs` takes `Date` objects; that reads no clock. `ts-fsrs` is driven with `Good` for a correct answer and `Again` for a wrong one, with fuzz off so scheduling is deterministic.

## 4. Events, state and API

- **Events** (all carry `wallMs` and a sequence number `seq`; `apply` first advances to `wallMs`, so an earlier `wallMs` is clamped exactly as §2.3 clamps a backwards clock, never rejected): `listen`, `buyEncounter {id, count}`, `pickUpWord`, `answerReview {itemId, correct, latencyMs, promptType}`, `answerPractice {itemId}`, `buyUpgrade {id}`, `startJourney {slot, durationId}`, `collectJourney {slot}`, `setSail`, `buyGrammarNode {id}`, `setAutomation {enabled, intervalMs}`. A review answer carries its latency for the bot signals (parent §10.4).
- **API:** `initialState(wallMs)`, `apply(course, state, event) → Result<GameState, Rejection>`, `advance(course, state, wallMs) → {state, summary}` (the summary feeds the "welcome back" card: time credited, whether the cap clipped it, Understanding earned, journeys returned), `integrate(state, elapsedMs)`, `view(course, state, wallMs)` (derived numbers, the review queue, rates with their multiplier breakdown for DN6, the unfold flags), and `stateHash(state)` (SHA-256 of a canonical serialisation, for the replay check in M5, computed synchronously with the pure-JS `@noble/hashes` (MIT), since WebCrypto is asynchronous and a global). Amended in #27: a function that reads course data takes the course first, because state holds no content (a save stays small, and a replay supplies the course it ran against); `initialState` gains a seed with the first story that draws from the RNG (#30). The Encounter actions `apply` dispatches, `listen(course, state)` and `buyEncounter(course, state, id, count) → Result`, act at the state's own simulated time; `apply` (#36) advances to the event's `wallMs` and checks `seq` first.
- **Rejections are values, not throws.** An unaffordable purchase, an unknown Encounter, a count that is not a positive integer, a scored review of an item that is not due, or a `seq` that does not increase returns a typed `Rejection` and leaves state unchanged. M5's replay flags are exactly these rejections.
- **State is plain, serialisable data:** no classes, no `Num` instances inside state (stored as `[mantissa, exponent]` tuples), so a save is `JSON.stringify` and the hash is stable.

## 5. Game rules this design fixes

The parent leaves these open. They are **starting values for the bots to tune**, recorded in `balance.ts`, and the operator may veto any of them.

- **Listen:** +1 💬 per tap, no upgrades. How much it can matter is bounded by §6 assertion 7 (DN10).
- **Insight upgrades:** journey slot 2 and 3; offline cap +24 h (twice, to 72 h); "Phrasebook" ×2 production for one tag (one per tag); faster Pemandu interval.
- **Stamp upgrades** (bought with 🛂, kept forever): starting Understanding; Encounter cost −5% per level (capped at −40%); journey duration −10% per level (capped at −30%); Pemandu unlocked one destination early. Each stamp also gives +10% global production (parent §3.1).
- **Grammar:** each node multiplies every word whose lexicon `root` it attaches to by `×(1 + g)`, with `g = 0.5` to start, and adds the derived words to the pick-up pool.
- **Automation:** unlocks at region 2. The player chooses an interval from those owned (start 10 s; upgrades 5 s, 2 s, 1 s). Each tick buys one unit of the affordable Encounter with the lowest `cost / Δrate`.
- **Set Sail goal:** destination `i` (0-based over all 12) needs `U_goal(i) = U₀ · g_U^i` and `words(i) = w₀ + w_step · i`. **Mastery mode** replays a destination with its goal × `1.5^replays`.
- **Seasonal bonus:** while a festival's wall-clock window is live, its card's bonus is ×2. Windows come from `CourseData`, so moving festivals are content, not code.

## 6. Pacing bots

- **Personas.** _Idler_ opens twice a day for 2 minutes and never reviews. _Casual Learner_ opens 3 times for 5 minutes and answers every due review. _Diligent Learner_ opens 5 times for 8 minutes and answers every due review. A _Clicker_ (Casual plus Listen at 10 taps a second throughout each open) exists only for the DN10 check; it shares the Casual Learner's seed, and each persona draws recall, latency and open times from separate RNG streams, so the only difference between the two runs is the clicking. A _Casual Non-learner_ (the Casual Learner's opens and seed, never reviewing) exists only for the D1 check in the same way. Every persona starts with one 60-minute first session.
- **Open times** are seeded per persona around waking hours (08:00–22:00 on the simulated wall clock), so the run is reproducible.
- **Recall model.** A due review is answered correctly with probability equal to the word's FSRS retrievability at that moment, drawn from the persona's seeded RNG. Latency is drawn from a log-normal centred on 2.5 s.
- **Policy** at each open: answer the queue (learners only); collect and restart journeys with the longest duration that returns before the next scheduled open; buy greedily by payback; pick up words when the next pick-up's payback is shorter than the best Encounter's; buy upgrades and grammar nodes when affordable, in a fixed priority order; Set Sail as soon as it is available.
- **The course** is `fixtures/synthetic-course.ts`, generated from a seed and sized like v1 (parent §5.6): per region 150 lexicon items, 12 culture cards in sets, 6 Encounters, 4 grammar nodes, and about 10 tags. It satisfies the same `CourseData` type that M2's real content must.
- **CI assertions** (one test each; each mutation-verified by mistuning `balance.ts`):
  1. first Set Sail in **30–60 min** for every persona;
  2. each later destination in **1–3 days** for the Casual Learner;
  3. the Mudik finale in **3–5 weeks** for the Casual Learner;
  4. the Idler reaches the finale within **10 weeks** (my number: the parent says only "can finish");
  5. every open of every persona offers at least one meaningful decision (DN1): an affordable purchase, a due review, a free or returned journey slot, or an available Set Sail;
  6. learning pays (D1): the Casual Learner reaches the finale at least **20%** sooner than the Casual Non-learner (my number for the parent's "large multipliers"), and Diligent ≤ Casual ≤ Idler in time to the finale;
  7. clicking never beats idling: the Clicker's time to each Set Sail is at least 95% of the Casual Learner's (DN10);
  8. no state on any persona's path contains NaN, a negative or an infinite value.
- **Report.** Each run writes `pacing-report.json` (per persona: every Set Sail time, finale time, first Mastered word day, opens without a decision) and CI uploads it, so balance changes are reviewed as numbers. The first Mastered word day is the measurement the parent §10.1 asks for.

## 7. Testing

- **Unit and property tests** (Vitest + fast-check), written first:
  - `integrate(integrate(s, a), b)` **deep-equals** `integrate(s, a + b)` for generated states and integer gaps: bit-exact, no tolerance (§2.2);
  - `apply` then `advance` equals `advance` then `apply` when the event's `wallMs` is the later time;
  - no NaN, negative or infinite value in any reachable state;
  - FSRS rank transitions, the floor, and queue order and cap;
  - the closed-form mean R agrees with numerical quadrature to 1e-9 relative, and with a high-precision reference at `T` near 0;
  - the bulk-buy closed form equals summing single purchases;
  - every rejection fires and leaves state unchanged.
- **Cross-engine determinism:** a golden event log (a seeded 5-week Diligent run) is replayed in Node and, through Playwright, in **Chromium, WebKit and Firefox**; all four must produce the same `stateHash`. This test turns §2.1's one-off measurement into a guard.
- **Source guards** (comments stripped, mutation-verified with the comment left in place): the banned-API rules of §2.1 and §3.
- **Stryker** mutation testing over `encounters`, `words`, `memory`, `production`, `sail`, `journeys`, `upgrades`, `grammar` and `automation`, run in CI with `break` at 90%.
- **Offline returns** at 1 h, 1 day and 30 days (DN19): the 30-day return is capped, ages memory by the full 30 days (§2.3), is summarised, and finishes in under 1,000 ms on the CI runner. The measured time goes in the pacing report, so a slowdown is visible long before it fails.

## 8. Stories (filed under epic #6, each with full acceptance criteria)

1. Core foundations: package, `Num`, `det-math` and its ESLint ban, clock, RNG, `balance.ts`, `CourseData`, the synthetic course generator, and the cross-engine harness (Node, Chromium, WebKit, Firefox) proven on `det-math` golden vectors.
2. Encounters and Understanding: Listen, costs, bulk buy, milestones, buckets, `integrate`/`advance`/`view`, offline cap and clock clamp.
3. Words and memory: pick-up, ranks, bonus and floor, FSRS, queue, Insight, practice.
4. Upgrades: the Insight and stamp catalogues.
5. Journeys and culture cards.
6. Set Sail and world progression: goals, stamps, destination order, finale, Mastery mode, unfold flags.
7. Grammar nodes.
8. Pemandu automation.
9. Event log and state hash: the full event union, rejections, `stateHash`, and the golden-log test on story 1's harness.
10. Pacing bots, the pacing report, and balance tuned until all eight CI assertions pass. One story, because `develop` never carries a red assertion: the bots land together with the tuning that makes them pass.
11. Stryker mutation testing in CI.

## 9. Amendments to the parent spec

- §6.2: "closed-form integration between events" now points to this document's §2.2 (hourly buckets, anchored state, integer clock) and adds the deterministic-maths rule of §2.1.
- §3.3: `R` in the word bonus is the word's mean retrievability over the current hour.
- §6.1: adds `packages/bots` (the pacing bots and their report).

## 10. Review log

| Pass | Date       | Findings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 2026-10-01 | Mechanical: every parent § and DN cited exists; each figure in §2 traced to a probe output. Read-through found 11: (1) memory ran on the capped simulated clock, so a month away aged words by one day; memory now runs on wall time via `skew` (§2.3); (2) a backwards `wallMs` was a rejection, which punishes a clock change (DN21); now clamped, and ordering uses `seq`; (3) the `Date` ban would forbid `ts-fsrs`'s `Date` arguments; narrowed to clock reads; (4) 12 s was claimed for two anchored rows never timed; (5) the whole-hour equality held only while Encounter counts are unchanged; (6) xorshift128+ needs 64-bit integers; now xoshiro128**; (7) SHA-256 had no synchronous source; `@noble/hashes`; (8) a 1% Listen-share claim had no measurement behind it; (9) a 200 ms CI budget invited flakes; 1,000 ms plus a reported figure; (10) festival windows had no fixed start date for bots; (11) `packages/bots` was missing from the parent's §6.1 amendments. |
| 2    | 2026-10-01 | Mechanical: re-traced every §2 figure; every named package exists on npm with the stated licence (`@noble/hashes` MIT; five `@stdlib` modules, Stryker's Vitest runner and `@playwright/test` Apache-2.0). Read-through found 7: (1) only `@stdlib` `pow` had been measured across engines, yet the design relies on five more functions; measured, 0 / 200,000 each, and `Math.expm1`/`Math.log1p` (9.3% and 2.0% differing) added; (2) "three methods" headed a four-row table; (3) `view(state, nowMs)` disagreed with the API's `wallMs`; (4) a purchase mid-bucket looked like an O(words) recompute; it reuses the per-word means; (5) the Clicker shared no RNG discipline with the Casual Learner, so recall draws would diverge and confound DN10; separate streams per purpose; (6) stories 10 and 11 split the bots from their tuning, which would put a red assertion on `develop`; merged; (7) bundling Apache-2.0 code needs its licence text in the shipped notices.      |
| 3    | 2026-10-01 | Mechanical checks re-run, unchanged. Full read found 2: (1) `integrate(state, simMs)` read as an absolute time while the associativity property needs an elapsed gap; renamed `elapsedMs` in §2.3 and §4; (2) "fixed absolute times" for journey returns did not say which clock; the simulated one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 4    | 2026-10-01 | Mechanical checks re-run, unchanged. Full read found 2: (1) assertion 6 compared Diligent with Casual, whose opens also differ, so it could pass with reviewing worth nothing; it now compares the Casual Learner with a Casual Non-learner on identical opens and seed, requiring 20% sooner; (2) `advance` returned no summary, yet §7 and parent §6.2 require a "welcome back" summary; it now returns `{state, summary}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5    | 2026-10-01 | Mechanical checks re-run: no placeholders; every parent § cited exists (§12.1 and §12.2 are the parent's numbered items, as its §12 states); Node 24 confirmed from `.nvmrc`. Full read of all sections: **no findings**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
