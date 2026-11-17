// Drives the demo page (docs/) in Chromium through Lexxy's real toolbar and checks
// the editor DOM, the saved HTML, and content rendered with renderContentMath.
// Run with `npm run test:e2e` (builds the demo first).

import assert from "node:assert/strict"
import { after, before, beforeEach, describe, test } from "node:test"
import { chromium } from "playwright"
import { serveDirectory } from "./static_server.js"

const INLINE = `<p>before <span class="math-inline" data-math="x^2+1">$x^2+1$</span> after</p>`
const MIXED = `${INLINE}<div class="math-block" data-math="y=mx+b">$$y=mx+b$$</div><p>tail</p>`
const FORMATS = [
  { name: "bold", tag: "strong", shortcut: "ControlOrMeta+b", applied: (s) => s.weight >= 600 },
  { name: "italic", tag: "em", shortcut: "ControlOrMeta+i", applied: (s) => s.fontStyle === "italic" },
  { name: "underline", tag: "u", shortcut: "ControlOrMeta+u", applied: (s) => s.lines.includes("underline") },
  { name: "strikethrough", tag: "s", applied: (s) => s.lines.includes("line-through") }
]

let server, browser, page, errors

before(async () => {
  server = await serveDirectory(new URL("../../docs/", import.meta.url))
  browser = await chromium.launch()
  page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(server.url, { waitUntil: "networkidle" })
})

after(async () => {
  await browser?.close()
  await server?.close()
})

// Helpers

async function load(html) {
  await page.evaluate((value) => { document.querySelector("lexxy-editor").value = value }, html)
  await page.waitForTimeout(150)
}

async function selectFirstParagraph() {
  await page.evaluate(() => {
    const range = document.createRange()
    range.selectNodeContents(document.querySelector("lexxy-editor [contenteditable] p"))
    getSelection().removeAllRanges()
    getSelection().addRange(range)
  })
  await page.waitForTimeout(100)
}

async function selectAll() {
  await page.click("lexxy-editor [contenteditable] p:last-of-type")
  await page.keyboard.press("ControlOrMeta+a")
}

async function toolbar(name) {
  await page.click(`lexxy-toolbar button[name=${name}]`)
  await page.waitForTimeout(100)
}

async function command(name) {
  await page.click(`lexxy-toolbar [data-command=${name}]`)
  await page.waitForTimeout(100)
}

async function pickColor(style, index) {
  await toolbar("highlight")
  await page.click(`lexxy-highlight-dropdown button[name=${style}-${index}]`)
  await page.waitForTimeout(100)
}

async function press(keys) {
  await page.keyboard.press(keys)
  await page.waitForTimeout(100)
}

const savedHtml = () => page.$eval("lexxy-editor", (editor) => editor.value)

// Computed appearance of the first inline or block formula in the editor or the rendered output.
function mathAppearance(scope, kind = "inline") {
  return page.evaluate(([scope, kind]) => {
    const selectors = {
      editor: { inline: "lexxy-editor .lexxy-math-inline", block: "lexxy-editor .lexxy-math-block__preview" },
      output: { inline: "[data-output=rendered] .math-inline", block: "[data-output=rendered] .math-block" }
    }
    const host = document.querySelector(selectors[scope][kind])
    const katex = host?.querySelector(".katex")
    if (!katex) return null

    // An upright glyph ("1" or "b"): KaTeX variables are always italic
    const glyph = [...host.querySelectorAll(".katex-html .mord")].find((el) => !el.children.length && /^[1b]$/.test(el.textContent))
    const glyphStyle = getComputedStyle(glyph)
    const drawn = (pseudo) => getComputedStyle(katex, pseudo).content !== "none"

    return {
      weight: Number(glyphStyle.fontWeight),
      fontStyle: glyphStyle.fontStyle,
      color: glyphStyle.color,
      background: getComputedStyle(host).backgroundColor,
      lines: [drawn("::after") && "underline", drawn("::before") && "line-through"].filter(Boolean),
      linked: !!host.closest("a")
    }
  }, [scope, kind])
}

const isTransparent = (color) => color === "rgba(0, 0, 0, 0)"

let baseColor

