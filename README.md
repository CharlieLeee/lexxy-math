# @lexxy/math

KaTeX-based math rendering extension for [Lexxy](https://github.com/basecamp/lexxy). Adds inline (`$...$`) and block (`$$...$$`) math support with live preview editing.

## Installation

```bash
npm install @lexxy/math
```

**Peer dependencies:** `@37signals/lexxy`, `lexical`, `@lexical/utils`

## Usage

```js
import { configure } from "@37signals/lexxy"
import { MathExtension } from "@lexxy/math"

configure({
  global: { extensions: [MathExtension] },
  default: { math: true }
})
```

### Styles

Add the editor and content styles to your application:

```css
/* In your editor stylesheet */
@import "@lexxy/math/styles/math-editor.css";

/* In your content stylesheet */
@import "@lexxy/math/styles/math-content.css";
```

You also need KaTeX's CSS for rendering. Either import it from the `katex` package or load it from a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.33/dist/katex.min.css">
```

### Content rendering

To render math in non-editor content (e.g., displaying saved posts), use `renderContentMath`:

```js
import { renderContentMath } from "@lexxy/math"

// Render all math elements in the document
renderContentMath()

// Or within a specific container
renderContentMath(document.querySelector(".post-body"))
```

## Features

- **Inline math**: Type `$E=mc^2$` and it auto-converts to rendered math
- **Block math**: Type `$$` on an empty line and press Enter to create a display-mode math block
- **Click to edit**: Click any rendered math to open the editor with live KaTeX preview
- **Keyboard shortcuts**: Escape or Cmd+Enter to confirm, click outside to save

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

## License

MIT
