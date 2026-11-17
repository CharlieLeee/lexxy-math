import assert from "node:assert/strict"
import test from "node:test"

import { hasMathFormat, setMathFormat, parseStyle } from "../src/helpers/math_format.js"

test("sets and clears each format without touching other styles", () => {
  let style = "color: red"

  for (const format of ["bold", "italic", "strikethrough", "underline"]) {
    style = setMathFormat(style, format, true)
    assert.ok(hasMathFormat(style, format), format)
  }

  assert.deepEqual(parseStyle(style), {
    "color": "red",
    "font-weight": "bold",
    "font-style": "italic",
    "text-decoration": "line-through underline"
  })

  style = setMathFormat(style, "strikethrough", false)
  assert.equal(parseStyle(style)["text-decoration"], "underline")

  for (const format of ["bold", "italic", "underline"]) style = setMathFormat(style, format, false)
  assert.equal(style, "color: red")
})

test("treats numeric font weights as bold", () => {
  assert.ok(hasMathFormat("font-weight: 700", "bold"))
  assert.ok(!hasMathFormat("font-weight: 400", "bold"))
})
