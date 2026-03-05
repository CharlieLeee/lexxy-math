# lexxy-math

KaTeX-based math rendering extension for [Lexxy](https://github.com/basecamp/lexxy). Adds inline (`$...$`) and block (`$$...$$`) math support with live preview editing.

## Installation

```bash
npm install lexxy-math
```

**Peer dependencies:** `@37signals/lexxy` (>= 0.8.0), `lexical`, `@lexical/utils`

## Usage

```js
import { configure } from "@37signals/lexxy"
import { MathExtension } from "lexxy-math"

configure({
  global: { extensions: [MathExtension] },
  default: { math: true }
})
```

That's it. All styles (KaTeX CSS + editor CSS) are auto-injected on first use — no manual CSS imports needed.

### Highlight & color support

To support highlight and font color on math nodes, Lexxy must export its highlight commands. Add the following exports to your Lexxy build's entry point:

```js
export { TOGGLE_HIGHLIGHT_COMMAND, REMOVE_HIGHLIGHT_COMMAND } from "./extensions/highlight_extension"
```

Once exported, `lexxy-math` will automatically intercept these commands and apply styles to selected math nodes.

### Content rendering

To render math in non-editor content (e.g., displaying saved posts), use `renderContentMath`:

```js
import { renderContentMath } from "lexxy-math"

// Render all math elements in the document
renderContentMath()

// Or within a specific container
renderContentMath(document.querySelector(".post-body"))
```

This finds all elements with `data-math` attributes and renders them with KaTeX.

### Rollup configuration

Since `lexxy-math` imports from `@37signals/lexxy`, you need to alias it to your local Lexxy source in your Rollup config:

```js
import alias from "@rollup/plugin-alias"
import path from "path"

export default {
  plugins: [
    alias({
      entries: [
        { find: "@37signals/lexxy", replacement: path.resolve("src/index.js") }
      ]
    }),
    // ... other plugins
  ]
}
```

## Features

- **Inline math**: Type `$E=mc^2$` and it auto-converts to rendered math
- **Block math**: Type `$$` on an empty line and press Enter to create a display-mode math block
- **Click to edit**: Click any rendered math to open the editor with live KaTeX preview
- **Keyboard shortcuts**: Escape or Cmd+Enter to confirm, click outside to save
- **Style inheritance**: Strikethrough, color, and highlight propagate into math nodes
- **Zero-config CSS**: KaTeX stylesheet and editor styles are auto-injected at runtime

## Exports

| Export | Description |
|--------|-------------|
| `MathExtension` | Lexxy extension class |
| `InlineMathNode` | Lexical node for inline math |
| `BlockMathNode` | Lexical node for block math |
| `$isInlineMathNode(node)` | Type guard |
| `$isBlockMathNode(node)` | Type guard |
| `renderMath(latex, options)` | KaTeX render wrapper |
| `renderContentMath(container)` | Render math in static content |
| `INSERT_BLOCK_MATH_COMMAND` | Lexical command |
| `INSERT_INLINE_MATH_COMMAND` | Lexical command |
| `APPLY_MATH_STYLE_COMMAND` | Lexical command for applying styles to math nodes |
| `INLINE_MATH_REGEX` | Regex used for inline math detection |

## License

MIT
