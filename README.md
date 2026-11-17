# lexxy-math

KaTeX-based math rendering for [Lexxy](https://github.com/basecamp/lexxy), with inline (`$...$`) and block (`$$...$$`) math, live preview editing, and support for both npm bundlers and Rails import maps.

**[Live demo](https://charlieleee.github.io/lexxy-math/)**

## Requirements

- Lexxy 0.9.29 or newer
- A modern browser with ES modules and custom elements

Lexxy 0.9.29 exposes the same Lexical instance used by its npm and gem builds. `lexxy-math` consumes that public instance, so custom math nodes remain compatible with the host editor without bundling a second copy of Lexical.

## npm installation

```bash
npm install lexxy-math @37signals/lexxy
```

```js
import { configure } from "@37signals/lexxy"
import { MathExtension } from "lexxy-math"

configure({
  global: { extensions: [MathExtension] },
  default: { math: true }
})
```

No custom alias or bundler configuration is required.

## Rails with importmap-rails

First update the `lexxy` gem to 0.9.29 or newer. Then vendor the standalone build, which includes KaTeX and imports only the gem-provided `"lexxy"` module:

```bash
curl --fail --location \
  "https://cdn.jsdelivr.net/npm/lexxy-math@1.3.0/dist/lexxy-math.standalone.js" \
  --output vendor/javascript/lexxy-math.js
```

Add the math pin alongside the pin installed by the Lexxy gem:

```ruby
# config/importmap.rb
pin "lexxy", to: "lexxy.js", preload: true
pin "lexxy-math", to: "lexxy-math.js"
```

Configure the extension from your application entry point:

```js
// app/javascript/application.js
import { configure } from "lexxy"
import { MathExtension } from "lexxy-math"

configure({
  global: { extensions: [MathExtension] },
  default: { math: true }
})
```

The standalone build is also exported as `lexxy-math/standalone` for tools that understand npm package exports.

## Styles

Editor and content styles are injected the first time math renders, in the editor or through `renderContentMath`. The matching KaTeX stylesheet is loaded from jsDelivr, so the default setup needs no CSS import.

For a strict Content Security Policy or an offline application, serve `katex/dist/katex.min.css` and its fonts locally. The default CDN request can then be blocked without affecting rendering.

## Content rendering

Saved Lexxy content keeps math as semantic elements with their LaTeX source in `data-math`. Text formats are saved as tags inside the math element, and colors as inline styles, so they pass Lexxy's sanitizer:

```html
<span class="math-inline" data-math="E=mc^2" style="color: var(--highlight-3)"><strong><em>$E=mc^2$</em></strong></span>
<div class="math-block" data-math="\int_0^1 x\,dx"><u>$$\int_0^1 x\,dx$$</u></div>
```

Render those elements outside the editor with `renderContentMath`:

```js
import { renderContentMath } from "lexxy-math"

renderContentMath() // the full document
renderContentMath(document.querySelector(".post-body")) // one container
```

## Features

- **Inline math:** type `$E=mc^2$` to convert it to rendered math. Prices like `$5 and $10`, escaped `\$`, inline code and code blocks stay text
- **Block math:** type `$$` in an empty paragraph and press Enter
- **Live editing:** click rendered math, then press Escape or Cmd/Ctrl+Enter to confirm
- **Formatting:** bold, italic, underline, strikethrough, text color, highlight, links, and clear formatting apply to selected math, in the editor and in rendered content
- **Static rendering:** render saved math inside any content container
- **Zero-config npm usage:** no source aliases or duplicate Lexical dependencies
- **Importmap build:** KaTeX is bundled; only the Lexxy gem's `"lexxy"` module remains external

## Exports

| Export | Description |
| --- | --- |
| `MathExtension` | Lexxy extension class |
| `InlineMathNode` | Lexical node for inline math |
| `BlockMathNode` | Lexical node for block math |
| `$isInlineMathNode(node)` | Inline math type guard |
| `$isBlockMathNode(node)` | Block math type guard |
| `renderMath(latex, options)` | KaTeX rendering wrapper |
| `renderContentMath(container)` | Render math in saved content |
| `INSERT_BLOCK_MATH_COMMAND` | Insert a block math node |
| `INSERT_INLINE_MATH_COMMAND` | Insert an inline math node |
| `APPLY_MATH_STYLE_COMMAND` | Apply styles to selected math nodes |
| `INLINE_MATH_REGEX` | Inline math detection expression |

## Package entry points

| Entry point | Intended environment |
| --- | --- |
| `lexxy-math` | npm, Bun, Vite, Rollup, esbuild, and other bundlers |
| `lexxy-math/standalone` | import maps; KaTeX bundled, `"lexxy"` external |
| `lexxy-math/styles/math-editor.css` | Optional editor stylesheet |
| `lexxy-math/styles/math-content.css` | Optional saved-content stylesheet |

## Development

```bash
npm run build       # dist/ builds and dist/styles/*.css
npm test            # unit and build tests
npm run test:e2e    # browser tests against the demo (npx playwright install chromium first)
npm run build:demo  # docs/demo.js for the GitHub Pages demo
```

Releases are published to npm by CI when a `v*` tag is pushed.

## License

MIT
