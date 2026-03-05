import { $createParagraphNode, $getNodeByKey, $getSelection, $getNearestNodeFromDOMNode, $isRangeSelection, $isParagraphNode, CLICK_COMMAND, COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_NORMAL, FORMAT_TEXT_COMMAND, TextNode, createCommand, defineExtension, isDOMNode, KEY_ENTER_COMMAND } from "lexical"
import { mergeRegister } from "@lexical/utils"
import { Extension, TOGGLE_HIGHLIGHT_COMMAND, REMOVE_HIGHLIGHT_COMMAND } from "@37signals/lexxy"
import { InlineMathNode, $isInlineMathNode } from "../nodes/inline_math_node"
import { BlockMathNode, $isBlockMathNode } from "../nodes/block_math_node"

export const INSERT_BLOCK_MATH_COMMAND = createCommand()
export const INSERT_INLINE_MATH_COMMAND = createCommand()
export const APPLY_MATH_STYLE_COMMAND = createCommand()

export const INLINE_MATH_REGEX = /(?:^|[^$])\$([^$\n]+)\$(?!\$)/

const MATH_STYLE_PROPERTIES = new Set([
  "color",
  "background-color",
  "font-size",
  "font-family",
  "font-style",
  "font-weight",
  "text-decoration"
])

export class MathExtension extends Extension {
  get enabled() {
    return this.editorElement.supportsRichText && this.editorConfig.get("math")
  }

  get lexicalExtension() {
    const editorElement = this.editorElement

    return defineExtension({
      name: "lexxy/math",
      nodes: [InlineMathNode, BlockMathNode],
      register(editor) {
        return mergeRegister(
          editor.registerNodeTransform(TextNode, $detectInlineMath),

          editor.registerCommand(KEY_ENTER_COMMAND, (event) => {
            return $handleBlockMathTrigger(editor, editorElement, event)
          }, COMMAND_PRIORITY_HIGH),

          editor.registerCommand(INSERT_BLOCK_MATH_COMMAND, () => {
            $insertBlockMath(editor, editorElement)
            return true
          }, COMMAND_PRIORITY_NORMAL),

          editor.registerCommand(INSERT_INLINE_MATH_COMMAND, () => (
            $insertInlineMath(editor), true
          ), COMMAND_PRIORITY_NORMAL),

          editor.registerCommand(FORMAT_TEXT_COMMAND, (formatType) => {
            return $handleMathFormatCommand(formatType)
          }, COMMAND_PRIORITY_HIGH),

          editor.registerCommand(TOGGLE_HIGHLIGHT_COMMAND, (styles) => {
            return $handleMathStyleCommand(styles, { toggle: true })
          }, COMMAND_PRIORITY_HIGH),

          editor.registerCommand(REMOVE_HIGHLIGHT_COMMAND, () => {
            return $handleMathStyleCommand({
              "color": null,
              "background-color": null
            })
          }, COMMAND_PRIORITY_HIGH),

          editor.registerCommand(APPLY_MATH_STYLE_COMMAND, (payload) => {
            return $handleApplyMathStyleCommand(payload)
          }, COMMAND_PRIORITY_NORMAL),

          editor.registerCommand(CLICK_COMMAND, ({ target }) => {
            return $handleMathClick(editor, editorElement, target)
          }, COMMAND_PRIORITY_NORMAL),
        )
      }
    })
  }
}

function $detectInlineMath(textNode) {
  const text = textNode.getTextContent()
  const match = INLINE_MATH_REGEX.exec(text)

  if (!match) return

  const latex = match[1]
  const matchStart = match[0].startsWith("$") ? match.index : match.index + 1
  const matchEnd = match.index + match[0].length

  let nodeToSplit = textNode
  let currentOffset = 0

  if (matchStart > 0) {
    const [before] = nodeToSplit.splitText(matchStart)
    nodeToSplit = before.getNextSibling()
    currentOffset = matchStart
  }

  const mathNode = new InlineMathNode({ latex })

  if (matchEnd < text.length) {
    const splitOffset = matchEnd - currentOffset
    const [mathText] = nodeToSplit.splitText(splitOffset)
    mathText.replace(mathNode)
  } else {
    nodeToSplit.replace(mathNode)
  }
}

