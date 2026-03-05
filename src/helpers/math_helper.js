import katex from "katex"
import { injectStyles } from "./styles"

export function renderMath(latex, { displayMode = false } = {}) {
  injectStyles()

  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return `<span class="lexxy-math-error">${escapeHtml(latex)}</span>`
  }
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
  return String(text).replace(/[&<>"']/g, (ch) => map[ch])
}
