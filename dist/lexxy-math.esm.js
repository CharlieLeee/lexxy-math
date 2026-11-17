import { Lexical, Extension } from '@37signals/lexxy';
import katex from 'katex';

// Lexxy exposes the exact Lexical instance used by both its npm and gem builds.
// Always consume that namespace so extensions do not load a second, incompatible
// copy of Lexical when they run through importmap-rails.
const {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  DecoratorNode,
  FORMAT_TEXT_COMMAND,
  isDOMNode,
  KEY_ENTER_COMMAND,
  TextNode,
  createCommand
} = Lexical;

function mergeRegistrations(...registrations) {
  return () => {
    for (const unregister of registrations) unregister();
  }
}

function createElement(name, properties, content = "") {
  const element = document.createElement(name);
  for (const [key, value] of Object.entries(properties || {})) {
    if (key in element) {
      element[key] = value;
    } else if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }
  if (content) {
    element.innerHTML = content;
  }
  return element
}

// Single source for the package styles: injected at runtime and written to
// dist/styles/*.css by the build (see rollup/styles.mjs).

const KATEX_CSS_URL = "https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.css";

const CONTENT_CSS = `
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
`;

const EDITOR_CSS = `
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
`;

let injected = false;

function injectStyles() {
  if (injected || typeof document === "undefined") return
  injected = true;

  // Pages that serve KaTeX's CSS themselves mark it with data-lexxy-math-katex
  if (!document.querySelector("[data-lexxy-math-katex]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = KATEX_CSS_URL;
    document.head.appendChild(link);
  }

  const style = document.createElement("style");
  style.textContent = CONTENT_CSS + EDITOR_CSS;
  document.head.appendChild(style);
}

function renderMath(latex, { displayMode = false } = {}) {
  injectStyles();

  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return `<span class="lexxy-math-error">${escapeHtml(latex)}</span>`
  }
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (ch) => map[ch])
}

// Text formats on math nodes are stored in the node's style, but Lexxy's sanitizer
// only keeps color and background-color, so the editor and the saved HTML render
// them as semantic tags (<strong>, <em>, <s>, <u>) inside the math element.

const FORMATS = [
  { name: "bold", tag: "strong", tags: ["STRONG", "B"], has: (s) => isBoldWeight(s["font-weight"]), set: (s) => { s["font-weight"] = "bold"; }, clear: (s) => { delete s["font-weight"]; } },
  { name: "italic", tag: "em", tags: ["EM", "I"], has: (s) => s["font-style"] === "italic", set: (s) => { s["font-style"] = "italic"; }, clear: (s) => { delete s["font-style"]; } },
  { name: "strikethrough", tag: "s", tags: ["S", "DEL", "STRIKE"], has: (s) => hasDecoration(s, "line-through"), set: (s) => addDecoration(s, "line-through"), clear: (s) => removeDecoration(s, "line-through") },
  { name: "underline", tag: "u", tags: ["U", "INS"], has: (s) => hasDecoration(s, "underline"), set: (s) => addDecoration(s, "underline"), clear: (s) => removeDecoration(s, "underline") }
];

const FORMAT_TAG_NAMES = new Set(FORMATS.flatMap((format) => format.tags));
const INLINE_ANCESTOR_TAG_NAMES = new Set([...FORMAT_TAG_NAMES, "A", "SPAN", "MARK"]);

function parseStyle(cssText) {
  const styles = {};
  if (!cssText) return styles

  for (const declaration of cssText.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue

    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (property && value) styles[property] = value;
  }

  return styles
}

function serializeStyle(styles) {
  return Object.entries(styles)
    .filter(([, value]) => value != null && value !== "")
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ")
}

function isMathFormat(name) {
  return FORMATS.some((format) => format.name === name)
}

function hasMathFormat(style, name) {
  return FORMATS.find((format) => format.name === name).has(parseStyle(style))
}

