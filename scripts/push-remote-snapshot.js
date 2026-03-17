#!/opt/homebrew/bin/node

const { loadSnapshot } = require("../server/lib/usageRepository");
const { buildUploadedSnapshot } = require("../server/lib/remoteSnapshot");

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  const uploadBaseUrl = requireEnv("REMOTE_DASHBOARD_URL").replace(/\/$/, "");
  const uploadToken = requireEnv("SNAPSHOT_UPLOAD_TOKEN");
  const codexHome = String(process.env.CODEX_HOME || "").trim() || undefined;
  const uploadUrl = `${uploadBaseUrl}/api/upload-snapshot`;

  const fullSnapshot = await loadSnapshot({ codexHome });
  const uploadedSnapshot = buildUploadedSnapshot(fullSnapshot);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${uploadToken}`,
    },
    body: JSON.stringify(uploadedSnapshot),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Snapshot upload failed with status ${response.status}`);
  }

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        uploadUrl,
        generatedAt: uploadedSnapshot.generatedAt,
        recentThreads: uploadedSnapshot.recentThreads.length,
        dailyLedger: uploadedSnapshot.dailyLedger.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  process.stderr.write(error.stack || error.message || String(error));
  process.exit(1);
});
