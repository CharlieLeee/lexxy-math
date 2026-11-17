import assert from "node:assert/strict"
import test from "node:test"

import { findInlineMath } from "../src/helpers/inline_math_syntax.js"

test("finds inline math and its range", () => {
  assert.deepEqual(findInlineMath("$E=mc^2$"), { latex: "E=mc^2", start: 0, end: 8 })
  assert.deepEqual(findInlineMath("so $x$ here"), { latex: "x", start: 3, end: 6 })
  assert.equal(findInlineMath("so $\\{a\\}$ here").latex, "\\{a\\}")
})

test("leaves prices, spaced dollars and escapes as text", () => {
  for (const text of ["costs $5 and $10", "$ x $", "$x$5", "\\$x$", "$$", "a $ b"]) {
    assert.equal(findInlineMath(text), null, text)
  }
})

test("skips dollars inside an unclosed backtick", () => {
  assert.equal(findInlineMath("`$a$"), null)
  assert.equal(findInlineMath("`code` and $a$").latex, "a")
})