function setMathFormat(style, name, enabled) {
  const styles = parseStyle(style);
  const format = FORMATS.find((format) => format.name === name);
  enabled ? format.set(styles) : format.clear(styles);
  return serializeStyle(styles)
}

function isBoldWeight(value) {
  if (!value) return false

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "bold" || normalized === "bolder") return true

  const numeric = Number.parseInt(normalized, 10);
  return !Number.isNaN(numeric) && numeric >= 600
}

function toggleTextDecorationToken(currentValue, token) {
  const tokens = decorationTokens(currentValue);
  tokens.has(token) ? tokens.delete(token) : tokens.add(token);
  return Array.from(tokens).join(" ")
}

// Renders `element > strong > em > s > u > content` and keeps the other styles on element.
// The editor DOM and the saved HTML both use it, so they share one structure.
function renderFormatted(element, style, { html, text }) {
  const styles = parseStyle(style);
  let target = element;

  for (const format of FORMATS) {
    if (!format.has(styles)) continue

    format.clear(styles);
    target = target.appendChild(document.createElement(format.tag));
  }

  if (html === undefined) {
    target.textContent = text;
  } else {
    target.innerHTML = html;
  }

  const remaining = serializeStyle(styles);
  if (remaining) element.setAttribute("style", remaining);

  return element
}

// Import: merges the element's own style with format tags inside it and inline ancestors around it.
function styleFromDOM(element) {
  const styles = parseStyle(element.getAttribute("style"));
  const tagNames = new Set();

  element.querySelectorAll("*").forEach((child) => tagNames.add(child.tagName));
  for (let ancestor = element.parentElement; ancestor && INLINE_ANCESTOR_TAG_NAMES.has(ancestor.tagName); ancestor = ancestor.parentElement) {
    if (ancestor.tagName === "B" && ancestor.style.fontWeight === "normal") continue
    tagNames.add(ancestor.tagName);
  }

  for (const format of FORMATS) {
    if (format.tags.some((tagName) => tagNames.has(tagName))) format.set(styles);
  }

  return serializeStyle(styles)
}

// Content rendering: descend through the format tags written by renderFormatted.
function formattedContentTarget(element) {
  let target = element;
  while (target.children?.length === 1 && FORMAT_TAG_NAMES.has(target.firstElementChild.tagName)) {
    target = target.firstElementChild;
  }
  return target
}

function decorationTokens(value) {
  return new Set(String(value || "").split(/\s+/).filter(Boolean))
}

function hasDecoration(styles, token) {
  return decorationTokens(styles["text-decoration"]).has(token)
}

function addDecoration(styles, token) {
  if (!hasDecoration(styles, token)) styles["text-decoration"] = toggleTextDecorationToken(styles["text-decoration"], token);
}

function removeDecoration(styles, token) {
  if (!hasDecoration(styles, token)) return

  const next = toggleTextDecorationToken(styles["text-decoration"], token);
  next ? styles["text-decoration"] = next : delete styles["text-decoration"];
}

class InlineMathNode extends DecoratorNode {
  $config() {
    return this.config("inline_math", {
      $importJSON: (serialized) => new InlineMathNode({
        latex: serialized.latex,
        style: serialized.style
      }),
      importDOM: {
        span: (element) => {
          if (!element.classList.contains("math-inline") || !element.hasAttribute("data-math")) return null

          return {
            conversion: (span) => ({
              node: new InlineMathNode({
                latex: span.getAttribute("data-math"),
                style: styleFromDOM(span)
              })
            }),
            priority: 2
          }
        }
      }
    })
  }

  constructor({ latex = "", style = "" } = {}, key) {
    super(key);
    this.__latex = latex;
    this.__style = style;
  }

  afterCloneFrom(prevNode) {
    super.afterCloneFrom(prevNode);
    this.__latex = prevNode.__latex;
    this.__style = prevNode.__style;
  }

