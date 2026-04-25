/**
 * Soft name validator. Disallows characters that almost certainly indicate
 * a wrong field (email symbols, brackets, digits at start), and trims
 * surrounding whitespace.
 */

const FORBIDDEN = /[@<>{}[\]\\/|]/;

export function isValidName(value: string): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  if (FORBIDDEN.test(v)) return false;
  return true;
}
