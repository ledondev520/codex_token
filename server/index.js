const { createAppServer } = require("./app");

const port = Number(process.env.PORT || 4318);
const host = process.env.HOST || "0.0.0.0";

const server = createAppServer({
  codexHome: process.env.CODEX_HOME,
  refreshIntervalMs: Number(process.env.REFRESH_INTERVAL_MS || 5000),
  remoteSnapshotFilePath: process.env.REMOTE_SNAPSHOT_FILE_PATH || "",
  snapshotUploadToken: process.env.SNAPSHOT_UPLOAD_TOKEN || "",
});

server.listen(port, host, () => {
  console.log(`Codex usage dashboard listening on http://${host}:${port}`);
});
