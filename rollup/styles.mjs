import { mkdir, writeFile } from "node:fs/promises"
import { CONTENT_CSS, EDITOR_CSS } from "../src/helpers/styles.js"

// Writes the optional standalone stylesheets from the same source the runtime injects.
export function writeStyles(destination) {
  return {
    name: "write-styles",
    async writeBundle() {
      await mkdir(destination, { recursive: true })
      await writeFile(`${destination}/math-content.css`, CONTENT_CSS.trimStart())
      await writeFile(`${destination}/math-editor.css`, EDITOR_CSS.trimStart())
    }
  }
}
