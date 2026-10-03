// ara_settings 그룹 시드(소유: ara_settings 그룹). AI 연결·관리·감사 기록·복지 공유 사본과 ARA 개인 영역 시드를 만듭니다.
// 만들 리소스: GROUP_RESOURCES.ara_settings (mcp_connections, mcp_policies, invitations, role_assignments, position_role_maps,
//   work_style_cards, wellbeing_consents, wellbeing_aggregates, audit_events 이력)
// ARA 개인 영역(P 영역)은 회사 리소스가 아니라 아래 ara()로만 만듭니다. 현재 페르소나 본인 것만(다른 사람 ARA 데이터는 어디에도 없음).
// 양·내용: 빌드 스펙 6.4절 ara_settings 표, 5.9절, 5.10절(감사 기록 이력 비율)
// rpc: revoke_mcp_connection · revoke_all_mcp (5.8절) + 이 그룹 화면용 동작(notes/ara_settings.md에 목록)
//
// 원칙
// - 사람은 TenantConfig.people(가상 이름·역할 표시명)만, 메일은 @example.com, 링크는 .example.invalid.
// - 감사 기록 이력은 다른 그룹의 실제 행(진행 기록·제출·검토·업무·산출물·회의 구간·현장 등록)에서 만들어 서로 맞습니다.
//   익명 현장 등록·아차사고는 감사 기록에 사람을 남기지 않습니다(익명 보호).
// - ARA 공유 사본(work_style_cards)과 ARA 카드 문장은 같은 표(CARD_SETS)에서 만들어 서로 맞습니다.
// - ARA 관련 동작(set_card_share · withdraw_wellbeing_consent)은 회사 감사 로그에 남기지 않습니다(개별 이용 시각은 회사가 볼 수 없는 것, A-03).
import { defineGroup, type SeedContext, type SeedOutput, type RpcHandler, type SelectorHandler, type AraSeed, type ActionContext } from "./types";
import type { McpConnection, Member, RowOf, SeedRow, TenantOverrides } from "@/types/entities";
import type { PlatformRole, RolloutStage } from "@/tenants/types";
import type { ModuleId } from "@/modules/registry.generated";
import { LOCKED_MODULES, MODULE_BY_ID, resolveModules } from "@/modules";
import { addDays, isOffDay, kstIso, toKstDate } from "@/lib/clock";
import { checkBrand, deriveTenantTheme } from "@/theme/derive";
import { CHART_ACCENT_CHOICES } from "@/theme/tokens";

type Row<R extends Parameters<SeedContext["get"]>[0]> = SeedRow<RowOf<R>>;
type Scope = "private" | "team" | "company";
type Client = "ChatGPT" | "Claude" | "Codex";

// ───────── 공통 상수(화면과 같은 값)
/** AI 연결 범위(mcp_policies.allowed_scopes · mcp_connections.scopes) */
export const MCP_SCOPES = ["tasks.read", "tasks.progress", "tasks.submit"] as const;
const ALL_CLIENTS: Client[] = ["ChatGPT", "Claude", "Codex"];
const short = (memberId: string) => memberId.replace(/^m-/, "");
/** ARA 카드 문장(ara 공급자 id) → 회사 공유 사본 id */
export const wscIdFor = (memberId: string, acsId: string) => `wsc-${short(memberId)}-${acsId}`;

// ───────── ARA 카드 문장(진단 용어 없이 일하는 방식만, 6.4절 문장 풀)
interface CardDef { n: number; text: string; scope: Scope }
const S = {
  morning: "집중이 필요한 일은 오전에 하는 편이에요.",
  phone: "급한 요청은 메신저보다 전화가 편해요.",
  purpose: "새 일을 맡을 때 목적을 먼저 들으면 빨리 움직여요.",
  comment: "피드백은 문서에 코멘트로 남겨 주면 좋아요.",
  agenda: "회의 전에 안건을 미리 받으면 더 잘 준비해요.",
  draft: "초안을 일찍 보여 주고 같이 고치는 편이 편해요.",
  list: "할 일은 목록으로 정리해 두면 덜 놓쳐요.",
  quiet: "긴 글을 쓸 때는 알림을 잠시 꺼 두는 편이에요.",
  example: "말로 듣는 것보다 예시를 보면 더 빨리 이해해요.",
  field: "현장 일은 직접 보고 이야기하는 편이 빨라요.",
  shift: "교대 직후에는 인수인계를 먼저 듣고 싶어요.",
  short: "짧게 자주 확인하는 편이 편해요.",
} as const;
const CARD_SETS: Record<string, CardDef[]> = {
  // CRATA(공유 사본 5: 성춘향 2 · 이몽룡 1 · 홍길동 1 · 전우치 1). 김선달은 동의 전이라 카드 없음.
  "m-cr-ceo": [{ n: 1, text: S.purpose, scope: "company" }, { n: 2, text: S.short, scope: "private" }, { n: 3, text: S.phone, scope: "private" }],
  "m-cr-ops": [{ n: 1, text: S.list, scope: "private" }, { n: 2, text: S.agenda, scope: "private" }, { n: 3, text: S.comment, scope: "private" }],
  "m-cr-edu-lead": [{ n: 1, text: S.morning, scope: "team" }, { n: 2, text: S.phone, scope: "private" }, { n: 3, text: S.comment, scope: "company" }, { n: 4, text: S.agenda, scope: "private" }],
  "m-cr-edu-1": [{ n: 1, text: S.draft, scope: "team" }, { n: 2, text: S.example, scope: "private" }, { n: 3, text: S.quiet, scope: "private" }],
  "m-cr-ssi-lead": [{ n: 1, text: S.agenda, scope: "private" }, { n: 2, text: S.purpose, scope: "private" }, { n: 3, text: S.morning, scope: "private" }],
  "m-cr-ara-lead": [{ n: 1, text: S.comment, scope: "team" }, { n: 2, text: S.quiet, scope: "private" }, { n: 3, text: S.short, scope: "private" }, { n: 4, text: S.list, scope: "private" }],
  // TR(공유 사본 3: 공장장 1 · 품질보증 A 1 · 영업·생산 A 1). 생산 작업자 A는 동의 전이라 카드 없음.
  "m-tr-ceo": [{ n: 1, text: S.purpose, scope: "private" }, { n: 2, text: S.short, scope: "private" }, { n: 3, text: S.phone, scope: "private" }],
  "m-tr-plant": [{ n: 1, text: S.field, scope: "company" }, { n: 2, text: S.phone, scope: "private" }, { n: 3, text: S.morning, scope: "private" }, { n: 4, text: S.shift, scope: "private" }],
  "m-tr-qa": [{ n: 1, text: S.comment, scope: "team" }, { n: 2, text: S.morning, scope: "private" }, { n: 3, text: S.example, scope: "private" }],
  "m-tr-sales": [{ n: 1, text: S.phone, scope: "team" }, { n: 2, text: S.list, scope: "private" }, { n: 3, text: S.agenda, scope: "private" }],
  "m-tr-admin": [{ n: 1, text: S.list, scope: "private" }, { n: 2, text: S.purpose, scope: "private" }, { n: 3, text: S.quiet, scope: "private" }],
  "m-tr-dev": [{ n: 1, text: S.example, scope: "private" }, { n: 2, text: S.draft, scope: "private" }, { n: 3, text: S.morning, scope: "private" }],
};
/** 복지 동의한 사람과 동의일(오늘 기준 며칠 전). 김선달·생산 작업자 A는 동의 전 */
const CONSENTS: Record<string, [string, number][]> = {
  "crata-demo": [["m-cr-ceo", -52], ["m-cr-ops", -50], ["m-cr-edu-lead", -48], ["m-cr-edu-1", -41], ["m-cr-ssi-lead", -37], ["m-cr-ara-lead", -30]],
  "tr-technology": [["m-tr-ceo", -26], ["m-tr-plant", -25], ["m-tr-qa", -24], ["m-tr-sales", -22], ["m-tr-admin", -21], ["m-tr-dev", -19], ["m-tr-op-b", -12]],
};

