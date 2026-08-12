export { MathExtension, INSERT_BLOCK_MATH_COMMAND, INSERT_INLINE_MATH_COMMAND, APPLY_MATH_STYLE_COMMAND, INLINE_MATH_REGEX } from "./extensions/math_extension.js"
export { InlineMathNode, $isInlineMathNode } from "./nodes/inline_math_node.js"
export { BlockMathNode, $isBlockMathNode } from "./nodes/block_math_node.js"
export { renderMath } from "./helpers/math_helper.js"
export { renderContentMath } from "./helpers/math_content_helper.js"

import MathEditor from "./elements/math_editor.js"

if (typeof customElements !== "undefined" && !customElements.get("lexxy-math-editor")) {
  customElements.define("lexxy-math-editor", MathEditor)
}
