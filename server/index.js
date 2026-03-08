const { createAppServer } = require("./app");

const port = Number(process.env.PORT || 4318);
const host = process.env.HOST || "127.0.0.1";

const server = createAppServer({
  codexHome: process.env.CODEX_HOME,
  refreshIntervalMs: Number(process.env.REFRESH_INTERVAL_MS || 5000),
});

server.listen(port, host, () => {
  console.log(`Codex usage dashboard listening on http://${host}:${port}`);
});