/** 예시 대화(질문 형태 해요체, 진단·치료 표현 없음) */
const CONVERSATIONS: [string, string, string, string][] = [
  [
    "요즘 회의가 많아서 오전에 집중할 시간이 부족해요.",
    "오전 시간이 자꾸 쪼개지는 느낌이었겠어요. 집중이 잘 됐던 날은 무엇이 달랐나요?",
    "회의 전에 안건을 미리 받으면 덜 지치더라고요.",
    "안건을 미리 받는 게 도움이 되는군요. 이 내용을 카드 문장으로 남겨 동료와 나눠 볼까요?",
  ],
  [
    "새 일을 맡으면 뭐부터 해야 할지 막막할 때가 있어요.",
    "막막할 때 가장 먼저 알고 싶은 건 무엇인가요? 목적, 마감, 아니면 함께할 사람인가요?",
    "목적을 먼저 들으면 그다음은 금방 정리돼요.",
    "목적을 먼저 듣는 게 출발점이군요. 일을 맡길 때 그 점을 알려 주면 좋겠다고 카드에 적어 둘까요?",
  ],
  [
    "피드백을 말로 들으면 나중에 잘 기억이 안 나요.",
    "기억에 남는 피드백은 어떤 모양이었나요?",
    "문서에 코멘트로 남겨 주면 다시 보면서 고치기 편해요.",
    "다시 볼 수 있는 피드백이 편하군요. 이번 주에 한 번, 동료에게 그렇게 부탁해 볼 수 있을까요?",
  ],
];

