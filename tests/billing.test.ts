import test from "node:test";
import assert from "node:assert/strict";
import { addCalendarMonths, attendanceMinutes, costPence, previousMonth } from "../src/lib/billing.ts";

test("hourly rates and minutes", () => {
  assert.equal(attendanceMinutes("09:00", "15:30"), 390);
  assert.equal(costPence(390, 600), 3900);
  assert.equal(costPence(15, 599), 150);
  assert.throws(() => attendanceMinutes("15:00", "09:00"));
});
test("review date clamps short months", () => {
  assert.equal(addCalendarMonths("2026-08-31", 6), "2027-02-28");
  assert.throws(() => addCalendarMonths("2026-02-31", 6));
});
test("month periods include leap years", () => {
  assert.deepEqual(previousMonth(new Date("2024-03-01")), { start: "2024-02-01", end: "2024-02-29" });
});
