import { DecoratorNode, createCommand, defineExtension, TextNode, KEY_ENTER_COMMAND, COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_NORMAL, FORMAT_TEXT_COMMAND, CLICK_COMMAND, $getSelection, $isRangeSelection, $isParagraphNode, $createParagraphNode, isDOMNode, $getNearestNodeFromDOMNode, $getNodeByKey } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { Extension } from '@37signals/lexxy';
import katex from 'katex';

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

function renderMath(latex, { displayMode = false } = {}) {
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
                style: span.getAttribute("style") || ""
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

    if (this.__style) {
      span.style.cssText = this.__style;
    }

    if (this.__latex) {
      span.innerHTML = renderMath(this.__latex);
    } else {
      span.textContent = "$\\ldots$";
    }

    return span
  }

  updateDOM(prevNode, dom) {
    const styleChanged = this.__style !== prevNode.__style;
    const latexChanged = this.__latex !== prevNode.__latex;
    if (!styleChanged && !latexChanged) return false

    if (styleChanged) {
      if (this.__style) {
        dom.style.cssText = this.__style;
      } else {
        dom.removeAttribute("style");
      }
    }

    if (latexChanged) {
      if (this.__latex) {
        dom.innerHTML = renderMath(this.__latex);
      } else {
        dom.textContent = "$\\ldots$";
      }
    }

    return false
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
    if (this.__style) {
      span.setAttribute("style", this.__style);
    }
    span.textContent = `$${this.__latex}$`;
    return { element: span }
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
    if (this.__style) {
      figure.style.cssText = this.__style;
    }

    const preview = createElement("div", { className: "lexxy-math-block__preview" });
    if (this.__latex) {
      preview.innerHTML = renderMath(this.__latex, { displayMode: true });
    } else {
      preview.textContent = "Click to add math formula";
      preview.classList.add("lexxy-math-block__preview--empty");
    }
    figure.appendChild(preview);

    const deleteButton = createElement("lexxy-node-delete-button");
    figure.appendChild(deleteButton);

    return figure
  }

  updateDOM(prevNode, dom) {
    const styleChanged = this.__style !== prevNode.__style;
    const latexChanged = this.__latex !== prevNode.__latex;
    if (!styleChanged && !latexChanged) return false

    if (styleChanged) {
      if (this.__style) {
        dom.style.cssText = this.__style;
      } else {
        dom.removeAttribute("style");
      }
    }

    if (!latexChanged) return false

    const preview = dom.querySelector(".lexxy-math-block__preview");
    if (!preview) return true

    if (this.__latex) {
      preview.classList.remove("lexxy-math-block__preview--empty");
      preview.innerHTML = renderMath(this.__latex, { displayMode: true });
    } else {
      preview.textContent = "Click to add math formula";
      preview.classList.add("lexxy-math-block__preview--empty");
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
    });
    if (this.__style) {
      div.setAttribute("style", this.__style);
    }
    div.textContent = `$$${this.__latex}$$`;
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

const INSERT_BLOCK_MATH_COMMAND = createCommand();
const INSERT_INLINE_MATH_COMMAND = createCommand();
const APPLY_MATH_STYLE_COMMAND = createCommand();

