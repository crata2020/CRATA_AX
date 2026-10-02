// collab 그룹 시드(소유: collab 그룹). 문서·규칙·지식·공지·일정·결재·메일 데이터를 만듭니다.
// 만들 리소스: GROUP_RESOURCES.collab (artifacts, artifact_versions, templates, corrections, rules, knowledge_items, knowledge_links,
//   notices, read_receipts, calendar_events, approval_links, mail_connections, mail_links, mail_rules, kpis·kpi_values의 AX_*)
// 앵커: ANCHORS.crata.artifact·rule·corrections·notice, ANCHORS.tr.artifact8d·rules·notice
// 양·내용: 빌드 스펙 6.4절 collab 표 · 지표 값 6.5절(AX_*)
// rpc: mark_notice_read · approve_rule · reject_rule (+ 그룹 동작: register_artifact · finalize_artifact · set_correction_reason ·
//      publish_template · verify_knowledge · create_notice · create_task_from_mail · set_glossary_label) / sel: calendar.range
//
// 지킬 것: 사람은 TenantConfig의 가상 인물만, 거래처는 '예시…'만, 링크는 *.example.invalid, 메일 주소는 @example.com.
// TR 화면의 제품·공정·설비·조직은 공개 자료 범위만 쓰고, 숫자·일정·문서 내용은 모두 예시입니다. 학생 정보는 어디에도 없습니다.
import { defineGroup, type ActionContext, type SeedContext, type SeedOutput, type RpcHandler, type SelectorContext, type SelectorHandler } from "./types";
import type { ResourceName, RowOf, SeedRow } from "@/types/entities";
import type { StatusValue } from "@/lib/status";
import type { Sensitivity, TenantConfig } from "@/tenants/types";
import { addDays, kstIso, toKstDate, weekStart } from "@/lib/clock";

type R<K extends ResourceName> = SeedRow<RowOf<K>>;
type DocType = StatusValue<"artifacts.doc_type">;
type Scope = StatusValue<"corrections.scope">;
type CalKind = StatusValue<"calendar_events.kind">;
type Vis = StatusValue<"calendar_events.visibility">;
/** [오늘+n일, "HH:mm"] */
type At = [number, string];

const FILES = "https://files.example.invalid";
const DOCS = "https://docs.example.invalid";
const APPROVALS = "https://approvals.example.invalid/doc";

// ─────────────────────────────────────────────── 공통 도우미
const pad = (n: number, w = 3) => String(n).padStart(w, "0");
const extOf = (doc: DocType) => (["quote", "daily_production", "outgoing_cert", "report_8d"].includes(doc) ? "xlsx" : ["result_report", "minutes", "request_4m"].includes(doc) ? "docx" : "pptx");

interface ArtDef {
  id: string; title: string; doc: DocType; project: string | null; task?: string | null; owner: string; ai: boolean;
  status: StatusValue<"artifacts.status">; vers: number; sens?: Sensitivity; tpl?: string | null;
  /** 마지막 버전 시각 */
  last: At;
  /** 버전 사이 간격(일, 기본 1) */
  gap?: number;
  /** AI 초안(v1)에 적용된 규칙 */
  rules?: string[];
  /** 버전별 작성자(없으면 담당) */
  authors?: string[];
  /** 버전별 시각(없으면 마지막 시각에서 gap일씩 거꾸로) */
  times?: At[];
}

interface CorDef {
  id: string; art: string; kind: RowOf<"corrections">["diff_kind"]; before: string | null; after: string | null; reason: string | null;
  scope: Scope; conf: number; status: StatusValue<"corrections.status">; rule?: string | null; ai?: number; fin?: number;
}

interface RuleDef {
  id: string; scope: Scope; docs: DocType[]; statement: string; evidence: string[]; examples?: string[]; status: StatusValue<"rules.status">;
  approver?: string | null; from?: number | null; review?: number | null; applied?: number; overridden?: number; compiled?: string | null; created?: At; supersedes?: string | null;
}

function buildArtifacts(ctx: SeedContext, tenantKey: "crata" | "tr", defs: ArtDef[]) {
  const artifacts: R<"artifacts">[] = [];
  const versions: R<"artifact_versions">[] = [];
  for (const def of defs) {
    // L2는 AI 초안 없음(국내 경로 개통 전). 시드가 실수해도 사람 초안으로
    const a = (def.sens ?? "L1") === "L2" ? { ...def, ai: false } : def;
    const gap = a.gap ?? 1;
    const lastIso = ctx.at(a.last[0], a.last[1]);
    for (let v = 1; v <= a.vers; v += 1) {
      const dayOff = a.last[0] - gap * (a.vers - v);
      const isLast = v === a.vers;
      const kind: StatusValue<"artifact_versions.kind"> = v === 1 ? (a.ai ? "ai_draft" : a.vers === 1 && a.status === "final" ? "final" : "draft") : isLast && a.status === "final" ? "final" : "revision";
      const author = a.authors?.[v - 1] ?? a.owner;
      const t = a.times?.[v - 1];
      const created = t ? ctx.at(t[0], t[1]) : isLast ? lastIso : ctx.at(dayOff, v === 1 ? "17:30" : "11:10");
      versions.push({
        id: `av-${a.id.slice(4)}-${v}`, artifact_id: a.id, ver: v, kind, file_ref: `${FILES}/${tenantKey}/${a.id}/v${v}.${extOf(a.doc)}`,
        author_id: author, author_kind: kind === "ai_draft" ? "ai" : "member", applied_rule_ids: v === 1 && a.ai ? a.rules ?? [] : [],
        created_at: created, updated_at: created, created_by: author,
      });
    }
    artifacts.push({
      id: a.id, project_id: a.project, task_id: a.task ?? null, doc_type: a.doc, template_id: a.tpl ?? null, title: a.title, current_version: a.vers,
      file_ref: `${FILES}/${tenantKey}/${a.id}/v${a.vers}.${extOf(a.doc)}`, ai_generated: a.ai, sensitivity: a.sens ?? "L1", owner_id: a.owner, status: a.status,
      created_at: ctx.at(a.last[0] - gap * (a.vers - 1), "17:00"), updated_at: lastIso, created_by: a.owner,
    });
  }
  return { artifacts, versions };
}

function buildCorrections(defs: CorDef[], arts: R<"artifacts">[]) {
  const byId = new Map(arts.map((a) => [a.id, a]));
  return defs.map((c): R<"corrections"> => {
    const a = byId.get(c.art)!;
    return {
      id: c.id, artifact_id: c.art, ai_ver: c.ai ?? 1, final_ver: c.fin ?? a.current_version, diff_kind: c.kind, before: c.before, after: c.after,
      reason: c.reason, scope_suggested: c.scope, scope_confidence: c.conf, status: c.status, linked_rule_id: c.rule ?? null,
      created_at: a.updated_at, updated_at: a.updated_at,
    };
  });
}

function buildRules(ctx: SeedContext, defs: RuleDef[]): R<"rules">[] {
  return defs.map((r) => ({
    id: r.id, scope_level: r.scope, doc_types: r.docs, statement: r.statement, evidence_ids: r.evidence, examples: r.examples ?? [],
    compiled_to: r.compiled ?? null, approver_id: r.approver ?? null, status: r.status,
    valid_from: r.from != null ? ctx.d(r.from) : null, review_by: r.review != null ? ctx.d(r.review) : null, supersedes_id: r.supersedes ?? null,
    stats: { applied: r.applied ?? 0, overridden: r.overridden ?? 0 },
    created_at: r.created ? ctx.at(r.created[0], r.created[1]) : ctx.at(r.from ?? -1, "16:20"),
  }));
}

/** 같은 수정 재발률 등 AX 지표(6.5절): 최근 8주(월요일) */
function axKpis(ctx: SeedContext, owner: string, series: Record<"AX_REPEAT_RATE" | "AX_FIRST_PASS" | "AX_REVIEW_MIN" | "AX_ACTIVE_AI", number[]>): SeedOutput {
  const monday = weekStart(ctx.today);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(monday, -7 * (7 - i)));
  const defs = [
    { id: "AX_REPEAT_RATE", name: "같은 수정 재발률", unit: "%", source: "적용 중 규칙이 다루는 유형의 수정이 다시 나온 비율(예시)", target: null as number | null, label: null as string | null },
    { id: "AX_FIRST_PASS", name: "1차 통과율", unit: "%", source: "고친 분량 10% 이하로 승인된 산출물 비율(예시)", target: null, label: null },
    { id: "AX_REVIEW_MIN", name: "평균 검토 시간", unit: "분", source: "검토 요청부터 승인까지 걸린 시간 평균(예시)", target: null, label: null },
    { id: "AX_ACTIVE_AI", name: "주간 AI 연결 활성 인원", unit: "명", source: "한 주에 AI 연결로 기록·제출한 사람 수(예시)", target: null, label: null },
  ] as const;
  return {
    kpis: defs.map((k) => ({
      id: k.id, name: k.name, unit: k.unit, baseline: series[k.id][0]!, target: k.target, target_label: k.label, measure_source: k.source, owner_id: owner, review_cycle: "주",
    })),
    kpi_values: defs.flatMap((k) => series[k.id].map((v, i) => ({
      id: `kv-${k.id}-${weeks[i]}`, kpi_id: k.id, period: weeks[i]!, value: v, note: "예시 값이에요", recorded_at: kstIso(addDays(weeks[i]!, 6), "18:00"),
    }))),
  };
}

/** 공지 대상에 드는 사람(공지 작성자는 확인 대상에서 뺌) */
export function audienceMembers(tenant: TenantConfig, projects: RowOf<"projects">[], n: Pick<RowOf<"notices">, "audience" | "author_id">): string[] {
  const a = n.audience;
  const people = tenant.people;
  let ids: string[];
  if (!a || a.type === "all") ids = people.map((p) => p.id);
  else if (a.type === "unit") ids = people.filter((p) => (a.ids ?? []).includes(p.unitId)).map((p) => p.id);
  else if (a.type === "role") ids = people.filter((p) => (a.ids ?? []).includes(p.roleCode)).map((p) => p.id);
  else {
    const set = new Set<string>();
    for (const pid of a.ids ?? []) {
      const pr = projects.find((x) => x.id === pid);
      if (!pr) continue;
      for (const m of [pr.owner_member_id, pr.reviewer_member_id, ...pr.member_ids]) set.add(m);
    }
    ids = [...set];
  }
  return ids.filter((id) => id !== n.author_id);
}

interface NoticeDef {
  id: string; cat: StatusValue<"notices.category">; title: string; body: string; author: string; at: At; must?: boolean; pinned?: boolean;
  audience?: RowOf<"notices">["audience"]; expires?: number | null; attachments?: { name: string; url: string }[];
  /** 꼭 읽지 않은 사람 / 꼭 읽은 사람 */
  unread?: string[]; read?: string[]; ratio?: number;
}

function buildNotices(ctx: SeedContext, defs: NoticeDef[]) {
  const rng = ctx.rng("read_receipts");
  const projects = ctx.get("projects");
  const notices: R<"notices">[] = [];
  const receipts: R<"read_receipts">[] = [];
  const nowCap = Date.parse(ctx.at(0, "09:25"));
  for (const n of defs) {
    const published = ctx.at(n.at[0], n.at[1]);
    const row: R<"notices"> = {
      id: n.id, category: n.cat, title: n.title, body: n.body, author_id: n.author, audience: n.audience ?? { type: "all" }, pinned: !!n.pinned, must_read: !!n.must,
      published_at: published, expires_at: n.expires != null ? ctx.at(n.expires, "23:59") : null, attachments: n.attachments ?? [],
      created_at: published, updated_at: published, created_by: n.author,
    };
    notices.push(row);
    const targets = audienceMembers(ctx.tenant, projects, row);
    const forcedUnread = new Set(n.unread ?? []);
    const pool = rng.shuffle(targets.filter((id) => !forcedUnread.has(id) && !(n.read ?? []).includes(id)));
    const want = Math.max(0, Math.round(targets.length * (n.ratio ?? 0.7)) - (n.read ?? []).length);
    const readers = [...(n.read ?? []), ...pool.slice(0, want)];
    for (const m of readers) {
      const t = Math.min(nowCap, Date.parse(published) + rng.int(20, 60 * 30) * 60_000);
      receipts.push({ id: `rr-${n.id.slice(4)}-${m.replace(/^m-/, "")}`, notice_id: n.id, member_id: m, read_at: new Date(t).toISOString(), created_at: new Date(t).toISOString() });
    }
  }
  return { notices, read_receipts: receipts };
}

interface EvDef { id: string; title: string; kind: CalKind; day: number; from?: string; to?: string; allDay?: boolean; project?: string | null; who: string[]; vis: Vis; by: string }
function buildEvents(ctx: SeedContext, defs: EvDef[]): R<"calendar_events">[] {
  return defs.map((e) => {
    const date = ctx.d(e.day);
    const start = e.allDay ? kstIso(date, "00:00") : kstIso(date, e.from ?? "09:00");
    const end = e.allDay ? kstIso(date, "23:59") : kstIso(date, e.to ?? e.from ?? "10:00");
    return {
      id: e.id, source: "manual", external_id: null, title: e.title, kind: e.kind, start_at: start, end_at: end, all_day: !!e.allDay, project_id: e.project ?? null,
      attendee_ids: e.who, visibility: e.vis, created_by: e.by, created_at: ctx.at(Math.min(e.day, 0) - 7, "09:00"),
    };
  });
}

interface ApvDef { id: string; no: string; title: string; form: string; by: string; approver: string | null; status: StatusValue<"approval_links.status">; at: At; done?: At | null; rel?: ["task" | "project", string] | null }
function buildApprovals(ctx: SeedContext, defs: ApvDef[]): R<"approval_links">[] {
  return defs.map((a) => ({
    id: a.id, system: "예시 결재 시스템", doc_no: a.no, title: a.title, form_name: a.form, requester_id: a.by, current_approver_id: a.approver, status: a.status,
    submitted_at: ctx.at(a.at[0], a.at[1]), completed_at: a.done ? ctx.at(a.done[0], a.done[1]) : null, url: `${APPROVALS}/${a.no}`,
    related_type: a.rel?.[0] ?? null, related_id: a.rel?.[1] ?? null, created_at: ctx.at(a.at[0], a.at[1]), created_by: a.by,
  }));
}

interface MailDef {
  subject: string; from: string; partner?: string | null; project?: string | null; by?: "rule" | "ai" | "manual" | null; conf?: number | null; at: At;
  shared?: boolean; suggestion?: string | null; sStatus?: "proposed" | "accepted" | "dismissed" | null; task?: string | null;
}
function buildMail(ctx: SeedContext, prefix: string, member: string, defs: MailDef[]): R<"mail_links">[] {
  return defs.map((m, i) => {
    const id = `ml-${prefix}-${pad(i + 1, 2)}`;
    const classified = m.by === undefined ? (m.project ? "ai" : null) : m.by;
    return {
      id, member_id: member, provider_message_id: `msg-${prefix}-${pad(i + 1, 4)}`, thread_id: null, subject: m.subject, from_address: m.from,
      partner_id: m.partner ?? null, project_id: m.project ?? null, classified_by: classified,
      confidence: classified === "manual" || classified == null ? null : m.conf ?? 0.8, received_at: ctx.at(m.at[0], m.at[1]),
      suggested_task_id: m.task ?? null, shared_to_project: !!m.shared, suggestion: m.suggestion ?? null, suggestion_status: m.suggestion ? m.sStatus ?? "proposed" : null,
      created_at: ctx.at(m.at[0], m.at[1]),
    };
  });
}

interface KiDef { id: string; kind: StatusValue<"knowledge_items.kind">; title: string; summary: string; project?: string | null; owner: string; source?: string | null; verified?: number | null; review?: number | null; status: StatusValue<"knowledge_items.status">; body?: boolean }
function buildKnowledge(ctx: SeedContext, key: string, defs: KiDef[], links: [string, string, string, string, string][]) {
  const items: R<"knowledge_items">[] = defs.map((k) => ({
    id: k.id, kind: k.kind, title: k.title, summary: k.summary, body_ref: k.body === false ? null : `${DOCS}/${key}/knowledge/${k.id}`, project_id: k.project ?? null,
    owner_id: k.owner, source_ref: k.source ?? null, verified_at: k.verified != null ? ctx.d(k.verified) : null, review_by: k.review != null ? ctx.d(k.review) : null, status: k.status,
    created_at: ctx.at(Math.min(k.verified ?? -10, -1) - 3, "10:00"), created_by: k.owner,
  }));
  const kl: R<"knowledge_links">[] = links.map(([ft, fid, tt, tid, rel], i) => ({ id: `kl-${key}-${pad(i + 1, 2)}`, from_type: ft, from_id: fid, to_type: tt, to_id: tid, relation: rel }));
  return { knowledge_items: items, knowledge_links: kl };
}

