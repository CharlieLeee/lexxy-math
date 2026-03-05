import { DecoratorNode } from "lexical"
import { createElement } from "../helpers/dom"
import { renderMath } from "../helpers/math_helper"

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
                style: div.getAttribute("style") || ""
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
    if (this.__style) {
      figure.style.cssText = this.__style
    }

    const preview = createElement("div", { className: "lexxy-math-block__preview" })
    if (this.__latex) {
      preview.innerHTML = renderMath(this.__latex, { displayMode: true })
    } else {
      preview.textContent = "Click to add math formula"
      preview.classList.add("lexxy-math-block__preview--empty")
    }
    figure.appendChild(preview)

    const deleteButton = createElement("lexxy-node-delete-button")
    figure.appendChild(deleteButton)

    return figure
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

    if (!latexChanged) return false

    const preview = dom.querySelector(".lexxy-math-block__preview")
    if (!preview) return true

    if (this.__latex) {
      preview.classList.remove("lexxy-math-block__preview--empty")
      preview.innerHTML = renderMath(this.__latex, { displayMode: true })
    } else {
      preview.textContent = "Click to add math formula"
      preview.classList.add("lexxy-math-block__preview--empty")
    }

    return false
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
    if (this.__style) {
      div.setAttribute("style", this.__style)
    }
    div.textContent = `$$${this.__latex}$$`
    return { element: div }
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