const INLINE_MATH_REGEX = /(?:^|[^$])\$([^$\n]+)\$(?!\$)/;

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
            $insertBlockMath(editor, editorElement);
            return true
          }, COMMAND_PRIORITY_NORMAL),

          editor.registerCommand(INSERT_INLINE_MATH_COMMAND, () => (
            $insertInlineMath(), true
          ), COMMAND_PRIORITY_NORMAL),

          editor.registerCommand(FORMAT_TEXT_COMMAND, (formatType) => {
            return $handleMathFormatCommand(formatType)
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
  const text = textNode.getTextContent();
  const match = INLINE_MATH_REGEX.exec(text);

  if (!match) return

  const latex = match[1];
  const matchStart = match[0].startsWith("$") ? match.index : match.index + 1;
  const matchEnd = match.index + match[0].length;

  let nodeToSplit = textNode;
  let currentOffset = 0;

  if (matchStart > 0) {
    const [before] = nodeToSplit.splitText(matchStart);
    nodeToSplit = before.getNextSibling();
    currentOffset = matchStart;
  }

  const mathNode = new InlineMathNode({ latex });

  if (matchEnd < text.length) {
    const splitOffset = matchEnd - currentOffset;
    const [mathText] = nodeToSplit.splitText(splitOffset);
    mathText.replace(mathNode);
  } else {
    nodeToSplit.replace(mathNode);
  }
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

  if ($isBlockMathNode(targetNode)) {
    const nodeKey = targetNode.getKey();
    const latex = targetNode.getLatex();
    requestAnimationFrame(() => {
      const targetElement = editor.getElementByKey(nodeKey);
      openMathEditor(editor, editorElement, nodeKey, latex, true, targetElement);
    });
    return true
  }

  if ($isInlineMathNode(targetNode)) {
    const nodeKey = targetNode.getKey();
    const latex = targetNode.getLatex();
    requestAnimationFrame(() => {
      const targetElement = editor.getElementByKey(nodeKey);
      openMathEditor(editor, editorElement, nodeKey, latex, false, targetElement);
    });
    return true
  }

  return false
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

function $handleMathFormatCommand(formatType) {
  const mathNodes = $getSelectedMathNodes();
  if (!mathNodes.length) return false

  if (formatType === "bold") {
    for (const node of mathNodes) {
      const styles = $parseStyle(node.getStyle());
      if ($isBoldWeight(styles["font-weight"])) {
        delete styles["font-weight"];
      } else {
        styles["font-weight"] = "bold";
      }
      node.setStyle($serializeStyle(styles));
    }
  } else if (formatType === "italic") {
    for (const node of mathNodes) {
      const styles = $parseStyle(node.getStyle());
      if ((styles["font-style"] || "").trim() === "italic") {
        delete styles["font-style"];
      } else {
        styles["font-style"] = "italic";
      }
      node.setStyle($serializeStyle(styles));
    }
  } else if (formatType === "underline" || formatType === "strikethrough") {
    const decoration = formatType === "underline" ? "underline" : "line-through";

    for (const node of mathNodes) {
      const styles = $parseStyle(node.getStyle());
      const nextTextDecoration = $toggleTextDecorationToken(styles["text-decoration"], decoration);

      if (nextTextDecoration) {
        styles["text-decoration"] = nextTextDecoration;
      } else {
        delete styles["text-decoration"];
      }

      node.setStyle($serializeStyle(styles));
    }
  }

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
    const styles = $parseStyle(node.getStyle());

    for (const [property, value] of Object.entries(normalizedPatch)) {
      const previousValue = styles[property] || null;
      const nextValue = toggle ? (previousValue === value ? null : value) : value;

      if (nextValue) {
        styles[property] = nextValue;
      } else {
        delete styles[property];
      }
    }

    node.setStyle($serializeStyle(styles));
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

// Lightweight style parsing — avoids dependency on @lexical/selection
function $parseStyle(cssText) {
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

function $serializeStyle(styles) {
  return Object.entries(styles)
    .filter(([, value]) => value != null && value !== "")
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ")
}

function $toggleTextDecorationToken(currentValue, token) {
  const tokens = new Set(String(currentValue || "").split(/\s+/).filter(Boolean));

  if (tokens.has(token)) {
    tokens.delete(token);
  } else {
    tokens.add(token);
  }

  return Array.from(tokens).join(" ")
}

function $isBoldWeight(value) {
  if (!value) return false

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "bold" || normalized === "bolder") return true

  const numeric = Number.parseInt(normalized, 10);
  return !Number.isNaN(numeric) && numeric >= 600
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
    element.innerHTML = renderMath(latex, { displayMode });
  });
}

class MathEditor extends HTMLElement {
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

if (!customElements.get("lexxy-math-editor")) {
  customElements.define("lexxy-math-editor", MathEditor);
}

export { $isBlockMathNode, $isInlineMathNode, APPLY_MATH_STYLE_COMMAND, BlockMathNode, INLINE_MATH_REGEX, INSERT_BLOCK_MATH_COMMAND, INSERT_INLINE_MATH_COMMAND, InlineMathNode, MathExtension, renderContentMath, renderMath };
