// 홈 히어로: 큰 숫자 = 그 아래 줄의 합(리뷰 1차 지적 — "5건" 아래 2·1·4가 보이던 문제)
import { describe, expect, it } from "vitest";
import { heroModel } from "@/pages/home/lib/heroModel";
import { greetingSummary } from "@/pages/home/lib/TodayHero";
import type { HomeToday } from "@/pages/home/lib/types";
import { makeProvider } from "./helpers";

const base: HomeToday = {
  mode: "reviewer", myOpen: 2, dueToday: 1, overdue: 0, reviewWaiting: 4, companyReviewWaiting: null, returnedToMe: 0, returnedOnly: 0, meetingsToday: 0, dueSoon: 1,
  workOrdersToday: null, workOrdersByProcess: null, checksPending: null, population: 0,
};
const sum = (m: ReturnType<typeof heroModel>) => m.rows.reduce((s, r) => s + r.value, 0);

describe("heroModel", () => {
  it("검토자: 오늘 마감 + 검토 요청, 내 업무는 참고로만", () => {
    const m = heroModel(base);
    expect(m.total).toBe(5);
    expect(sum(m)).toBe(m.total);
    expect(m.rows.map((r) => r.key)).toEqual(["due", "rev"]);
    expect(m.aside.map((r) => r.key)).toEqual(["open"]);
  });
  it("검토자도 기한 지남·수정 요청을 셈(오늘 마감 0이어도 빈 문장이 아님)", () => {
    const m = heroModel({ ...base, dueToday: 0, overdue: 1, returnedToMe: 1, returnedOnly: 1, reviewWaiting: 0 });
    expect(m.total).toBe(2);
    expect(sum(m)).toBe(m.total);
    expect(m.rows.map((r) => r.key)).toEqual(["late", "ret"]);
    expect(m.rows[0]!.to).toBe("/work?due=overdue");
  });
  it("0인 줄은 숨기고, 모두 0이면 합도 0", () => {
    const m = heroModel({ ...base, dueToday: 0, reviewWaiting: 0 });
    expect(m.rows).toEqual([]);
    expect(m.total).toBe(0);
  });
  it("소유자·관리자: 회사 전체 검토 대기는 합에 넣지 않고 참고로", () => {
    const m = heroModel({ ...base, reviewWaiting: 1, companyReviewWaiting: 5 });
    expect(m.total).toBe(2);
    expect(m.aside.map((r) => r.key)).toEqual(["open", "company"]);
  });
  it("greeting: 기한 지난 업무가 맨 앞", () => {
    expect(greetingSummary({ ...base, dueToday: 0, overdue: 1, dueSoon: 2, returnedOnly: 1, reviewWaiting: 0 })).toBe("기한 지난 업무 1건, 이틀 안 마감 업무 2건, 수정 요청 1건이 있어요.");
  });
  it("구성원: 오늘 마감 + 수정 요청", () => {
    const m = heroModel({ ...base, mode: "member", myOpen: 5, dueToday: 1, returnedToMe: 2, returnedOnly: 2 });
    expect(m.total).toBe(3);
    expect(sum(m)).toBe(m.total);
  });
  it("작업자: 작업지시(건)를 공정별로 나누고 설비(대)는 따로", () => {
    const m = heroModel({ ...base, mode: "operator", workOrdersToday: 8, workOrdersByProcess: [{ key: "knit", label: "편조", count: 5 }, { key: "form", label: "가공", count: 3 }], checksPending: 3, dueToday: 1 });
    expect(m.total).toBe(8);
    expect(sum(m)).toBe(m.total);
    expect(m.rows.every((r) => r.unit === "건")).toBe(true);
    expect(m.aside.find((r) => r.key === "chk")?.unit).toBe("대");
  });
  it("작업자: 한 공정뿐이면 큰 숫자와 같은 줄을 되풀이하지 않음", () => {
    const m = heroModel({ ...base, mode: "operator", workOrdersToday: 8, workOrdersByProcess: [{ key: "knit", label: "편조", count: 8 }, { key: "form", label: "가공", count: 0 }], checksPending: 3 });
    expect(m.total).toBe(8);
    expect(m.rows).toEqual([]);
  });
  it("TR 품질보증: 기한 지남·수정 요청이 히어로에 들어감(라운드 3)", async () => {
    const { dp } = makeProvider("tr-technology", "R_QA");
    const d = (await dp.custom!({ url: "sel:home.today", method: "get", query: {} })).data as HomeToday;
    expect(d.overdue).toBeGreaterThan(0);
    const m = heroModel(d);
    expect(m.rows.map((r) => r.key)).toContain("late");
    expect(greetingSummary(d)?.startsWith("기한 지난 업무")).toBe(true);
  });
  it("모든 테넌트·인물의 실제 시드에서 합이 맞음", async () => {
    for (const [slug, codes] of [["tr-technology", ["R_CEO", "R_PLANT_MGR", "R_QA", "R_SALES_PROD", "R_ADMIN_PUR_ACC", "R_DEV", "R_OPERATOR"]], ["crata-demo", ["R_CEO", "R_OPS_ADMIN", "R_EDU_LEAD", "R_EDU_STAFF"]]] as const) {
      for (const code of codes) {
        const { dp } = makeProvider(slug, code);
        const r = await dp.custom!({ url: "sel:home.today", method: "get", query: {} });
        const m = heroModel(r.data as HomeToday);
        if (m.rows.length) expect(sum(m), `${slug} ${code}`).toBe(m.total);
        // 기한 지난 업무가 있으면 히어로가 '할 일 없음'이라고 하지 않아요
        if ((r.data as HomeToday).overdue > 0) expect(m.total, `${slug} ${code} overdue`).toBeGreaterThan(0);
      }
    }
  });
});
