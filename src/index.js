export { MathExtension, INSERT_BLOCK_MATH_COMMAND, INSERT_INLINE_MATH_COMMAND, APPLY_MATH_STYLE_COMMAND, INLINE_MATH_REGEX } from "./extensions/math_extension"
export { InlineMathNode, $isInlineMathNode } from "./nodes/inline_math_node"
export { BlockMathNode, $isBlockMathNode } from "./nodes/block_math_node"
export { renderMath } from "./helpers/math_helper"
export { renderContentMath } from "./helpers/math_content_helper"

import MathEditor from "./elements/math_editor"

if (!customElements.get("lexxy-math-editor")) {
  customElements.define("lexxy-math-editor", MathEditor)
}
