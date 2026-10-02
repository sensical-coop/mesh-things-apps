/** A run of plain text, or a URL to render as a link. */
export type TextSegment = { text: string; href?: string };

const URL_PATTERN = /https?:\/\/[^\s()<>]+/g;

/**
 * Splits `text` into plain runs and http(s) URLs, so served copy such as a terms statement
 * can link the Data Processing Agreement it names. Trailing punctuation stays outside the URL.
 */
export function splitLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const href = match[0].replace(/[.,;:!?]+$/, "");
    const start = match.index;
    if (start > last) segments.push({ text: text.slice(last, start) });
    segments.push({ text: href, href });
    last = start + href.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
