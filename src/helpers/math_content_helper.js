import { renderMath } from "./math_helper.js"
import { formattedContentTarget } from "./math_format.js"

export function renderContentMath(container = document) {
  container.querySelectorAll(".math-inline[data-math], .math-block[data-math]").forEach(element => {
    const latex = element.getAttribute("data-math")
    if (!latex) return

    const displayMode = element.classList.contains("math-block")
    formattedContentTarget(element).innerHTML = renderMath(latex, { displayMode })
  })
}