// ───────── 시드
function seed(ctx: SeedContext): SeedOutput {
  const cr = ctx.tenant.slug === "crata-demo";
  const now = ctx.at(0, "09:30");
  const owner = ctx.memberOf("R_CEO");
  const people = ctx.people;
  const unitOf = (id: string) => people.find((p) => p.id === id)?.unitId;

  // AI 연결 정책(1행)
  const mcp_policies: Row<"mcp_policies">[] = [{
    id: "mcppol", enabled: true, read_only: false, allowed_clients: [...ALL_CLIENTS], allowed_scopes: [...MCP_SCOPES],
    overseas_notice_version: "v1-2026-10-01", updated_by: owner, created_by: owner, created_at: ctx.at(-40, "10:00"), updated_at: ctx.at(-2, "17:10"),
  }];

  // AI 연결: [id, 사람, AI, 연결한 날, 범위 수, 끊은 날?]. 마지막 사용 시각은 진행 기록·제출(AI 연결)에서 계산(지연 생성)
  type ConnDef = [string, string, Client, number, number, number?];
  const connDefs: ConnDef[] = cr
    ? [
      ["mcp-cr-01", "m-cr-edu-lead", "Claude", -40, 3],
      ["mcp-cr-02", "m-cr-edu-lead", "ChatGPT", -28, 3],
      ["mcp-cr-03", "m-cr-edu-1", "Claude", -36, 3],
      ["mcp-cr-04", "m-cr-ara-1", "Codex", -21, 3],
      ["mcp-cr-05", "m-cr-ara-lead", "ChatGPT", -23, 3],
      ["mcp-cr-06", "m-cr-edu-1", "ChatGPT", -51, 3, -29],
    ]
    : [
      ["mcp-tr-01", "m-tr-qa", "Claude", -22, 3],
      ["mcp-tr-02", "m-tr-sales", "ChatGPT", -18, 3],
      ["mcp-tr-03", "m-tr-dev", "Claude", -15, 3],
      ["mcp-tr-04", "m-tr-plant", "ChatGPT", -14, 3],
    ];
  const FALLBACK_USE: Record<string, [number, string]> = {
    "mcp-cr-01": [0, "08:12"], "mcp-cr-02": [-3, "16:20"], "mcp-cr-03": [0, "08:40"], "mcp-cr-04": [-1, "21:05"], "mcp-cr-05": [-2, "11:30"], "mcp-cr-06": [-31, "15:10"],
    "mcp-tr-01": [-1, "17:30"], "mcp-tr-02": [-1, "17:40"], "mcp-tr-03": [-2, "10:05"], "mcp-tr-04": [-1, "07:30"],
  };
  const mcp_connections = (): Row<"mcp_connections">[] => {
    const uses = aiUses(ctx);
    return connDefs.map(([id, member, client, from, nScopes, revoked]) => {
      const created = ctx.at(from, "10:00");
      const fb = FALLBACK_USE[id]!;
      let last = ctx.at(fb[0], fb[1]);
      if (revoked == null) {
        const seen = uses.filter((u) => u.member === member && u.client === client).map((u) => u.at).sort();
        if (seen.length && seen[seen.length - 1]! > last) last = seen[seen.length - 1]!;
      }
      return {
        id, member_id: member, client_name: client, client_id: `demo-oauth-${client.toLowerCase()}`, scopes: MCP_SCOPES.slice(0, nScopes),
        last_used_at: last, revoked_at: revoked != null ? ctx.at(revoked, "18:00") : null, created_by: member, created_at: created, updated_at: revoked != null ? ctx.at(revoked, "18:00") : last,
      };
    });
  };

  // 초대(대기)
  const invitations: Row<"invitations">[] = cr
    ? [{ id: "inv-cr-01", email: "new.edu.staff@example.com", role: "member", org_unit_id: "U_EDU", invited_by: "m-cr-ops", expires_at: ctx.at(5, "23:59"), status: "pending", created_by: "m-cr-ops", created_at: ctx.at(-2, "14:20") }]
    : [
      { id: "inv-tr-01", email: "tr.op.g@example.com", role: "member", org_unit_id: "U_SALES_PROD", invited_by: "m-tr-admin", expires_at: ctx.at(5, "23:59"), status: "pending", created_by: "m-tr-admin", created_at: ctx.at(-2, "11:05") },
      { id: "inv-tr-02", email: "tr.op.h@example.com", role: "member", org_unit_id: "U_SALES_PROD", invited_by: "m-tr-admin", expires_at: ctx.at(6, "23:59"), status: "pending", created_by: "m-tr-admin", created_at: ctx.at(-1, "15:40") },
    ];

  // 역할 부여: 사람마다 1(입사·시작 시) + 최근 7일 변경 2(이전 역할 → 지금 역할)
  const roleOf = (code: string): PlatformRole => ctx.tenant.roles.find((r) => r.code === code)?.platformRole ?? "member";
  const CHANGES: Record<string, { member: string; from: PlatformRole; day: number; time: string }[]> = {
    // 일하는 날만(추석 9/24~26·일요일 피함)
    "crata-demo": [{ member: "m-cr-ops", from: "member", day: -7, time: "10:30" }, { member: "m-cr-ara-lead", from: "member", day: -2, time: "16:10" }],
    "tr-technology": [{ member: "m-tr-admin", from: "member", day: -7, time: "09:40" }, { member: "m-tr-qa", from: "member", day: -2, time: "13:20" }],
  };
  const changes = CHANGES[ctx.tenant.slug] ?? [];
  const role_assignments: Row<"role_assignments">[] = [];
  people.forEach((p, i) => {
    const ch = changes.find((c) => c.member === p.id);
    const start = cr ? -88 + (i % 3) : -45 + (i % 4);
    role_assignments.push({
      id: `rasg-${short(p.id)}-1`, member_id: p.id, role: ch ? ch.from : roleOf(p.roleCode), scope_type: "company", scope_id: null,
      granted_by: p.id === owner ? null : owner, granted_at: ctx.at(start, "09:00"), created_by: owner, created_at: ctx.at(start, "09:00"),
    });
  });
  for (const ch of changes) {
    const p = people.find((x) => x.id === ch.member)!;
    role_assignments.push({
      id: `rasg-${short(p.id)}-2`, member_id: p.id, role: roleOf(p.roleCode), scope_type: "company", scope_id: null,
      granted_by: owner, granted_at: ctx.at(ch.day, ch.time), created_by: owner, created_at: ctx.at(ch.day, ch.time),
    });
  }

  // 직책 → 기본 역할
  const maps: [string, PlatformRole][] = cr
    ? [["대표", "owner"], ["경영지원 담당", "admin"], ["리드(팀장)", "reviewer"], ["담당", "member"]]
    : [["대표이사", "owner"], ["공장장", "reviewer"], ["팀장·파트 책임", "reviewer"], ["총무·구매·경리 담당", "admin"], ["담당", "member"], ["생산 작업자", "member"]];
  const position_role_maps: Row<"position_role_maps">[] = maps.map(([t, r], i) => ({ id: `prm-${cr ? "cr" : "tr"}-${i + 1}`, position_or_title: t, default_role: r, created_by: owner, created_at: ctx.at(-40, "10:00") }));

  // 복지 동의 + 공유 사본 + 월 집계
  const consents = CONSENTS[ctx.tenant.slug] ?? [];
  const wellbeing_consents: Row<"wellbeing_consents">[] = consents.map(([m, day]) => ({
    id: `wcon-${short(m)}`, member_id: m, ai_notice_at: ctx.at(day, "12:10"), privacy_consent_at: ctx.at(day, "12:12"), sensitive_consent_at: ctx.at(day, "12:13"),
    withdrawn_at: null, created_by: m, created_at: ctx.at(day, "12:10"),
  }));
  const work_style_cards: Row<"work_style_cards">[] = [];
  for (const [m, day] of consents) {
    for (const c of CARD_SETS[m] ?? []) {
      if (c.scope === "private") continue;
      const unit = unitOf(m);
      const shared = ctx.at(Math.min(-1, day + 4 + c.n), "17:30");
      work_style_cards.push({
        id: wscIdFor(m, `acs-${c.n}`), member_id: m, sentence: c.text, share_scope: c.scope,
        shared_with_ids: c.scope === "team" ? people.filter((p) => p.unitId === unit && p.id !== m).map((p) => p.id) : [],
        shared_at: shared, revoked_at: null, created_by: m, created_at: shared,
      });
    }
  }
  const pop = cr ? [5, 6, 6] : [6, 7, 7];
  const wellbeing_aggregates: Row<"wellbeing_aggregates">[] = ["2026-07", "2026-08", "2026-09"].map((month, i) => ({
    id: `wagg-${month}`, period_month: month, population_n: pop[i]!, active_seats: pop[i]!,
    assessment_completion_rate: cr ? [60, 67, 83][i]! : [50, 57, 71][i]!, card_share_rate: cr ? [20, 33, 50][i]! : [17, 29, 43][i]!,
    topic_distribution: null, created_at: kstIso(`${addDays(`${month}-01`, 32).slice(0, 7)}-01`, "06:00"),
  }));

  return {
    mcp_policies, mcp_connections, invitations, role_assignments, position_role_maps,
    work_style_cards, wellbeing_consents, wellbeing_aggregates,
    audit_events: () => makeAudit(ctx, connDefs, changes.map((c) => ({ ...c, to: roleOf(people.find((p) => p.id === c.member)!.roleCode) })), invitations, now),
  };
}

