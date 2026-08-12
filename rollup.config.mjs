import resolve from "@rollup/plugin-node-resolve"
import { cp, mkdir } from "node:fs/promises"

export default {
  input: "src/index.js",
  output: {
    file: "dist/lexxy-math.esm.js",
    format: "esm",
    sourcemap: true
  },
  external: [
    "@37signals/lexxy",
    "katex"
  ],
  plugins: [
    resolve(),
    copyStyles("styles", "dist/styles")
  ]
}

function copyStyles(source, destination) {
  return {
    name: "copy-styles",
    async writeBundle() {
      await mkdir(destination, { recursive: true })
      await cp(source, destination, { recursive: true })
    }
  }
}