beforeEach(async () => {
  await load(INLINE)
  baseColor ??= (await mathAppearance("editor")).color
})

// Tests

describe("text formats", () => {
  for (const format of FORMATS) {
    for (const via of format.shortcut ? ["toolbar", "shortcut"] : ["toolbar"]) {
      test(`${format.name} via ${via} applies to editor, saved HTML and rendered output, and toggles off`, async () => {
        const apply = () => via === "toolbar" ? toolbar(format.name) : press(format.shortcut)

        await selectFirstParagraph()
        await apply()

        assert.ok(format.applied(await mathAppearance("editor")), "editor")
        assert.match(await savedHtml(), new RegExp(`<span class="math-inline"[^>]*><${format.tag}>`))
        assert.ok(format.applied(await mathAppearance("output")), "rendered output")

        await apply()
        assert.ok(!format.applied(await mathAppearance("editor")), "toggled off")
      })
    }
  }

  test("all four formats combine on inline and block math", async () => {
    await load(MIXED)
    await selectAll()
    for (const format of FORMATS) await toolbar(format.name)

    for (const scope of ["editor", "output"]) {
      for (const kind of ["inline", "block"]) {
        const appearance = await mathAppearance(scope, kind)
        for (const format of FORMATS) assert.ok(format.applied(appearance), `${format.name} on ${kind} ${scope}`)
      }
    }
  })

  test("a mixed selection follows the first text node, like Lexical", async () => {
    await load(`<p><strong>bold</strong> <span class="math-inline" data-math="x^2+1">$x^2+1$</span></p>`)
    await selectFirstParagraph()

    await toolbar("bold")
    assert.ok(!(await savedHtml()).includes("<strong>"))
    assert.ok((await mathAppearance("editor")).weight < 600)

    await toolbar("bold")
    assert.match(await savedHtml(), /<strong>bold ?<\/strong>.*<span class="math-inline"[^>]*><strong>/)
  })

  test("undo and redo revert math together with text", async () => {
    await selectFirstParagraph()
    await press("ControlOrMeta+b")
    await press("ControlOrMeta+z")
    assert.ok(!(await savedHtml()).includes("<strong>"))
    assert.ok((await mathAppearance("editor")).weight < 600)

    await press("ControlOrMeta+Shift+z")
    assert.ok((await mathAppearance("editor")).weight >= 600)
  })

  test("clear formatting resets math", async () => {
    await selectFirstParagraph()
    await toolbar("bold")
    await pickColor("color", 1)
    await selectFirstParagraph()
    await toolbar("format")
    await command("clearFormatting")

    const appearance = await mathAppearance("editor")
    assert.ok(appearance.weight < 600)
    assert.equal(appearance.color, baseColor)
  })
})

describe("colors", () => {
  test("text color and highlight apply, combine, toggle and clear", async () => {
    await selectFirstParagraph()
    await pickColor("color", 2)
    assert.notEqual((await mathAppearance("editor")).color, baseColor)
    assert.notEqual((await mathAppearance("output")).color, baseColor)
    assert.match(await savedHtml(), /class="math-inline"[^>]*style="[^"]*color/)

    await pickColor("background-color", 3)
    for (const scope of ["editor", "output"]) {
      const appearance = await mathAppearance(scope)
      assert.ok(!isTransparent(appearance.background), `${scope} background`)
      assert.notEqual(appearance.color, baseColor, `${scope} keeps color`)
    }

    await pickColor("color", 2)
    assert.equal((await mathAppearance("editor")).color, baseColor)

    await toolbar("highlight")
    await page.click("lexxy-highlight-dropdown [data-command=removeHighlight]")
    await page.waitForTimeout(100)
    assert.ok(isTransparent((await mathAppearance("editor")).background))
  })

  test("block math takes colors and formats from a select-all", async () => {
    await load(MIXED)
    await selectAll()
    await toolbar("bold")
    await pickColor("color", 4)

    for (const scope of ["editor", "output"]) {
      const appearance = await mathAppearance(scope, "block")
      assert.ok(appearance.weight >= 600, `${scope} bold`)
      assert.notEqual(appearance.color, baseColor, `${scope} color`)
    }
  })
})

