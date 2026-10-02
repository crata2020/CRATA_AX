// 데모 일정이 일요일·한국 공휴일(추석·개천절·대체공휴일·한글날)에 놓이지 않는지(리뷰 1차 지적)
import { describe, expect, it } from "vitest";
import { isOffDay, toKstDate } from "@/lib/clock";
import type { ResourceName } from "@/types/entities";
import { makeProvider } from "./helpers";

const CHECKS: [ResourceName, string, boolean][] = [
  ["meetings", "started_at", true], ["notices", "published_at", true], ["tasks", "due_at", true], ["action_proposals", "suggested_due_at", true],
  ["work_orders", "planned_date", false], ["production_results", "date", false], ["equipment_run_logs", "date", false], ["sales_order_lines", "due_date", false],
];

describe("데모 달력", () => {
  for (const slug of ["tr-technology", "crata-demo"] as const) {
    it(`${slug}: 회의·공지·마감·생산이 쉬는 날에 없음`, () => {
      const { store } = makeProvider(slug, "R_CEO");
      const bad: string[] = [];
      for (const [resource, field, office] of CHECKS) {
        for (const row of store.rows(resource)) {
          const v = row[field];
          if (typeof v === "string" && isOffDay(v, { saturday: office })) bad.push(`${resource}.${field} ${row.id} ${toKstDate(v)}`);
        }
      }
      expect(bad).toEqual([]);
    });
  }
  it("2026 대체공휴일: 10월 5일(월)", () => {
    expect(isOffDay("2026-10-05")).toBe(true);
    expect(isOffDay("2026-10-06")).toBe(false);
  });
});
