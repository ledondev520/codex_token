const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const { createLiveSnapshotService } = require("./lib/liveSnapshotService");
const { createRemoteSnapshotService } = require("./lib/remoteSnapshot");
const { resolveCodexHome, resolveSelectableCodexHome } = require("./lib/codexPaths");

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

function sendJsonHead(response, statusCode) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end();
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

function serveStaticHead(response, filePath) {
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
  response.end();
}

function buildInitialSnapshotScript(snapshot) {
  return `<script>window.__INITIAL_SNAPSHOT__=${JSON.stringify(snapshot).replace(
    /</g,
    "\\u003c"
  )}</script>`;
}

function serveIndexHtml(response, filePath, snapshot) {
  if (!fs.existsSync(filePath)) {
    sendNotFound(response);
    return;
  }

  const html = fs
    .readFileSync(filePath, "utf8")
    .replace("<!--app-initial-snapshot-->", buildInitialSnapshotScript(snapshot));

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(html);
}

function serveIndexHead(response, filePath) {
  if (!fs.existsSync(filePath)) {
    sendNotFound(response);
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end();
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("请求体不是有效的 JSON。"));
      }
    });
    request.on("error", reject);
  });
}

function createAppServer(options = {}) {
  const publicDir = options.publicDir || path.join(process.cwd(), "public");
  const isRemoteSnapshotMode = Boolean(options.remoteSnapshotFilePath);
  const liveSnapshotService = isRemoteSnapshotMode
    ? createRemoteSnapshotService({
        snapshotFilePath: options.remoteSnapshotFilePath,
      })
    : createLiveSnapshotService(options);
  liveSnapshotService.primeSnapshots();

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

    if (request.method === "HEAD" && url.pathname === "/api/snapshot") {
      sendJsonHead(response, 200);
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

    if (request.method === "POST" && url.pathname === "/api/refresh") {
      try {
        const snapshot = await liveSnapshotService.refresh();
        sendJson(response, 200, snapshot);
      } catch (error) {
        sendJson(response, 500, { error: error.message });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/source") {
      if (isRemoteSnapshotMode) {
        sendJson(response, 400, { error: "远端快照模式不支持切换本地数据目录。" });
        return;
      }

      try {
        const payload = await readJsonBody(request);
        const nextCodexHome = payload?.codexHome
          ? resolveSelectableCodexHome(payload.codexHome)
          : resolveCodexHome();
        const snapshot = await liveSnapshotService.setCodexHome(nextCodexHome);
        sendJson(response, 200, snapshot);
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/upload-snapshot") {
      if (!isRemoteSnapshotMode) {
        sendNotFound(response);
        return;
      }

      const expectedToken = String(options.snapshotUploadToken || "").trim();
      const authorizationHeader = String(request.headers.authorization || "").trim();
      const providedToken = authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.slice("Bearer ".length).trim()
        : String(request.headers["x-snapshot-upload-token"] || "").trim();

      if (!expectedToken || providedToken !== expectedToken) {
        sendJson(response, 401, { error: "未授权的快照上传请求。" });
        return;
      }

      try {
        const payload = await readJsonBody(request);
        const snapshot = payload?.snapshot && typeof payload.snapshot === "object"
          ? payload.snapshot
          : payload;
        if (!snapshot || typeof snapshot !== "object") {
          throw new Error("上传内容缺少有效快照。");
        }

        const savedSnapshot = await liveSnapshotService.setUploadedSnapshot(snapshot);
        sendJson(response, 200, {
          ok: true,
          generatedAt: savedSnapshot.generatedAt,
          recentThreads: Array.isArray(savedSnapshot.recentThreads)
            ? savedSnapshot.recentThreads.length
            : 0,
        });
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
      return;
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/" ||
        url.pathname === "/index.html" ||
        url.pathname === "/settings/pricing")
    ) {
      serveIndexHtml(
        response,
        path.join(publicDir, "index.html"),
        liveSnapshotService.getCurrentSnapshot()
      );
      return;
    }

    if (
      request.method === "HEAD" &&
      (url.pathname === "/" ||
        url.pathname === "/index.html" ||
        url.pathname === "/settings/pricing")
    ) {
      serveIndexHead(response, path.join(publicDir, "index.html"));
      return;
    }

    if (request.method === "GET") {
      const requestedPath = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
      if (path.extname(requestedPath)) {
        serveStaticFile(response, path.join(publicDir, requestedPath));
        return;
      }

      serveIndexHtml(
        response,
        path.join(publicDir, "index.html"),
        liveSnapshotService.getCurrentSnapshot()
      );
      return;
    }

    if (request.method === "HEAD") {
      const requestedPath = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
      if (path.extname(requestedPath)) {
        serveStaticHead(response, path.join(publicDir, requestedPath));
        return;
      }

      serveIndexHead(response, path.join(publicDir, "index.html"));
      return;
    }

    sendNotFound(response);
  });
}

module.exports = {
  createAppServer,
};
