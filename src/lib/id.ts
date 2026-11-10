/**
 * Small dependency-free id helper (no `uuid` needed in an Expo Go app).
 */
export function createId(prefix = 'id'): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${random}`;
}
