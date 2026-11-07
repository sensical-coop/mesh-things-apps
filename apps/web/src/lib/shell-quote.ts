/** Single quotes for a POSIX shell, so `$` or `!` in a value survive pasting. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
