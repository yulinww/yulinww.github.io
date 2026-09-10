export function searchTerms(query) {
  return query.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
}

export function filterNotes(notes, { category = "", subcategory = "", query = "" } = {}) {
  const terms = searchTerms(query);
  return notes.filter((note) => {
    if (category && note.category !== category) return false;
    if (subcategory && note.subcategory !== subcategory) return false;
    const text = (note.title + "\n" + note.searchText).normalize("NFKC").toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

export function searchSnippet(note, query) {
  const terms = searchTerms(query);
  if (!terms.length) return note.summary;
  const text = note.searchText.replace(/\s+/g, " ").normalize("NFKC");
  const lower = text.toLocaleLowerCase();
  const hits = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
  if (!hits.length) return note.summary;
  const first = Math.min(...hits);
  const start = Math.max(0, first - 38);
  return (start ? "…" : "") + text.slice(start, start + 150) + (text.length > start + 150 ? "…" : "");
}

// Return text ranges, not HTML: a search term can never inject markup.
export function highlightParts(text, query) {
  const terms = searchTerms(query);
  if (!terms.length) return [{ text, match: false }];
  const normalized = text.normalize("NFKC");
  const lower = normalized.toLocaleLowerCase();
  const ranges = [];
  for (const term of terms) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(term, from);
      if (index < 0) break;
      ranges.push([index, index + term.length]);
      from = index + term.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  const parts = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: normalized.slice(cursor, start), match: false });
    parts.push({ text: normalized.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < normalized.length) parts.push({ text: normalized.slice(cursor), match: false });
  return parts;
}