  createDOM() {
    const span = createElement("span", {
      className: "lexxy-math-inline",
      "data-lexxy-decorator": true
    });

    const content = this.__latex ? { html: renderMath(this.__latex) } : { text: "$\\ldots$" };
    return renderFormatted(span, this.__style, content)
  }

  // Returning true makes Lexical recreate the DOM through createDOM
  updateDOM(prevNode) {
    return this.__style !== prevNode.__style || this.__latex !== prevNode.__latex
  }

  getTextContent() {
    return `$${this.__latex}$`
  }

  isInline() {
    return true
  }

  exportDOM() {
    const span = createElement("span", {
      className: "math-inline",
      "data-math": this.__latex
    });
    return { element: renderFormatted(span, this.__style, { text: `$${this.__latex}$` }) }
  }

  exportJSON() {
    return {
      type: "inline_math",
      version: 1,
      latex: this.__latex,
      style: this.__style
    }
  }

  getLatex() {
    return this.__latex
  }

  setLatex(latex) {
    const writable = this.getWritable();
    writable.__latex = latex;
  }

  getStyle() {
    return this.__style
  }

  setStyle(style = "") {
    const writable = this.getWritable();
    writable.__style = style;
  }

  decorate() {
    return null
  }
}

function $isInlineMathNode(node) {
  return node instanceof InlineMathNode
}

class BlockMathNode extends DecoratorNode {
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
    super(key);
    this.__latex = latex;
    this.__style = style;
  }

  afterCloneFrom(prevNode) {
    super.afterCloneFrom(prevNode);
    this.__latex = prevNode.__latex;
    this.__style = prevNode.__style;
  }

  createDOM() {
    const figure = createElement("figure", { className: "lexxy-math-block" });
    const preview = createElement("div", { className: "lexxy-math-block__preview" });

    if (this.__latex) {
      renderFormatted(preview, this.__style, { html: renderMath(this.__latex, { displayMode: true }) });
    } else {
      preview.textContent = "Click to add math formula";
      preview.classList.add("lexxy-math-block__preview--empty");
    }

    figure.append(preview, createElement("lexxy-node-delete-button"));
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
    });
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
    const writable = this.getWritable();
    writable.__latex = latex;
  }

  getStyle() {
    return this.__style
  }

  setStyle(style = "") {
    const writable = this.getWritable();
    writable.__style = style;
  }

  decorate() {
    return null
  }
}

function $isBlockMathNode(node) {
  return node instanceof BlockMathNode
}

// Pandoc rules: no space just inside the dollars, no escaped dollar, and no digit right
// after the closing one, so prices like "$5 and $10" stay text.
const INLINE_MATH_REGEX = /(?:^|[^$\\])\$([^\s$](?:[^$\n]*[^\s$\\])?)\$(?![$\d])/;
const DISPLAY_MATH_REGEX = /(?:^|[^\\])\$\$([^$]+?)\$\$/;

// Returns the first inline formula in text as { latex, start, end }, or null.
function findInlineMath(text) {
  const match = INLINE_MATH_REGEX.exec(text);
  if (!match) return null

  const start = match[0].startsWith("$") ? match.index : match.index + 1;
  if (isInsideOpenBacktick(text, start)) return null

  return { latex: match[1], start, end: match.index + match[0].length }
}

// Returns the first $$display$$ or $inline$ formula in text as { latex, start, end, displayMode }, or null.
function findMath(text) {
  const inline = findInlineMath(text);
  const match = DISPLAY_MATH_REGEX.exec(text);
  const display = match && {
    latex: match[1].trim(),
    start: match[0].startsWith("$") ? match.index : match.index + 1,
    end: match.index + match[0].length,
    displayMode: true
  };

  if (display && (!inline || display.start <= inline.start)) return display
  return inline && { ...inline, displayMode: false }
}

