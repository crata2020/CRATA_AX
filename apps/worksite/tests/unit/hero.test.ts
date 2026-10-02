// 홈 히어로: 큰 숫자 = 그 아래 줄의 합(리뷰 1차 지적 — "5건" 아래 2·1·4가 보이던 문제)
import { describe, expect, it } from "vitest";
import { heroModel } from "@/pages/home/lib/heroModel";
import type { HomeToday } from "@/pages/home/lib/types";
import { makeProvider } from "./helpers";

const base: HomeToday = { mode: "reviewer", myOpen: 2, dueToday: 1, reviewWaiting: 4, returnedToMe: 0, meetingsToday: 0, dueSoon: 1, workOrdersToday: null, checksPending: null, population: 0 };
const sum = (m: ReturnType<typeof heroModel>) => m.rows.reduce((s, r) => s + r.value, 0);

describe("heroModel", () => {
  it("검토자: 오늘 마감 + 검토 요청, 내 업무는 참고로만", () => {
    const m = heroModel(base);
    expect(m.total).toBe(5);
    expect(sum(m)).toBe(m.total);
    expect(m.rows.map((r) => r.key)).toEqual(["due", "rev"]);
    expect(m.aside.map((r) => r.key)).toEqual(["open"]);
  });
  it("구성원: 오늘 마감 + 수정 요청", () => {
    const m = heroModel({ ...base, mode: "member", myOpen: 5, dueToday: 1, returnedToMe: 2 });
    expect(m.total).toBe(3);
    expect(sum(m)).toBe(m.total);
  });
  it("작업자: 작업지시(건)만 더하고 설비(대)는 따로", () => {
    const m = heroModel({ ...base, mode: "operator", workOrdersToday: 8, checksPending: 3, dueToday: 1 });
    expect(m.total).toBe(8);
    expect(sum(m)).toBe(m.total);
    expect(m.rows.every((r) => r.unit === "건")).toBe(true);
    expect(m.aside.find((r) => r.key === "chk")?.unit).toBe("대");
  });
  it("모든 테넌트·인물의 실제 시드에서 합이 맞음", async () => {
    for (const [slug, codes] of [["tr-technology", ["R_CEO", "R_PLANT_MGR", "R_QA", "R_SALES_PROD", "R_ADMIN_PUR_ACC", "R_DEV", "R_OPERATOR"]], ["crata-demo", ["R_CEO", "R_OPS_ADMIN", "R_EDU_LEAD", "R_EDU_STAFF"]]] as const) {
      for (const code of codes) {
        const { dp } = makeProvider(slug, code);
        const r = await dp.custom!({ url: "sel:home.today", method: "get", query: {} });
        const m = heroModel(r.data as HomeToday);
        expect(sum(m), `${slug} ${code}`).toBe(m.total);
      }
    }
  });
});