// ─────────────────────────────────────────────── CRATA(crata-demo)
const CEO = "m-cr-ceo", OPS = "m-cr-ops", EL = "m-cr-edu-lead", E1 = "m-cr-edu-1", SL = "m-cr-ssi-lead", AL = "m-cr-ara-lead", A1 = "m-cr-ara-1";
const CRATA_ALL = [CEO, OPS, EL, E1, SL, AL, A1];
const P = {
  eduA: "prj-cr-edu-a", eduB: "prj-cr-edu-b", eduC: "prj-cr-edu-content", ssiA: "prj-cr-ssi-a", ssiR: "prj-cr-ssi-research",
  araCore: "prj-cr-ara-core", araPipe: "prj-cr-ara-pipeline", coreGen: "prj-cr-core-general", coreAx: "prj-cr-core-ax",
};

const CR_TEMPLATES: R<"templates">[] = [
  { id: "tpl-cr-proposal", doc_type: "proposal", name: "제안서 표준 양식", format: "PPTX", version: "v3", file_ref: `${FILES}/crata/templates/proposal-v3.pptx`, owner_id: EL, status: "active" },
  { id: "tpl-cr-curriculum", doc_type: "curriculum", name: "교안 표준 양식", format: "PPTX", version: "v2", file_ref: `${FILES}/crata/templates/curriculum-v2.pptx`, owner_id: EL, status: "active" },
  { id: "tpl-cr-result", doc_type: "result_report", name: "결과보고서 양식", format: "DOCX", version: "v1", file_ref: `${FILES}/crata/templates/result-v1.docx`, owner_id: EL, status: "active" },
  { id: "tpl-cr-quote", doc_type: "quote", name: "견적서 양식", format: "XLSX", version: "v2", file_ref: `${FILES}/crata/templates/quote-v2.xlsx`, owner_id: CEO, status: "active" },
  { id: "tpl-cr-minutes", doc_type: "minutes", name: "회의록 양식", format: "DOCX", version: "v1", file_ref: `${FILES}/crata/templates/minutes-v1.docx`, owner_id: OPS, status: "active" },
];

const CR_ARTS: ArtDef[] = [
  // 제안서 5
  { id: "art-cr-001", title: "예시기업 특강 제안서", doc: "proposal", project: P.eduA, task: "t-cr-001", owner: E1, ai: true, status: "in_review", vers: 3, tpl: "tpl-cr-proposal", last: [0, "08:30"], gap: 3, rules: ["rule-cr-02", "rule-cr-04"], times: [[-7, "17:30"], [-2, "10:10"], [0, "08:30"]] },
  { id: "art-cr-002", title: "예시고 교사 AI 활용 연수 제안서", doc: "proposal", project: P.eduB, owner: E1, ai: true, status: "final", vers: 4, tpl: "tpl-cr-proposal", last: [-38, "16:00"], gap: 2, rules: ["rule-cr-12"], authors: [E1, E1, E1, EL] },
  { id: "art-cr-003", title: "예시재단 AI 리터러시 워크숍 제안서", doc: "proposal", project: P.coreGen, task: "t-cr-045", owner: CEO, ai: true, status: "draft", vers: 2, tpl: "tpl-cr-proposal", last: [-1, "18:20"], rules: ["rule-cr-02", "rule-cr-04"] },
  { id: "art-cr-004", title: "예시교육지원청 관리자 연수 제안서", doc: "proposal", project: P.ssiA, owner: SL, ai: true, status: "final", vers: 3, sens: "L2", tpl: "tpl-cr-proposal", last: [-20, "15:30"], gap: 2, rules: ["rule-cr-02"], authors: [SL, SL, CEO] },
  { id: "art-cr-005", title: "기업 특강 제안서 표본", doc: "proposal", project: P.eduC, owner: EL, ai: false, status: "final", vers: 2, tpl: "tpl-cr-proposal", last: [-45, "11:00"], gap: 5, authors: [EL, CEO] },
  // 교안 6
  { id: "art-cr-006", title: "특강 교안 1차 슬라이드", doc: "curriculum", project: P.eduA, task: "t-cr-033", owner: E1, ai: true, status: "draft", vers: 2, tpl: "tpl-cr-curriculum", last: [-1, "17:40"], gap: 2, rules: ["rule-cr-03", "rule-cr-05", "rule-cr-06", "rule-cr-07"] },
  { id: "art-cr-007", title: "예시고 연수 1차시 교안", doc: "curriculum", project: P.eduB, task: "t-cr-012", owner: E1, ai: true, status: "final", vers: 3, tpl: "tpl-cr-curriculum", last: [-8, "16:30"], gap: 3, rules: ["rule-cr-03", "rule-cr-05"], authors: [E1, E1, EL] },
  { id: "art-cr-008", title: "예시고 연수 2차시 교안", doc: "curriculum", project: P.eduB, task: "t-cr-002", owner: E1, ai: true, status: "in_review", vers: 3, tpl: "tpl-cr-curriculum", last: [-1, "17:05"], gap: 2, rules: ["rule-cr-03", "rule-cr-05", "rule-cr-06"] },
  { id: "art-cr-009", title: "표준 교안: 생성형 AI 기초", doc: "curriculum", project: P.eduC, task: "t-cr-013", owner: EL, ai: true, status: "final", vers: 4, tpl: "tpl-cr-curriculum", last: [-6, "15:00"], gap: 3, rules: ["rule-cr-03", "rule-cr-06"], authors: [EL, EL, E1, CEO] },
  { id: "art-cr-010", title: "실습 예제 프롬프트 10종", doc: "curriculum", project: P.eduC, task: "t-cr-014", owner: E1, ai: false, status: "final", vers: 2, tpl: "tpl-cr-curriculum", last: [-12, "16:10"], gap: 3, authors: [E1, EL] },
  { id: "art-cr-011", title: "관리자 연수 커리큘럼 1차안", doc: "curriculum", project: P.ssiA, task: "t-cr-005", owner: SL, ai: true, status: "in_review", vers: 2, sens: "L2", tpl: "tpl-cr-curriculum", last: [-1, "16:00"], gap: 3, rules: ["rule-cr-07"] },
  // 결과보고서 3
  { id: "art-cr-012", title: "8월 강의 만족도 결과 분석", doc: "result_report", project: P.eduC, task: "t-cr-046", owner: EL, ai: true, status: "draft", vers: 2, tpl: "tpl-cr-result", last: [-1, "14:20"], gap: 2, rules: ["rule-cr-08"] },
  { id: "art-cr-013", title: "예시고 연수 1차 결과보고서", doc: "result_report", project: P.eduB, owner: E1, ai: false, status: "final", vers: 3, tpl: "tpl-cr-result", last: [-5, "11:30"], gap: 2, authors: [E1, E1, EL] },
  { id: "art-cr-014", title: "아라 평가 세트 9월 결과보고", doc: "result_report", project: P.araCore, task: "t-cr-008", owner: AL, ai: false, status: "in_review", vers: 2, tpl: "tpl-cr-result", last: [-2, "18:00"], gap: 2 },
  // 견적서 3(견적 화면 quotes.artifact_id와 연결: q-cr-01 · q-cr-02 · q-cr-05)
  { id: "art-cr-quote-01", title: "예시재단 AI 리터러시 워크숍 견적서", doc: "quote", project: P.coreGen, owner: CEO, ai: false, status: "final", vers: 2, sens: "L2", tpl: "tpl-cr-quote", last: [-6, "10:00"], gap: 2, authors: [EL, CEO] },
  { id: "art-cr-quote-02", title: "예시기업 팀장 대상 AI 업무 활용 과정 견적서", doc: "quote", project: P.coreGen, owner: CEO, ai: true, status: "final", vers: 3, sens: "L2", tpl: "tpl-cr-quote", last: [-15, "13:00"], gap: 2, rules: ["rule-cr-04"] },
  { id: "art-cr-quote-03", title: "예시기업 임원 특강 견적서", doc: "quote", project: P.eduA, owner: EL, ai: false, status: "final", vers: 2, sens: "L2", tpl: "tpl-cr-quote", last: [-40, "14:00"], gap: 2, authors: [EL, CEO] },
  // 회의록 1
  { id: "art-cr-018", title: "9월 4주 주간 회의록", doc: "minutes", project: P.coreGen, owner: OPS, ai: true, status: "final", vers: 2, tpl: "tpl-cr-minutes", last: [-8, "17:00"], gap: 1, rules: ["rule-cr-09"], authors: [OPS, CEO] },
];

const CR_CORS: CorDef[] = [
  // art-cr-001 (앵커: 근거 cor-cr-001~004 → rule-cr-01 승인 대기)
  { id: "cor-cr-001", art: "art-cr-001", kind: "insert", before: "교육 목표", after: "교육 목표(3줄 요약)", reason: "검토 의견: 첫 장에 교육 목표를 3줄로 요약해 주세요", scope: "writing_rule", conf: 0.81, status: "grouped", rule: "rule-cr-01" },
  { id: "cor-cr-002", art: "art-cr-001", kind: "replace", before: "본 과정은 임원 여러분께 생성형 AI의 개념과 국내외 활용 사례, 도입 시 고려 사항을 폭넓게 소개하는 것을 목표로 합니다.", after: "임원이 3시간 안에 생성형 AI 도입 판단 기준을 세워요.", reason: "첫 장 개요가 길어서 한 문장으로 줄였어요", scope: "writing_rule", conf: 0.74, status: "grouped", rule: "rule-cr-01" },
  { id: "cor-cr-003", art: "art-cr-001", kind: "move", before: "교육 목표(3쪽)", after: "교육 목표(1쪽)", reason: null, scope: "writing_rule", conf: 0.69, status: "grouped", rule: "rule-cr-01" },
  { id: "cor-cr-004", art: "art-cr-001", kind: "delete", before: "목차(2쪽)", after: null, reason: "첫 장 요약이 있어 목차 쪽은 뺐어요", scope: "writing_rule", conf: 0.58, status: "grouped", rule: "rule-cr-01" },
  // art-cr-002
  { id: "cor-cr-005", art: "art-cr-002", kind: "replace", before: "회사 소개(1~2쪽)", after: "학교가 겪는 문제: 연수 준비 시간이 부족해요(1쪽)", reason: "제안서는 고객 문제로 시작해요", scope: "writing_rule", conf: 0.86, status: "promoted", rule: "rule-cr-02", fin: 4 },
  { id: "cor-cr-006", art: "art-cr-002", kind: "move", before: "회사 소개(2쪽)", after: "부록: 회사 소개", reason: "회사 소개는 부록으로", scope: "writing_rule", conf: 0.79, status: "promoted", rule: "rule-cr-02", fin: 4 },
  { id: "cor-cr-007", art: "art-cr-002", kind: "replace", before: "연수비 120만 원", after: "연수비 120만 원(부가세 포함)", reason: "부가세 포함 여부를 적어요", scope: "writing_rule", conf: 0.72, status: "promoted", rule: "rule-cr-04", fin: 4 },
  { id: "cor-cr-008", art: "art-cr-002", kind: "replace", before: "교사 30명", after: "교사 20명", reason: "고객이 알려 준 인원으로 고쳤어요", scope: "one_off", conf: 0.91, status: "dismissed", fin: 4 },
  // art-cr-003
  { id: "cor-cr-009", art: "art-cr-003", kind: "replace", before: "AI 리터러시란 무엇인가", after: "재단 직원이 매일 쓰는 문서 업무부터 바꿔요", reason: null, scope: "writing_rule", conf: 0.66, status: "new" },
  { id: "cor-cr-010", art: "art-cr-003", kind: "replace", before: "워크숍 4시간", after: "워크숍 3시간 + 사후 상담 1시간", reason: "재단 요청 일정에 맞췄어요", scope: "one_off", conf: 0.88, status: "new" },
  // art-cr-004
  { id: "cor-cr-011", art: "art-cr-004", kind: "replace", before: "회사 소개", after: "기관이 준비해야 할 일: 시행 일정과 서식", reason: "기관 협의 메모 반영", scope: "writing_rule", conf: 0.77, status: "promoted", rule: "rule-cr-02" },
  { id: "cor-cr-012", art: "art-cr-004", kind: "insert", before: null, after: "참고 법령: 관련 법률·시행령 조문 번호", reason: "근거 조문을 붙여요", scope: "writing_rule", conf: 0.63, status: "new" },
  { id: "cor-cr-013", art: "art-cr-004", kind: "replace", before: "연수 2회 총 8시간", after: "연수 2회 총 6시간", reason: "기관 협의 결과", scope: "one_off", conf: 0.9, status: "dismissed" },
  // art-cr-006
  { id: "cor-cr-014", art: "art-cr-006", kind: "insert", before: null, after: "실습 1 따라 하기: ① 문서 붙여넣기 ② 요약 지시 ③ 결과 확인", reason: null, scope: "writing_rule", conf: 0.83, status: "promoted", rule: "rule-cr-05" },
  { id: "cor-cr-015", art: "art-cr-006", kind: "replace", before: "본문 14pt", after: "본문 18pt", reason: "강의장 뒤에서도 읽히게", scope: "template", conf: 0.92, status: "promoted", rule: "rule-cr-03" },
  // art-cr-007
  { id: "cor-cr-016", art: "art-cr-007", kind: "insert", before: null, after: "수업 적용 예시: 수행평가 안내문을 AI로 다듬기", reason: "교사 연수에는 수업 적용 예시가 필요해요", scope: "writing_rule", conf: 0.78, status: "grouped", rule: "rule-cr-10" },
  { id: "cor-cr-017", art: "art-cr-007", kind: "insert", before: "프롬프트", after: "프롬프트(AI에게 주는 지시문)", reason: "용어 첫 등장에 설명", scope: "writing_rule", conf: 0.85, status: "promoted", rule: "rule-cr-06" },
  { id: "cor-cr-018", art: "art-cr-007", kind: "replace", before: "학습 목표(마지막 쪽)", after: "학습 목표(모듈 첫 쪽)", reason: null, scope: "template", conf: 0.71, status: "promoted", rule: "rule-cr-07" },
  // art-cr-008
  { id: "cor-cr-019", art: "art-cr-008", kind: "insert", before: null, after: "수업 적용 예시: 학급 공지문 초안 만들기", reason: "1차시와 같은 의견", scope: "writing_rule", conf: 0.8, status: "grouped", rule: "rule-cr-10" },
  { id: "cor-cr-020", art: "art-cr-008", kind: "insert", before: null, after: "실습 2 따라 하기 순서 번호", reason: null, scope: "writing_rule", conf: 0.82, status: "promoted", rule: "rule-cr-05" },
  { id: "cor-cr-021", art: "art-cr-008", kind: "replace", before: "본문 16pt", after: "본문 18pt", reason: "규칙이 있는데도 작게 나왔어요", scope: "template", conf: 0.9, status: "promoted", rule: "rule-cr-03" },
  // art-cr-009
  { id: "cor-cr-022", art: "art-cr-009", kind: "insert", before: "할루시네이션", after: "할루시네이션(그럴듯하지만 틀린 답)", reason: null, scope: "writing_rule", conf: 0.87, status: "promoted", rule: "rule-cr-06" },
  { id: "cor-cr-023", art: "art-cr-009", kind: "replace", before: "사례 12개", after: "사례 6개(업무별 2개씩)", reason: "분량 조정", scope: "one_off", conf: 0.64, status: "dismissed" },
  { id: "cor-cr-024", art: "art-cr-009", kind: "move", before: "학습 목표(4쪽)", after: "학습 목표(모듈 첫 쪽)", reason: null, scope: "template", conf: 0.76, status: "promoted", rule: "rule-cr-07" },
  { id: "cor-cr-025", art: "art-cr-009", kind: "insert", before: null, after: "출처: 공개 보고서 이름과 발행 연도", reason: "교안 출처 표기 기준", scope: "writing_rule", conf: 0.7, status: "new" },
  // art-cr-011
  { id: "cor-cr-026", art: "art-cr-011", kind: "replace", before: "1회차 4시간", after: "1회차 3시간", reason: "기관 일정", scope: "one_off", conf: 0.89, status: "new" },
  { id: "cor-cr-027", art: "art-cr-011", kind: "insert", before: null, after: "회차별 학습 목표 3개", reason: null, scope: "template", conf: 0.73, status: "promoted", rule: "rule-cr-07" },
  // art-cr-012
  { id: "cor-cr-028", art: "art-cr-012", kind: "replace", before: "만족도 4.5점", after: "만족도 4.5점(응답 42명)", reason: "응답 수를 같이 적어요", scope: "writing_rule", conf: 0.84, status: "promoted", rule: "rule-cr-08" },
  { id: "cor-cr-029", art: "art-cr-012", kind: "insert", before: null, after: "핵심 숫자 3개 표(만족도·응답 수·재수강 의향)", reason: "첫 쪽에서 한눈에 보이게", scope: "template", conf: 0.68, status: "grouped", rule: "rule-cr-11" },
  // art-cr-014
  { id: "cor-cr-030", art: "art-cr-014", kind: "insert", before: null, after: "핵심 숫자 3개 표(정답률·평균 응답 길이·재질문 비율)", reason: null, scope: "template", conf: 0.66, status: "grouped", rule: "rule-cr-11" },
  { id: "cor-cr-031", art: "art-cr-014", kind: "replace", before: "30문항 중 24문항 통과", after: "30문항 중 24문항 통과(80%)", reason: null, scope: "writing_rule", conf: 0.6, status: "new" },
  // art-cr-quote-02
  { id: "cor-cr-032", art: "art-cr-quote-02", kind: "insert", before: "합계", after: "합계(부가세 포함)", reason: null, scope: "writing_rule", conf: 0.88, status: "promoted", rule: "rule-cr-04" },
  { id: "cor-cr-033", art: "art-cr-quote-02", kind: "replace", before: "일정·장소 문단", after: "일정·장소 표", reason: "표로 보는 게 빨라요", scope: "writing_rule", conf: 0.75, status: "promoted", rule: "rule-cr-04" },
  { id: "cor-cr-034", art: "art-cr-quote-02", kind: "replace", before: "유효기간 60일", after: "유효기간 30일", reason: "이번 견적만", scope: "one_off", conf: 0.93, status: "dismissed" },
  // art-cr-018
  { id: "cor-cr-035", art: "art-cr-018", kind: "replace", before: "실습 비중 논의함", after: "실습 비중을 60%로 하기로 했어요", reason: "결정은 문장으로", scope: "writing_rule", conf: 0.86, status: "promoted", rule: "rule-cr-09" },
  { id: "cor-cr-036", art: "art-cr-018", kind: "insert", before: "예제 준비", after: "예제 준비 · 담당 이몽룡 · 10월 2일까지", reason: "할 일에 담당·기한", scope: "writing_rule", conf: 0.83, status: "promoted", rule: "rule-cr-09" },
];

