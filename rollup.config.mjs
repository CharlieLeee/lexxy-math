import resolve from "@rollup/plugin-node-resolve"
import copy from "rollup-plugin-copy"

export default {
  input: "src/index.js",
  output: {
    file: "dist/lexxy-math.esm.js",
    format: "esm"
  },
  external: [
    "@37signals/lexxy",
    "katex"
  ],
  plugins: [
    resolve(),
    copy({
      targets: [
        { src: "styles/*", dest: "dist/styles" }
      ]
    })
  ]
}
