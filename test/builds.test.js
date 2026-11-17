import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const root = new URL("../", import.meta.url)

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8")
}

function bareImports(source) {
  return Array.from(source.matchAll(/^(?:import|export)\b[^;\n]*?\bfrom\s*["']([^"']+)["']/gm), match => match[1])
}

test("npm build keeps Lexxy and KaTeX external", async () => {
  const source = await read("dist/lexxy-math.esm.js")
  const imports = bareImports(source)

  assert.deepEqual(imports.sort(), ["@37signals/lexxy", "katex"])
  assert.match(source, /MathExtension/)
})

test("standalone build bundles KaTeX and only imports the gem's lexxy module", async () => {
  const source = await read("dist/lexxy-math.standalone.js")
  const imports = bareImports(source)

  assert.deepEqual(imports, ["lexxy"])
  assert.doesNotMatch(source, /@37signals\/lexxy|from\s+["']katex["']/)
  assert.ok(source.length > 100_000, "expected the standalone build to contain KaTeX")
})

test("package exports both supported builds", async () => {
  const packageJson = JSON.parse(await read("package.json"))

  assert.equal(packageJson.exports["."], "./dist/lexxy-math.esm.js")
  assert.equal(packageJson.exports["./standalone"], "./dist/lexxy-math.standalone.js")
  assert.equal(packageJson.peerDependencies["@37signals/lexxy"], ">=0.9.29 <1")
})

test("stylesheets are generated from the runtime styles", async () => {
  const { CONTENT_CSS, EDITOR_CSS } = await import("../src/helpers/styles.js")

  assert.equal(await read("dist/styles/math-content.css"), CONTENT_CSS.trimStart())
  assert.equal(await read("dist/styles/math-editor.css"), EDITOR_CSS.trimStart())
})
