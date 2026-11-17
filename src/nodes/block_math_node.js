import { DecoratorNode } from "../lexxy.js"
import { createElement } from "../helpers/dom.js"
import { renderMath } from "../helpers/math_helper.js"
import { renderFormatted, styleFromDOM } from "../helpers/math_format.js"

export class BlockMathNode extends DecoratorNode {
  $config() {
    return this.config("block_math", {
      $importJSON: (serialized) => new BlockMathNode({
        latex: serialized.latex,
        style: serialized.style
      }),
      importDOM: {
        div: (element) => {
          if (!element.classList.contains("math-block") || !element.hasAttribute("data-math")) return null

          return {
            conversion: (div) => ({
              node: new BlockMathNode({
                latex: div.getAttribute("data-math"),
                style: styleFromDOM(div)
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
    const figure = createElement("figure", { className: "lexxy-math-block" })
    const preview = createElement("div", { className: "lexxy-math-block__preview" })

    if (this.__latex) {
      renderFormatted(preview, this.__style, { html: renderMath(this.__latex, { displayMode: true }) })
    } else {
      preview.textContent = "Click to add math formula"
      preview.classList.add("lexxy-math-block__preview--empty")
    }

    figure.append(preview, createElement("lexxy-node-delete-button"))
    return figure
  }

  // Returning true makes Lexical recreate the DOM through createDOM
  updateDOM(prevNode) {
    return this.__style !== prevNode.__style || this.__latex !== prevNode.__latex
  }

  getTextContent() {
    return `$$${this.__latex}$$\n\n`
  }

  isInline() {
    return false
  }

  exportDOM() {
    const div = createElement("div", {
      className: "math-block",
      "data-math": this.__latex
    })
    return { element: renderFormatted(div, this.__style, { text: `$$${this.__latex}$$` }) }
  }

  exportJSON() {
    return {
      type: "block_math",
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

export function $isBlockMathNode(node) {
  return node instanceof BlockMathNode
}
