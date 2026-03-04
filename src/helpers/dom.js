export function createElement(name, properties, content = "") {
  const element = document.createElement(name)
  for (const [key, value] of Object.entries(properties || {})) {
    if (key in element) {
      element[key] = value
    } else if (value !== null && value !== undefined) {
      element.setAttribute(key, value)
    }
  }
  if (content) {
    element.innerHTML = content
  }
  return element
}
