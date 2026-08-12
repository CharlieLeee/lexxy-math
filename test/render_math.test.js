import assert from "node:assert/strict"
import test from "node:test"

import { renderContentMath } from "../src/helpers/math_content_helper.js"
import { renderMath } from "../src/helpers/math_helper.js"

test("renderMath renders inline and display formulas", () => {
  assert.match(renderMath("E=mc^2"), /class="katex"/)
  assert.match(renderMath("\\int_0^1 x^2 dx", { displayMode: true }), /class="katex-display"/)
})

test("renderContentMath renders inline and block content", () => {
  const elements = [
    mathElement("math-inline", "x+y"),
    mathElement("math-block", "x^2")
  ]

  renderContentMath({ querySelectorAll: () => elements })

  assert.match(elements[0].innerHTML, /class="katex"/)
  assert.doesNotMatch(elements[0].innerHTML, /class="katex-display"/)
  assert.match(elements[1].innerHTML, /class="katex-display"/)
})

function mathElement(className, latex) {
  return {
    classList: { contains: (value) => value === className },
    getAttribute: (name) => name === "data-math" ? latex : null,
    innerHTML: ""
  }
}
