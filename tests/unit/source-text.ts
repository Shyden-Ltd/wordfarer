/**
 * Comment stripping for the guards that assert against source text. #24.
 *
 * Several suites in this repo read a file as TEXT and assert that something
 * appears in it, or does not. Every one of them is exposed to the same defect,
 * and this repo has now shipped it three times:
 *
 * 1. #23 — `supply-chain.test.ts` asserted `dependabot.yml` contained
 *    `"actions/cache*"`, and the file's own explanatory NOTE spelled that
 *    pattern out verbatim. No group was configured at all; the suite was
 *    green.
 * 2. #21 Stage 4 — `pipeline-wiring.test.ts`'s first dev-sanity check searched
 *    raw text, and pointing the run step at a different config left it green,
 *    because that file's own comment explaining the fix contained the filename
 *    it was looking for.
 * 3. #35 — the pre-push hook guard asserted the hook source contained
 *    `npm run test:unit`. It passed while the hook did NOT run it: the string
 *    survived inside the failure hint the hook prints telling you how to run
 *    it by hand.
 *
 * All three read as obviously correct. None was found by review; each was
 * found by mutation, which is why the standing rule pairs the two: assert on
 * the stripped text, and watch it fail.
 *
 * THE INVERSE IS ALSO A DEFECT and is easier to miss, because nothing goes
 * red. `dead-copy.test.ts` asserts ABSENCE — a key is dead if nothing
 * references it — so a comment naming a key keeps a dead key looking alive and
 * SUPPRESSES a finding rather than satisfying an assertion. Same cause, no
 * symptom.
 */

/**
 * YAML with comments removed, inline ones included, and blank lines dropped.
 *
 * `# vX.Y.Z` beside a pinned action SHA is meaningful data, not prose, so
 * anything checking those version comments must read the RAW text — this is
 * for config bodies where a `#` is always commentary.
 */
export const withoutYamlComments = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.replace(/(^|\s)#.*$/, ''))
    .filter((line) => line.trim() !== '')
    .join('\n');

/**
 * YAML with its scalar quote characters removed.
 *
 * Quoting in YAML is a STYLE, not a meaning: `'actions/cache*'` and
 * `"actions/cache*"` are the same scalar. A guard that greps for one spelling
 * reports a correct config as missing, which is a false ALARM rather than a
 * false pass -- the safe direction, but it reddens CI on config that is right
 * and sends whoever hits it hunting a problem that does not exist.
 *
 * Found by building the org template repository against this repo's own
 * supply-chain guard. The template configured the sub-path group in this
 * repo's own house style (single quotes, as `'npm'` and `'develop'` are
 * written) and the guard called it ungrouped.
 *
 * Only the quote characters go; separators and structure stay, so `['a','b']`
 * becomes `[a,b]` and two scalars cannot merge into one.
 */
export const withoutYamlQuotes = (text: string): string =>
  text.replace(/['"]/g, '');
