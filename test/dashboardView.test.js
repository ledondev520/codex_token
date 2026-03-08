const test = require("node:test");
const assert = require("node:assert/strict");

const {
  formatTokenMillions,
  formatPercent,
  formatResetTime,
  formatUsd,
} = require("../public/app.js");

test("dashboard formatters render readable token and quota values", () => {
  assert.equal(formatTokenMillions(35000000), "35M");
  assert.equal(formatTokenMillions(5013157), "5.01M");
  assert.equal(formatPercent(12), "12%");
  assert.equal(formatUsd(0.005363), "$0.0054");
  assert.match(
    formatResetTime(1772950000),
    /2026|03|08|09/
  );
});