const CR_RULES: RuleDef[] = [
  { id: "rule-cr-01", scope: "writing_rule", docs: ["proposal"], statement: "제안서 첫 장에 교육 목표를 3줄로 요약해요", evidence: ["cor-cr-001", "cor-cr-002", "cor-cr-003", "cor-cr-004"], examples: ["전: 교육 목표 → 후: 교육 목표(3줄 요약)"], status: "candidate", approver: EL, created: [-1, "16:20"] },
  { id: "rule-cr-02", scope: "writing_rule", docs: ["proposal"], statement: "제안서 첫 장은 고객이 겪는 문제로 시작하고, 회사 소개는 부록으로 옮겨요", evidence: ["cor-cr-005", "cor-cr-006", "cor-cr-011"], examples: ["전: 회사 소개(1~2쪽) → 후: 학교가 겪는 문제(1쪽)"], status: "active", approver: EL, from: -42, review: 48, applied: 14, overridden: 1, compiled: "제안서 작성 규칙 v3" },
  { id: "rule-cr-03", scope: "template", docs: ["proposal", "curriculum"], statement: "슬라이드 본문 글자는 18pt 아래로 내리지 않아요", evidence: ["cor-cr-015", "cor-cr-021"], examples: ["전: 본문 14pt → 후: 본문 18pt"], status: "active", approver: EL, from: -35, review: 55, applied: 22, overridden: 2, compiled: "교안 표준 양식 v2" },
  { id: "rule-cr-04", scope: "writing_rule", docs: ["proposal", "quote"], statement: "일정·금액은 표로 정리하고 부가세 포함 여부를 적어요", evidence: ["cor-cr-007", "cor-cr-032", "cor-cr-033"], examples: ["전: 합계 → 후: 합계(부가세 포함)"], status: "active", approver: CEO, from: -50, review: 40, applied: 11, overridden: 0, compiled: "견적서 작성 규칙 v2" },
  { id: "rule-cr-05", scope: "writing_rule", docs: ["curriculum"], statement: "실습 쪽마다 따라 할 순서를 번호로 적어요", evidence: ["cor-cr-014", "cor-cr-020"], status: "active", approver: EL, from: -30, review: 60, applied: 9, overridden: 1, compiled: "교안 작성 규칙 v2" },
  { id: "rule-cr-06", scope: "writing_rule", docs: ["curriculum"], statement: "용어는 처음 나올 때 한 줄 설명을 붙여요", evidence: ["cor-cr-017", "cor-cr-022"], examples: ["전: 프롬프트 → 후: 프롬프트(AI에게 주는 지시문)"], status: "active", approver: EL, from: -28, review: 62, applied: 12, overridden: 3, compiled: "교안 작성 규칙 v2" },
  { id: "rule-cr-07", scope: "template", docs: ["curriculum"], statement: "모듈 첫 쪽에 학습 목표 3개를 같은 자리에 둬요", evidence: ["cor-cr-018", "cor-cr-024", "cor-cr-027"], status: "active", approver: EL, from: -21, review: 69, applied: 8, overridden: 0, compiled: "교안 표준 양식 v2" },
  { id: "rule-cr-08", scope: "writing_rule", docs: ["result_report"], statement: "만족도는 응답 수와 함께 적어요", evidence: ["cor-cr-028"], examples: ["전: 만족도 4.5점 → 후: 만족도 4.5점(응답 42명)"], status: "active", approver: EL, from: -14, review: 76, applied: 4, overridden: 0, compiled: "결과보고서 작성 규칙 v1" },
  { id: "rule-cr-09", scope: "writing_rule", docs: ["minutes"], statement: "결정은 '~하기로 했어요'로, 할 일은 담당·기한과 함께 적어요", evidence: ["cor-cr-035", "cor-cr-036"], status: "active", approver: CEO, from: -7, review: 83, applied: 3, overridden: 0, compiled: "회의록 작성 규칙 v1" },
  { id: "rule-cr-10", scope: "writing_rule", docs: ["curriculum"], statement: "교사 연수 교안에는 수업 적용 예시를 한 쪽 이상 넣어요", evidence: ["cor-cr-016", "cor-cr-019"], status: "candidate", approver: EL, created: [-2, "11:00"] },
  { id: "rule-cr-11", scope: "template", docs: ["result_report"], statement: "결과보고서 첫 쪽에 핵심 숫자 3개를 표로 둬요", evidence: ["cor-cr-029", "cor-cr-030"], status: "candidate", approver: EL, created: [-1, "15:10"] },
  { id: "rule-cr-12", scope: "writing_rule", docs: ["proposal"], statement: "제안서 분량은 15쪽 안으로 맞춰요", evidence: [], status: "paused", approver: EL, from: -60, review: 30, applied: 12, overridden: 5, compiled: "제안서 작성 규칙 v2" },
];

const CR_NOTICES: NoticeDef[] = [
  {
    id: "ntc-cr-01", cat: "general", title: "10월 전사 회의 일정 안내", author: OPS, at: [-2, "10:00"], must: true, unread: [EL],
    body: "10월 전사 회의는 10월 14일(수) 오전 10시에 열어요.\n안건은 하반기 사업 점검, 워크사이트 내부 적용 결과, 연말 교육 일정이에요.\n안건을 더하고 싶으면 10월 12일까지 경영지원 담당에게 알려 주세요.",
    attachments: [{ name: "10월 전사 회의 안건(초안)", url: `${DOCS}/crata/notices/2026-10-meeting` }],
  },
  {
    id: "ntc-cr-02", cat: "policy", title: "AI 연결 사용 기준 안내", author: OPS, at: [-8, "09:30"], must: true, pinned: true, read: [EL],
    body: "업무사이트에 개인 AI를 연결할 때는 '읽기 전용'부터 시작해요.\n고객 비밀(L2) 자료는 국내 경로가 열리기 전까지 AI 연결로 다루지 않아요.\n연결과 해제는 '내 AI 연결'에서 언제든 할 수 있어요.",
    attachments: [{ name: "AI 연결 정책 안내 v1", url: `${DOCS}/crata/policies/ai-connection-v1` }],
  },
  { id: "ntc-cr-03", cat: "system", title: "업무사이트 내부 적용을 시작해요", author: OPS, at: [-15, "09:00"], body: "9월 15일부터 업무사이트를 CRATA 안에서 먼저 써요.\n불편한 점은 경영지원 담당에게 편하게 알려 주세요." },
  { id: "ntc-cr-04", cat: "event", title: "10월 둘째 주 워크사이트 사용 교육", author: OPS, at: [-1, "15:00"], expires: 13, body: "10월 13일(화) 오후 2시에 워크사이트 사용 교육을 해요.\n업무 제출, 검토, AI 연결 방법을 한 시간 동안 같이 해 봐요." },
  { id: "ntc-cr-05", cat: "general", title: "개천절·한글날 휴무 안내", author: OPS, at: [-5, "11:00"], expires: 9, body: "10월 3일(토) 개천절, 10월 5일(월) 대체공휴일, 10월 9일(금) 한글날은 쉬어요.\n그 주에 잡힌 강의 일정은 각 리드가 고객과 다시 확인해 주세요." },
  { id: "ntc-cr-06", cat: "policy", title: "출장비 정산 기준을 바꿔요", author: OPS, at: [-20, "14:00"], ratio: 0.85, body: "10월 출장부터 교통비는 영수증 사진만 올리면 돼요.\n식비는 하루 한도 안에서 실비로 정산해요." },
  { id: "ntc-cr-07", cat: "event", title: "8월 강의 만족도 공유회", author: EL, at: [-22, "10:30"], audience: { type: "unit", ids: ["U_EDU", "U_CEO"] }, body: "8월 강의 만족도 결과를 함께 봐요.\n좋았던 점과 고칠 점을 다음 교안에 반영해요." },
  { id: "ntc-cr-08", cat: "system", title: "회의 자동 분류 신뢰도 기준을 0.85로 바꿨어요", author: AL, at: [-6, "17:00"], audience: { type: "project", ids: [P.araPipe, P.coreAx] }, body: "자동 분류 신뢰도가 0.85보다 낮은 구간은 '확인 필요'로 보내요.\n분류 확인 화면에서 하루 안에 처리해 주세요." },
];

const CR_EVENTS: EvDef[] = [
  { id: "ev-cr-01", title: "10월 전사 회의", kind: "company", day: 14, from: "10:00", to: "11:30", who: CRATA_ALL, vis: "company", by: OPS },
  { id: "ev-cr-02", title: "개천절 휴무", kind: "company", day: 3, allDay: true, who: [], vis: "company", by: OPS },
  { id: "ev-cr-02b", title: "개천절 대체공휴일", kind: "company", day: 5, allDay: true, who: [], vis: "company", by: OPS },
  { id: "ev-cr-02c", title: "추석 연휴", kind: "company", day: -6, allDay: true, who: [], vis: "company", by: OPS },
  { id: "ev-cr-02d", title: "추석", kind: "company", day: -5, allDay: true, who: [], vis: "company", by: OPS },
  { id: "ev-cr-02e", title: "추석 연휴", kind: "company", day: -4, allDay: true, who: [], vis: "company", by: OPS },
  { id: "ev-cr-03", title: "한글날 휴무", kind: "company", day: 9, allDay: true, who: [], vis: "company", by: OPS },
  { id: "ev-cr-04", title: "워크사이트 사용 교육", kind: "training", day: 13, from: "14:00", to: "15:00", project: P.coreAx, who: CRATA_ALL, vis: "company", by: OPS },
  { id: "ev-cr-05", title: "예시기업 임원 특강(본 강의)", kind: "training", day: 16, from: "14:00", to: "17:00", project: P.eduA, who: [EL, E1, CEO], vis: "company", by: EL },
  { id: "ev-cr-06", title: "예시고 교사 연수 2차시", kind: "training", day: 2, from: "15:00", to: "17:00", project: P.eduB, who: [E1, EL], vis: "company", by: E1 },
  { id: "ev-cr-07", title: "예시고 교사 연수 3차시", kind: "training", day: 23, from: "15:00", to: "17:00", project: P.eduB, who: [E1, EL], vis: "company", by: E1 },
  { id: "ev-cr-08", title: "예시재단 제안서 제출", kind: "due", day: 7, allDay: true, project: P.coreGen, who: [CEO], vis: "company", by: CEO },
  { id: "ev-cr-09", title: "예시재단 사전 미팅(외부)", kind: "meeting", day: 1, from: "10:00", to: "11:00", project: P.coreGen, who: [CEO, EL], vis: "company", by: CEO },
  { id: "ev-cr-10", title: "예시교육지원청 2차 협의", kind: "meeting", day: 8, from: "14:00", to: "15:30", project: P.ssiA, who: [SL, CEO], vis: "private", by: SL },
  { id: "ev-cr-11", title: "아라 배포", kind: "company", day: 6, allDay: true, project: P.araCore, who: [AL, A1], vis: "team", by: AL },
  { id: "ev-cr-12", title: "관리자 연수 커리큘럼 기관 송부", kind: "due", day: 5, allDay: true, project: P.ssiA, who: [SL], vis: "private", by: SL },
  { id: "ev-cr-13", title: "9월 비용 마감", kind: "due", day: 0, allDay: true, project: P.coreGen, who: [OPS], vis: "company", by: OPS },
  { id: "ev-cr-14", title: "분기 결산 자료 제출", kind: "due", day: 10, allDay: true, project: P.coreGen, who: [OPS, CEO], vis: "team", by: OPS },
  { id: "ev-cr-15", title: "아라 평가 세트 리뷰", kind: "meeting", day: 1, from: "15:00", to: "16:00", project: P.araCore, who: [AL, A1], vis: "team", by: AL },
  { id: "ev-cr-16", title: "교안 디자인 시안 리뷰(예시디자인)", kind: "meeting", day: 2, from: "11:00", to: "12:00", project: P.eduC, who: [EL, E1], vis: "team", by: EL },
  { id: "ev-cr-17", title: "강사 역량 워크숍", kind: "training", day: 21, from: "13:00", to: "17:00", project: P.eduC, who: [EL, E1, CEO], vis: "company", by: EL },
  { id: "ev-cr-18", title: "하반기 채용 공고 게시", kind: "company", day: 15, allDay: true, project: P.coreGen, who: [CEO, OPS], vis: "company", by: CEO },
  { id: "ev-cr-19", title: "예시고 연수 결과보고서 제출", kind: "due", day: 28, allDay: true, project: P.eduB, who: [E1, EL], vis: "company", by: EL },
  { id: "ev-cr-20", title: "노트북·마이크 장비 점검", kind: "inspection", day: 15, from: "10:00", to: "11:00", project: P.eduA, who: [E1], vis: "team", by: E1 },
  { id: "ev-cr-21", title: "외근(오후)", kind: "meeting", day: 1, from: "13:00", to: "18:00", who: [E1], vis: "private", by: E1 },
  { id: "ev-cr-22", title: "정책 세미나 참석(외부)", kind: "training", day: -1, from: "13:00", to: "17:00", project: P.ssiR, who: [SL], vis: "company", by: SL },
  { id: "ev-cr-23", title: "8월 강의 만족도 공유회", kind: "company", day: -22, from: "10:30", to: "11:30", project: P.eduC, who: [EL, E1, CEO], vis: "company", by: EL },
  { id: "ev-cr-24", title: "워크사이트 내부 적용 시작", kind: "company", day: -15, allDay: true, project: P.coreAx, who: CRATA_ALL, vis: "company", by: OPS },
  { id: "ev-cr-25", title: "AI 연결 정책 설명회", kind: "training", day: -8, from: "16:00", to: "16:40", project: P.coreAx, who: CRATA_ALL, vis: "company", by: OPS },
];

