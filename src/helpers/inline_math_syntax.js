// Pandoc rules: no space just inside the dollars, no escaped dollar, and no digit right
// after the closing one, so prices like "$5 and $10" stay text.
export const INLINE_MATH_REGEX = /(?:^|[^$\\])\$([^\s$](?:[^$\n]*[^\s$\\])?)\$(?![$\d])/

// Returns the first inline formula in text as { latex, start, end }, or null.
export function findInlineMath(text) {
  const match = INLINE_MATH_REGEX.exec(text)
  if (!match) return null

  const start = match[0].startsWith("$") ? match.index : match.index + 1
  if (isInsideOpenBacktick(text, start)) return null

  return { latex: match[1], start, end: match.index + match[0].length }
}

// Typing `$x$` should become inline code, not math inside backticks.
function isInsideOpenBacktick(text, index) {
  return (text.slice(0, index).match(/`/g) || []).length % 2 === 1
}