// Typing `$x$` should become inline code, not math inside backticks.
function isInsideOpenBacktick(text, index) {
  return (text.slice(0, index).match(/`/g) || []).length % 2 === 1
}

const INSERT_BLOCK_MATH_COMMAND = createCommand();
const INSERT_INLINE_MATH_COMMAND = createCommand();
const APPLY_MATH_STYLE_COMMAND = createCommand();

const MATH_STYLE_PROPERTIES = new Set([
  "color",
  "background-color",
  "font-size",
  "font-family",
  "font-style",
  "font-weight",
  "text-decoration"
]);

class MathExtension extends Extension {
  get enabled() {
    return this.editorElement.supportsRichText && this.editorConfig.get("math")
  }

  get lexicalExtension() {
    const editorElement = this.editorElement;

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
            $insertBlockMath(editor, editorElement);
            return true
          }, COMMAND_PRIORITY_NORMAL),

          editor.registerCommand(INSERT_INLINE_MATH_COMMAND, () => (
            $insertInlineMath(), true
          ), COMMAND_PRIORITY_NORMAL),

          editor.registerCommand(FORMAT_TEXT_COMMAND, (formatType) => {
            return $handleMathFormatCommand(formatType)
          }, COMMAND_PRIORITY_HIGH),

          editor.registerCommand("toggleHighlight", (styles) => {
            return $handleMathStyleCommand(styles, { toggle: true })
          }, COMMAND_PRIORITY_HIGH),

          editor.registerCommand("clearFormatting", () => {
            $getSelectedMathNodes().forEach((node) => node.setStyle(""));
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

  const match = findInlineMath(textNode.getTextContent());
  if (!match) return

  const parts = textNode.splitText(match.start, match.end);
  parts[match.start > 0 ? 1 : 0].replace(new InlineMathNode({ latex: match.latex }));
}

function $handleBlockMathTrigger(editor, editorElement, event) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false

  const anchorNode = selection.anchor.getNode();
  const topElement = anchorNode.getTopLevelElementOrThrow();
  if (!$isParagraphNode(topElement)) return false

  const text = topElement.getTextContent().trim();
  if (text !== "$$") return false

  event.preventDefault();

  const blockMathNode = new BlockMathNode({ latex: "" });

  let nextParagraph = topElement.getNextSibling();
  if (!nextParagraph || !$isParagraphNode(nextParagraph)) {
    nextParagraph = $createParagraphNode();
    topElement.insertAfter(nextParagraph);
  }

  // Move selection BEFORE replacing to avoid Lexical error #19
  nextParagraph.selectStart();
  topElement.replace(blockMathNode);

  const nodeKey = blockMathNode.getKey();

  requestAnimationFrame(() => {
    const targetElement = editor.getElementByKey(nodeKey);
    openMathEditor(editor, editorElement, nodeKey, "", true, targetElement);
  });

  return true
}

function $handleMathClick(editor, editorElement, target) {
  if (!isDOMNode(target)) return false

  const targetNode = $getNearestNodeFromDOMNode(target);
  if (!targetNode) return false

  const displayMode = $isBlockMathNode(targetNode);
  if (!displayMode && !$isInlineMathNode(targetNode)) return false

  const nodeKey = targetNode.getKey();
  const latex = targetNode.getLatex();
  requestAnimationFrame(() => {
    openMathEditor(editor, editorElement, nodeKey, latex, displayMode, editor.getElementByKey(nodeKey));
  });
  return true
}

function $insertBlockMath(editor, editorElement) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return

  const node = new BlockMathNode({ latex: "" });
  const anchorNode = selection.anchor.getNode();
  const topElement = anchorNode.getTopLevelElementOrThrow();

  if ($isParagraphNode(topElement) && topElement.isEmpty()) {
    topElement.replace(node);
  } else {
    topElement.insertAfter(node);
  }

  if (!node.getNextSibling()) {
    const paragraph = $createParagraphNode();
    node.insertAfter(paragraph);
  }

  requestAnimationFrame(() => {
    const targetElement = editor.getElementByKey(node.getKey());
    openMathEditor(editor, editorElement, node.getKey(), "", true, targetElement);
  });
}

function $insertInlineMath(editor) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false

  const node = new InlineMathNode({ latex: "" });
  selection.insertNodes([node]);
  return true
}

// Mirrors Lexical's toggle: the first selected text node decides whether the format turns on or off.
function $handleMathFormatCommand(formatType) {
  if (!isMathFormat(formatType)) return false

  const mathNodes = $getSelectedMathNodes();
  if (!mathNodes.length) return false

  const firstTextNode = $getSelection().getNodes().find($isTextNode);
  const enabled = firstTextNode
    ? !firstTextNode.hasFormat(formatType)
    : !mathNodes.every((node) => hasMathFormat(node.getStyle(), formatType));

  mathNodes.forEach((node) => node.setStyle(setMathFormat(node.getStyle(), formatType, enabled)));
  return false
}

function $handleApplyMathStyleCommand(payload) {
  const patch = payload?.patch ?? payload;
  const toggle = payload?.toggle === true;

  return $handleMathStyleCommand(patch, { toggle })
}

function $handleMathStyleCommand(patch, { toggle = false } = {}) {
  const normalizedPatch = $normalizeMathStylePatch(patch);
  if (!normalizedPatch) return false

  const mathNodes = $getSelectedMathNodes();
  if (!mathNodes.length) return false

  for (const node of mathNodes) {
    const styles = parseStyle(node.getStyle());

    for (const [property, value] of Object.entries(normalizedPatch)) {
      const previousValue = styles[property] || null;
      const nextValue = toggle ? (previousValue === value ? null : value) : value;

      if (nextValue) {
        styles[property] = nextValue;
      } else {
        delete styles[property];
      }
    }

    node.setStyle(serializeStyle(styles));
  }

  return false
}

function $getSelectedMathNodes() {
  const selection = $getSelection();
  if (!selection) return []

  return selection.getNodes().filter((node) => $isInlineMathNode(node) || $isBlockMathNode(node))
}

function $normalizeMathStylePatch(patch) {
  if (!patch || typeof patch !== "object") return null

  const normalizedPatch = {};

  for (const [property, value] of Object.entries(patch)) {
    if (!MATH_STYLE_PROPERTIES.has(property)) continue

    if (value === null || value === undefined || value === "") {
      normalizedPatch[property] = null;
    } else {
      normalizedPatch[property] = String(value);
    }
  }

  return Object.keys(normalizedPatch).length ? normalizedPatch : null
}

function openMathEditor(editor, editorElement, nodeKey, latex, displayMode, targetElement) {
  let mathEditor = editorElement.querySelector("lexxy-math-editor");
  if (!mathEditor) {
    mathEditor = document.createElement("lexxy-math-editor");
    editorElement.appendChild(mathEditor);
  }

  mathEditor.show(latex, targetElement, {
    displayMode,
    callback: (newLatex) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (!node) return

        if (!newLatex) {
          if ($isBlockMathNode(node)) {
            const paragraph = $createParagraphNode();
            node.replace(paragraph);
            paragraph.selectStart();
          } else {
            node.remove();
          }
          return
        }

        node.setLatex(newLatex);
      });

      editor.focus();
    }
  });
}

function renderContentMath(container = document) {
  container.querySelectorAll(".math-inline[data-math], .math-block[data-math]").forEach(element => {
    const latex = element.getAttribute("data-math");
    if (!latex) return

    const displayMode = element.classList.contains("math-block");
    formattedContentTarget(element).innerHTML = renderMath(latex, { displayMode });
  });
}

const SKIPPED = "code, pre, script, style, textarea, [contenteditable], lexxy-editor, .katex, .math-inline, .math-block";

// Renders math written as plain $...$ and $$...$$ text, e.g. in content saved without
// lexxy-math or by a server that strips data-math. Uses the same rules as the editor.
function renderTextMath(container = document.body) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => node.nodeValue.includes("$") && !node.parentElement?.closest(SKIPPED)
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(renderTextNode);
}

function renderTextNode(node) {
  const fragment = document.createDocumentFragment();
  let text = node.nodeValue;
  let match;

  while ((match = findMath(text))) {
    fragment.append(text.slice(0, match.start), mathElement(match));
    text = text.slice(match.end);
  }

  if (text === node.nodeValue) return

  fragment.append(text);
  node.replaceWith(fragment);
}

function mathElement({ latex, displayMode }) {
  const element = document.createElement("span");
  element.className = displayMode ? "math-block" : "math-inline";
  element.dataset.math = latex;
  element.innerHTML = renderMath(latex, { displayMode });
  return element
}

const HTMLElementBase = globalThis.HTMLElement || class {};

class MathEditor extends HTMLElementBase {
  #callback = null
  #displayMode = false
  #handleOutsideClick = null

  connectedCallback() {
    if (!this.#input) this.#buildUI();
    this.hidden = true;
  }

  disconnectedCallback() {
    this.hide();
  }

  show(latex, targetElement, { displayMode = false, callback }) {
    this.#callback = callback;
    this.#displayMode = displayMode;
    this.hidden = false;

    this.#input.value = latex || "";
    this.#renderPreview();
    this.#positionNear(targetElement);

    requestAnimationFrame(() => this.#input.focus());

    if (this.#handleOutsideClick) {
      document.removeEventListener("mousedown", this.#handleOutsideClick, true);
    }
    this.#handleOutsideClick = (event) => {
      if (!this.contains(event.target)) {
        this.#confirm();
      }
    };
    document.addEventListener("mousedown", this.#handleOutsideClick, true);
  }

  hide() {
    this.hidden = true;
    document.removeEventListener("mousedown", this.#handleOutsideClick, true);
    this.#handleOutsideClick = null;
  }

  get #input() {
    return this.querySelector(".lexxy-math-editor__input")
  }

  get #preview() {
    return this.querySelector(".lexxy-math-editor__preview")
  }

  #buildUI() {
    const input = createElement("textarea", {
      className: "lexxy-math-editor__input",
      placeholder: "Type LaTeX...",
      rows: 2
    });
    input.addEventListener("input", () => this.#renderPreview());
    input.addEventListener("keydown", (event) => this.#handleKeydown(event));

    const preview = createElement("div", { className: "lexxy-math-editor__preview" });

    this.appendChild(input);
    this.appendChild(preview);
  }

  #renderPreview() {
    const latex = this.#input.value.trim();
    if (latex) {
      this.#preview.innerHTML = renderMath(latex, { displayMode: this.#displayMode });
    } else {
      this.#preview.textContent = "";
    }
  }

  #handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.#confirm();
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();
      this.#confirm();
    }
  }

  #confirm() {
    const latex = this.#input.value.trim();
    this.hide();
    if (this.#callback) {
      this.#callback(latex);
      this.#callback = null;
    }
  }

  #positionNear(targetElement) {
    if (!targetElement) return

    const rect = targetElement.getBoundingClientRect();
    const editorRect = this.closest("lexxy-editor")?.getBoundingClientRect();

    if (editorRect) {
      this.style.top = `${rect.bottom - editorRect.top + 4}px`;
      this.style.left = `${rect.left - editorRect.left}px`;
    }
  }
}

if (typeof customElements !== "undefined" && !customElements.get("lexxy-math-editor")) {
  customElements.define("lexxy-math-editor", MathEditor);
}

export { $isBlockMathNode, $isInlineMathNode, APPLY_MATH_STYLE_COMMAND, BlockMathNode, INLINE_MATH_REGEX, INSERT_BLOCK_MATH_COMMAND, INSERT_INLINE_MATH_COMMAND, InlineMathNode, MathExtension, renderContentMath, renderMath, renderTextMath };
//# sourceMappingURL=lexxy-math.esm.js.map