const CR_APPROVALS: ApvDef[] = [
  { id: "apv-cr-01", no: "EX-2026-0931", title: "예시기업 특강 보조 강사료 지급", form: "지출결의서", by: EL, approver: CEO, status: "pending", at: [-1, "16:40"], rel: ["task", "t-cr-034"] },
  { id: "apv-cr-02", no: "EX-2026-0934", title: "예시고 연수 출장(10월 2일)", form: "출장신청서", by: E1, approver: EL, status: "pending", at: [0, "08:50"], rel: ["project", P.eduB] },
  { id: "apv-cr-03", no: "EX-2026-0927", title: "교안 디자인 외주 비용", form: "지출결의서", by: EL, approver: CEO, status: "pending", at: [-2, "11:20"], rel: ["project", P.eduC] },
  { id: "apv-cr-04", no: "EX-2026-0925", title: "회의 녹음 기기 2대 구매", form: "구매요청서", by: AL, approver: CEO, status: "pending", at: [-3, "10:05"], rel: ["project", P.araPipe] },
  { id: "apv-cr-05", no: "EX-2026-0911", title: "9월 협업 도구 구독료", form: "지출결의서", by: OPS, approver: null, status: "approved", at: [-14, "09:40"], done: [-13, "10:10"], rel: ["task", "t-cr-019"] },
  { id: "apv-cr-06", no: "EX-2026-0915", title: "예시기업 특강 교재 인쇄", form: "구매요청서", by: E1, approver: null, status: "approved", at: [-10, "14:00"], done: [-9, "11:30"], rel: ["project", P.eduA] },
  { id: "apv-cr-07", no: "EX-2026-0908", title: "기관 협의 출장(9월 17일)", form: "출장신청서", by: SL, approver: null, status: "approved", at: [-16, "09:00"], done: [-15, "13:00"], rel: ["project", P.ssiA] },
  { id: "apv-cr-08", no: "EX-2026-0921", title: "아라 테스트 서버 추가 비용", form: "지출결의서", by: A1, approver: AL, status: "rejected", at: [-6, "15:20"], done: [-5, "10:00"], rel: ["project", P.araCore] },
  { id: "apv-cr-09", no: "EX-2026-0929", title: "워크사이트 교육 다과", form: "구매요청서", by: OPS, approver: null, status: "withdrawn", at: [-4, "13:00"], done: [-3, "09:20"], rel: ["project", P.coreAx] },
  { id: "apv-cr-10", no: "EX-2026-0933", title: "예시고 연수 실습 키트 구매", form: "구매요청서", by: E1, approver: EL, status: "pending", at: [-1, "10:15"], rel: ["task", "t-cr-035"] },
];

const CR_MAIL_EL: MailDef[] = [
  { subject: "예시고 연수 일정 조정 요청", from: "school.teacher@example.com", partner: "p-cr-school", project: P.eduB, by: "rule", conf: 0.97, at: [-2, "09:12"], shared: true, suggestion: "연수 일정 재조정 회신하기", sStatus: "accepted", task: "t-cr-036" },
  { subject: "[예시기업] 특강 참석자 명단 공유드립니다", from: "corp.hr@example.com", partner: "p-cr-corp", project: P.eduA, by: "rule", conf: 0.99, at: [0, "08:05"], shared: true, suggestion: "참석자 명단으로 좌석 배치표 만들기" },
  { subject: "[예시기업] 특강 장소 사진 보내드립니다", from: "corp.hr@example.com", partner: "p-cr-corp", project: P.eduA, by: "ai", conf: 0.91, at: [-1, "15:40"] },
  { subject: "연수 사전 설문 문항 의견", from: "school.teacher@example.com", partner: "p-cr-school", project: P.eduB, by: "ai", conf: 0.88, at: [-1, "11:02"], suggestion: "설문 문항 의견 반영하기" },
  { subject: "교안 디자인 시안 2차", from: "design.pm@example.com", partner: "p-cr-design", project: P.eduC, by: "rule", conf: 0.95, at: [-1, "18:30"], suggestion: "디자인 시안 의견 회신하기" },
  { subject: "교안 디자인 비용 안내", from: "design.pm@example.com", partner: "p-cr-design", project: P.eduC, by: "ai", conf: 0.84, at: [-3, "10:20"] },
  { subject: "[예시기업] 특강 사전 과제 문의", from: "corp.hr@example.com", partner: "p-cr-corp", project: P.eduA, by: "ai", conf: 0.86, at: [0, "07:50"], suggestion: "사전 과제 안내문 먼저 보내기" },
  { subject: "예시고 연수 장소 변경 안내", from: "school.office@example.com", partner: "p-cr-school", project: P.eduB, by: "rule", conf: 0.96, at: [-4, "13:15"], suggestion: "연수 장소 변경을 일정에 반영하기", sStatus: "dismissed" },
  { subject: "강의 만족도 설문 결과 파일", from: "survey.tool@example.com", project: P.eduC, by: "ai", conf: 0.72, at: [-5, "09:00"] },
  { subject: "AI 리터러시 워크숍 문의드립니다", from: "found.office@example.com", partner: "p-cr-found", project: null, by: null, at: [-1, "09:30"] },
  { subject: "교육 세미나 초청 안내", from: "seminar.info@example.com", project: null, by: null, at: [-2, "14:00"] },
  { subject: "교육 플랫폼 계정 만료 안내", from: "noreply.platform@example.com", project: null, by: null, at: [-3, "08:00"] },
  { subject: "[예시기업] 특강 일정 확정 회신", from: "corp.hr@example.com", partner: "p-cr-corp", project: P.eduA, by: "rule", conf: 0.99, at: [-9, "16:10"], shared: true },
  { subject: "예시고 연수 2차시 자료 요청", from: "school.teacher@example.com", partner: "p-cr-school", project: P.eduB, by: "ai", conf: 0.9, at: [0, "08:20"], suggestion: "2차시 실습지 보내 드리기" },
  { subject: "디자인 원본 파일 전달", from: "design.pm@example.com", partner: "p-cr-design", project: P.eduC, by: "rule", conf: 0.94, at: [-6, "17:20"] },
  { subject: "연수 이수증 양식 문의", from: "school.office@example.com", partner: "p-cr-school", project: P.eduB, by: "manual", at: [-7, "10:40"] },
  { subject: "연말 교육 수요 조사", from: "edu.research@example.com", project: null, by: null, at: [-4, "16:30"] },
  { subject: "[예시기업] 회의실 출입 등록 안내", from: "corp.ga@example.com", partner: "p-cr-corp", project: P.eduA, by: "rule", conf: 0.97, at: [-2, "17:45"], suggestion: "출입 등록 명단 보내기", sStatus: "dismissed" },
];
const CR_MAIL_CEO: MailDef[] = [
  { subject: "예시재단 워크숍 미팅 일정", from: "found.office@example.com", partner: "p-cr-found", project: P.coreGen, by: "ai", conf: 0.82, at: [-3, "10:00"], shared: true, suggestion: "미팅 전 제안 방향 메모 마무리하기", sStatus: "accepted", task: "t-cr-045" },
  { subject: "AI 바우처 공고 안내", from: "notice.agency@example.com", project: P.coreGen, by: "ai", conf: 0.7, at: [-2, "09:10"], suggestion: "바우처 공고 확인하기", sStatus: "accepted", task: "t-cr-030" },
  { subject: "관리자 연수 협의 일정", from: "office.edu@example.com", partner: "p-cr-edu-office", project: P.ssiA, by: "rule", conf: 0.95, at: [-1, "13:30"] },
  { subject: "세무 자료 제출 요청", from: "tax.office@example.com", project: P.coreGen, by: "rule", conf: 0.9, at: [-4, "11:00"] },
  { subject: "협업 도구 결제 안내", from: "billing.tool@example.com", project: P.coreGen, by: "rule", conf: 0.93, at: [-6, "07:00"], suggestion: "결제 내역을 비용 정리에 넣기", sStatus: "dismissed" },
  { subject: "재단 담당자 연락처 변경", from: "found.office@example.com", partner: "p-cr-found", project: null, by: null, at: [-1, "17:05"] },
  { subject: "산업 행사 초청", from: "event.info@example.com", project: null, by: null, at: [-5, "15:00"] },
  { subject: "사내 AX 교육 장소 안내", from: "space.rent@example.com", project: P.coreAx, by: "ai", conf: 0.8, at: [-2, "16:20"] },
  { subject: "예시기업 특강 진행 확인", from: "corp.hr@example.com", partner: "p-cr-corp", project: P.eduA, by: "rule", conf: 0.98, at: [-8, "10:30"], shared: true },
  { subject: "아라 데모 요청", from: "partner.lab@example.com", project: P.araCore, by: "ai", conf: 0.74, at: [0, "08:45"], suggestion: "아라 데모 일정 잡기" },
  { subject: "정책 세미나 자료 공유", from: "policy.forum@example.com", project: P.ssiR, by: "ai", conf: 0.69, at: [-3, "14:40"] },
  { subject: "하반기 채용 공고 문의", from: "job.board@example.com", project: P.coreGen, by: "ai", conf: 0.66, at: [-5, "10:10"], suggestion: "채용 조건 정리하기", sStatus: "accepted", task: "t-cr-031" },
];

const CR_KI: KiDef[] = [
  { id: "ki-cr-01", kind: "decision", title: "예시기업 특강 실습 비중은 60%", summary: "요구사항 미팅에서 실습 비중을 50%에서 60%로 올리기로 했어요.", project: P.eduA, owner: EL, verified: -5, review: 60, status: "verified", source: "회의 결정" },
  { id: "ki-cr-02", kind: "decision", title: "특강은 3시간 3모듈 구성", summary: "킥오프 미팅에서 정한 특강 구성이에요.", project: P.eduA, owner: EL, verified: -19, review: 45, status: "verified", source: "회의 결정" },
  { id: "ki-cr-03", kind: "decision", title: "회의 자동 분류 기준은 신뢰도 0.85", summary: "0.85보다 낮은 구간은 사람이 확인해요.", project: P.araPipe, owner: AL, verified: -7, review: 83, status: "verified", source: "회의 결정" },
  { id: "ki-cr-04", kind: "decision", title: "아라 평가 세트는 30문항", summary: "스프린트 리뷰에서 평가 세트 크기를 30문항으로 맞췄어요.", project: P.araCore, owner: AL, verified: -5, review: 85, status: "verified", source: "회의 결정" },
  { id: "ki-cr-05", kind: "decision", title: "업무사이트 메뉴는 레지스트리 9개 그대로", summary: "회사별로 메뉴 순서와 구조는 바꾸지 않고 이름만 바꿔요.", project: P.coreAx, owner: OPS, verified: -12, review: 78, status: "verified", source: "회의 결정" },
  { id: "ki-cr-06", kind: "policy", title: "AI 연결 사용 기준(읽기 전용부터)", summary: "개인 AI는 읽기 전용으로 시작하고, L2 자료는 국내 경로가 열린 뒤에 다뤄요.", project: P.coreAx, owner: OPS, verified: -40, review: -5, status: "review_due" },
  { id: "ki-cr-07", kind: "policy", title: "고객 자료 보관 기준(L1·L2)", summary: "견적·계약 조건과 기관 협의 자료는 국내 저장소에만 둬요.", project: P.coreGen, owner: OPS, verified: -84, review: 6, status: "verified" },
  { id: "ki-cr-08", kind: "policy", title: "학맞통 업무에서 다루지 않는 정보", summary: "학맞통 업무는 기관·연수·정책·서식만 다뤄요. 개인을 알아볼 수 있는 정보는 받지 않아요.", project: P.ssiR, owner: SL, verified: -30, review: 150, status: "verified" },
  { id: "ki-cr-09", kind: "policy", title: "교안 출처 표기 기준", summary: "공개 자료를 쓸 때는 자료 이름과 발행 연도를 적어요.", project: P.eduC, owner: EL, verified: -25, review: 155, status: "verified" },
  { id: "ki-cr-10", kind: "manual", title: "특강 운영 체크리스트", summary: "장소·장비·명단·사전 과제·사후 설문을 순서대로 확인해요.", project: P.eduA, owner: E1, verified: -160, review: 20, status: "verified" },
  { id: "ki-cr-11", kind: "manual", title: "연수 교안 작성 매뉴얼", summary: "교안 표준 양식과 적용 중인 작성 규칙을 모은 안내예요.", project: P.eduC, owner: EL, verified: -190, review: -12, status: "review_due" },
  { id: "ki-cr-12", kind: "manual", title: "아라 배포 절차", summary: "배포 전 점검표, 배포 순서, 되돌리기 방법을 정리하는 중이에요.", project: P.araCore, owner: A1, status: "draft" },
  { id: "ki-cr-13", kind: "manual", title: "회의 녹음 올리는 방법", summary: "녹음 파일 이름 앞에 사업 접두어를 붙여 올리면 자동 분류가 쉬워져요.", project: P.araPipe, owner: AL, verified: -20, review: 160, status: "verified" },
  { id: "ki-cr-14", kind: "faq", title: "견적서 금액에 부가세를 넣나요?", summary: "넣어요. 합계 옆에 '부가세 포함'을 꼭 적어요.", project: P.coreGen, owner: CEO, verified: -50, review: 130, status: "verified" },
  { id: "ki-cr-15", kind: "faq", title: "AI 초안은 누가 최종 확인하나요?", summary: "업무의 검토자가 승인해야 완료돼요. AI 연결로 제출해도 같아요.", project: P.coreAx, owner: OPS, verified: -10, review: 170, status: "verified" },
  { id: "ki-cr-16", kind: "faq", title: "강의 만족도 설문은 언제 보내나요?", summary: "강의가 끝난 다음 날 오전에 보내고 3일 뒤 마감해요.", project: P.eduC, owner: E1, verified: -35, review: 145, status: "verified" },
  { id: "ki-cr-17", kind: "reference", title: "학맞통 관련 법령·시행령 요약", summary: "조문 번호와 기관 운영에 주는 영향을 표로 정리했어요.", project: P.ssiR, owner: SL, verified: -168, review: 12, status: "verified", source: "공개 법령" },
  { id: "ki-cr-18", kind: "reference", title: "생성형 AI 업무 활용 사례 모음", summary: "공개 보고서에서 업무별 사례를 모았어요. 교안 예시로 써요.", project: P.eduC, owner: EL, verified: -15, review: 165, status: "verified", source: "공개 자료" },
  { id: "ki-cr-19", kind: "reference", title: "회의 분류 체계 v0.2", summary: "사업 4개와 업무 유형, 접두어 규칙이에요.", project: P.araPipe, owner: AL, verified: -5, review: 85, status: "verified", source: "회의 분류 체계" },
  { id: "ki-cr-20", kind: "reference", title: "구 교안 양식 안내", summary: "새 교안 표준 양식으로 바뀌어 보관만 해요.", project: P.eduC, owner: EL, verified: -120, status: "archived" },
];
const CR_KL: [string, string, string, string, string][] = [
  ["knowledge", "ki-cr-01", "decision", "dec-cr-01", "근거"],
  ["knowledge", "ki-cr-01", "meeting", "mtg-cr-01", "근거"],
  ["knowledge", "ki-cr-01", "artifact", "art-cr-001", "관련"],
  ["knowledge", "ki-cr-01", "knowledge", "ki-cr-02", "관련"],
  ["knowledge", "ki-cr-02", "decision", "dec-cr-03", "근거"],
  ["knowledge", "ki-cr-02", "meeting", "mtg-cr-03", "근거"],
  ["knowledge", "ki-cr-03", "decision", "dec-cr-10", "근거"],
  ["knowledge", "ki-cr-03", "knowledge", "ki-cr-19", "관련"],
  ["knowledge", "ki-cr-03", "notice", "ntc-cr-08", "관련"],
  ["knowledge", "ki-cr-04", "decision", "dec-cr-07", "근거"],
  ["knowledge", "ki-cr-04", "artifact", "art-cr-014", "관련"],
  ["knowledge", "ki-cr-05", "decision", "dec-cr-11", "근거"],
  ["knowledge", "ki-cr-06", "notice", "ntc-cr-02", "근거"],
  ["knowledge", "ki-cr-06", "knowledge", "ki-cr-07", "관련"],
  ["knowledge", "ki-cr-06", "knowledge", "ki-cr-15", "관련"],
  ["knowledge", "ki-cr-07", "glossary", "g-cr-02", "관련"],
  ["knowledge", "ki-cr-08", "glossary", "g-cr-02", "관련"],
  ["knowledge", "ki-cr-08", "knowledge", "ki-cr-17", "관련"],
  ["knowledge", "ki-cr-09", "rule", "rule-cr-06", "관련"],
  ["knowledge", "ki-cr-10", "artifact", "art-cr-006", "관련"],
  ["knowledge", "ki-cr-10", "knowledge", "ki-cr-01", "관련"],
  ["knowledge", "ki-cr-11", "rule", "rule-cr-05", "적용 규칙"],
  ["knowledge", "ki-cr-11", "rule", "rule-cr-07", "적용 규칙"],
  ["knowledge", "ki-cr-11", "knowledge", "ki-cr-20", "대체"],
  ["knowledge", "ki-cr-13", "knowledge", "ki-cr-19", "관련"],
  ["knowledge", "ki-cr-13", "glossary", "g-cr-06", "관련"],
  ["knowledge", "ki-cr-14", "rule", "rule-cr-04", "근거"],
  ["knowledge", "ki-cr-14", "artifact", "art-cr-quote-02", "관련"],
  ["knowledge", "ki-cr-16", "artifact", "art-cr-012", "관련"],
  ["knowledge", "ki-cr-18", "artifact", "art-cr-009", "관련"],
];

