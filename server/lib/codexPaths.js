const os = require("node:os");
const path = require("node:path");

function resolveCodexHome(explicitHome) {
  if (explicitHome) {
    return path.resolve(explicitHome);
  }

  if (process.env.CODEX_HOME) {
    return path.resolve(process.env.CODEX_HOME);
  }

  return path.join(os.homedir(), ".codex");
}

function resolveCodexPaths(explicitHome) {
  const codexHome = resolveCodexHome(explicitHome);

  return {
    codexHome,
    stateDbPath: path.join(codexHome, "state_5.sqlite"),
    sessionsDir: path.join(codexHome, "sessions"),
    archivedSessionsDir: path.join(codexHome, "archived_sessions"),
  };
}

module.exports = {
  resolveCodexHome,
  resolveCodexPaths,
};