// ───────── AI 연결 사용 기록(진행 기록·제출 중 via=ai_connection)
interface AiUse { member: string; client: string; at: string; kind: "log" | "sub"; id: string; taskId: string; body: string }
function aiUses(ctx: SeedContext): AiUse[] {
  const out: AiUse[] = [];
  for (const l of ctx.get("progress_logs")) if (l.via === "ai_connection" && l.via_client) out.push({ member: l.author_id, client: l.via_client, at: l.created_at, kind: "log", id: l.id, taskId: l.task_id, body: l.body });
  for (const s of ctx.get("submissions")) if (s.via === "ai_connection" && s.via_client) out.push({ member: s.submitted_by, client: s.via_client, at: s.submitted_at, kind: "sub", id: s.id, taskId: s.task_id, body: s.summary });
  return out;
}

// ───────── 감사 기록 이력(5.10절: 구성원 70% · AI 연결 20% · 시스템 9% · CRATA 운영자 1건)
type Ev = Row<"audit_events">;
function makeAudit(
  ctx: SeedContext,
  connDefs: [string, string, Client, number, number, number?][],
  roleChanges: { member: string; from: PlatformRole; to: PlatformRole; day: number; time: string }[],
  invitations: Row<"invitations">[],
  now: string,
): Ev[] {
  const cr = ctx.tenant.slug === "crata-demo";
  const total = cr ? 200 : 160;
  const quota = { ai: Math.round(total * 0.2), system: Math.round(total * 0.09), operator: 1 };
  const memberQuota = total - quota.ai - quota.system - quota.operator;
  const rng = ctx.rng("ara_settings.audit");
  const owner = ctx.memberOf("R_CEO");
  const from = ctx.at(-60, "00:00");
  const inWindow = (at: string | null | undefined): at is string => !!at && at >= from && at <= now;
  // 사람·AI 연결 기록은 일하는 날만 고릅니다(일요일·공휴일, CRATA는 토요일도 쉬어요). 시스템 기록은 날을 가리지 않아요
  const workday = (at: string) => !isOffDay(toKstDate(at), { saturday: cr });
  const ev = (o: Omit<Ev, "id" | "ip" | "user_agent" | "request_id" | "changes" | "resource_id"> & { resource_id?: string | null; changes?: Ev["changes"] }): Ev => ({
    ip: null, user_agent: null, request_id: null, resource_id: null, changes: null, ...o, id: "",
  });

  const tasks = ctx.get("tasks");

  // 꼭 넣을 구성원 기록(관리·AI 연결 화면과 맞물림)
  const must: Ev[] = [];
  for (const [id, member, client, day, , revoked] of connDefs) {
    must.push(ev({ at: ctx.at(day, "10:00"), actor_id: member, actor_type: "member", action: "create", resource: "mcp_connections", resource_id: id, changes: { client_name: [null, client] } }));
    if (revoked != null) must.push(ev({ at: ctx.at(revoked, "18:00"), actor_id: member, actor_type: "member", action: "rpc:revoke_mcp_connection", resource: "mcp_connections", resource_id: id, changes: { revoked_at: [null, ctx.at(revoked, "18:00")] } }));
  }
  for (const c of roleChanges) {
    const at = ctx.at(c.day, c.time);
    must.push(ev({ at, actor_id: owner, actor_type: "member", action: "rpc:change_member_role", resource: "members", resource_id: c.member, changes: { role: [c.from, c.to] } }));
    must.push(ev({ at, actor_id: owner, actor_type: "member", action: "create", resource: "role_assignments", resource_id: `rasg-${short(c.member)}-2`, changes: { role: [null, c.to] } }));
  }
  for (const inv of invitations) must.push(ev({ at: inv.created_at!, actor_id: inv.invited_by, actor_type: "member", action: "create", resource: "invitations", resource_id: inv.id, changes: { email: [null, "••• 가림"], role: [null, inv.role] } }));
  must.push(ev({ at: ctx.at(-2, "17:10"), actor_id: owner, actor_type: "member", action: "update", resource: "mcp_policies", resource_id: "mcppol", changes: { overseas_notice_version: ["v0-2026-08-01", "v1-2026-10-01"] } }));

  // 그 밖의 구성원 기록 후보(다른 그룹 행에서)
  const pool: Ev[] = [];
  for (const s of ctx.get("submissions")) {
    if (s.via !== "ai_connection" && inWindow(s.submitted_at)) pool.push(ev({ at: s.submitted_at, actor_id: s.submitted_by, actor_type: "member", action: "rpc:submit_task", resource: "tasks", resource_id: s.task_id, changes: { status: ["in_progress", "submitted"] } }));
    if (s.reviewed_by && inWindow(s.reviewed_at)) {
      pool.push(ev({ at: s.reviewed_at, actor_id: s.reviewed_by, actor_type: "member", action: s.status === "approved" ? "rpc:approve_submission" : "rpc:request_changes", resource: "submissions", resource_id: s.id, changes: { status: ["submitted", s.status] } }));
    }
  }
  for (const t of tasks) if (inWindow(t.created_at) && t.created_by) pool.push(ev({ at: t.created_at, actor_id: t.created_by, actor_type: "member", action: "create", resource: "tasks", resource_id: t.id, changes: { title: [null, t.title] } }));
  for (const l of ctx.get("progress_logs")) if (l.via !== "ai_connection" && inWindow(l.created_at)) pool.push(ev({ at: l.created_at, actor_id: l.author_id, actor_type: "member", action: "create", resource: "progress_logs", resource_id: l.id, changes: { body: [null, clip(l.body)] } }));
  for (const a of ctx.get("artifacts")) if (inWindow(a.created_at)) pool.push(ev({ at: a.created_at, actor_id: a.owner_id, actor_type: "member", action: "rpc:register_artifact", resource: "artifacts", resource_id: a.id, changes: { title: [null, a.title] } }));
  for (const n of ctx.get("notices")) if (inWindow(n.published_at)) pool.push(ev({ at: n.published_at, actor_id: n.author_id, actor_type: "member", action: "rpc:create_notice", resource: "notices", resource_id: n.id, changes: { title: [null, n.title] } }));
  if (!cr) {
    for (const f of ctx.get("field_reports")) {
      if (f.anonymous || !f.reported_by || !inWindow(f.reported_at)) continue;
      pool.push(ev({ at: f.reported_at, actor_id: f.reported_by, actor_type: "member", action: "rpc:create_field_report", resource: "field_reports", resource_id: f.id, changes: { kind: [null, f.kind] } }));
    }
  }
  const memberEvents = [...must, ...pickSpread(rng, pool.filter((e) => workday(e.at) && ctx.people.some((p) => p.id === e.actor_id)), Math.max(0, memberQuota - must.length))];

  // AI 연결 기록: 진행 기록·제출(AI 연결) + 모자라면 업무 시작(start_task)
  const aiPool: Ev[] = aiUses(ctx).filter((u) => inWindow(u.at) && workday(u.at)).map((u) => ev({
    at: u.at, actor_id: u.member, actor_type: "ai_connection", actor_client: u.client,
    action: u.kind === "log" ? "create" : "rpc:submit_task", resource: u.kind === "log" ? "progress_logs" : "tasks", resource_id: u.kind === "log" ? u.id : u.taskId,
    changes: u.kind === "log" ? { body: [null, clip(u.body)] } : { status: ["in_progress", "submitted"] },
  }));
  let aiEvents = pickSpread(rng, aiPool, quota.ai);
  if (aiEvents.length < quota.ai) {
    const active = connDefs.filter((c) => c[5] == null);
    const extra: Ev[] = [];
    for (const t of tasks) {
      const conn = active.find((c) => c[1] === t.assignee_id);
      if (!conn || t.status === "todo" || !inWindow(t.created_at)) continue;
      const at = new Date(Date.parse(t.created_at) + 26 * 3_600_000).toISOString();
      if (!inWindow(at) || !workday(at) || at < ctx.at(conn[3], "10:00")) continue;
      extra.push(ev({ at, actor_id: t.assignee_id, actor_type: "ai_connection", actor_client: conn[2], action: "rpc:start_task", resource: "tasks", resource_id: t.id, changes: { status: ["todo", "in_progress"] } }));
    }
    aiEvents = [...aiEvents, ...pickSpread(rng, extra, quota.ai - aiEvents.length)];
  }

  // 시스템 기록: 회의 자동 분류 · 주간 지표 계산 · 규칙 적용 통계
  const sysPool: Ev[] = [];
  const meetings = new Map(ctx.get("meetings").map((m) => [m.id, m]));
  for (const s of ctx.get("meeting_segments")) {
    const m = meetings.get(s.meeting_id);
    // L2(고객 비밀) 회의는 AI 자동 분류가 꺼져 있어 시스템 분류 기록이 없어요(사람이 분류)
    if (!m || m.sensitivity === "L2") continue;
    const at = new Date(Date.parse(m.started_at) + (m.duration_min + 12) * 60_000).toISOString();
    if (inWindow(at)) sysPool.push(ev({ at, actor_id: null, actor_type: "system", action: "create", resource: "meeting_segments", resource_id: s.id, changes: { review_status: [null, "auto"] } }));
  }
  for (const v of ctx.get("kpi_values")) if (v.kpi_id.startsWith("AX_") && inWindow(v.recorded_at)) sysPool.push(ev({ at: v.recorded_at, actor_id: null, actor_type: "system", action: "create", resource: "kpi_values", resource_id: v.id, changes: { value: [null, v.value] } }));
  const sysEvents = pickSpread(rng, sysPool, quota.system);

  // CRATA 운영자: 프로파일 적용 1건
  const op = ev({
    at: ctx.at(-7, "19:00"), actor_id: null, actor_type: "crata_operator", action: "rpc:profile_applied", resource: "tenant_settings", resource_id: "settings",
    changes: { profile_version: cr ? [null, ctx.tenant.profile.version] : ["v1.0", ctx.tenant.profile.version] },
  });

  const all = [...memberEvents, ...aiEvents, ...sysEvents, op].sort((a, b) => a.at.localeCompare(b.at));
  return all.map((e, i) => {
    const id = `ae-${cr ? "cr" : "tr"}-${String(i + 1).padStart(4, "0")}`;
    return { ...e, id, request_id: `req-${id.slice(3)}`, created_by: e.actor_id, created_at: e.at, updated_at: e.at };
  });
}

