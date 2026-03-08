const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const { createLiveSnapshotService } = require("./lib/liveSnapshotService");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendNotFound(response) {
  sendJson(response, 404, { error: "Not found" });
}

function serveStaticFile(response, filePath) {
  if (!fs.existsSync(filePath)) {
    sendNotFound(response);
    return;
  }

  const extname = path.extname(filePath);
  const mimeType = MIME_TYPES[extname] || "text/plain; charset=utf-8";

  response.writeHead(200, {
    "content-type": mimeType,
    "cache-control": "no-store",
  });
  response.end(fs.readFileSync(filePath));
}

function createAppServer(options = {}) {
  const publicDir = options.publicDir || path.join(process.cwd(), "public");
  const liveSnapshotService = createLiveSnapshotService(options);

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/api/snapshot") {
      try {
        const snapshot = liveSnapshotService.getCurrentSnapshot();
        sendJson(response, 200, snapshot);
      } catch (error) {
        sendJson(response, 500, { error: error.message });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/stream") {
      response.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      });

      response.write(": connected\n\n");

      const writeSnapshot = (snapshot) => {
        response.write(`event: snapshot\n`);
        response.write(`data: ${JSON.stringify(snapshot)}\n\n`);
      };

      writeSnapshot(liveSnapshotService.getCurrentSnapshot());

      const unsubscribe = liveSnapshotService.subscribe(writeSnapshot);
      request.on("close", unsubscribe);
      return;
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      serveStaticFile(response, path.join(publicDir, "index.html"));
      return;
    }

    if (request.method === "GET") {
      const requestedPath = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
      serveStaticFile(response, path.join(publicDir, requestedPath));
      return;
    }

    sendNotFound(response);
  });
}

module.exports = {
  createAppServer,
};