function crataSeed(ctx: SeedContext): SeedOutput {
  const { artifacts, versions } = buildArtifacts(ctx, "crata", CR_ARTS);
  const notices = buildNotices(ctx, CR_NOTICES);
  const mailRules: R<"mail_rules">[] = [
    { id: "mr-cr-01", condition: "보낸 곳이 예시기업(주) 담당자", project_id: P.eduA, action: "예시기업 임원 특강 프로젝트로 분류", active: true },
    { id: "mr-cr-02", condition: "보낸 곳이 예시고등학교 담당자", project_id: P.eduB, action: "예시고 교사 연수 프로젝트로 분류", active: true },
    { id: "mr-cr-03", condition: "보낸 곳이 예시디자인 담당자", project_id: P.eduC, action: "공통 강의 콘텐츠 프로젝트로 분류", active: true },
  ];
  return {
    templates: CR_TEMPLATES.map((t) => ({ ...t, created_at: ctx.at(-80, "10:00") })),
    artifacts,
    artifact_versions: versions,
    corrections: buildCorrections(CR_CORS, artifacts),
    rules: buildRules(ctx, CR_RULES),
    ...buildKnowledge(ctx, "crata", CR_KI, CR_KL),
    notices: notices.notices,
    read_receipts: notices.read_receipts,
    calendar_events: buildEvents(ctx, CR_EVENTS),
    approval_links: buildApprovals(ctx, CR_APPROVALS),
    mail_connections: [
      { id: "mc-cr-01", member_id: EL, provider: "imap", scopes: ["읽기"], status: "preview", connected_at: ctx.at(-20, "10:00"), revoked_at: null, account_label: "예시 메일 계정(IMAP)", last_checked_at: ctx.at(0, "08:10") },
      { id: "mc-cr-02", member_id: CEO, provider: "imap", scopes: ["읽기"], status: "preview", connected_at: ctx.at(-18, "09:00"), revoked_at: null, account_label: "예시 메일 계정(IMAP)", last_checked_at: ctx.at(0, "08:10") },
    ],
    mail_links: [...buildMail(ctx, "cr-el", EL, CR_MAIL_EL), ...buildMail(ctx, "cr-ceo", CEO, CR_MAIL_CEO)],
    mail_rules: mailRules,
    ...axKpis(ctx, OPS, {
      AX_REPEAT_RATE: [46, 41, 38, 33, 29, 27, 22, 19],
      AX_FIRST_PASS: [31, 35, 34, 40, 44, 47, 52, 55],
      AX_REVIEW_MIN: [42, 40, 37, 35, 31, 30, 27, 25],
      AX_ACTIVE_AI: [2, 2, 3, 3, 4, 4, 4, 4],
    }),
  };
}

// ─────────────────────────────────────────────── 티알테크놀러지(tr-technology)
const T_CEO = "m-tr-ceo", PL = "m-tr-plant", QA = "m-tr-qa", SA = "m-tr-sales", AD = "m-tr-admin", DV = "m-tr-dev", OA = "m-tr-op-a";
const Q = {
  exh: "prj-tr-mass-exh", saf: "prj-tr-mass-saf", flt: "prj-tr-mass-flt", dev: "prj-tr-dev-dr", ppm: "prj-tr-qual-ppm", clm: "prj-tr-qual-clm",
  h2: "prj-tr-safe-h2", press: "prj-tr-safe-press", ax: "prj-tr-ax-pilot",
};

const TR_TEMPLATES: R<"templates">[] = [
  { id: "tpl-tr-8d", doc_type: "report_8d", name: "8D 보고서 양식(고객 양식 확인 전)", format: "XLSX", version: "수집 전", file_ref: null, owner_id: QA, status: "draft", to_collect: true },
  { id: "tpl-tr-cert", doc_type: "outgoing_cert", name: "출하 검사성적서 양식", format: "XLSX", version: "수집 전", file_ref: null, owner_id: QA, status: "draft", to_collect: true },
  { id: "tpl-tr-daily", doc_type: "daily_production", name: "생산일보 양식", format: "XLSX", version: "수집 전", file_ref: null, owner_id: SA, status: "draft", to_collect: true },
  { id: "tpl-tr-4m", doc_type: "request_4m", name: "4M 변경 신청서 양식", format: "DOCX", version: "수집 전", file_ref: null, owner_id: DV, status: "draft", to_collect: true },
  { id: "tpl-tr-monthly", doc_type: "monthly_quality", name: "월 품질 리포트 양식", format: "PPTX", version: "수집 전", file_ref: null, owner_id: QA, status: "draft", to_collect: true },
];

const TR_ARTS: ArtDef[] = [
  // 8D 3
  { id: "art-tr-8d-01", title: "CL-2026-01 8D 보고서", doc: "report_8d", project: Q.ppm, owner: QA, ai: false, status: "final", vers: 2, sens: "L2", tpl: "tpl-tr-8d", last: [-62, "17:00"], gap: 6, authors: [QA, PL] },
  // L2(고객 비밀) 산출물은 국내 처리 경로가 열리기 전까지 AI 초안이 없어요(사람 초안 → 사람이 고친 내용이 규칙 후보)
  { id: "art-tr-8d-02", title: "CL-2026-02 8D 보고서", doc: "report_8d", project: Q.ppm, owner: QA, ai: false, status: "final", vers: 3, sens: "L2", tpl: "tpl-tr-8d", last: [-31, "16:30"], gap: 4, authors: [QA, QA, PL] },
  { id: "art-tr-8d-03", title: "CL-2026-03 8D 보고서", doc: "report_8d", project: Q.clm, task: "t-tr-001", owner: QA, ai: false, status: "in_review", vers: 3, sens: "L2", tpl: "tpl-tr-8d", last: [0, "07:50"], gap: 3, times: [[-7, "16:40"], [-2, "11:20"], [0, "07:50"]] },
  // 출하 검사성적서 4
  { id: "art-tr-cert-01", title: "출하 검사성적서 · 예시배기시스템 9월 4주", doc: "outgoing_cert", project: Q.exh, owner: QA, ai: true, status: "final", vers: 2, tpl: "tpl-tr-cert", last: [-3, "15:00"], rules: ["rule-tr-03"], authors: [QA, PL] },
  { id: "art-tr-cert-02", title: "출하 검사성적서 · 예시세이프티 9월 4주", doc: "outgoing_cert", project: Q.saf, owner: QA, ai: true, status: "final", vers: 2, tpl: "tpl-tr-cert", last: [-2, "16:20"], rules: ["rule-tr-03"], authors: [QA, PL] },
  { id: "art-tr-cert-03", title: "출하 검사성적서 · 예시필터 9월 4주", doc: "outgoing_cert", project: Q.flt, owner: QA, ai: false, status: "final", vers: 2, tpl: "tpl-tr-cert", last: [-2, "17:10"], authors: [QA, PL] },
  { id: "art-tr-cert-04", title: "출하 검사성적서 · 예시배기시스템 9월 5주", doc: "outgoing_cert", project: Q.exh, owner: QA, ai: false, status: "draft", vers: 2, tpl: "tpl-tr-cert", last: [0, "08:40"] },
  // 생산일보 4
  // 생산일보·설비 점검은 공장 전체 일이라 특정 고객 프로젝트에 붙이지 않아요(추석 9/24~26은 쉬어서 생산일보 없음)
  { id: "art-tr-daily-01", title: "생산일보 9월 22일", doc: "daily_production", project: null, owner: SA, ai: true, status: "final", vers: 2, tpl: "tpl-tr-daily", last: [-8, "18:30"], rules: ["rule-tr-04"], authors: [SA, PL] },
  { id: "art-tr-daily-02", title: "생산일보 9월 23일", doc: "daily_production", project: null, owner: SA, ai: true, status: "final", vers: 2, tpl: "tpl-tr-daily", last: [-7, "18:20"], rules: ["rule-tr-04"], authors: [SA, PL] },
  { id: "art-tr-daily-03", title: "생산일보 9월 28일", doc: "daily_production", project: null, owner: SA, ai: false, status: "final", vers: 2, tpl: "tpl-tr-daily", last: [-2, "18:40"], authors: [SA, PL] },
  { id: "art-tr-daily-04", title: "생산일보 9월 29일", doc: "daily_production", project: null, owner: SA, ai: false, status: "in_review", vers: 2, tpl: "tpl-tr-daily", last: [-1, "18:50"] },
  // 4M 변경 신청서 2
  { id: "art-tr-4m-01", title: "4M 변경 신청서 CR4M-2026-04 · KN-07 편조 조건표 개정", doc: "request_4m", project: Q.dev, owner: DV, ai: false, status: "in_review", vers: 3, sens: "L2", tpl: "tpl-tr-4m", last: [-9, "15:40"], gap: 2 },
  { id: "art-tr-4m-02", title: "4M 변경 신청서 CR4M-2026-03 · 포장 사양 변경", doc: "request_4m", project: Q.saf, owner: SA, ai: false, status: "final", vers: 2, sens: "L2", tpl: "tpl-tr-4m", last: [-26, "14:00"], gap: 3, authors: [SA, PL] },
  // 월 품질 리포트 1
  { id: "art-tr-monthly-09", title: "9월 월 품질 리포트", doc: "monthly_quality", project: Q.ppm, task: "t-tr-002", owner: QA, ai: true, status: "in_review", vers: 2, tpl: "tpl-tr-monthly", last: [-1, "16:20"] },
];

const TR_CORS: CorDef[] = [
  // art-tr-8d-03 (앵커: 수정 기록 5개 → rule-tr-01·02 승인 대기)
  { id: "cor-tr-001", art: "art-tr-8d-03", kind: "replace", before: "D4 근본 원인: 편조 조건 변동으로 추정", after: "D4 근본 원인 근거표: LOT K-KN07-260914-A · 초물 검사 기록 · 설비 점검 기록", reason: "근거 출처를 표로 남겨요", scope: "writing_rule", conf: 0.84, status: "grouped", rule: "rule-tr-01" },
  { id: "cor-tr-002", art: "art-tr-8d-03", kind: "insert", before: null, after: "출처: 검사 기록 번호와 기록 날짜", reason: null, scope: "writing_rule", conf: 0.79, status: "grouped", rule: "rule-tr-01" },
  { id: "cor-tr-003", art: "art-tr-8d-03", kind: "replace", before: "관련 LOT 확인 완료", after: "관련 LOT 4개(원자재 → 편조 → 가공 → 출하) 연결표", reason: null, scope: "writing_rule", conf: 0.72, status: "grouped", rule: "rule-tr-01", fin: 2 },
  { id: "cor-tr-004", art: "art-tr-8d-03", kind: "replace", before: "임시 조치: 재고 선별", after: "임시 조치: 출하 대기 재고 2,400개 선별, 의심 LOT 1,700개는 격리 구역 B-2에 보관", reason: "수량과 장소가 없으면 고객이 다시 물어봐요", scope: "writing_rule", conf: 0.87, status: "grouped", rule: "rule-tr-02" },
  { id: "cor-tr-005", art: "art-tr-8d-03", kind: "insert", before: null, after: "고객 창고 재고 처리: 선별 후 합격품만 사용(수량 확인 중)", reason: null, scope: "writing_rule", conf: 0.71, status: "grouped", rule: "rule-tr-02", ai: 2 },
  // art-tr-8d-02
  { id: "cor-tr-006", art: "art-tr-8d-02", kind: "replace", before: "임시 조치: 선별 진행", after: "임시 조치: 재고 800개 선별, 격리 구역 보관", reason: null, scope: "writing_rule", conf: 0.8, status: "grouped", rule: "rule-tr-02" },
  { id: "cor-tr-007", art: "art-tr-8d-02", kind: "insert", before: null, after: "근거: 출하 검사 기록 2건", reason: null, scope: "writing_rule", conf: 0.68, status: "grouped", rule: "rule-tr-01" },
  { id: "cor-tr-008", art: "art-tr-8d-02", kind: "replace", before: "8월 20일 회신", after: "8월 22일 회신", reason: "고객과 다시 정한 날짜", scope: "one_off", conf: 0.92, status: "dismissed" },
  // 출하 검사성적서
  { id: "cor-tr-009", art: "art-tr-cert-01", kind: "move", before: "LOT 번호(맨 아래)", after: "LOT 번호·검사 수량(맨 위)", reason: "고객이 먼저 보는 칸", scope: "writing_rule", conf: 0.88, status: "promoted", rule: "rule-tr-03" },
  { id: "cor-tr-010", art: "art-tr-cert-01", kind: "replace", before: "측정값 5개", after: "측정값 5개(시료 수 함께)", reason: null, scope: "template", conf: 0.62, status: "new" },
  { id: "cor-tr-011", art: "art-tr-cert-02", kind: "insert", before: null, after: "검사 수량 32개", reason: null, scope: "writing_rule", conf: 0.85, status: "promoted", rule: "rule-tr-03" },
  // 생산일보
  { id: "cor-tr-012", art: "art-tr-daily-01", kind: "move", before: "편조기 순서 섞임", after: "설비 번호 순서(KN-01 → KN-36)", reason: null, scope: "template", conf: 0.9, status: "promoted", rule: "rule-tr-04" },
  { id: "cor-tr-013", art: "art-tr-daily-01", kind: "replace", before: "정지 사유 없음", after: "정지 사유: 금형 교체 40분", reason: "정지 시간은 사유와 함께", scope: "one_off", conf: 0.55, status: "new" },
  // 4M
  { id: "cor-tr-014", art: "art-tr-4m-01", kind: "insert", before: null, after: "고객 통보 필요 여부와 초도품 LOT 번호", reason: "고객 승인 서류에 꼭 들어가요", scope: "template", conf: 0.74, status: "new" },
];

const TR_RULES: RuleDef[] = [
  { id: "rule-tr-01", scope: "writing_rule", docs: ["report_8d"], statement: "D4에는 근거(LOT·검사 기록) 출처를 표로 적어요", evidence: ["cor-tr-001", "cor-tr-002", "cor-tr-003", "cor-tr-007"], examples: ["전: 편조 조건 변동으로 추정 → 후: LOT·검사 기록 근거표"], status: "candidate", approver: PL, created: [-1, "15:40"] },
  { id: "rule-tr-02", scope: "writing_rule", docs: ["report_8d"], statement: "임시 조치는 수량과 보관 장소를 함께 적어요", evidence: ["cor-tr-004", "cor-tr-005", "cor-tr-006"], examples: ["전: 재고 선별 → 후: 출하 대기 재고 2,400개 선별, 의심 LOT 1,700개는 격리 구역 B-2에 보관"], status: "candidate", approver: PL, created: [-1, "15:45"] },
  { id: "rule-tr-03", scope: "writing_rule", docs: ["outgoing_cert"], statement: "검사성적서 맨 위에 LOT 번호와 검사 수량을 적어요", evidence: ["cor-tr-009", "cor-tr-011"], status: "active", approver: PL, from: -12, review: 78, applied: 9, overridden: 1, compiled: "출하 검사성적서 작성 규칙 v1" },
  { id: "rule-tr-04", scope: "template", docs: ["daily_production"], statement: "생산일보는 설비 번호 순서로 적어요", evidence: ["cor-tr-012"], status: "active", approver: PL, from: -10, review: 80, applied: 7, overridden: 0, compiled: "생산일보 양식(초안)" },
];

