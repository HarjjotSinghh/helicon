/** Counts the words in a string, splitting on any run of whitespace. */
export function wordCount(text) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}
