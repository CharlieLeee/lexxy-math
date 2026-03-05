import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import copy from "rollup-plugin-copy"

// Standalone build that bundles katex but externalizes lexxy + lexical
// (lexxy's bundle already includes lexical)
export default {
  input: "src/index.js",
  output: {
    file: "dist/lexxy-math.standalone.js",
    format: "esm",
    paths: {
      "lexical": "lexxy",
      "@lexical/utils": "lexxy",
      "@37signals/lexxy": "lexxy"
    }
  },
  external: [
    "lexical",
    /^@lexical\//,
    "@37signals/lexxy"
  ],
  plugins: [
    resolve(),
    commonjs(),
    copy({
      targets: [
        { src: "styles/*", dest: "dist/styles" }
      ]
    })
  ]
}
