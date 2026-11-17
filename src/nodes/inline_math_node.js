import { DecoratorNode } from "../lexxy.js"
import { createElement } from "../helpers/dom.js"
import { renderMath } from "../helpers/math_helper.js"
import { renderFormatted, styleFromDOM } from "../helpers/math_format.js"

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
                style: styleFromDOM(span)
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

    const content = this.__latex ? { html: renderMath(this.__latex) } : { text: "$\\ldots$" }
    return renderFormatted(span, this.__style, content)
  }

  // Returning true makes Lexical recreate the DOM through createDOM
  updateDOM(prevNode) {
    return this.__style !== prevNode.__style || this.__latex !== prevNode.__latex
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
    return { element: renderFormatted(span, this.__style, { text: `$${this.__latex}$` }) }
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
