import {
  $createParagraphNode, $getNodeByKey, $getSelection, $getNearestNodeFromDOMNode,
  $isRangeSelection, $isParagraphNode, CLICK_COMMAND, COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL, FORMAT_TEXT_COMMAND, TextNode, createCommand,
  isDOMNode, $isTextNode, KEY_ENTER_COMMAND, mergeRegistrations, Extension
} from "../lexxy.js"
import { InlineMathNode, $isInlineMathNode } from "../nodes/inline_math_node.js"
import { BlockMathNode, $isBlockMathNode } from "../nodes/block_math_node.js"
import { parseStyle, serializeStyle, isMathFormat, hasMathFormat, setMathFormat } from "../helpers/math_format.js"
import { findInlineMath } from "../helpers/inline_math_syntax.js"

export const INSERT_BLOCK_MATH_COMMAND = createCommand()
export const INSERT_INLINE_MATH_COMMAND = createCommand()
export const APPLY_MATH_STYLE_COMMAND = createCommand()

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

    return this.defineExtension({
      name: "lexxy/math",
      nodes: [InlineMathNode, BlockMathNode],
      register(editor) {
        return mergeRegistrations(
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

          editor.registerCommand("toggleHighlight", (styles) => {
            return $handleMathStyleCommand(styles, { toggle: true })
          }, COMMAND_PRIORITY_HIGH),

          editor.registerCommand("clearFormatting", () => {
            $getSelectedMathNodes().forEach((node) => node.setStyle(""))
            return false
          }, COMMAND_PRIORITY_HIGH),

          editor.registerCommand("removeHighlight", () => {
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
  if (textNode.hasFormat("code")) return

  const match = findInlineMath(textNode.getTextContent())
  if (!match) return

  const parts = textNode.splitText(match.start, match.end)
  parts[match.start > 0 ? 1 : 0].replace(new InlineMathNode({ latex: match.latex }))
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

  const displayMode = $isBlockMathNode(targetNode)
  if (!displayMode && !$isInlineMathNode(targetNode)) return false

  const nodeKey = targetNode.getKey()
  const latex = targetNode.getLatex()
  requestAnimationFrame(() => {
    openMathEditor(editor, editorElement, nodeKey, latex, displayMode, editor.getElementByKey(nodeKey))
  })
  return true
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

// Mirrors Lexical's toggle: the first selected text node decides whether the format turns on or off.
function $handleMathFormatCommand(formatType) {
  if (!isMathFormat(formatType)) return false

  const mathNodes = $getSelectedMathNodes()
  if (!mathNodes.length) return false

  const firstTextNode = $getSelection().getNodes().find($isTextNode)
  const enabled = firstTextNode
    ? !firstTextNode.hasFormat(formatType)
    : !mathNodes.every((node) => hasMathFormat(node.getStyle(), formatType))

  mathNodes.forEach((node) => node.setStyle(setMathFormat(node.getStyle(), formatType, enabled)))
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
    const styles = parseStyle(node.getStyle())

    for (const [property, value] of Object.entries(normalizedPatch)) {
      const previousValue = styles[property] || null
      const nextValue = toggle ? (previousValue === value ? null : value) : value

      if (nextValue) {
        styles[property] = nextValue
      } else {
        delete styles[property]
      }
    }

    node.setStyle(serializeStyle(styles))
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
