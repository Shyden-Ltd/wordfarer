/**
 * `from` minus `taken`, one occurrence per match, so two identical sites need
 * two entries. A guard's burn-down list compares both ways: sites missing from
 * the list, and entries that no longer match a site.
 */
export const minus = (
  from: readonly string[],
  taken: readonly string[],
): string[] => {
  const left = [...taken];
  return from.filter((item) => {
    const at = left.indexOf(item);
    if (at === -1) return true;
    left.splice(at, 1);
    return false;
  });
};
