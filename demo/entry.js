import { configure } from "@37signals/lexxy"
import { MathExtension } from "../src/index.js"

configure({
  global: { extensions: [MathExtension] },
  default: { math: true }
})
