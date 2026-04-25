/**
 * Student enrollment number validator.
 *
 * Format: `<YYYY><Branch><3-digit-num>` e.g. "2025BCSE093". The branch is
 * 3-5 uppercase letters; the number is 3 digits. Anything else is rejected
 * as obvious garbage before we hit the network.
 */

const ENROLL_REGEX = /^\d{4}[A-Z]{3,5}\d{3}$/;

export function isValidEnrollmentFormat(value: string): boolean {
  return ENROLL_REGEX.test(value.trim().toUpperCase());
}

export function normalizeEnrollment(value: string): string {
  return value.trim().toUpperCase();
}
