/** Lowercase and strip accents, so "jose" finds "José". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** True when every word of `query` appears somewhere in `text`. An empty query matches everything. */
export function matchesSearch(text: string, query: string): boolean {
  const haystack = fold(text);
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
