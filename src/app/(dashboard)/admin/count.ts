/** Bounds of the "norms per source" field in the admin panel. */
export const MIN = 1;
export const MAX = 25;
/** Sources walked per run — only used to tell the admin what the number will cost. */
export const SOURCES = 7;

/**
 * What the field accepts while typing.
 *
 * `type="number"` is not a filter: it still lets "e", "+" and "-" through, and hands them
 * over as an empty string. Keeping the raw text (rather than a number) is what lets the
 * field be emptied — the previous version ran Number("") === 0, so deleting the last digit
 * snapped the input to "0" and the next keystroke produced "05".
 */
export const sanitizeCount = (raw: string): string => raw.replace(/\D/g, "").slice(0, 2);

/** True when the field holds a number the server will accept unchanged. */
export const isValidCount = (value: string): boolean => {
  const n = Number(value);
  return value !== "" && Number.isInteger(n) && n >= MIN && n <= MAX;
};

/** Applied on blur, not on every keystroke: clamping while typing turned "1" into the
 *  minimum before the second digit could arrive. */
export const clampCount = (value: string): string =>
  String(Math.min(Math.max(Number(value) || MIN, MIN), MAX));