const clip = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** 시간 순서를 고르게 남기며 n개 고르기(같은 시드면 늘 같음) */
function pickSpread<T extends { at: string }>(rng: ReturnType<SeedContext["rng"]>, list: T[], n: number): T[] {
  if (n <= 0) return [];
  if (list.length <= n) return [...list];
  return rng.sample(list, n);
}

// ───────── ARA 개인 영역(현재 페르소나 1명분만)
const ara: AraSeed = ({ persona, at, rng }) => {
  const consent = Object.values(CONSENTS).flat().find(([m]) => m === persona.memberId);
  if (!consent) return { ara_profile: [{ id: "profile", consented_at: null, steps_done: 0 }] };
  const day = consent[1];
  const cards = CARD_SETS[persona.memberId] ?? [];
  const conv = rng("conversation").pick(CONVERSATIONS);
  const base = Math.max(day + 2, -3);
  return {
    ara_profile: [{ id: "profile", consented_at: at(day, "12:13"), steps_done: 4, created_at: at(day, "12:10") }],
    ara_card_sentences: cards.map((c) => ({ id: `acs-${c.n}`, text: c.text, order: c.n, share_scope: c.scope, created_at: at(day, "12:40"), updated_at: at(day, "12:40") })),
    ara_messages: conv.map((text, i) => ({ id: `am-${i + 1}`, role: i % 2 === 0 ? "me" as const : "ara" as const, text, created_at: at(base, `21:${String(10 + i * 3).padStart(2, "0")}`) })),
  };
};