describe("links", () => {
  test("link wraps math and underlines it; unlink keeps it", async () => {
    await selectFirstParagraph()
    await toolbar("link")
    await page.fill("lexxy-link-dropdown input[type=url]", "https://example.com")
    await page.click("lexxy-link-dropdown button[value=link]")
    await page.waitForTimeout(150)

    assert.match(await savedHtml(), /<a [^>]*href="https:\/\/example.com"[^>]*>.*math-inline.*<\/a>/)
    for (const scope of ["editor", "output"]) {
      const appearance = await mathAppearance(scope)
      assert.ok(appearance.linked && appearance.lines.includes("underline"), scope)
    }

    await selectFirstParagraph()
    await toolbar("link")
    await page.click("lexxy-link-dropdown button[value=unlink]")
    await page.waitForTimeout(150)
    assert.ok(!(await savedHtml()).includes("<a "))
    assert.ok(await mathAppearance("editor"))
  })
})

describe("blocks and persistence", () => {
  const blockCommands = {
    "heading": async () => { await toolbar("format"); await page.click("lexxy-heading-dropdown button >> nth=0") },
    "bullet list": () => command("insertUnorderedList"),
    "numbered list": () => command("insertOrderedList"),
    "quote": () => command("insertQuoteBlock")
  }

  for (const [name, run] of Object.entries(blockCommands)) {
    test(`${name} keeps inline math`, async () => {
      await selectFirstParagraph()
      await run()
      await page.waitForTimeout(100)
      assert.match(await savedHtml(), /data-math="x\^2\+1"/)
      assert.ok(await mathAppearance("editor"))
    })
  }

  test("saved HTML round-trips with formats and colors", async () => {
    await load(MIXED)
    await selectAll()
    await toolbar("bold")
    await toolbar("italic")
    await pickColor("color", 2)

    const saved = await savedHtml()
    await load(saved)
    assert.equal(await savedHtml(), saved)

    const inline = await mathAppearance("editor")
    const block = await mathAppearance("editor", "block")
    assert.ok(inline.weight >= 600 && inline.fontStyle === "italic")
    assert.ok(block.weight >= 600 && block.color !== baseColor)
  })
})

describe("typing", () => {
  async function typeInto(html, selector, text) {
    await load(html)
    await page.click(`lexxy-editor [contenteditable] ${selector}`)
    await page.keyboard.press("End")
    await page.keyboard.type(text)
    await page.waitForTimeout(150)
    return savedHtml()
  }

  test("$...$ converts while bold is on", async () => {
    await load("<p><br></p>")
    await page.click("lexxy-editor [contenteditable]")
    await press("ControlOrMeta+b")
    await page.keyboard.type("bold $a+b$ end")
    await page.waitForTimeout(150)
    assert.match(await savedHtml(), /data-math="a\+b"/)
  })

  test("$...$ converts at the end of a link", async () => {
    assert.match(await typeInto(`<p><a href="https://example.com">link</a></p>`, "a", " $z$"), /data-math="z"/)
  })

  test("`$a$` becomes inline code, not math", async () => {
    const html = await typeInto("<p><br></p>", "p", "`$a$` ")
    assert.ok(!html.includes("math-inline"), html)
    assert.match(html, /<code>(<[^>]+>)*\$a\$/)
  })

  test("code blocks, inline code and prices stay text", async () => {
    assert.ok(!(await typeInto(`<pre data-language="plain">price $5</pre>`, "code", " $x$")).includes("math-inline"))

    await load(`<p>costs $5 and $10 today</p><p><code>$a$</code></p>`)
    assert.ok(!(await savedHtml()).includes("math-inline"))
  })

  test("$$ + Enter opens the block editor", async () => {
    await typeInto("<p><br></p>", "p", "$$")
    await page.keyboard.press("Enter")
    await page.waitForTimeout(150)
    await page.keyboard.type("\\frac{1}{2}")
    await page.keyboard.press("Escape")
    await page.waitForTimeout(150)
    assert.match(await savedHtml(), /<div class="math-block" data-math="\\frac\{1\}\{2\}">/)
  })
})

test("no page errors", () => {
  assert.deepEqual(errors, [])
})
