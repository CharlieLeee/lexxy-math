import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import terser from "@rollup/plugin-terser"

// Importmap build: bundle KaTeX, but use the Lexical instance exposed by the
// host `lexxy` gem. Bundling Lexical here would create incompatible node types.
export default {
  input: "src/index.js",
  output: {
    file: "dist/lexxy-math.standalone.js",
    format: "esm",
    sourcemap: true,
    paths: {
      "@37signals/lexxy": "lexxy"
    }
  },
  external: ["@37signals/lexxy"],
  plugins: [
    resolve(),
    commonjs(),
    terser()
  ]
}