function $handleBlockMathTrigger(editor, editorElement, event) {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false

  const anchorNode = selection.anchor.getNode()
  const topElement = anchorNode.getTopLevelElementOrThrow()
  if (!$isParagraphNode(topElement)) return false

  const text = topElement.getTextContent().trim()
  if (text !== "$$") return false

  event.preventDefault()

  const blockMathNode = new BlockMathNode({ latex: "" })

  let nextParagraph = topElement.getNextSibling()
  if (!nextParagraph || !$isParagraphNode(nextParagraph)) {
    nextParagraph = $createParagraphNode()
    topElement.insertAfter(nextParagraph)
  }

  // Move selection BEFORE replacing to avoid Lexical error #19
  nextParagraph.selectStart()
  topElement.replace(blockMathNode)

  const nodeKey = blockMathNode.getKey()

  requestAnimationFrame(() => {
    const targetElement = editor.getElementByKey(nodeKey)
    openMathEditor(editor, editorElement, nodeKey, "", true, targetElement)
  })

  return true
}

function $handleMathClick(editor, editorElement, target) {
  if (!isDOMNode(target)) return false

  const targetNode = $getNearestNodeFromDOMNode(target)
  if (!targetNode) return false

  if ($isBlockMathNode(targetNode)) {
    const nodeKey = targetNode.getKey()
    const latex = targetNode.getLatex()
    requestAnimationFrame(() => {
      const targetElement = editor.getElementByKey(nodeKey)
      openMathEditor(editor, editorElement, nodeKey, latex, true, targetElement)
    })
    return true
  }

  if ($isInlineMathNode(targetNode)) {
    const nodeKey = targetNode.getKey()
    const latex = targetNode.getLatex()
    requestAnimationFrame(() => {
      const targetElement = editor.getElementByKey(nodeKey)
      openMathEditor(editor, editorElement, nodeKey, latex, false, targetElement)
    })
    return true
  }

  return false
}

function $insertBlockMath(editor, editorElement) {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return

  const node = new BlockMathNode({ latex: "" })
  const anchorNode = selection.anchor.getNode()
  const topElement = anchorNode.getTopLevelElementOrThrow()

  if ($isParagraphNode(topElement) && topElement.isEmpty()) {
    topElement.replace(node)
  } else {
    topElement.insertAfter(node)
  }

  if (!node.getNextSibling()) {
    const paragraph = $createParagraphNode()
    node.insertAfter(paragraph)
  }

  requestAnimationFrame(() => {
    const targetElement = editor.getElementByKey(node.getKey())
    openMathEditor(editor, editorElement, node.getKey(), "", true, targetElement)
  })
}

function $insertInlineMath(editor) {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return false

  const node = new InlineMathNode({ latex: "" })
  selection.insertNodes([node])
  return true
}

function $handleMathFormatCommand(formatType) {
  const mathNodes = $getSelectedMathNodes()
  if (!mathNodes.length) return false

  if (formatType === "bold") {
    for (const node of mathNodes) {
      const styles = $parseStyle(node.getStyle())
      if ($isBoldWeight(styles["font-weight"])) {
        delete styles["font-weight"]
      } else {
        styles["font-weight"] = "bold"
      }
      node.setStyle($serializeStyle(styles))
    }
  } else if (formatType === "italic") {
    for (const node of mathNodes) {
      const styles = $parseStyle(node.getStyle())
      if ((styles["font-style"] || "").trim() === "italic") {
        delete styles["font-style"]
      } else {
        styles["font-style"] = "italic"
      }
      node.setStyle($serializeStyle(styles))
    }
  } else if (formatType === "underline" || formatType === "strikethrough") {
    const decoration = formatType === "underline" ? "underline" : "line-through"

    for (const node of mathNodes) {
      const styles = $parseStyle(node.getStyle())
      const nextTextDecoration = $toggleTextDecorationToken(styles["text-decoration"], decoration)

      if (nextTextDecoration) {
        styles["text-decoration"] = nextTextDecoration
      } else {
        delete styles["text-decoration"]
      }

      node.setStyle($serializeStyle(styles))
    }
  }

  return false
}

