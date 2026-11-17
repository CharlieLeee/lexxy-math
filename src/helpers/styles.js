// Single source for the package styles: injected at runtime and written to
// dist/styles/*.css by the build (see rollup/styles.mjs).

export const KATEX_CSS_URL = "https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.css"

export const CONTENT_CSS = `
/* Math in rendered content */
.math-inline {
  display: inline;
}

.math-block {
  display: flex;
  justify-content: center;
  margin: 1em 0;
  overflow-x: auto;
}

/* KaTeX resets fonts on .katex; let <strong> and <em> around the formula reach it */
:is(.math-inline, .math-block, .lexxy-math-inline, .lexxy-math-block__preview) :is(.katex-display, .katex, .katex-html, .katex-base) {
  font-weight: inherit;
  font-style: inherit;
}

/* KaTeX lays glyphs out in inline blocks, which text-decoration skips, so underline,
   strikethrough and link underlines are drawn once across the whole formula */
:is(.math-inline, .math-block, .lexxy-math-inline, .lexxy-math-block__preview) :is(u, s) {
  text-decoration: none;
}

:is(.math-inline, .math-block, .lexxy-math-inline, .lexxy-math-block__preview) :is(u, s) .katex,
a > :is(.math-inline, .lexxy-math-inline) .katex {
  position: relative;
}

:is(.math-inline, .math-block, .lexxy-math-inline, .lexxy-math-block__preview) :is(u, s) .katex-display > .katex {
  display: inline-block;
}

:is(.math-inline, .math-block, .lexxy-math-inline, .lexxy-math-block__preview) u .katex::after,
a > :is(.math-inline, .lexxy-math-inline) .katex::after,
:is(.math-inline, .math-block, .lexxy-math-inline, .lexxy-math-block__preview) s .katex::before {
  border-block-start: 0.06em solid currentColor;
  content: "";
  inset-inline: 0;
  pointer-events: none;
  position: absolute;
}

:is(.math-inline, .math-block, .lexxy-math-inline, .lexxy-math-block__preview) u .katex::after,
a > :is(.math-inline, .lexxy-math-inline) .katex::after {
  bottom: 0;
}

:is(.math-inline, .math-block, .lexxy-math-inline, .lexxy-math-block__preview) s .katex::before {
  top: 50%;
}
`

export const EDITOR_CSS = `
/* Inline math */
.lexxy-math-inline {
  cursor: pointer;
  border-radius: var(--lexxy-radius);
  padding: 0 0.25ch;
}

.lexxy-math-inline:hover {
  background: var(--lexxy-color-ink-lightest);
}

/* Block math */
.lexxy-math-block {
  cursor: pointer;
  margin: 0;
  padding: 1em;
  position: relative;
  text-align: center;
}

.lexxy-math-block:hover {
  background: var(--lexxy-color-ink-lightest);
  border-radius: var(--lexxy-radius);
}

.lexxy-math-block__preview--empty {
  color: var(--lexxy-color-ink-medium);
  font-style: italic;
}

/* Math error */
.lexxy-math-error {
  color: var(--lexxy-color-red);
  font-family: var(--lexxy-font-mono);
  font-size: 0.9em;
}

/* Math editor panel */
:where(lexxy-math-editor) {
  background-color: var(--lexxy-color-canvas);
  border: 2px solid var(--lexxy-color-selected-hover);
  border-radius: calc(var(--lexxy-radius) + 2px);
  box-shadow: var(--lexxy-shadow);
  display: flex;
  flex-direction: column;
  gap: 0.5ch;
  padding: 1ch;
  position: absolute;
  z-index: 3;
  min-inline-size: 20ch;
  max-inline-size: calc(100% - 2ch);
}

:where(lexxy-math-editor)[hidden] {
  display: none;
}

.lexxy-math-editor__input {
  background-color: var(--lexxy-color-ink-lightest);
  border: 1px solid var(--lexxy-color-ink-lighter);
  border-radius: var(--lexxy-radius);
  color: var(--lexxy-color-ink);
  font-family: var(--lexxy-font-mono);
  font-size: 0.9em;
  padding: 1ch;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
}

.lexxy-math-editor__input:focus {
  outline: var(--lexxy-focus-ring-size) solid var(--lexxy-focus-ring-color);
  outline-offset: var(--lexxy-focus-ring-offset);
}

.lexxy-math-editor__preview {
  min-block-size: 2em;
  overflow-x: auto;
  padding: 0.5ch;
  text-align: center;
}
`

let injected = false

export function injectStyles() {
  if (injected || typeof document === "undefined") return
  injected = true

  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = KATEX_CSS_URL
  document.head.appendChild(link)

  const style = document.createElement("style")
  style.textContent = CONTENT_CSS + EDITOR_CSS
  document.head.appendChild(style)
}