const TR_NOTICES: NoticeDef[] = [
  {
    id: "ntc-tr-01", cat: "safety", title: "하반기 반기 안전 점검 안내", author: PL, at: [-5, "09:10"], must: true, unread: [QA, OA],
    body: "2026 하반기 반기 안전 점검을 10월 14일까지 마쳐요.\n작업장별 위험성평가 개선 이행 사진과 점검표를 담당자에게 모아 주세요.\n근로자 의견은 현장 등록이나 종이 의견함으로 남길 수 있어요.",
    attachments: [{ name: "반기 점검 항목표(예시)", url: `${DOCS}/tr/safety/2026h2-checklist` }],
  },
  { id: "ntc-tr-02", cat: "safety", title: "프레스 PR-010-02 사용 중지 안내", author: PL, at: [0, "08:55"], must: true, ratio: 0.3, body: "작업 중 이상 소음이 있어 점검이 끝날 때까지 PR-010-02는 쓰지 않아요.\n같은 품목은 다른 프레스로 돌려요. 작업지시는 공장장이 다시 알려 드려요." },
  { id: "ntc-tr-03", cat: "safety", title: "10월 정기 안전교육 일정", author: AD, at: [-8, "10:00"], expires: 7, body: "10월 7일(수) 오후 4시에 정기 안전교육을 해요.\n프레스 작업 안전과 보호구 착용을 다뤄요." },
  { id: "ntc-tr-04", cat: "system", title: "업무사이트 1차 파일럿을 준비해요", author: T_CEO, at: [-4, "11:00"], pinned: true, body: "10월부터 품질·현장 등록·설비·안전보건 화면을 먼저 써 봐요.\n휴대폰으로 현장 등록하는 방법은 10월 13일에 안내해요." },
  { id: "ntc-tr-05", cat: "policy", title: "출하 검사성적서 양식을 하나로 맞춰요", author: QA, at: [-7, "14:30"], body: "고객마다 달랐던 출하 검사성적서를 공통 양식 하나로 맞춰요.\n맨 위에 LOT 번호와 검사 수량을 적어요." },
  { id: "ntc-tr-06", cat: "general", title: "개천절·한글날 휴무와 생산 일정", author: SA, at: [-6, "16:00"], expires: 9, body: "10월 3일(토) 개천절, 10월 5일(월) 대체공휴일, 10월 9일(금) 한글날은 쉬어요.\n그 주 출하 일정은 영업·생산 담당이 고객과 다시 확인했어요." },
  { id: "ntc-tr-07", cat: "event", title: "품질 개선 제안 공유", author: QA, at: [-18, "13:00"], ratio: 0.8, body: "지난달 현장에서 나온 개선 제안 6건을 함께 봐요.\n좋은 제안은 작업표준에 반영해요." },
  { id: "ntc-tr-08", cat: "general", title: "10월 계측기 검교정 일정", author: QA, at: [-14, "09:30"], audience: { type: "unit", ids: ["U_QA", "U_PLANT", "U_SALES_PROD"] }, body: "10월 8일에 계측기 정기 검교정을 해요.\n그날 오전에는 해당 계측기를 쓰지 않도록 작업 순서를 조정해 주세요." },
];

const TR_EVENTS: EvDef[] = [
  { id: "ev-tr-01", title: "CL-2026-03 8D 보고서 고객 제출 기한", kind: "due", day: 6, allDay: true, project: Q.clm, who: [QA, PL, SA], vis: "team", by: QA },
  { id: "ev-tr-02", title: "계측기 정기 검교정(예시교정센터 방문)", kind: "inspection", day: 8, from: "10:00", to: "16:00", project: Q.ppm, who: [QA], vis: "company", by: QA },
  { id: "ev-tr-03", title: "10월 정기 안전교육", kind: "training", day: 7, from: "16:00", to: "18:00", project: Q.h2, who: [AD, PL], vis: "company", by: AD },
  { id: "ev-tr-04", title: "개천절 휴무", kind: "company", day: 3, allDay: true, who: [], vis: "company", by: AD },
  { id: "ev-tr-04b", title: "개천절 대체공휴일", kind: "company", day: 5, allDay: true, who: [], vis: "company", by: AD },
  { id: "ev-tr-04c", title: "추석 연휴", kind: "company", day: -6, allDay: true, who: [], vis: "company", by: AD },
  { id: "ev-tr-04d", title: "추석", kind: "company", day: -5, allDay: true, who: [], vis: "company", by: AD },
  { id: "ev-tr-04e", title: "추석 연휴", kind: "company", day: -4, allDay: true, who: [], vis: "company", by: AD },
  { id: "ev-tr-05", title: "한글날 휴무", kind: "company", day: 9, allDay: true, who: [], vis: "company", by: AD },
  { id: "ev-tr-06", title: "예시배기시스템 품질 회의 방문", kind: "meeting", day: 6, from: "14:00", to: "16:00", project: Q.clm, who: [QA, PL, SA], vis: "team", by: QA },
  { id: "ev-tr-07", title: "디커플링 링 초품 검사", kind: "inspection", day: 12, from: "09:00", to: "12:00", project: Q.dev, who: [DV, QA, PL], vis: "team", by: DV },
  { id: "ev-tr-08", title: "소방 대피 훈련", kind: "safety", day: 20, from: "15:00", to: "16:00", project: Q.h2, who: [AD], vis: "company", by: AD },
  { id: "ev-tr-09", title: "예시선재 공급 협의", kind: "meeting", day: 2, from: "10:00", to: "11:00", project: Q.exh, who: [AD, PL], vis: "company", by: AD },
  { id: "ev-tr-10", title: "현장 등록 사용 안내(파일럿)", kind: "training", day: 13, from: "08:30", to: "09:00", project: Q.ax, who: [AD, PL], vis: "company", by: AD },
  { id: "ev-tr-11", title: "업무사이트 1차 파일럿 시작", kind: "company", day: 1, allDay: true, project: Q.ax, who: [T_CEO, AD], vis: "company", by: T_CEO },
  { id: "ev-tr-12", title: "4M 변경 고객 승인 회신 확인", kind: "due", day: 2, allDay: true, project: Q.dev, who: [DV, QA], vis: "team", by: DV },
  { id: "ev-tr-13", title: "편조기 월간 점검", kind: "inspection", day: 1, from: "08:00", to: "10:00", project: null, who: [PL], vis: "company", by: PL },
  { id: "ev-tr-14", title: "프레스 월간 점검", kind: "inspection", day: 2, from: "08:00", to: "10:00", project: Q.press, who: [PL], vis: "company", by: PL },
  { id: "ev-tr-15", title: "작업 전 안전점검(프레스)", kind: "safety", day: 0, from: "08:00", to: "08:20", project: Q.press, who: [PL], vis: "company", by: PL },
  { id: "ev-tr-16", title: "9월 생산·출하 마감", kind: "due", day: 0, allDay: true, project: null, who: [SA], vis: "company", by: SA },
  { id: "ev-tr-17", title: "품질 교육: 초중종물 기록", kind: "training", day: 14, from: "16:00", to: "17:00", project: Q.ppm, who: [QA, PL], vis: "company", by: QA },
  { id: "ev-tr-18", title: "예시세이프티 공정 감사 사전 회의", kind: "meeting", day: 15, from: "10:00", to: "11:00", project: Q.saf, who: [QA, PL], vis: "team", by: QA },
  { id: "ev-tr-19", title: "예시세이프티 고객 공정 감사", kind: "inspection", day: 22, allDay: true, project: Q.saf, who: [QA, PL, SA], vis: "company", by: QA },
  { id: "ev-tr-20", title: "공장 대청소", kind: "company", day: 16, from: "15:00", to: "17:00", who: [AD], vis: "company", by: AD },
  { id: "ev-tr-21", title: "월 품질 리포트 대표 보고", kind: "due", day: 6, allDay: true, project: Q.ppm, who: [QA, T_CEO], vis: "team", by: QA },
  { id: "ev-tr-22", title: "예시파워트레인 샘플 협의", kind: "meeting", day: 19, from: "14:00", to: "15:00", who: [SA], vis: "private", by: SA },
  { id: "ev-tr-23", title: "하반기 보호구 지급", kind: "safety", day: 5, from: "08:00", to: "08:30", project: Q.h2, who: [AD], vis: "company", by: AD },
  { id: "ev-tr-24", title: "신규 작업자 안전교육", kind: "training", day: 26, from: "09:00", to: "11:00", project: Q.h2, who: [AD], vis: "company", by: AD },
  { id: "ev-tr-25", title: "출하 검사 기준 재교육", kind: "training", day: 21, from: "16:00", to: "17:00", project: Q.ppm, who: [QA], vis: "company", by: QA },
  { id: "ev-tr-26", title: "품질 개선 제안 공유회", kind: "company", day: -18, from: "13:00", to: "14:00", project: Q.ppm, who: [QA, PL], vis: "company", by: QA },
  { id: "ev-tr-27", title: "계측기 검교정 계획 수립", kind: "due", day: -15, allDay: true, project: Q.ppm, who: [QA], vis: "team", by: QA },
  { id: "ev-tr-28", title: "9월 정기 안전교육", kind: "training", day: -8, from: "16:00", to: "18:00", project: Q.h2, who: [AD], vis: "company", by: AD },
  { id: "ev-tr-29", title: "반기 점검 사전 회의", kind: "meeting", day: -5, from: "10:00", to: "11:00", project: Q.h2, who: [AD, T_CEO, PL], vis: "company", by: AD },
  { id: "ev-tr-30", title: "CL-2026-03 접수 대응 회의", kind: "meeting", day: -12, from: "15:00", to: "16:00", project: Q.clm, who: [QA, PL, SA], vis: "team", by: QA },
];

const TR_APPROVALS: ApvDef[] = [
  { id: "apv-tr-01", no: "EX-2026-0641", title: "KN-21 수리 부품 구매", form: "구매요청서", by: AD, approver: PL, status: "pending", at: [-1, "14:20"], rel: ["task", "t-tr-036"] },
  { id: "apv-tr-02", no: "EX-2026-0644", title: "SUS321 선재 긴급 발주", form: "구매요청서", by: AD, approver: T_CEO, status: "pending", at: [0, "08:30"], rel: ["project", Q.exh] },
  { id: "apv-tr-03", no: "EX-2026-0637", title: "프레스 안전검사 수수료", form: "지출결의서", by: PL, approver: T_CEO, status: "pending", at: [-2, "10:40"], rel: ["project", Q.press] },
  { id: "apv-tr-04", no: "EX-2026-0640", title: "계측기 검교정 비용(10월)", form: "지출결의서", by: QA, approver: PL, status: "pending", at: [-1, "09:15"], rel: ["task", "t-tr-026"] },
  { id: "apv-tr-05", no: "EX-2026-0619", title: "고객사 품질 회의 출장(9월 22일)", form: "출장신청서", by: QA, approver: null, status: "approved", at: [-12, "13:00"], done: [-11, "09:00"], rel: ["project", Q.clm] },
  { id: "apv-tr-06", no: "EX-2026-0626", title: "포장재 구매(10월분)", form: "구매요청서", by: SA, approver: null, status: "approved", at: [-9, "15:30"], done: [-8, "10:20"], rel: ["project", Q.saf] },
  { id: "apv-tr-07", no: "EX-2026-0612", title: "안전보호구 구매", form: "구매요청서", by: AD, approver: null, status: "approved", at: [-15, "11:00"], done: [-14, "16:00"], rel: ["project", Q.h2] },
  { id: "apv-tr-08", no: "EX-2026-0631", title: "야간조 연장 근무 식대", form: "지출결의서", by: SA, approver: PL, status: "rejected", at: [-5, "17:30"], done: [-4, "08:40"], rel: null },
];

const TR_MAIL_SA: MailDef[] = [
  { subject: "[예시필터] 편조 롤 폭 규격 문의", from: "flt.buyer@example.com", partner: "p-tr-flt", project: Q.flt, by: "rule", conf: 0.97, at: [-3, "10:20"], shared: true, suggestion: "편조 롤 폭 규격 확인 회신하기", sStatus: "accepted", task: "t-tr-003" },
  { subject: "[예시세이프티] 포장 사양 변경 요청", from: "saf.buyer@example.com", partner: "p-tr-saf", project: Q.saf, by: "rule", conf: 0.98, at: [-1, "16:00"], shared: true, suggestion: "포장 사양 변경 확인하기", sStatus: "accepted", task: "t-tr-025" },
  { subject: "[예시배기시스템] 10월 내시 물량 송부", from: "exh.scm@example.com", partner: "p-tr-exh", project: Q.exh, by: "rule", conf: 0.99, at: [-4, "09:00"], shared: true, suggestion: "10월 내시를 생산계획에 반영하기", sStatus: "accepted", task: "t-tr-030" },
  { subject: "[예시배기시스템] 9월 5주 납품 일정 확인", from: "exh.scm@example.com", partner: "p-tr-exh", project: Q.exh, by: "rule", conf: 0.98, at: [0, "08:15"], suggestion: "납품 일정 회신하기" },
  { subject: "[예시파워트레인] 브리더 필터 샘플 요청", from: "pwt.dev@example.com", partner: "p-tr-pwt", project: null, by: null, at: [-1, "13:40"] },
  { subject: "[예시써멀] 차열 부품 문의", from: "thm.buyer@example.com", partner: "p-tr-thm", project: null, by: null, at: [-2, "11:10"] },
  { subject: "[예시배기시스템] 클레임 회신 요청", from: "exh.quality@example.com", partner: "p-tr-exh", project: Q.clm, by: "ai", conf: 0.9, at: [0, "07:40"], suggestion: "예시배기시스템 클레임 회신하기" },
  { subject: "선재 입고 일정 안내", from: "wire.sales@example.com", partner: "p-tr-wire", project: Q.exh, by: "rule", conf: 0.92, at: [-2, "15:30"] },
  { subject: "포장재 납기 지연 안내", from: "pack.sales@example.com", partner: "p-tr-pack", project: Q.saf, by: "ai", conf: 0.83, at: [-1, "10:05"], suggestion: "포장 일정 영향 확인하기" },
  { subject: "[예시세이프티] 10월 발주서", from: "saf.buyer@example.com", partner: "p-tr-saf", project: Q.saf, by: "rule", conf: 0.99, at: [-6, "09:20"], shared: true },
  { subject: "[예시전자] 가스켓 문의", from: "ele.rnd@example.com", partner: "p-tr-ele", project: null, by: null, at: [-5, "14:00"] },
  { subject: "전시회 참가 안내", from: "expo.info@example.com", project: null, by: null, at: [-7, "10:00"] },
  { subject: "[예시필터] 9월 납품 확인서", from: "flt.buyer@example.com", partner: "p-tr-flt", project: Q.flt, by: "rule", conf: 0.97, at: [-2, "17:20"] },
  { subject: "운송사 배차 변경", from: "logistics.desk@example.com", project: Q.exh, by: "manual", at: [-3, "08:30"] },
];
const TR_MAIL_QA: MailDef[] = [
  { subject: "[예시배기시스템] CL-2026-03 8D 제출 기한 안내", from: "exh.quality@example.com", partner: "p-tr-exh", project: Q.clm, by: "rule", conf: 0.99, at: [-11, "09:00"], suggestion: "8D D4 근거 정리하기", sStatus: "accepted", task: "t-tr-001" },
  { subject: "[예시배기시스템] 임시 조치 결과 확인 요청", from: "exh.quality@example.com", partner: "p-tr-exh", project: Q.clm, by: "ai", conf: 0.92, at: [-9, "14:30"], suggestion: "임시 조치 결과 회신하기", sStatus: "dismissed" },
  { subject: "검교정 일정 안내", from: "cal.center@example.com", partner: "p-tr-cal", project: Q.ppm, by: "rule", conf: 0.96, at: [-6, "10:10"], suggestion: "계측기 검교정 10월 일정 확인하기", sStatus: "accepted", task: "t-tr-026" },
  { subject: "[예시세이프티] 9월 품질 실적 요청", from: "saf.quality@example.com", partner: "p-tr-saf", project: Q.ppm, by: "ai", conf: 0.87, at: [0, "08:05"], suggestion: "9월 품질 실적 회신하기" },
  { subject: "선재 검사증명서 송부", from: "wire.sales@example.com", partner: "p-tr-wire", project: Q.exh, by: "rule", conf: 0.95, at: [-2, "16:40"] },
  { subject: "[예시배기시스템] 4M 변경 승인 진행 상황", from: "exh.quality@example.com", partner: "p-tr-exh", project: Q.dev, by: "ai", conf: 0.81, at: [-1, "11:30"], suggestion: "4M 고객 승인 진행 상황 확인하기" },
  { subject: "품질 교육 과정 안내", from: "training.center@example.com", project: null, by: null, at: [-4, "09:40"] },
  { subject: "[예시필터] 편조 롤 외관 문의", from: "flt.quality@example.com", partner: "p-tr-flt", project: Q.flt, by: "ai", conf: 0.78, at: [-3, "13:20"] },
  { subject: "측정기 판매 안내", from: "tool.sales@example.com", project: null, by: null, at: [-5, "11:00"] },
  { subject: "[예시세이프티] 출하 검사성적서 양식 요청", from: "saf.quality@example.com", partner: "p-tr-saf", project: Q.saf, by: "rule", conf: 0.94, at: [-8, "15:10"], shared: true },
  { subject: "외주 가공품 검사 기록 송부", from: "prec.qc@example.com", partner: "p-tr-prec", project: Q.exh, by: "ai", conf: 0.75, at: [-2, "10:50"] },
  { subject: "[예시배기시스템] 고객 감사 일정 사전 안내", from: "exh.quality@example.com", partner: "p-tr-exh", project: Q.ppm, by: "ai", conf: 0.86, at: [-1, "17:00"] },
];

