const { loadSnapshot } = require("./usageRepository");

async function main() {
  const rawOptions = process.argv[2] || "{}";
  const options = JSON.parse(rawOptions);
  const snapshot = await loadSnapshot(options);
  process.stdout.write(JSON.stringify(snapshot));
}

main().catch((error) => {
  process.stderr.write(error.stack || error.message || String(error));
  process.exit(1);
});
