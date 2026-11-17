// Pandoc rules: no space just inside the dollars, no escaped dollar, and no digit right
// after the closing one, so prices like "$5 and $10" stay text.
export const INLINE_MATH_REGEX = /(?:^|[^$\\])\$([^\s$](?:[^$\n]*[^\s$\\])?)\$(?![$\d])/
export const DISPLAY_MATH_REGEX = /(?:^|[^\\])\$\$([^$]+?)\$\$/

// Returns the first inline formula in text as { latex, start, end }, or null.
export function findInlineMath(text) {
  const match = INLINE_MATH_REGEX.exec(text)
  if (!match) return null

  const start = match[0].startsWith("$") ? match.index : match.index + 1
  if (isInsideOpenBacktick(text, start)) return null

  return { latex: match[1], start, end: match.index + match[0].length }
}

// Returns the first $$display$$ or $inline$ formula in text as { latex, start, end, displayMode }, or null.
export function findMath(text) {
  const inline = findInlineMath(text)
  const match = DISPLAY_MATH_REGEX.exec(text)
  const display = match && {
    latex: match[1].trim(),
    start: match[0].startsWith("$") ? match.index : match.index + 1,
    end: match.index + match[0].length,
    displayMode: true
  }

  if (display && (!inline || display.start <= inline.start)) return display
  return inline && { ...inline, displayMode: false }
}

// Typing `$x$` should become inline code, not math inside backticks.
function isInsideOpenBacktick(text, index) {
  return (text.slice(0, index).match(/`/g) || []).length % 2 === 1
}
