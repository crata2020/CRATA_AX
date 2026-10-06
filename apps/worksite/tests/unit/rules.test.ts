import { describe, expect, it } from "vitest";
import { TENANTS } from "@/tenants";
import { homeLayout, resolveModules, buildNav, makeT } from "@/modules";
import { deriveTenantTheme } from "@/theme/derive";
import { contrast } from "@/theme/color";
import { TR_TOKENS, CRATA_TOKENS } from "@/theme/tenants";
import { STATUS } from "@/lib/status";
import { ddayInfo } from "@/lib/format";

describe("homeLayout(빌드 스펙 5.3절 결과 예)", () => {
  it("TR 공장장", () => {
    const t = TENANTS["tr-technology"];
    expect(homeLayout(t, { roleCode: "R_PLANT_MGR", unitId: "U_PLANT", homePreset: "lead", bundles: [] }, resolveModules(t).enabled)).toEqual([
      "greeting", "mfg-production-today", "mfg-equipment-status", "mfg-claims-8d", "mfg-field-feed", "review-queue", "mfg-delivery-due", "mfg-legal-calendar",
    ]);
  });
  it("CRATA 강의·워크샵 리드", () => {
    const t = TENANTS["crata-demo"];
    expect(homeLayout(t, { roleCode: "R_EDU_LEAD", unitId: "U_EDU", homePreset: "lead", bundles: ["view_prices"] }, resolveModules(t).enabled)).toEqual([
      "greeting", "review-queue", "team-workload", "my-tasks", "upcoming-meetings", "project-health", "approvals-pending",
    ]);
  });
  it("TR 생산 작업자는 역할코드 배치, 원재료 가격은 금액 권한이 있어야", () => {
    const t = TENANTS["tr-technology"];
    const en = resolveModules(t).enabled;
    expect(homeLayout(t, { roleCode: "R_OPERATOR", unitId: "U_SALES_PROD", homePreset: "staff", bundles: [] }, en)).toEqual(["greeting", "mfg-field-report", "my-tasks", "notices", "ara-card"]);
    expect(homeLayout(t, { roleCode: "R_CEO", unitId: "U_CEO", homePreset: "ceo", bundles: [] }, en)).not.toContain("mfg-material-price");
    expect(homeLayout(t, { roleCode: "R_CEO", unitId: "U_CEO", homePreset: "ceo", bundles: ["view_prices"] }, en)).toContain("mfg-material-price");
  });
});

describe("모듈·메뉴", () => {
  it("CRATA는 제조 팩·안전보건이 꺼지고 영업·교육이 켜짐", () => {
    const en = resolveModules(TENANTS["crata-demo"]).enabled;
    expect(en.has("mfg-quality")).toBe(false);
    expect(en.has("safety-health")).toBe(false);
    expect(en.has("edu-sales")).toBe(true);
    expect(en.has("approvals")).toBe(true);
  });
  it("메뉴: owner 9개, member 8개(관리 없음)", () => {
    const t = TENANTS["tr-technology"];
    const en = resolveModules(t).enabled;
    const tt = makeT(t);
    expect(buildNav(t, "owner", en, tt).length).toBe(9);
    expect(buildNav(t, "member", en, tt).map((g) => g.key)).not.toContain("admin");
    expect(tt("nav.industry")).toBe("생산·품질");
  });
});

describe("테마 대비(4.1절)", () => {
  for (const [name, t] of [["TR", TR_TOKENS], ["CRATA", CRATA_TOKENS]] as const) {
    it(`${name} 글자 4.5:1, 입력칸 테두리 3:1`, () => {
      expect(contrast(t.onBrand, t.brand)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.brand, t.brandWeak)).toBeGreaterThanOrEqual(4.5);
      for (const fg of [t.ink, t.ink2, t.muted]) {
        expect(contrast(fg, t.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(fg, t.panel)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(t.muted, t.brandWeak)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.controlLine, t.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(t.controlLine, t.panel)).toBeGreaterThanOrEqual(3);
      // sunken(트랙·레인·카드 테두리 면) 위 흐린 글자 4.5:1, 입력칸 테두리 3:1(07 Orbix 명세 4.1절)
      expect(contrast(t.muted, t.sunken)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.controlLine, t.sunken)).toBeGreaterThanOrEqual(3);
    });
  }
  it("deriveTenantTheme가 확정 값과 거의 같고 대비 통과", () => {
    for (const base of [TR_TOKENS, CRATA_TOKENS]) {
      const d = deriveTenantTheme({ brand: base.brand, chartAccent: base.chartAccent });
      expect(contrast(d.ink, d.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(d.muted, d.panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(d.controlLine, d.panel)).toBeGreaterThanOrEqual(3);
      const near = (a: string, b: string) => [1, 3, 5].every((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= 2);
      expect(near(d.panel, base.panel)).toBe(true);
      expect(near(d.ink, base.ink)).toBe(true);
      expect(near(d.sunken, base.sunken)).toBe(true);
    }
  });
});

describe("status.ts·format.ts", () => {
  it("5.7절 주요 도메인이 모두 있음", () => {
    for (const d of ["tasks.status", "submissions.status", "meeting_segments.review_status", "rules.status", "equipment_run_logs.status", "customer_claims.status", "semiannual_reviews.result", "audit_events.actor_type"]) {
      expect(STATUS).toHaveProperty(d);
    }
    expect(Object.keys(STATUS["tasks.status"])).toEqual(["todo", "in_progress", "submitted", "changes_requested", "done", "canceled"]);
  });
  it("D-day 표기", () => {
    expect(ddayInfo("2026-10-03", "2026-09-30")).toMatchObject({ label: "D-3", tone: "neutral" });
    expect(ddayInfo("2026-10-01", "2026-09-30")).toMatchObject({ label: "D-1 내일 마감", tone: "warning" });
    expect(ddayInfo("2026-09-30", "2026-09-30")).toMatchObject({ label: "오늘 마감", tone: "warning" });
    expect(ddayInfo("2026-09-28", "2026-09-30")).toMatchObject({ label: "2일 지남", tone: "critical" });
  });
});

describe("데이터 안전(8.7절, 기준 데이터)", () => {
  it("메일 @example.com · 전화 000-0000- · 거래처 '예시'", () => {
    for (const t of Object.values(TENANTS)) {
      for (const p of t.people) {
        expect(p.email.endsWith("@example.com")).toBe(true);
        expect(p.phoneWork.startsWith("000-0000-")).toBe(true);
      }
      for (const p of t.partners) expect(p.name.startsWith("예시")).toBe(true);
    }
  });
  it("CRATA facts에 주소·연혁·인증 값 없음", () => {
    const f = TENANTS["crata-demo"].facts;
    expect(f.history).toBeUndefined();
    expect(f.certifications).toBeUndefined();
    expect(f.overview.some((o) => o.label === "주소")).toBe(false);
  });
});