const TR_KI: KiDef[] = [
  { id: "ki-tr-01", kind: "manual", title: "편조 작업표준서", summary: "이름만 등록했어요. 본문은 회사 저장소에 있고 진단에서 받은 뒤 연결해요.", project: Q.exh, owner: PL, status: "draft", body: false, source: "진단에서 수집" },
  { id: "ki-tr-02", kind: "manual", title: "프레스 성형 작업표준서", summary: "이름만 등록했어요. 본문은 진단에서 받은 뒤 연결해요.", project: Q.press, owner: PL, status: "draft", body: false, source: "진단에서 수집" },
  { id: "ki-tr-03", kind: "policy", title: "출하 검사기준서", summary: "이름만 등록했어요. 고객별 기준 여부는 진단에서 확인해요.", project: Q.ppm, owner: QA, status: "draft", body: false, source: "진단에서 수집" },
  { id: "ki-tr-04", kind: "policy", title: "선재 수입검사 기준", summary: "이름만 등록했어요. 검사증명서 확인 항목은 진단에서 확인해요.", project: Q.ppm, owner: QA, status: "draft", body: false, source: "진단에서 수집" },
  { id: "ki-tr-05", kind: "decision", title: "SUS321 선재 공급사 2곳 검토", summary: "주간 품질회의에서 공급사를 2곳으로 늘리는 안을 검토하기로 했어요.", project: Q.exh, owner: PL, verified: -1, review: 89, status: "verified", source: "회의 결정" },
  { id: "ki-tr-06", kind: "decision", title: "출하 검사성적서 양식 통일", summary: "고객마다 달랐던 양식을 하나로 맞추기로 했어요.", project: Q.ppm, owner: QA, verified: -8, review: 82, status: "verified", source: "회의 결정" },
  { id: "ki-tr-07", kind: "decision", title: "임시 조치 재고는 선별 후 별도 구역 보관", summary: "클레임 임시 조치 재고는 선별한 뒤 격리 구역에 둬요.", project: Q.clm, owner: QA, verified: -8, review: 82, status: "verified", source: "회의 결정" },
  { id: "ki-tr-08", kind: "decision", title: "SUS321 선재 안전재고 7일", summary: "안전재고를 5일에서 7일로 올렸어요.", project: Q.flt, owner: PL, verified: -9, review: 21, status: "verified", source: "회의 결정" },
  { id: "ki-tr-09", kind: "faq", title: "현장 등록은 어떻게 하나요?", summary: "휴대폰에서 '현장 등록'을 누르고 종류를 고른 뒤 한 줄과 사진 이름을 남겨요.", project: Q.ax, owner: AD, status: "draft" },
  { id: "ki-tr-10", kind: "faq", title: "초중종물 기록은 누가 확인하나요?", summary: "야간조는 조장이 확인하고, 다음 날 아침 품질보증 담당이 다시 봐요.", project: Q.ppm, owner: QA, verified: -15, review: 165, status: "verified" },
  { id: "ki-tr-11", kind: "manual", title: "계측기 검교정 절차", summary: "주기·기관·성적서 보관 위치를 적은 절차예요. 이번 달에 다시 확인해야 해요.", project: Q.ppm, owner: QA, verified: -200, review: -20, status: "review_due" },
  { id: "ki-tr-12", kind: "policy", title: "반기 안전 점검 증빙 목록", summary: "반기 점검 항목별로 모을 증빙 이름을 정리했어요.", project: Q.h2, owner: AD, verified: -30, review: 14, status: "verified" },
  { id: "ki-tr-13", kind: "reference", title: "공개 제품 카테고리·재질 목록", summary: "홈페이지에 공개된 제품 카테고리 11개와 재질 9종이에요.", project: null, owner: SA, verified: -3, review: 177, status: "verified", source: "회사 홈페이지(공개)", body: false },
  { id: "ki-tr-14", kind: "reference", title: "8D 보고서 쓰는 법(일반)", summary: "D0~D8 단계별로 적을 내용을 정리한 일반 안내예요.", project: Q.ppm, owner: QA, verified: -190, review: -4, status: "review_due" },
];
const TR_KL: [string, string, string, string, string][] = [
  ["knowledge", "ki-tr-01", "glossary", "g-tr-01", "관련"],
  ["knowledge", "ki-tr-01", "glossary", "g-tr-05", "관련"],
  ["knowledge", "ki-tr-02", "glossary", "g-tr-08", "관련"],
  ["knowledge", "ki-tr-03", "artifact", "art-tr-cert-01", "관련"],
  ["knowledge", "ki-tr-03", "knowledge", "ki-tr-06", "관련"],
  ["knowledge", "ki-tr-04", "glossary", "g-tr-18", "관련"],
  ["knowledge", "ki-tr-05", "decision", "dec-tr-01", "근거"],
  ["knowledge", "ki-tr-05", "meeting", "mtg-tr-01", "근거"],
  ["knowledge", "ki-tr-05", "knowledge", "ki-tr-08", "관련"],
  ["knowledge", "ki-tr-06", "decision", "dec-tr-03", "근거"],
  ["knowledge", "ki-tr-06", "notice", "ntc-tr-05", "관련"],
  ["knowledge", "ki-tr-06", "rule", "rule-tr-03", "적용 규칙"],
  ["knowledge", "ki-tr-07", "decision", "dec-tr-04", "근거"],
  ["knowledge", "ki-tr-07", "artifact", "art-tr-8d-03", "관련"],
  ["knowledge", "ki-tr-08", "decision", "dec-tr-10", "근거"],
  ["knowledge", "ki-tr-10", "decision", "dec-tr-05", "근거"],
  ["knowledge", "ki-tr-10", "glossary", "g-tr-14", "관련"],
  ["knowledge", "ki-tr-12", "notice", "ntc-tr-01", "관련"],
  ["knowledge", "ki-tr-14", "glossary", "g-tr-16", "관련"],
  ["knowledge", "ki-tr-14", "rule", "rule-tr-01", "관련"],
];

function trSeed(ctx: SeedContext): SeedOutput {
  const { artifacts, versions } = buildArtifacts(ctx, "tr", TR_ARTS);
  const notices = buildNotices(ctx, TR_NOTICES);
  return {
    templates: TR_TEMPLATES.map((t) => ({ ...t, created_at: ctx.at(-3, "10:00") })),
    artifacts,
    artifact_versions: versions,
    corrections: buildCorrections(TR_CORS, artifacts),
    rules: buildRules(ctx, TR_RULES),
    ...buildKnowledge(ctx, "tr", TR_KI, TR_KL),
    notices: notices.notices,
    read_receipts: notices.read_receipts,
    calendar_events: buildEvents(ctx, TR_EVENTS),
    approval_links: buildApprovals(ctx, TR_APPROVALS),
    mail_connections: [
      { id: "mc-tr-01", member_id: SA, provider: "imap", scopes: ["읽기"], status: "preview", connected_at: ctx.at(-10, "09:00"), revoked_at: null, account_label: "예시 메일 계정(IMAP)", last_checked_at: ctx.at(0, "08:10") },
      { id: "mc-tr-02", member_id: QA, provider: "imap", scopes: ["읽기"], status: "preview", connected_at: ctx.at(-10, "09:30"), revoked_at: null, account_label: "예시 메일 계정(IMAP)", last_checked_at: ctx.at(0, "08:10") },
    ],
    mail_links: [...buildMail(ctx, "tr-sa", SA, TR_MAIL_SA), ...buildMail(ctx, "tr-qa", QA, TR_MAIL_QA)],
    mail_rules: [
      { id: "mr-tr-01", condition: "보낸 곳이 예시배기시스템(주) 구매 담당", project_id: Q.exh, action: "예시배기시스템 양산 대응 프로젝트로 분류", active: true },
      { id: "mr-tr-02", condition: "보낸 곳이 예시세이프티(주) 구매 담당", project_id: Q.saf, action: "예시세이프티 양산 대응 프로젝트로 분류", active: true },
      { id: "mr-tr-03", condition: "제목에 클레임 번호(CL-)가 있음", project_id: Q.clm, action: "클레임 대응 프로젝트로 분류(L2라 공유 꺼짐)", active: true },
    ],
    ...axKpis(ctx, AD, {
      AX_REPEAT_RATE: [50, 50, 44, 40, 40, 33, 29, 25],
      AX_FIRST_PASS: [20, 20, 25, 25, 30, 33, 33, 40],
      AX_REVIEW_MIN: [70, 66, 64, 60, 58, 55, 51, 48],
      AX_ACTIVE_AI: [1, 1, 2, 2, 3, 3, 4, 4],
    }),
  };
}

function seed(ctx: SeedContext): SeedOutput {
  if (ctx.tenant.slug === "crata-demo") return crataSeed(ctx);
  if (ctx.tenant.slug === "tr-technology") return trSeed(ctx);
  return {};
}

// ─────────────────────────────────────────────── 이름 있는 동작(5.8절 + collab 그룹 동작). 동기 함수, 권한은 ctx.can으로 직접 확인
const me = (ctx: ActionContext) => ctx.persona.memberId;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const asRow = (r: unknown) => r as Record<string, unknown>;
const adminish = (ctx: SelectorContext) => ctx.persona.role === "owner" || ctx.persona.role === "admin";

function need<K extends ResourceName>(ctx: ActionContext, resource: K, id: unknown): RowOf<K> {
  return (typeof id === "string" && id ? ctx.get(resource, id) : null) ?? ctx.fail(404, "찾는 항목이 없어요");
}

/** 공지 대상인지(작성자·관리자는 늘 볼 수 있음) */
export function isNoticeAudience(ctx: SelectorContext, n: RowOf<"notices">): boolean {
  const a = n.audience;
  if (!a || a.type === "all") return true;
  if (a.type === "unit") return (a.ids ?? []).includes(ctx.persona.unitId);
  if (a.type === "role") return (a.ids ?? []).includes(ctx.persona.roleCode);
  return (a.ids ?? []).some((pid) => {
    const p = ctx.get("projects", pid);
    return !!p && (p.owner_member_id === ctx.persona.memberId || p.reviewer_member_id === ctx.persona.memberId || p.member_ids.includes(ctx.persona.memberId));
  });
}

