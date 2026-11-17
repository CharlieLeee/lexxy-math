import { configure } from "@37signals/lexxy"
import { MathExtension, renderContentMath } from "../src/index.js"

configure({
  global: { extensions: [MathExtension] },
  default: { math: true }
})

const editor = document.querySelector("lexxy-editor")
const rendered = document.querySelector("[data-output=rendered]")
const html = document.querySelector("[data-output=html]")
const text = document.querySelector("[data-output=text]")

function refresh() {
  const value = editor.value.trim()
  rendered.innerHTML = value
  renderContentMath(rendered)
  html.textContent = value.replace(/></g, ">\n<")
  text.textContent = editor.toString().trim()
}

function loadSample(name) {
  editor.value = document.getElementById(`sample-${name}`).innerHTML.trim()
  document.querySelectorAll("[data-sample]").forEach(button => {
    button.setAttribute("aria-pressed", button.dataset.sample === name)
  })
}

document.querySelectorAll("[data-sample]").forEach(button => {
  button.addEventListener("click", () => loadSample(button.dataset.sample))
})

editor.addEventListener("lexxy:change", refresh)
editor.addEventListener("lexxy:initialize", () => loadSample("default"))