// ───────── 이름 있는 동작
const isAdminish = (ctx: ActionContext) => ctx.persona.role === "owner" || ctx.persona.role === "admin";
const ROLE_LABEL: Record<PlatformRole, string> = { owner: "소유자", admin: "관리자", reviewer: "검토자", member: "구성원" };

function currentOverrides(ctx: ActionContext): TenantOverrides {
  return (ctx.raw.get("tenant_settings", "settings")?.overrides as TenantOverrides | undefined) ?? {};
}

const rpc: Record<string, RpcHandler> = {
  /** A-05: 내 AI 연결 끊기(본인 것만, 관리자는 회사 전체) */
  revoke_mcp_connection: (ctx, { connectionId }: { connectionId: string }) => {
    const c = ctx.raw.get("mcp_connections", connectionId);
    if (!c || !ctx.get("mcp_connections", connectionId)) ctx.fail(404, "찾는 항목이 없어요");
    const conn = c as McpConnection;
    if (conn.member_id !== ctx.persona.memberId && !isAdminish(ctx)) ctx.fail(403, "본인 연결만 끊을 수 있어요");
    if (conn.revoked_at) return { ok: true, already: true };
    const at = ctx.clock.now();
    ctx.update("mcp_connections", connectionId, { revoked_at: at });
    ctx.audit({ action: "rpc:revoke_mcp_connection", resource: "mcp_connections", resourceId: connectionId, changes: { revoked_at: [null, at] } });
    if (conn.member_id !== ctx.persona.memberId) {
      ctx.notify({ recipientId: conn.member_id, kind: "system", title: `${conn.client_name} AI 연결이 관리자에 의해 끊겼어요`, link: "/me/ai", sourceModule: "ai-connect", sourceId: connectionId });
    }
    return { ok: true };
  },

  /** A-09: 회사 전체 AI 연결 모두 끊기(owner·admin) */
  revoke_all_mcp: (ctx) => {
    if (!isAdminish(ctx) || !ctx.can("mcp_connections", "delete")) ctx.fail(403, "권한이 없어요");
    const active = ctx.raw.list("mcp_connections").filter((c) => !c.revoked_at);
    const at = ctx.clock.now();
    const people = new Set<string>();
    for (const c of active) {
      ctx.update("mcp_connections", c.id, { revoked_at: at });
      people.add(c.member_id);
    }
    ctx.audit({ action: "rpc:revoke_all_mcp", resource: "mcp_connections", resourceId: null, changes: { revoked: [0, active.length] } });
    for (const m of people) {
      if (m === ctx.persona.memberId) continue;
      ctx.notify({ recipientId: m, kind: "system", title: "회사에서 모든 AI 연결을 끊었어요. 다시 연결해 주세요", link: "/me/ai", sourceModule: "ai-connect" });
    }
    return { ok: true, revoked: active.length, people: people.size };
  },

  /** A-01: 카드 문장의 나눌 범위. 팀·회사면 사본만 회사 쪽에 만들고, 나만이면 revoked_at. ARA 동작이라 감사 기록 없음 */
  set_card_share: (ctx, { acsId, sentence, scope }: { acsId: string; sentence: string; scope: Scope }) => {
    if (!["private", "team", "company"].includes(scope)) ctx.fail(400, "나눌 범위를 다시 골라 주세요");
    if (typeof sentence !== "string" || !sentence.trim() || sentence.length > 200) ctx.fail(400, "문장을 확인해 주세요");
    const me = ctx.persona.memberId;
    const consent = ctx.raw.list("wellbeing_consents").find((c) => c.member_id === me);
    if (!consent || consent.withdrawn_at) ctx.fail(409, "ARA 동의 후에 나눌 수 있어요");
    const id = wscIdFor(me, acsId);
    const cur = ctx.raw.get("work_style_cards", id);
    const at = ctx.clock.now();
    if (scope === "private") {
      if (cur && !cur.revoked_at) ctx.update("work_style_cards", id, { revoked_at: at, share_scope: "private" });
      return { ok: true, shared: false };
    }
    const unit = ctx.tenant.people.find((p) => p.id === me)?.unitId;
    const shared_with_ids = scope === "team" ? ctx.tenant.people.filter((p) => p.unitId === unit && p.id !== me).map((p) => p.id) : [];
    if (cur) ctx.update("work_style_cards", id, { sentence, share_scope: scope, shared_with_ids, shared_at: at, revoked_at: null });
    else ctx.insert("work_style_cards", { id, member_id: me, sentence, share_scope: scope, shared_with_ids, shared_at: at, revoked_at: null, created_by: me });
    return { ok: true, shared: true };
  },

  /** A-03: 복지 동의 철회 → withdrawn_at + 공유 사본 모두 내리기(ARA 기록 삭제는 화면이 ara 공급자 rpc:wipe로). 감사 기록 없음 */
  withdraw_wellbeing_consent: (ctx) => {
    const me = ctx.persona.memberId;
    const at = ctx.clock.now();
    const consent = ctx.raw.list("wellbeing_consents").find((c) => c.member_id === me);
    if (consent && !consent.withdrawn_at) ctx.update("wellbeing_consents", consent.id, { withdrawn_at: at });
    let revoked = 0;
    for (const c of ctx.raw.list("work_style_cards")) {
      if (c.member_id === me && !c.revoked_at) { ctx.update("work_style_cards", c.id, { revoked_at: at, share_scope: "private" }); revoked += 1; }
    }
    return { ok: true, revoked };
  },

  /** A-04: 내 프로필에서 담당 업무·업무 전화만 고치기(구성원 권한이 조회여도 본인 두 칸은 고칠 수 있음) */
  update_my_profile: (ctx, { duties, phoneWork }: { duties?: string | null; phoneWork?: string }) => {
    const me = ctx.persona.memberId;
    const cur = ctx.raw.get("members", me) as Member | null;
    if (!cur) ctx.fail(404, "찾는 항목이 없어요");
    const patch: Partial<Member> = {};
    const changes: Record<string, [unknown, unknown]> = {};
    if (duties !== undefined) {
      const v = (duties ?? "").trim();
      if (v.length > 60) ctx.fail(400, "담당 업무는 60자 이내로 적어 주세요");
      if ((cur!.duties ?? "") !== v) { patch.duties = v || null; changes.duties = [cur!.duties, v || null]; }
    }
    if (phoneWork !== undefined) {
      const v = phoneWork.trim();
      if (!/^000-0000-\d{4}$/.test(v)) ctx.fail(400, "데모에서는 000-0000-0000 모양의 예시 번호만 쓸 수 있어요");
      if (cur!.phone_work !== v) { patch.phone_work = v; changes.phone_work = [cur!.phone_work, v]; }
    }
    if (!Object.keys(patch).length) return { ok: true, changed: false };
    ctx.update("members", me, patch);
    ctx.audit({ action: "rpc:update_my_profile", resource: "members", resourceId: me, changes });
    return { ok: true, changed: true };
  },

  /** A-06: 프로파일 변경 요청(CRATA 운영자에게, 예시) */
  request_profile_change: (ctx, { area, reason }: { area: string; reason: string }) => {
    if (!isAdminish(ctx)) ctx.fail(403, "권한이 없어요");
    if (!area || !reason || !String(reason).trim()) ctx.fail(400, "무엇을 왜 바꿀지 적어 주세요");
    ctx.audit({ action: "rpc:profile_change_requested", resource: "tenant_settings", resourceId: "settings", changes: { area: [null, area], reason: [null, String(reason).trim().slice(0, 200)] } });
    return { ok: true };
  },

  /** A-07: 모듈 켜기·끄기(잠금 모듈·의존성 확인) */
  set_module_enabled: (ctx, { moduleId, enabled }: { moduleId: ModuleId; enabled: boolean }) => {
    if (!isAdminish(ctx) || !ctx.can("tenant_settings", "edit")) ctx.fail(403, "권한이 없어요");
    const mod = MODULE_BY_ID[moduleId];
    if (!mod) ctx.fail(404, "찾는 모듈이 없어요");
    if (mod!.industry !== "core") ctx.fail(409, "업종 팩은 계약 사항이라 CRATA 운영자와 함께 바꿔요");
    if (LOCKED_MODULES.includes(moduleId)) ctx.fail(409, "꼭 필요한 모듈이라 끌 수 없어요");
    const o = currentOverrides(ctx);
    const before = resolveModules(ctx.tenant, o).enabled;
    if (enabled) {
      const missing = mod!.dependsOn.filter((d) => !before.has(d));
      if (missing.length) ctx.fail(409, `먼저 ${missing.map((d) => MODULE_BY_ID[d]?.nameKo ?? d).join(", ")} 모듈을 켜 주세요`);
    } else {
      const users = [...before].filter((id) => id !== moduleId && MODULE_BY_ID[id]?.dependsOn.includes(moduleId));
      if (users.length) ctx.fail(409, `${users.map((d) => MODULE_BY_ID[d]?.nameKo ?? d).join(", ")} 모듈이 이 모듈을 써요`);
    }
    const next: TenantOverrides = { ...o, modules: { ...(o.modules ?? {}), [moduleId]: enabled } };
    ctx.update("tenant_settings", "settings", { overrides: next });
    ctx.audit({ action: "rpc:set_module_enabled", resource: "tenant_settings", resourceId: "settings", changes: { [`modules.${moduleId}`]: [before.has(moduleId), enabled] } });
    return { ok: true };
  },

  /** A-07 도입 단계: 1단계(꼭 필요한 화면만)와 전체 사이 전환. 메뉴·홈만 바뀌고 모듈·데이터는 그대로예요 */
  set_rollout_stage: (ctx, { stage }: { stage: RolloutStage }) => {
    if (!isAdminish(ctx) || !ctx.can("tenant_settings", "edit")) ctx.fail(403, "권한이 없어요");
    if (!ctx.tenant.rollout) ctx.fail(409, "이 회사는 도입 단계를 나누지 않았어요");
    if (stage !== "phase1" && stage !== "full") ctx.fail(400, "단계를 다시 골라 주세요");
    const o = currentOverrides(ctx);
    const before = o.stage ?? ctx.tenant.rollout!.defaultStage;
    if (before === stage) return { ok: true, changed: false };
    const next: TenantOverrides = { ...o, stage };
    ctx.update("tenant_settings", "settings", { overrides: next });
    ctx.audit({ action: "rpc:set_rollout_stage", resource: "tenant_settings", resourceId: "settings", changes: { stage: [before, stage] } });
    return { ok: true, changed: true };
  },

  /** A-08: 브랜드·테마 저장(흰 글자 대비 4.5:1 미만이면 막음, 차트 강조는 검사 통과 목록만) */
  save_theme: (ctx, input: { brand: string; chartAccent: string; monogram: string; density: "comfortable" | "compact" | "public" }) => {
    if (!isAdminish(ctx) || !ctx.can("tenant_settings", "edit")) ctx.fail(403, "권한이 없어요");
    const brand = String(input.brand ?? "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(brand)) ctx.fail(400, "브랜드 색 값을 확인해 주세요");
    const accent = String(input.chartAccent ?? "").toUpperCase();
    if (!(CHART_ACCENT_CHOICES as readonly string[]).map((c) => c.toUpperCase()).includes(accent)) ctx.fail(400, "차트 강조 색은 검사 통과 목록에서 골라 주세요");
    const monogram = String(input.monogram ?? "").trim();
    if (!monogram || [...monogram].length > 2) ctx.fail(400, "모노그램은 글자 1~2자로 적어 주세요");
    if (!["comfortable", "compact", "public"].includes(input.density)) ctx.fail(400, "밀도를 다시 골라 주세요");
    const fail = checkBrand(deriveTenantTheme({ brand, chartAccent: accent })).find((c) => c.level === "fail");
    if (fail) ctx.fail(409, `${fail.label}가 낮아 저장할 수 없어요`);
    const base = ctx.tenant.theme;
    const o = currentOverrides(ctx);
    const theme: NonNullable<TenantOverrides["theme"]> = {};
    if (brand !== base.tokens.brand.toUpperCase()) theme.brand = brand;
    if (accent !== base.tokens.chartAccent.toUpperCase()) theme.chartAccent = accent;
    if (monogram !== ctx.tenant.monogram) theme.monogram = monogram;
    if (input.density !== base.density) theme.density = input.density;
    const prev = o.theme ?? {};
    const next: TenantOverrides = { ...o, theme: Object.keys(theme).length ? theme : undefined };
    ctx.update("tenant_settings", "settings", { overrides: next });
    const changes: Record<string, [unknown, unknown]> = {};
    for (const k of ["brand", "chartAccent", "monogram", "density"] as const) if ((prev[k] ?? null) !== (theme[k] ?? null)) changes[`theme.${k}`] = [prev[k] ?? null, theme[k] ?? null];
    ctx.audit({ action: "rpc:save_theme", resource: "tenant_settings", resourceId: "settings", changes });
    return { ok: true };
  },

  /** A-11: 역할 바꾸기(owner 지정·해제는 owner만, 마지막 owner는 바꿀 수 없음) */
  change_member_role: (ctx, { memberId, role }: { memberId: string; role: PlatformRole }) => {
    if (!isAdminish(ctx) || !ctx.can("members", "edit")) ctx.fail(403, "권한이 없어요");
    if (!["owner", "admin", "reviewer", "member"].includes(role)) ctx.fail(400, "역할을 다시 골라 주세요");
    const m = ctx.raw.get("members", memberId) as Member | null;
    if (!m) ctx.fail(404, "찾는 항목이 없어요");
    const cur = m!.role;
    if (cur === role) return { ok: true, changed: false };
    if ((cur === "owner" || role === "owner") && ctx.persona.role !== "owner") ctx.fail(403, "소유자 지정·해제는 소유자만 할 수 있어요");
    if (cur === "owner") {
      const owners = ctx.raw.list("members").filter((x) => x.role === "owner" && x.status === "active");
      if (owners.length <= 1) ctx.fail(409, "마지막 소유자는 바꿀 수 없어요");
    }
    const at = ctx.clock.now();
    ctx.update("members", memberId, { role });
    const ra = ctx.insert("role_assignments", { member_id: memberId, role, scope_type: "company", scope_id: null, granted_by: ctx.persona.memberId, granted_at: at });
    ctx.audit({ action: "rpc:change_member_role", resource: "members", resourceId: memberId, changes: { role: [cur, role] } });
    ctx.audit({ action: "create", resource: "role_assignments", resourceId: ra.id, changes: { role: [null, role] } });
    if (memberId !== ctx.persona.memberId) ctx.notify({ recipientId: memberId, kind: "system", title: `내 역할이 ${ROLE_LABEL[role]}(으)로 바뀌었어요`, link: "/me", sourceModule: "admin-members", sourceId: memberId });
    return { ok: true, changed: true };
  },

  /** A-11: 비활성화·다시 활성화(삭제하지 않음) */
  set_member_status: (ctx, { memberId, status }: { memberId: string; status: "active" | "inactive" }) => {
    if (!isAdminish(ctx) || !ctx.can("members", "edit")) ctx.fail(403, "권한이 없어요");
    if (!["active", "inactive"].includes(status)) ctx.fail(400, "상태를 다시 골라 주세요");
    const m = ctx.raw.get("members", memberId) as Member | null;
    if (!m) ctx.fail(404, "찾는 항목이 없어요");
    if (memberId === ctx.persona.memberId && status === "inactive") ctx.fail(409, "내 계정은 비활성화할 수 없어요");
    if (m!.role === "owner" && ctx.persona.role !== "owner") ctx.fail(403, "소유자는 소유자만 비활성화할 수 있어요");
    if (m!.role === "owner" && status === "inactive") {
      const owners = ctx.raw.list("members").filter((x) => x.role === "owner" && x.status === "active");
      if (owners.length <= 1) ctx.fail(409, "마지막 소유자는 비활성화할 수 없어요");
    }
    if (m!.status === status) return { ok: true, changed: false };
    ctx.update("members", memberId, { status });
    if (status === "inactive") {
      for (const c of ctx.raw.list("mcp_connections")) if (c.member_id === memberId && !c.revoked_at) ctx.update("mcp_connections", c.id, { revoked_at: ctx.clock.now() });
    }
    ctx.audit({ action: "rpc:set_member_status", resource: "members", resourceId: memberId, changes: { status: [m!.status, status] } });
    return { ok: true, changed: true };
  },
};

const sel: Record<string, SelectorHandler> = {};

export default defineGroup({ group: "ara_settings", seed, rpc, sel, ara });

