const os = require("node:os");
const fs = require("node:fs");
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

function resolveSelectableCodexHome(inputPath) {
  if (!inputPath) {
    return resolveCodexHome();
  }

  const resolvedInputPath = path.resolve(String(inputPath));
  const directCodexHome = path.join(resolvedInputPath, "state_5.sqlite");
  const nestedCodexHome = path.join(resolvedInputPath, ".codex", "state_5.sqlite");

  if (fs.existsSync(directCodexHome)) {
    return resolvedInputPath;
  }

  if (fs.existsSync(nestedCodexHome)) {
    return path.join(resolvedInputPath, ".codex");
  }

  throw new Error("所选目录中没有找到 Codex 数据，请选择 .codex 目录或其上级目录。");
}

module.exports = {
  resolveCodexHome,
  resolveCodexPaths,
  resolveSelectableCodexHome,
};
