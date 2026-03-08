const { execFile } = require("node:child_process");
const path = require("node:path");

function loadSnapshotInBackground(options = {}) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, "loadSnapshotWorker.js");
    const serializedOptions = JSON.stringify(options);

    execFile(
      process.execPath,
      [workerPath, serializedOptions],
      {
        cwd: path.join(__dirname, "..", ".."),
        timeout: 30000,
        maxBuffer: 20 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr?.trim() ||
                error.message ||
                "Background snapshot worker failed."
            )
          );
          return;
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          reject(
            new Error(
              `Failed to parse background snapshot output: ${parseError.message}`
            )
          );
        }
      }
    );
  });
}

module.exports = {
  loadSnapshotInBackground,
};
