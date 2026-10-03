// 도입 단계(1단계·전체)와 홈 '승인 대기'(한 번 눌러 끝내기)
import { describe, expect, it } from "vitest";
import { TENANTS, type TenantSlug } from "@/tenants";
import { buildNav, homeLayout, makeT, resolveModules, rolloutStage, stageNavKeys } from "@/modules";
import type { ApprovalInbox } from "@/pages/home/lib/types";
import { makeProvider } from "./helpers";

const tr = TENANTS["tr-technology"];
const crata = TENANTS["crata-demo"];

describe("도입 단계", () => {
  it("TR은 1단계로 시작, CRATA는 전체. 덮어쓰기가 이김", () => {
    expect(rolloutStage(tr)).toBe("phase1");
    expect(rolloutStage(tr, { stage: "full" })).toBe("full");
    expect(rolloutStage(crata)).toBe("full");
    expect(rolloutStage(crata, { stage: "phase1" })).toBe("phase1");
  });

  it("1단계 메뉴: 정한 항목만 + 관리(owner·admin). ARA·문서·회사는 숨김", () => {
    const en = resolveModules(tr).enabled;
    const nav = buildNav(tr, "reviewer", en, makeT(tr), { navKeys: stageNavKeys(tr, "phase1") });
    expect(nav.map((g) => g.key)).toEqual(["home", "work", "meetings", "industry"]);
    expect(nav.flatMap((g) => g.children.map((c) => c.key))).toEqual(["work-list", "work-review", "meetings", "meeting-inbox", "field-report", "quality", "claims"]);
    // 소제목은 처음 보이는 항목에 다시 붙어요
    expect(nav.find((g) => g.key === "industry")!.children.map((c) => c.section)).toEqual(["현장", "품질", undefined]);
    const owner = buildNav(tr, "owner", en, makeT(tr), { navKeys: stageNavKeys(tr, "phase1") });
    expect(owner.map((g) => g.key)).toContain("admin");
    expect(owner.find((g) => g.key === "admin")!.children.length).toBeGreaterThan(5);
    // 전체로 바꾸면 그대로
    expect(buildNav(tr, "owner", en, makeT(tr), { navKeys: stageNavKeys(tr, "full") }).length).toBe(9);
  });

  it("1단계 홈: 승인 대기 중심, 1단계 목록이 없으면 평소 홈", () => {
    const en = resolveModules(tr).enabled;
    const plant = { roleCode: "R_PLANT_MGR", unitId: "U_PLANT", homePreset: "lead" as const, bundles: [] };
    expect(homeLayout(tr, plant, en, { stage: "phase1" })).toEqual(["greeting", "approval-inbox", "mfg-field-feed", "mfg-claims-8d"]);
    expect(homeLayout(tr, plant, en, { stage: "full" })).not.toContain("approval-inbox");
    const op = { roleCode: "R_OPERATOR", unitId: "U_SALES_PROD", homePreset: "staff" as const, bundles: [] };
    expect(homeLayout(tr, op, en, { stage: "phase1" })).toEqual(["greeting", "mfg-field-report", "my-tasks"]);
    const lead = { roleCode: "R_EDU_LEAD", unitId: "U_EDU", homePreset: "lead" as const, bundles: [] };
    expect(homeLayout(crata, lead, resolveModules(crata).enabled, { stage: "phase1" })[1]).toBe("approval-inbox");
  });

  it("rpc:set_rollout_stage: 관리자만, 메뉴·홈 덮어쓰기에 저장", async () => {
    const admin = makeProvider("tr-technology", "R_ADMIN_PUR_ACC");
    await admin.dp.custom!({ url: "rpc:set_rollout_stage", method: "post", payload: { stage: "full" } });
    const o = admin.store.find("tenant_settings", "settings")!.overrides as { stage?: string };
    expect(o.stage).toBe("full");
    const member = makeProvider("tr-technology", "R_DEV");
    await expect(member.dp.custom!({ url: "rpc:set_rollout_stage", method: "post", payload: { stage: "full" } })).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("승인 대기(approval-inbox)", () => {
  const inbox = async (dp: ReturnType<typeof makeProvider>["dp"]) =>
    (await dp.custom!({ url: "sel:widget.approval-inbox", method: "get" })).data as ApprovalInbox | null;

  it("TR 공장장: 새 현장 등록이 추천 담당과 함께 모임", async () => {
    const { dp } = makeProvider("tr-technology", "R_PLANT_MGR");
    const d = await inbox(dp);
    expect(d).not.toBeNull();
    const field = d!.items.filter((i) => i.kind === "field");
    expect(field.length).toBeGreaterThan(0);
    for (const f of field) expect(f.subtitle).toContain("추천 담당");
    // 배정 역할이 아닌 품질 담당 홈에는 현장 배정이 없어요(같은 건이 두 사람 할 일로 보이지 않게)
    const qa = await inbox(makeProvider("tr-technology", "R_QA").dp);
    expect(qa?.items.some((i) => i.kind === "field") ?? false).toBe(false);
  });

  // 모든 버튼이 실제로 끝까지 되는지: 보이는 것을 다 눌러 0건이 되어야 해요
  const personas: [TenantSlug, string][] = [
    ["tr-technology", "R_CEO"], ["tr-technology", "R_PLANT_MGR"], ["tr-technology", "R_QA"], ["tr-technology", "R_SALES_PROD"], ["tr-technology", "R_ADMIN_PUR_ACC"],
    ["crata-demo", "R_CEO"], ["crata-demo", "R_EDU_LEAD"], ["crata-demo", "R_SSI_LEAD"], ["crata-demo", "R_ARA_LEAD"], ["crata-demo", "R_OPS_ADMIN"],
  ];
  it.each(personas)("%s %s: 한 번씩 누르면 모두 처리됨", async (slug, code) => {
    const { dp } = makeProvider(slug, code);
    const first = await inbox(dp);
    const items = first?.items ?? [];
    for (const it of items) {
      await expect(dp.custom!({ url: `rpc:${it.primary.rpc}`, method: "post", payload: it.primary.payload }), `${it.key} ${it.primary.rpc}`).resolves.toBeTruthy();
    }
    const after = await inbox(dp);
    expect(after?.items.length ?? 0).toBe(0);
  });

  it("규칙 후보 '이번만'도 한 번에 끝남", async () => {
    const { dp } = makeProvider("tr-technology", "R_PLANT_MGR");
    const rule = (await inbox(dp))!.items.find((i) => i.kind === "rule");
    expect(rule?.secondary?.rpc).toBe("reject_rule");
    await dp.custom!({ url: `rpc:${rule!.secondary!.rpc}`, method: "post", payload: rule!.secondary!.payload });
    expect((await inbox(dp))!.items.some((i) => i.key === rule!.key)).toBe(false);
  });

  it("회원(검토 권한 없음)은 비어 있음", async () => {
    const d = await inbox(makeProvider("tr-technology", "R_DEV").dp);
    expect(d?.items.length ?? 0).toBe(0);
  });
});
