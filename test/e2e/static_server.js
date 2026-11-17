import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname } from "node:path"

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css" }

// Serves a directory on a random local port for the e2e tests.
export function serveDirectory(rootUrl) {
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, "http://localhost").pathname.replace(/\/$/, "/index.html").replace(/^\//, "")

    try {
      const body = await readFile(new URL(path, rootUrl))
      response.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" })
      response.end(body)
    } catch {
      response.writeHead(404)
      response.end()
    }
  })

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({
      url: `http://127.0.0.1:${server.address().port}/`,
      close: () => new Promise((done) => server.close(done))
    }))
  })
}
