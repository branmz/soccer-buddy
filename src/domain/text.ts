// Display text helpers.

/**
 * Capitalizes the first letter of every word (button labels: "Set up match" → "Set Up
 * Match"). Other letters are left alone, so names and abbreviations ("OK", "vs") keep their
 * case apart from that first letter.
 */
export function capitalizeWords(text: string): string {
  return text.replace(
    /(^|[\s(])(\p{Ll})/gu,
    (_match, before: string, letter: string) => `${before}${letter.toUpperCase()}`,
  );
}
