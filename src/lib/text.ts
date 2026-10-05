/**
 * Fits an admin-configured label inside a sentence ("Escribe tu …"):
 * lowercases only its first letter, and leaves acronyms such as "RFC" or
 * "SOEID del empleado" untouched.
 */
export function inSentence(label: string): string {
  const firstWord = label.trim().split(/\s+/)[0] ?? "";
  if (firstWord.length > 1 && firstWord === firstWord.toUpperCase()) return label.trim();
  return label.trim().charAt(0).toLowerCase() + label.trim().slice(1);
}