const rpc: Record<string, RpcHandler> = {
  /** 필독 공지 '확인했어요': 읽음 확인 1건(중복 무시) */
  mark_notice_read: (ctx, p: { noticeId?: string }) => {
    const n = need(ctx, "notices", p.noticeId);
    if (!isNoticeAudience(ctx, n) && n.author_id !== me(ctx) && !adminish(ctx)) ctx.fail(403, "이 공지의 대상이 아니에요");
    const dup = ctx.raw.list("read_receipts", { filters: [{ field: "notice_id", operator: "eq", value: n.id }, { field: "member_id", operator: "eq", value: me(ctx) }] })[0];
    if (dup) return { ok: true, readAt: dup.read_at, already: true };
    const now = ctx.clock.now();
    ctx.insert("read_receipts", { notice_id: n.id, member_id: me(ctx), read_at: now });
    // 이 공지의 필독 알림은 읽음으로
    for (const ntf of ctx.raw.list("notifications", { filters: [{ field: "recipient_id", operator: "eq", value: me(ctx) }, { field: "source_id", operator: "eq", value: n.id }] })) {
      if (!ntf.read_at) ctx.update("notifications", ntf.id, { read_at: now });
    }
    return { ok: true, readAt: now };
  },

  /** 규칙 후보 승인: 적용 중(오늘부터, 90일 뒤 재검토), 근거 수정은 '규칙이 됨' */
  approve_rule: (ctx, p: { ruleId?: string }) => {
    const rule = need(ctx, "rules", p.ruleId);
    if (!ctx.can("rules", "approve", asRow(rule))) ctx.fail(403, "규칙은 검토자 이상이 승인할 수 있어요");
    if (rule.status !== "candidate") ctx.fail(409, "이미 처리한 규칙 후보예요");
    const today = ctx.today;
    ctx.update("rules", rule.id, { status: "active", valid_from: today, review_by: addDays(today, 90), approver_id: me(ctx) });
    for (const id of rule.evidence_ids) if (ctx.raw.get("corrections", id)) ctx.update("corrections", id, { status: "promoted", linked_rule_id: rule.id });
    ctx.audit({ action: "rpc:approve_rule", resource: "rules", resourceId: rule.id, changes: { status: [rule.status, "active"] } });
    return { ok: true };
  },

  /** 규칙 후보 반려: 반려, 근거 수정은 '이번만' */
  reject_rule: (ctx, p: { ruleId?: string }) => {
    const rule = need(ctx, "rules", p.ruleId);
    if (!ctx.can("rules", "approve", asRow(rule))) ctx.fail(403, "규칙은 검토자 이상이 처리할 수 있어요");
    if (rule.status !== "candidate") ctx.fail(409, "이미 처리한 규칙 후보예요");
    ctx.update("rules", rule.id, { status: "rejected", approver_id: me(ctx) });
    for (const id of rule.evidence_ids) if (ctx.raw.get("corrections", id)) ctx.update("corrections", id, { status: "dismissed" });
    ctx.audit({ action: "rpc:reject_rule", resource: "rules", resourceId: rule.id, changes: { status: [rule.status, "rejected"] } });
    return { ok: true };
  },

  /** 산출물 등록: 산출물 + 첫 버전(AI 초안 또는 수정본). 파일은 회사 저장소 링크만 */
  register_artifact: (ctx, p: { title?: string; doc_type?: DocType; project_id?: string | null; task_id?: string | null; template_id?: string | null; file_ref?: string; ai_generated?: boolean }) => {
    const title = text(p.title);
    if (title.length < 2) ctx.fail(400, "제목을 두 글자 이상 적어 주세요");
    if (!p.doc_type) ctx.fail(400, "문서 유형을 골라 주세요");
    const fileRef = text(p.file_ref);
    if (!/^https:\/\/\S+$/.test(fileRef)) ctx.fail(400, "파일 링크는 https로 시작하는 주소로 적어 주세요");
    const project = p.project_id ? ctx.get("projects", p.project_id) ?? ctx.fail(404, "프로젝트를 찾을 수 없어요") : null;
    const draft = { owner_id: me(ctx), project_id: project?.id ?? null };
    if (!ctx.can("artifacts", "create", draft)) ctx.fail(403, "권한이 없어요");
    const art = ctx.insert("artifacts", {
      project_id: project?.id ?? null, task_id: p.task_id || null, doc_type: p.doc_type, template_id: p.template_id || null, title, current_version: 1,
      file_ref: fileRef, ai_generated: !!p.ai_generated, sensitivity: project?.sensitivity ?? "L1", owner_id: me(ctx), status: "draft",
    });
    ctx.insert("artifact_versions", {
      artifact_id: art.id, ver: 1, kind: p.ai_generated ? "ai_draft" : "draft", file_ref: fileRef, author_id: me(ctx), author_kind: p.ai_generated ? "ai" : "member", applied_rule_ids: [],
    });
    ctx.audit({ action: "rpc:register_artifact", resource: "artifacts", resourceId: art.id });
    return { ok: true, artifactId: art.id };
  },

  /** 최종본으로 확정(검토자): 상태 최종 + 마지막 버전 '최종본' */
  finalize_artifact: (ctx, p: { artifactId?: string }) => {
    const art = need(ctx, "artifacts", p.artifactId);
    if (!ctx.can("artifacts", "approve", asRow(art))) ctx.fail(403, "최종본 확정은 검토자가 할 수 있어요");
    if (art.status === "final") ctx.fail(409, "이미 최종본이에요");
    const last = ctx.raw.list("artifact_versions", { filters: [{ field: "artifact_id", operator: "eq", value: art.id }], sorters: [{ field: "ver", order: "desc" }] })[0];
    if (last) ctx.update("artifact_versions", last.id, { kind: "final" });
    ctx.update("artifacts", art.id, { status: "final" });
    if (art.owner_id !== me(ctx)) {
      ctx.notify({ recipientId: art.owner_id, kind: "submission_approved", title: `"${art.title}" 최종본으로 확정됐어요`, link: `/docs/artifacts/${art.id}`, sourceModule: "documents", sourceId: art.id });
    }
    ctx.audit({ action: "rpc:finalize_artifact", resource: "artifacts", resourceId: art.id, changes: { status: [art.status, "final"] } });
    return { ok: true };
  },

  /** 수정 사유 남기기: 산출물 담당 또는 검토자 이상 */
  set_correction_reason: (ctx, p: { correctionId?: string; reason?: string }) => {
    const cor = need(ctx, "corrections", p.correctionId);
    const art = need(ctx, "artifacts", cor.artifact_id);
    const ok = art.owner_id === me(ctx) || ctx.can("artifacts", "approve", asRow(art));
    if (!ok) ctx.fail(403, "산출물 담당과 검토자가 사유를 남길 수 있어요");
    const reason = text(p.reason);
    ctx.update("corrections", cor.id, { reason: reason || null });
    ctx.audit({ action: "rpc:set_correction_reason", resource: "corrections", resourceId: cor.id, changes: { reason: [cor.reason, reason || null] } });
    return { ok: true };
  },

  /** 양식 게시(검토자): 사용 중으로, 같은 문서 유형의 이전 사용 중 양식은 사용 안 함 */
  publish_template: (ctx, p: { templateId?: string }) => {
    const tpl = need(ctx, "templates", p.templateId);
    if (!ctx.can("templates", "approve", asRow(tpl))) ctx.fail(403, "양식 게시는 검토자가 할 수 있어요");
    if (!tpl.file_ref) ctx.fail(409, "양식 파일 링크가 없어요. 진단에서 양식을 받은 뒤 게시해요");
    if (tpl.status === "active") ctx.fail(409, "이미 사용 중인 양식이에요");
    for (const t of ctx.raw.list("templates", { filters: [{ field: "doc_type", operator: "eq", value: tpl.doc_type }, { field: "status", operator: "eq", value: "active" }] })) {
      ctx.update("templates", t.id, { status: "retired" });
    }
    ctx.update("templates", tpl.id, { status: "active" });
    ctx.audit({ action: "rpc:publish_template", resource: "templates", resourceId: tpl.id, changes: { status: [tpl.status, "active"] } });
    return { ok: true };
  },

  /** 지식 '검증됨으로 확정'(검토자): 검증일 오늘, 재검토 180일 뒤 */
  verify_knowledge: (ctx, p: { itemId?: string }) => {
    const ki = need(ctx, "knowledge_items", p.itemId);
    if (!ctx.can("knowledge_items", "approve", asRow(ki))) ctx.fail(403, "검토자 이상이 확정할 수 있어요");
    ctx.update("knowledge_items", ki.id, { status: "verified", verified_at: ctx.today, review_by: addDays(ctx.today, 180) });
    ctx.audit({ action: "rpc:verify_knowledge", resource: "knowledge_items", resourceId: ki.id, changes: { status: [ki.status, "verified"] } });
    return { ok: true };
  },

  /** 공지 쓰기: 공지 + 대상에게 알림(필독이면 notice_must_read) */
  create_notice: (ctx, p: {
    category?: StatusValue<"notices.category">; title?: string; body?: string; audience?: RowOf<"notices">["audience"]; must_read?: boolean; pinned?: boolean;
    published_on?: string | null; expires_on?: string | null;
  }) => {
    if (!ctx.can("notices", "create")) ctx.fail(403, "공지는 검토자 이상이 쓸 수 있어요");
    const title = text(p.title);
    const body = text(p.body);
    if (title.length < 2) ctx.fail(400, "제목을 두 글자 이상 적어 주세요");
    if (!body) ctx.fail(400, "본문을 적어 주세요");
    const audience = p.audience && p.audience.type !== "all" ? { type: p.audience.type, ids: (p.audience.ids ?? []).filter(Boolean) } : { type: "all" as const };
    if (audience.type !== "all" && !audience.ids?.length) ctx.fail(400, "대상을 골라 주세요");
    // 검토자는 본인 조직·참여 프로젝트에만
    if (!adminish(ctx) && audience.type !== "all") {
      const okIds = audience.type === "unit" ? [ctx.persona.unitId]
        : audience.type === "project" ? ctx.list("projects").filter((x) => x.owner_member_id === me(ctx) || x.reviewer_member_id === me(ctx) || x.member_ids.includes(me(ctx))).map((x) => x.id)
          : null;
      if (okIds && audience.ids!.some((id) => !okIds.includes(id))) ctx.fail(403, "본인 조직·참여 프로젝트에만 공지할 수 있어요");
    }
    if (!adminish(ctx) && audience.type === "all") ctx.fail(403, "전체 공지는 관리자가 쓸 수 있어요");
    const now = ctx.clock.now();
    const published = p.published_on && p.published_on > ctx.today ? kstIso(p.published_on, "09:00") : now;
    const notice = ctx.insert("notices", {
      category: p.category ?? "general", title, body, author_id: me(ctx), audience, pinned: !!p.pinned, must_read: !!p.must_read,
      published_at: published, expires_at: p.expires_on ? kstIso(p.expires_on, "23:59") : null, attachments: [],
    });
    const targets = audienceMembers(ctx.tenant, ctx.raw.list("projects"), notice);
    for (const to of targets) {
      ctx.notify({
        recipientId: to, kind: notice.must_read ? "notice_must_read" : "system", title: notice.must_read ? notice.title : `새 공지: ${notice.title}`,
        body: notice.must_read ? "필독 공지예요. 읽고 확인해 주세요" : null, link: `/company/notices/${notice.id}`, sourceModule: "notices", sourceId: notice.id,
      });
    }
    ctx.audit({ action: "rpc:create_notice", resource: "notices", resourceId: notice.id });
    return { ok: true, noticeId: notice.id, notified: targets.length };
  },

  /** 메일 후속 제안 → 업무 만들기(출처 메일). 본문은 저장하지 않고 제목만 씁니다 */
  create_task_from_mail: (ctx, p: { mailLinkId?: string; title?: string; dueOn?: string | null }) => {
    const ml = need(ctx, "mail_links", p.mailLinkId);
    if (ml.member_id !== me(ctx)) ctx.fail(403, "본인 메일만 다룰 수 있어요");
    const projectId = ml.project_id ?? ctx.fail(409, "먼저 프로젝트를 골라 주세요");
    if (ml.suggested_task_id) ctx.fail(409, "이미 업무로 만들었어요");
    const project = ctx.get("projects", projectId) ?? ctx.fail(404, "프로젝트를 찾을 수 없어요");
    const draft = { assignee_id: me(ctx), project_id: project.id };
    if (!ctx.can("tasks", "create", draft)) ctx.fail(403, "업무를 만들 권한이 없어요");
    const title = text(p.title) || text(ml.suggestion) || ml.subject;
    const due = p.dueOn && /^\d{4}-\d{2}-\d{2}$/.test(p.dueOn) ? p.dueOn : addDays(ctx.today, 3);
    const reviewer = project.reviewer_member_id === me(ctx) ? project.owner_member_id : project.reviewer_member_id;
    const task = ctx.insert("tasks", {
      project_id: project.id, part_id: null, title, description: `메일 "${ml.subject}"에서 만든 업무예요. 메일 본문은 저장하지 않았어요.`, task_type: null,
      assignee_id: me(ctx), reviewer_id: reviewer, due_at: kstIso(due, "18:00"), priority: "normal", status: "todo", source: "mail", source_ref: ml.id,
      estimate_hours: null, sensitivity: project.sensitivity,
    });
    ctx.update("mail_links", ml.id, { suggested_task_id: task.id, suggestion_status: "accepted" });
    ctx.audit({ action: "rpc:create_task_from_mail", resource: "tasks", resourceId: task.id });
    return { ok: true, taskId: task.id };
  },

  /** 용어 화면 표기 고치기(owner·admin). 플랫폼 키가 있으면 메뉴·필드 이름도 바로 바뀜 */
  set_glossary_label: (ctx, p: { termId?: string | null; platformKey?: string | null; uiLabel?: string }) => {
    if (!ctx.can("tenant_settings", "edit")) ctx.fail(403, "화면 표기는 관리자가 고칠 수 있어요");
    const label = text(p.uiLabel);
    if (!label) ctx.fail(400, "화면 표기를 적어 주세요");
    let key = p.platformKey ?? null;
    if (p.termId) {
      const term = need(ctx, "glossary_terms", p.termId);
      ctx.update("glossary_terms", term.id, { ui_label: label });
      key = term.platform_key ?? key;
    }
    if (key) {
      const settings = ctx.raw.get("tenant_settings", "settings");
      if (settings) {
        const overrides = { ...(settings.overrides ?? {}), glossary: { ...(settings.overrides?.glossary ?? {}), [key]: label } };
        ctx.update("tenant_settings", "settings", { overrides });
      }
    }
    ctx.audit({ action: "rpc:set_glossary_label", resource: "glossary_terms", resourceId: p.termId ?? key });
    return { ok: true };
  },
};

// ─────────────────────────────────────────────── 셀렉터
export interface CalendarItem {
  id: string;
  kind: CalKind;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  project_id: string | null;
  /** 어디서 왔는지: 일정 · 업무 마감 · 회의 · 납기 · 법정 일정 · 법정 검사 */
  source: "event" | "task" | "meeting" | "delivery" | "legal" | "inspection";
  visibility: Vis | null;
  mine: boolean;
  /** 눌렀을 때 갈 곳 */
  to: string | null;
  sub?: string | null;
}

const sel: Record<string, SelectorHandler> = {
  /** 일정 한 화면(C-10): 일정 + 내 업무 마감 + 회의 + (TR) 납기·법정 일정. 쿼리 { from, to, kinds?, mine? } */
  "calendar.range": (ctx, q: { from?: string; to?: string; kinds?: string[] | string; mine?: boolean | string }) => {
    const from = typeof q?.from === "string" ? q.from : weekStart(ctx.today);
    const to = typeof q?.to === "string" ? q.to : addDays(from, 6);
    const kinds = Array.isArray(q?.kinds) ? q.kinds : typeof q?.kinds === "string" && q.kinds ? q.kinds.split(",") : [];
    const mineOnly = q?.mine === true || q?.mine === "1" || q?.mine === "true";
    const meId = ctx.persona.memberId;
    const inRange = (iso: string) => { const d = toKstDate(iso); return d >= from && d <= to; };
    const out: CalendarItem[] = [];

    if (ctx.isModuleOn("calendar")) {
      for (const e of ctx.list("calendar_events")) {
        if (!inRange(e.start_at)) continue;
        out.push({
          id: e.id, kind: e.kind, title: e.title, start_at: e.start_at, end_at: e.end_at, all_day: e.all_day, project_id: e.project_id, source: "event",
          visibility: e.visibility, mine: e.created_by === meId || e.attendee_ids.includes(meId), to: null,
        });
      }
    }
    if (ctx.isModuleOn("tasks")) {
      for (const t of ctx.list("tasks", { filters: [{ field: "assignee_id", operator: "eq", value: meId }] })) {
        if (!t.due_at || ["done", "canceled"].includes(t.status) || !inRange(t.due_at)) continue;
        out.push({ id: `due-${t.id}`, kind: "due", title: t.title, start_at: t.due_at, end_at: null, all_day: false, project_id: t.project_id, source: "task", visibility: null, mine: true, to: `/work/tasks/${t.id}`, sub: "업무 마감" });
      }
    }
    if (ctx.isModuleOn("meetings")) {
      for (const m of ctx.list("meetings")) {
        if (!inRange(m.started_at)) continue;
        const end = new Date(Date.parse(m.started_at) + m.duration_min * 60_000).toISOString();
        out.push({ id: `mtg-${m.id}`, kind: "meeting", title: m.title, start_at: m.started_at, end_at: end, all_day: false, project_id: m.project_ids[0] ?? null, source: "meeting", visibility: null, mine: m.attendee_ids.includes(meId), to: `/meetings/${m.id}` });
      }
    }
    if (ctx.isModuleOn("mfg-orders")) {
      // 납기: 같은 날 같은 거래처는 한 줄로 묶음
      const orders = new Map(ctx.list("sales_orders").map((o) => [o.id, o]));
      const partners = new Map(ctx.list("partners").map((pt) => [pt.id, pt.name]));
      const groups = new Map<string, { date: string; partner: string; count: number; mine: boolean }>();
      for (const l of ctx.list("sales_order_lines")) {
        const date = l.promised_date ?? l.due_date;
        if (!date || date < from || date > to || ["shipped", "closed", "canceled"].includes(l.status)) continue;
        const o = orders.get(l.order_id);
        const key = `${date}|${o?.partner_id ?? "-"}`;
        const g = groups.get(key) ?? { date, partner: partners.get(o?.partner_id ?? "") ?? "거래처", count: 0, mine: o?.owner_id === meId };
        g.count += 1;
        groups.set(key, g);
      }
      for (const [key, g] of groups) {
        out.push({ id: `dlv-${key}`, kind: "delivery", title: `${g.partner} 납기 ${g.count}건`, start_at: kstIso(g.date, "00:00"), end_at: null, all_day: true, project_id: null, source: "delivery", visibility: null, mine: g.mine, to: "/ops/orders" });
      }
    }
    if (ctx.isModuleOn("safety-health")) {
      for (const l of ctx.list("legal_calendar_items")) {
        if (l.due_on < from || l.due_on > to || l.status === "done") continue;
        out.push({ id: `lc-${l.id}`, kind: "safety", title: l.title, start_at: kstIso(l.due_on, "00:00"), end_at: null, all_day: true, project_id: null, source: "legal", visibility: null, mine: l.owner_id === meId, to: "/company/safety", sub: "법정 일정" });
      }
    }
    if (ctx.isModuleOn("mfg-equipment")) {
      const eq = new Map(ctx.list("equipment").map((e) => [e.id, e]));
      for (const li of ctx.list("legal_inspections")) {
        if (li.done_on || li.due_on < from || li.due_on > to) continue;
        const e = eq.get(li.equipment_id);
        out.push({ id: `li-${li.id}`, kind: "inspection", title: `${e?.equipment_no ?? "설비"} ${li.kind}`, start_at: kstIso(li.due_on, "00:00"), end_at: null, all_day: true, project_id: null, source: "inspection", visibility: null, mine: false, to: "/ops/equipment", sub: "법정 검사" });
      }
    }

    const filtered = out.filter((it) => (!kinds.length || kinds.includes(it.kind)) && (!mineOnly || it.mine));
    filtered.sort((a, b) => toKstDate(a.start_at).localeCompare(toKstDate(b.start_at)) || (a.all_day === b.all_day ? a.start_at.localeCompare(b.start_at) : a.all_day ? -1 : 1));
    return { from, to, items: filtered, total: filtered.length };
  },
};

export default defineGroup({ group: "collab", seed, rpc, sel });
