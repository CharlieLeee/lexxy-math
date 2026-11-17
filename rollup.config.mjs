import resolve from "@rollup/plugin-node-resolve"
import { writeStyles } from "./rollup/styles.mjs"

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
    writeStyles("dist/styles")
  ]
}
