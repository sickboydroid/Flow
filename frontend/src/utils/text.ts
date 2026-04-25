/**
 * Text helpers. Pure functions, no DOM.
 */

/** "Ahmad Malik" → "AM". Falsy parts collapse gracefully. */
export function initials(first: string | undefined, last: string | undefined): string {
  const a = (first?.[0] ?? '').toUpperCase();
  const b = (last?.[0] ?? '').toUpperCase();
  return `${a}${b}`;
}

/** Title-case a single word: "MALE" / "male" / "MaLe" → "Male". */
export function titleCase(value: string | undefined | null): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
