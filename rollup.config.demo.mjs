import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import inject from "@rollup/plugin-inject"
import terser from "@rollup/plugin-terser"
import { cp, mkdir } from "node:fs/promises"

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
    terser(),
    copyDemoStyles()
  ]
}

function copyDemoStyles() {
  return {
    name: "copy-demo-styles",
    async writeBundle() {
      await mkdir("docs/styles", { recursive: true })
      await cp("styles", "docs/styles", { recursive: true })
    }
  }
}
