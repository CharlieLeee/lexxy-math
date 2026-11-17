import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import inject from "@rollup/plugin-inject"
import terser from "@rollup/plugin-terser"

export default {
  input: "demo/entry.js",
  output: {
    file: "docs/demo.js",
    format: "esm",
    inlineDynamicImports: true
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    inject({
      Prism: ["prismjs", "default"],
      include: "**/prismjs/components/**"
    }),
    terser()
  ]
}

