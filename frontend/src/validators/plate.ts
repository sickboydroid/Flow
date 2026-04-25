/**
 * Indian vehicle license plate validator.
 *
 * Accepts the canonical "MH 04 AB 1234" format with optional spaces, in
 * any case. Normalizes input to uppercase + space-separated.
 */

const STATE = '[A-Z]{2}';
const RTO = '\\d{1,2}';
const SERIES = '[A-Z]{1,3}';
const NUMBER = '\\d{1,4}';
const PLATE_REGEX = new RegExp(`^${STATE}\\s?${RTO}\\s?${SERIES}\\s?${NUMBER}$`);

export function isValidIndianPlate(value: string): boolean {
  return PLATE_REGEX.test(value.replace(/\s+/g, ' ').trim().toUpperCase());
}

/** Normalize to uppercase + single-spaced. Doesn't validate. */
export function normalizePlate(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toUpperCase();
}