function $handleApplyMathStyleCommand(payload) {
  const patch = payload?.patch ?? payload
  const toggle = payload?.toggle === true

  return $handleMathStyleCommand(patch, { toggle })
}

function $handleMathStyleCommand(patch, { toggle = false } = {}) {
  const normalizedPatch = $normalizeMathStylePatch(patch)
  if (!normalizedPatch) return false

  const mathNodes = $getSelectedMathNodes()
  if (!mathNodes.length) return false

  for (const node of mathNodes) {
    const styles = $parseStyle(node.getStyle())

    for (const [property, value] of Object.entries(normalizedPatch)) {
      const previousValue = styles[property] || null
      const nextValue = toggle ? (previousValue === value ? null : value) : value

      if (nextValue) {
        styles[property] = nextValue
      } else {
        delete styles[property]
      }
    }

    node.setStyle($serializeStyle(styles))
  }

  return false
}

function $getSelectedMathNodes() {
  const selection = $getSelection()
  if (!selection) return []

  return selection.getNodes().filter((node) => $isInlineMathNode(node) || $isBlockMathNode(node))
}

function $normalizeMathStylePatch(patch) {
  if (!patch || typeof patch !== "object") return null

  const normalizedPatch = {}

  for (const [property, value] of Object.entries(patch)) {
    if (!MATH_STYLE_PROPERTIES.has(property)) continue

    if (value === null || value === undefined || value === "") {
      normalizedPatch[property] = null
    } else {
      normalizedPatch[property] = String(value)
    }
  }

  return Object.keys(normalizedPatch).length ? normalizedPatch : null
}

// Lightweight style parsing — avoids dependency on @lexical/selection
function $parseStyle(cssText) {
  const styles = {}
  if (!cssText) return styles

  for (const declaration of cssText.split(";")) {
    const colon = declaration.indexOf(":")
    if (colon === -1) continue

    const property = declaration.slice(0, colon).trim()
    const value = declaration.slice(colon + 1).trim()
    if (property && value) styles[property] = value
  }

  return styles
}

function $serializeStyle(styles) {
  return Object.entries(styles)
    .filter(([, value]) => value != null && value !== "")
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ")
}

function $toggleTextDecorationToken(currentValue, token) {
  const tokens = new Set(String(currentValue || "").split(/\s+/).filter(Boolean))

  if (tokens.has(token)) {
    tokens.delete(token)
  } else {
    tokens.add(token)
  }

  return Array.from(tokens).join(" ")
}

function $isBoldWeight(value) {
  if (!value) return false

  const normalized = String(value).trim().toLowerCase()
  if (normalized === "bold" || normalized === "bolder") return true

  const numeric = Number.parseInt(normalized, 10)
  return !Number.isNaN(numeric) && numeric >= 600
}

function openMathEditor(editor, editorElement, nodeKey, latex, displayMode, targetElement) {
  let mathEditor = editorElement.querySelector("lexxy-math-editor")
  if (!mathEditor) {
    mathEditor = document.createElement("lexxy-math-editor")
    editorElement.appendChild(mathEditor)
  }

  mathEditor.show(latex, targetElement, {
    displayMode,
    callback: (newLatex) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if (!node) return

        if (!newLatex) {
          if ($isBlockMathNode(node)) {
            const paragraph = $createParagraphNode()
            node.replace(paragraph)
            paragraph.selectStart()
          } else {
            node.remove()
          }
          return
        }

        node.setLatex(newLatex)
      })

      editor.focus()
    }
  })
}
