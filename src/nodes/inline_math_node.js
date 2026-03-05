import { DecoratorNode } from "@37signals/lexxy"
import { createElement } from "../helpers/dom"
import { renderMath } from "../helpers/math_helper"

export class InlineMathNode extends DecoratorNode {
  $config() {
    return this.config("inline_math", {
      $importJSON: (serialized) => new InlineMathNode({
        latex: serialized.latex,
        style: serialized.style
      }),
      importDOM: {
        span: (element) => {
          if (!element.classList.contains("math-inline") || !element.hasAttribute("data-math")) return null

          return {
            conversion: (span) => ({
              node: new InlineMathNode({
                latex: span.getAttribute("data-math"),
                style: span.getAttribute("style") || ""
              })
            }),
            priority: 2
          }
        }
      }
    })
  }

  constructor({ latex = "", style = "" } = {}, key) {
    super(key)
    this.__latex = latex
    this.__style = style
  }

  afterCloneFrom(prevNode) {
    super.afterCloneFrom(prevNode)
    this.__latex = prevNode.__latex
    this.__style = prevNode.__style
  }

  createDOM() {
    const span = createElement("span", {
      className: "lexxy-math-inline",
      "data-lexxy-decorator": true
    })

    if (this.__style) {
      span.style.cssText = this.__style
    }

    if (this.__latex) {
      span.innerHTML = renderMath(this.__latex)
    } else {
      span.textContent = "$\\ldots$"
    }

    return span
  }

  updateDOM(prevNode, dom) {
    const styleChanged = this.__style !== prevNode.__style
    const latexChanged = this.__latex !== prevNode.__latex
    if (!styleChanged && !latexChanged) return false

    if (styleChanged) {
      if (this.__style) {
        dom.style.cssText = this.__style
      } else {
        dom.removeAttribute("style")
      }
    }

    if (latexChanged) {
      if (this.__latex) {
        dom.innerHTML = renderMath(this.__latex)
      } else {
        dom.textContent = "$\\ldots$"
      }
    }

    return false
  }

  getTextContent() {
    return `$${this.__latex}$`
  }

  isInline() {
    return true
  }

  exportDOM() {
    const span = createElement("span", {
      className: "math-inline",
      "data-math": this.__latex
    })
    if (this.__style) {
      span.setAttribute("style", this.__style)
    }
    span.textContent = `$${this.__latex}$`
    return { element: span }
  }

  exportJSON() {
    return {
      type: "inline_math",
      version: 1,
      latex: this.__latex,
      style: this.__style
    }
  }

  getLatex() {
    return this.__latex
  }

  setLatex(latex) {
    const writable = this.getWritable()
    writable.__latex = latex
  }

  getStyle() {
    return this.__style
  }

  setStyle(style = "") {
    const writable = this.getWritable()
    writable.__style = style
  }

  decorate() {
    return null
  }
}

export function $isInlineMathNode(node) {
  return node instanceof InlineMathNode
}
