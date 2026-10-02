// 기준 데이터(Foundation, 빌드 스펙 6.2절). TenantConfig에서 행을 만듭니다: 조직·사람·사업 구조·거래처·회사 정보·설정·용어·배분 규칙.
// 다른 그룹은 이 행들을 ctx.get("members") 등으로 읽고, id(m-tr-plant, prj-cr-edu-a …)를 그대로 참조해도 됩니다.
import type { SeedContext, SeedOutput } from "./types";

export function referenceSeed(ctx: SeedContext): SeedOutput {
  const { tenant } = ctx;
  const roleOf = (code: string) => tenant.roles.find((r) => r.code === code)!;
  const isTr = tenant.slug === "tr-technology";
  const facts = tenant.facts;
  const factValue = (label: string) => facts.overview.find((o) => o.label === label)?.value ?? null;

  // 구성원 목록 순서: 조직도 순서(대표 → 공장장 → 팀 …), 같은 조직 안에서는 조직장 먼저
  const orgOrder = (memberId: string, unitId: string) => {
    const u = tenant.orgUnits.find((x) => x.id === unitId);
    const idx = tenant.people.findIndex((p) => p.id === memberId);
    return (u?.sortOrder ?? 99) * 100 + (u?.headMemberId === memberId ? 0 : 1 + idx);
  };
  const out: SeedOutput = {
    org_units: tenant.orgUnits.map((u) => ({ id: u.id, name: u.name, parent_id: u.parentId, head_member_id: u.headMemberId ?? null, sort_order: u.sortOrder, valid_from: null, valid_to: null })),
    members: tenant.people.map((p) => ({
      id: p.id, display_name: p.displayName, email: p.email, phone_work: p.phoneWork, org_unit_id: p.unitId, position: null, job_title: p.jobTitle,
      duties: p.duties ?? null, role: roleOf(p.roleCode).platformRole, status: "active" as const, joined_at: null, avatar_ref: null, external_ids: null,
      role_code: p.roleCode, is_persona: p.persona,
      org_order: orgOrder(p.id, p.unitId),
    })),
    business_lines: tenant.businessStructure.map((bl, i) => ({
      id: bl.id, code: bl.code, name: bl.name, description: bl.description, owner_member_id: bl.ownerMemberId, status: "active" as const, sort_order: i + 1, hypothesis: bl.hypothesis ?? false,
    })),
    projects: tenant.businessStructure.flatMap((bl) => bl.projects.map((p) => ({
      id: p.id, business_line_id: bl.id, code: p.code, name: p.name, aliases: p.aliases ?? [], partner_id: p.partnerId ?? null,
      owner_member_id: p.ownerMemberId, reviewer_member_id: p.reviewerMemberId, start_on: p.startOn, due_on: p.dueOn, status: p.status,
      health: p.health, sensitivity: p.sensitivity, description: p.description, member_ids: p.memberIds,
    }))),
    parts: tenant.businessStructure.flatMap((bl) => bl.projects.flatMap((p) => p.parts.map((pt, i) => ({
      id: pt.id, project_id: p.id, name: pt.name, lead_member_id: pt.leadMemberId, member_ids: pt.memberIds, sort_order: i + 1,
    })))),
    partners: tenant.partners.map((p) => ({ id: p.id, kind: p.kind, name: p.name, biz_reg_no: null, status: p.status, owner_member_id: p.ownerMemberId, tags: p.tags, external_ids: null, note: p.note ?? null })),
    company_info: [{
      id: "company",
      legal_name: tenant.legalName ?? null,
      display_name: tenant.displayName,
      address: factValue("주소"),
      phone: factValue("대표 전화"),
      website: isTr ? "http://trtechnology.co.kr/" : null,
      founded_on: isTr ? "2011-12-08" : null,
      vision: facts.vision ?? null,
      values: null,
      policies: null,
      history: facts.history ?? null,
      certifications: facts.certifications ?? null,
      logo_ref: null,
    }],
    tenant_settings: [{
      id: "settings", display_name: tenant.displayName, brand_tokens: null, logo_ref: null, locale: "ko" as const, timezone: "Asia/Seoul" as const,
      enabled_modules: [], enabled_packs: tenant.packs, nav_overrides: tenant.nav.labels, data_class_defaults: null,
      profile_version: tenant.profile.version, overrides: {},
    }],
    glossary_terms: tenant.glossary.terms.map((g) => ({
      id: g.id, term: g.term, ui_label: g.uiLabel, aliases: g.aliases, forbidden: g.forbidden ?? false, definition: g.definition,
      platform_key: g.platformKey ?? null, to_confirm: g.toConfirm ?? false, evidence: g.evidence ?? [],
    })),
    assignment_rules: isTr
      ? [
        { id: "ar-tr-01", name: "클레임 업무(가설)", condition: "출처가 클레임인 업무", assignee_rule: "품질보증 담당", reviewer_rule: "공장장", source_ref: "프로파일 decision_rights 가설", active: true },
        { id: "ar-tr-02", name: "현장 등록 후속 업무(가설)", condition: "출처가 현장 등록인 업무", assignee_rule: "공장장이 정한 담당", reviewer_rule: "공장장", source_ref: "프로파일 processes P_FIELD_REPORT", active: true },
        { id: "ar-tr-03", name: "안전보건 서류(가설)", condition: "안전보건 사업의 업무", assignee_rule: "총무·구매·경리 담당", reviewer_rule: "대표이사", source_ref: "프로파일 actions confirm_semiannual_review", active: true },
      ]
      : [
        { id: "ar-cr-01", name: "강의·워크샵 업무", condition: "사업이 강의·워크샵인 업무", assignee_rule: "요청자가 정한 담당", reviewer_rule: "강의·워크샵 리드", source_ref: "회의 분류 체계 v0.2", active: true },
        { id: "ar-cr-02", name: "학맞통 업무", condition: "사업이 학맞통인 업무", assignee_rule: "학맞통 리드", reviewer_rule: "대표", source_ref: "회의 분류 체계 v0.2", active: true },
        { id: "ar-cr-03", name: "아라 개발 업무", condition: "사업이 아라 개발인 업무", assignee_rule: "요청자가 정한 담당", reviewer_rule: "아라 개발 리드", source_ref: "회의 분류 체계 v0.2", active: true },
      ],
  };
  return out;
}
