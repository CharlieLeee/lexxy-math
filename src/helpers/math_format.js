// Text formats on math nodes are stored in the node's style, but Lexxy's sanitizer
// only keeps color and background-color, so the editor and the saved HTML render
// them as semantic tags (<strong>, <em>, <s>, <u>) inside the math element.

const FORMATS = [
  { name: "bold", tag: "strong", tags: ["STRONG", "B"], has: (s) => isBoldWeight(s["font-weight"]), set: (s) => { s["font-weight"] = "bold" }, clear: (s) => { delete s["font-weight"] } },
  { name: "italic", tag: "em", tags: ["EM", "I"], has: (s) => s["font-style"] === "italic", set: (s) => { s["font-style"] = "italic" }, clear: (s) => { delete s["font-style"] } },
  { name: "strikethrough", tag: "s", tags: ["S", "DEL", "STRIKE"], has: (s) => hasDecoration(s, "line-through"), set: (s) => addDecoration(s, "line-through"), clear: (s) => removeDecoration(s, "line-through") },
  { name: "underline", tag: "u", tags: ["U", "INS"], has: (s) => hasDecoration(s, "underline"), set: (s) => addDecoration(s, "underline"), clear: (s) => removeDecoration(s, "underline") }
]

const FORMAT_TAG_NAMES = new Set(FORMATS.flatMap((format) => format.tags))
const INLINE_ANCESTOR_TAG_NAMES = new Set([...FORMAT_TAG_NAMES, "A", "SPAN", "MARK"])

export function parseStyle(cssText) {
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

export function serializeStyle(styles) {
  return Object.entries(styles)
    .filter(([, value]) => value != null && value !== "")
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ")
}

export function isMathFormat(name) {
  return FORMATS.some((format) => format.name === name)
}

export function hasMathFormat(style, name) {
  return FORMATS.find((format) => format.name === name).has(parseStyle(style))
}

export function setMathFormat(style, name, enabled) {
  const styles = parseStyle(style)
  const format = FORMATS.find((format) => format.name === name)
  enabled ? format.set(styles) : format.clear(styles)
  return serializeStyle(styles)
}

function isBoldWeight(value) {
  if (!value) return false

  const normalized = String(value).trim().toLowerCase()
  if (normalized === "bold" || normalized === "bolder") return true

  const numeric = Number.parseInt(normalized, 10)
  return !Number.isNaN(numeric) && numeric >= 600
}

function toggleTextDecorationToken(currentValue, token) {
  const tokens = decorationTokens(currentValue)
  tokens.has(token) ? tokens.delete(token) : tokens.add(token)
  return Array.from(tokens).join(" ")
}

// Renders `element > strong > em > s > u > content` and keeps the other styles on element.
// The editor DOM and the saved HTML both use it, so they share one structure.
export function renderFormatted(element, style, { html, text }) {
  const styles = parseStyle(style)
  let target = element

  for (const format of FORMATS) {
    if (!format.has(styles)) continue

    format.clear(styles)
    target = target.appendChild(document.createElement(format.tag))
  }

  if (html === undefined) {
    target.textContent = text
  } else {
    target.innerHTML = html
  }

  const remaining = serializeStyle(styles)
  if (remaining) element.setAttribute("style", remaining)

  return element
}

// Import: merges the element's own style with format tags inside it and inline ancestors around it.
export function styleFromDOM(element) {
  const styles = parseStyle(element.getAttribute("style"))
  const tagNames = new Set()

  element.querySelectorAll("*").forEach((child) => tagNames.add(child.tagName))
  for (let ancestor = element.parentElement; ancestor && INLINE_ANCESTOR_TAG_NAMES.has(ancestor.tagName); ancestor = ancestor.parentElement) {
    if (ancestor.tagName === "B" && ancestor.style.fontWeight === "normal") continue
    tagNames.add(ancestor.tagName)
  }

  for (const format of FORMATS) {
    if (format.tags.some((tagName) => tagNames.has(tagName))) format.set(styles)
  }

  return serializeStyle(styles)
}

// Content rendering: descend through the format tags written by renderFormatted.
export function formattedContentTarget(element) {
  let target = element
  while (target.children?.length === 1 && FORMAT_TAG_NAMES.has(target.firstElementChild.tagName)) {
    target = target.firstElementChild
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
  if (!hasDecoration(styles, token)) styles["text-decoration"] = toggleTextDecorationToken(styles["text-decoration"], token)
}

function removeDecoration(styles, token) {
  if (!hasDecoration(styles, token)) return

  const next = toggleTextDecorationToken(styles["text-decoration"], token)
  next ? styles["text-decoration"] = next : delete styles["text-decoration"]
}
