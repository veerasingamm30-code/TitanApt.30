/**
 * Single canonical email normaliser used by signup and login.
 * Trim -> Unicode NFKC -> lower-case.
 */
export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase();
}
