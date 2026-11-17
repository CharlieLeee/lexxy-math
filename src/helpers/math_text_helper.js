import { renderMath } from "./math_helper.js"
import { findMath } from "./inline_math_syntax.js"

const SKIPPED = "code, pre, script, style, textarea, [contenteditable], lexxy-editor, .katex, .math-inline, .math-block"

// Renders math written as plain $...$ and $$...$$ text, e.g. in content saved without
// lexxy-math or by a server that strips data-math. Uses the same rules as the editor.
export function renderTextMath(container = document.body) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => node.nodeValue.includes("$") && !node.parentElement?.closest(SKIPPED)
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT
  })

  const textNodes = []
  while (walker.nextNode()) textNodes.push(walker.currentNode)
  textNodes.forEach(renderTextNode)
}

function renderTextNode(node) {
  const fragment = document.createDocumentFragment()
  let text = node.nodeValue
  let match

  while ((match = findMath(text))) {
    fragment.append(text.slice(0, match.start), mathElement(match))
    text = text.slice(match.end)
  }

  if (text === node.nodeValue) return

  fragment.append(text)
  node.replaceWith(fragment)
}

function mathElement({ latex, displayMode }) {
  const element = document.createElement("span")
  element.className = displayMode ? "math-block" : "math-inline"
  element.dataset.math = latex
  element.innerHTML = renderMath(latex, { displayMode })
  return element
}
