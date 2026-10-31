import test from "node:test";
import assert from "node:assert/strict";
import { formatDueDate, toDateInput } from "../src/utils/format.js";

test("formatDueDate handles missing dates", () => {
  assert.equal(formatDueDate(null), "No due date");
  assert.equal(formatDueDate(undefined), "No due date");
  assert.equal(formatDueDate(""), "No due date");
});
test("formatDueDate shows the calendar date of an ISO timestamp", () => {
  assert.equal(formatDueDate("2026-09-15T00:00:00.000Z"), "Due: 2026-09-15");
});
test("toDateInput returns YYYY-MM-DD for <input type=date>, or empty string", () => {
  assert.equal(toDateInput("2026-09-15T00:00:00.000Z"), "2026-09-15");
  assert.equal(toDateInput(null), "");
});
test("date text does not shift with the machine's timezone", () => {
  const saved = process.env.TZ;
  for (const tz of ["Asia/Kolkata", "America/Los_Angeles", "Pacific/Auckland"]) {
    process.env.TZ = tz;
    assert.equal(toDateInput("2026-09-15T00:00:00.000Z"), "2026-09-15", tz);
  }
  process.env.TZ = saved;
});
