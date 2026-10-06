// home 그룹 시드(소유: home 그룹). 다른 그룹 시드 뒤에 실행되어 파생 데이터(알림·알림 설정)를 만듭니다.
// 만들 리소스: GROUP_RESOURCES.home (notifications, notification_preferences)
// 규칙: 빌드 스펙 6.4절 home 표(검토 대기 제출 → 검토자에게 review_requested …, 페르소나당 약 15건, 안 읽음 약 5건)
// rpc: mark_all_notifications_read · save_notification_preferences
// sel: home.today · home.rail · search · widget.<id>(홈 위젯 셀렉터, 빌드 스펙 3.1.1절)
// 셀렉터는 SelectorContext(권한 경로를 거친 행)만 씁니다. 화면에 보일 날짜·이름 글자는 여기서 만들어 보냅니다.
import { defineGroup, type SeedContext, type SeedOutput, type RpcHandler, type SelectorHandler, type SelectorContext } from "./types";
import type { Notification, NotificationPreference, ResourceName, RowOf, SeedRow, Task } from "@/types/entities";
import type { ModuleId } from "@/modules/registry.generated";
import type { FieldReportKind } from "@/tenants/types";
import { statusOf, labelOf, orderLineStatus, type StatusValue } from "@/lib/status";
import { addDays, addMinutes, daysBetween, kstIso, toKstDate, weekStart } from "@/lib/clock";
import { latestRisks } from "@/lib/safety";
import { formatDate, formatMinutes, formatMonth, formatNumber, formatRelative, formatTime } from "@/lib/format";
import type {
  ApprovalInbox, ApprovalItem, ApprovalKind, AiConnect, AxEffect, CompanyKpi, EquipmentStatus, HomeRail, HomeToday, MaterialPrice, MonthlySummary, OrderBacklog, ProductionToday,
  ProjectHealth, QualityPpm, RailItem, SafetyStatus, SaveNotificationPrefsInput, SearchGroup, SearchGroupKey, SearchItem, SearchResult,
  TeamWorkload, WFigure, WList, WRow, WSeg, WStat,
} from "@/pages/home/lib/types";

type NotifKind = StatusValue<"notifications.kind">;
export const NOTIFICATION_KINDS: NotifKind[] = [
  "task_assigned", "review_requested", "submission_returned", "submission_approved", "due_soon", "overdue", "notice_must_read",
  "meeting_review", "rule_candidate", "field_report", "safety_due", "claim", "system",
];
const OPEN_TASK = new Set<string>(["todo", "in_progress", "changes_requested"]);
const LIVE_TASK = new Set<string>(["todo", "in_progress", "submitted", "changes_requested"]);

// ───────── 작은 도우미
const firstLine = (s: string | null | undefined, max = 60) => {
  const line = (s ?? "").split("\n")[0]!.trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};
const byIso = (a: string | null | undefined, b: string | null | undefined) => (a ?? "￿").localeCompare(b ?? "￿");
const sum = (xs: number[]) => xs.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);
const indexBy = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));

// ═════════════════════════════════════════ 시드: 알림
interface Draft {
  id: string;
  recipient: string;
  kind: NotifKind;
  title: string;
  body?: string | null;
  link?: string | null;
  module?: ModuleId | null;
  sourceId?: string | null;
  at: string;
  /** true: 읽음으로 고정(읽은 시각 지정 가능) */
  readAt?: string | null;
  read?: boolean;
  /** 오래돼도 안 읽음으로 남김(안 읽은 필독 공지 등) */
  sticky?: boolean;
}

function buildNotifications(ctx: SeedContext): SeedRow<Notification>[] {
  const { tenant, anchors, today } = ctx;
  const isTr = tenant.slug === "tr-technology";
  const nowCap = kstIso(today, "09:25");
  const people = tenant.people;
  const personas = people.filter((p) => p.persona);
  const personaIds = new Set(personas.map((p) => p.id));
  const nameOf = (id: string | null | undefined) => people.find((p) => p.id === id)?.displayName ?? "구성원";
  const roleOfMember = (id: string) => tenant.roles.find((r) => r.code === people.find((p) => p.id === id)?.roleCode);
  const isReviewerUp = (id: string) => (roleOfMember(id)?.platformRole ?? "member") !== "member";
  const memberOf = (code: string) => people.find((p) => p.roleCode === code)?.id;

  const drafts = new Map<string, Draft>();
  const add = (d: Draft) => {
    if (!personaIds.has(d.recipient)) return;
    if (d.at > nowCap) d.at = nowCap;
    if (!drafts.has(d.id)) drafts.set(d.id, d);
  };
  const get = <R extends ResourceName>(r: R): RowOf<R>[] => ctx.get(r);

  const tasks = get("tasks");
  const taskById = indexBy(tasks);
  const subs = get("submissions");
  const projects = indexBy(get("projects"));
  const notices = get("notices");
  const receipts = get("read_receipts");
  const meetings = get("meetings");
  const rules = get("rules");

  // 1) 검토 요청: 검토 대기 제출 → 검토자
  for (const s of subs) {
    if (s.status !== "submitted") continue;
    const t = taskById.get(s.task_id);
    if (!t) continue;
    add({
      id: `ntf-rr-${s.id}`, recipient: t.reviewer_id, kind: "review_requested", title: `"${t.title}" 검토 요청`,
      body: s.via === "ai_connection" ? `${nameOf(s.submitted_by)}님이 AI 연결(${s.via_client ?? "AI"})로 제출했어요` : `${nameOf(s.submitted_by)}님이 제출했어요`,
      link: `/work/review?selected=${s.id}`, module: "tasks", sourceId: s.id, at: s.submitted_at,
    });
  }
  // 2) 수정 요청: 반려된 제출 → 담당자(지금도 수정 요청 상태면 안 읽음 후보)
  for (const s of subs) {
    if (s.status !== "rejected") continue;
    const t = taskById.get(s.task_id);
    if (!t) continue;
    add({
      id: `ntf-sr-${s.id}`, recipient: t.assignee_id, kind: "submission_returned", title: `"${t.title}" 수정 요청`,
      body: firstLine(s.review_comment) || "검토자가 수정을 요청했어요", link: `/work/tasks/${t.id}`, module: "tasks", sourceId: s.id,
      at: s.reviewed_at ?? s.submitted_at, read: t.status !== "changes_requested",
    });
  }
  // 3) 승인: 최근 14일 승인 → 제출한 사람(읽음 기록)
  const approvedBy = new Map<string, number>();
  for (const s of [...subs].sort((a, b) => byIso(b.reviewed_at, a.reviewed_at))) {
    if (s.status !== "approved" || !s.reviewed_at) continue;
    if (daysBetween(toKstDate(s.reviewed_at), today) > 14) continue;
    const t = taskById.get(s.task_id);
    if (!t) continue;
    const n = approvedBy.get(t.assignee_id) ?? 0;
    if (n >= 3) continue;
    approvedBy.set(t.assignee_id, n + 1);
    add({
      id: `ntf-sa-${s.id}`, recipient: t.assignee_id, kind: "submission_approved", title: `"${t.title}" 승인됐어요`,
      body: s.review_comment ? firstLine(s.review_comment) : `${nameOf(s.reviewed_by)}님이 승인했어요`, link: `/work/tasks/${t.id}`, module: "tasks", sourceId: s.id,
      at: s.reviewed_at, read: true,
    });
  }
  // 4) 마감 임박·기한 지남 → 담당자
  for (const t of tasks) {
    if (!t.due_at || !OPEN_TASK.has(t.status)) continue;
    const diff = daysBetween(today, toKstDate(t.due_at));
    if (diff === 0 || diff === 1) {
      add({
        id: `ntf-ds-${t.id}`, recipient: t.assignee_id, kind: "due_soon", title: `"${t.title}" ${diff === 0 ? "오늘" : "내일"} 마감`,
        body: `${projects.get(t.project_id)?.name ?? "프로젝트"} · ${formatTime(t.due_at)}까지`, link: `/work/tasks/${t.id}`, module: "tasks", sourceId: t.id,
        // 아침 8시 알림. 오늘 만든 업무(예: 08:45 현장 등록에서 온 업무)는 만든 뒤에 알려요
        at: t.created_at > kstIso(today, "08:00") ? addMinutes(t.created_at, 1) : kstIso(today, "08:00"),
      });
    } else if (diff < 0 && diff >= -14) {
      add({
        id: `ntf-od-${t.id}`, recipient: t.assignee_id, kind: "overdue", title: `"${t.title}" 마감이 ${-diff}일 지났어요`,
        body: "일정을 다시 잡거나 검토자와 이야기해 주세요", link: `/work/tasks/${t.id}`, module: "tasks", sourceId: t.id,
        at: kstIso(addDays(toKstDate(t.due_at), 1), "08:00"),
      });
    }
  }
  // 5) 업무 배정: 회의·현장·클레임·규칙에서 온 할 일(담당자별 2건까지)
  const assigned = new Map<string, number>();
  for (const t of [...tasks].sort((a, b) => byIso(b.created_at, a.created_at))) {
    if (t.status !== "todo" || t.source === "manual") continue;
    const n = assigned.get(t.assignee_id) ?? 0;
    if (n >= 2) continue;
    assigned.set(t.assignee_id, n + 1);
    add({
      id: `ntf-ta-${t.id}`, recipient: t.assignee_id, kind: "task_assigned", title: `"${t.title}" 업무가 배정됐어요`,
      body: `${labelOf("tasks.source", t.source)}에서 만든 업무예요`, link: `/work/tasks/${t.id}`, module: "tasks", sourceId: t.id,
      at: t.created_at ?? kstIso(addDays(today, -1), "17:00"),
    });
  }
  // 6) 필독 공지 → 대상자(읽음 확인이 있으면 읽음)
  const audienceHas = (n: (typeof notices)[number], memberId: string) => {
    const a = n.audience;
    if (!a || a.type === "all") return true;
    const p = people.find((x) => x.id === memberId);
    if (a.type === "unit") return !!p && (a.ids ?? []).includes(p.unitId);
    if (a.type === "role") return !!p && (a.ids ?? []).includes(p.roleCode);
    if (a.type === "project") return (a.ids ?? []).some((pid) => { const pr = projects.get(pid); return !!pr && (pr.member_ids.includes(memberId) || pr.owner_member_id === memberId || pr.reviewer_member_id === memberId); });
    return true;
  };
  for (const n of notices) {
    if (!n.must_read || daysBetween(toKstDate(n.published_at), today) > 30) continue;
    for (const p of personas) {
      if (p.id === n.author_id || !audienceHas(n, p.id)) continue;
      const rr = receipts.find((r) => r.notice_id === n.id && r.member_id === p.id);
      add({
        id: `ntf-nm-${n.id}-${p.id}`, recipient: p.id, kind: "notice_must_read", title: n.title, body: "필독 공지예요. 읽고 확인해 주세요",
        link: `/company/notices/${n.id}`, module: "notices", sourceId: n.id, at: n.published_at,
        read: !!rr, readAt: rr?.read_at ?? null, sticky: !rr,
      });
    }
  }
  // 7) 회의 확인 → 참석한 검토자 이상
  for (const m of meetings) {
    if (m.status !== "needs_review") continue;
    for (const a of m.attendee_ids) {
      if (!isReviewerUp(a)) continue;
      add({
        id: `ntf-mr-${m.id}-${a}`, recipient: a, kind: "meeting_review", title: `"${m.title}" 분류 확인이 필요해요`,
        body: "자동 분류한 구간을 확인해 주세요", link: `/meetings/${m.id}`, module: "meetings", sourceId: m.id,
        at: addMinutes(m.started_at, m.duration_min + 30),
      });
    }
  }
  // 8) 규칙 후보 → 승인자(없으면 검토 흐름의 기본 검토자)
  const defaultApprover = isTr ? memberOf("R_PLANT_MGR") : memberOf("R_EDU_LEAD");
  for (const r of rules) {
    if (r.status !== "candidate") continue;
    const to = r.approver_id ?? defaultApprover;
    if (!to) continue;
    add({
      id: `ntf-rc-${r.id}`, recipient: to, kind: "rule_candidate", title: "작성 규칙 후보가 생겼어요", body: firstLine(r.statement),
      link: `/docs/rules?selected=${r.id}`, module: "correction-rules", sourceId: r.id, at: r.created_at ?? kstIso(addDays(today, -1), "16:00"),
    });
  }

  // ───── TR 제조 팩
  if (isTr) {
    const plant = memberOf("R_PLANT_MGR");
    const qa = memberOf("R_QA");
    const ceo = memberOf("R_CEO");
    const admin = memberOf("R_ADMIN_PUR_ACC");
    const equipment = indexBy(get("equipment"));
    const partners = indexBy(get("partners"));
    const items = indexBy(get("items"));
    // 현장 등록: 최근 3일 → 공장장(불량이면 품질보증 담당도), 본인 등록 건에 담당이 정해지면 등록자에게
    const reports = get("field_reports").filter((f) => daysBetween(toKstDate(f.reported_at), today) <= 3).sort((a, b) => byIso(b.reported_at, a.reported_at));
    for (const f of reports.slice(0, 8)) {
      const kindLabel = labelOf("field_reports.kind", f.kind);
      const eq = f.equipment_id ? equipment.get(f.equipment_id)?.equipment_no : null;
      const body = `${f.anonymous || !f.reported_by ? "익명" : nameOf(f.reported_by)}${eq ? ` · ${eq}` : ""}`;
      const base = { kind: "field_report" as const, title: `${kindLabel} 등록: ${firstLine(f.note, 40)}`, body, link: `/ops/report?tab=feed&selected=${f.id}`, module: "mfg-quality" as ModuleId, sourceId: f.id, at: f.reported_at };
      if (plant) add({ ...base, id: `ntf-fr-${f.id}`, recipient: plant });
      if (qa && f.kind === "defect") add({ ...base, id: `ntf-frq-${f.id}`, recipient: qa });
      if (f.reported_by && !f.anonymous && f.status !== "new" && f.assignee_id) {
        add({ ...base, id: `ntf-fra-${f.id}`, recipient: f.reported_by, title: "등록한 현장 기록에 담당이 정해졌어요", body: `${kindLabel} · 담당 ${nameOf(f.assignee_id)}`, at: addMinutes(f.reported_at, 25) });
      }
    }
    // 설비 고장(최근 2일) → 공장장
    for (const b of get("breakdown_records")) {
      if (b.status !== "open" || daysBetween(toKstDate(b.occurred_at), today) > 2 || !plant) continue;
      const eq = equipment.get(b.equipment_id);
      add({
        id: `ntf-bd-${b.id}`, recipient: plant, kind: "field_report", title: `${eq?.equipment_no ?? "설비"} 고장 등록`, body: firstLine(b.symptom),
        link: "/ops/production/board", module: "mfg-production", sourceId: b.id, at: b.occurred_at,
      });
    }
    // 클레임: 진행 중 → 품질보증 담당
    for (const c of get("customer_claims")) {
      if (c.status === "closed" || !qa) continue;
      const near = c.report_8d_due && daysBetween(today, c.report_8d_due) <= 7;
      add({
        id: `ntf-cl-${c.id}`, recipient: qa, kind: "claim",
        title: near ? `${c.claim_no} 8D 보고서 기한 ${formatDate(c.report_8d_due, false)}` : `${c.claim_no} 클레임 접수`,
        body: `${partners.get(c.partner_id)?.name ?? "고객사"} · ${items.get(c.item_id)?.name ?? "품목"} · ${formatNumber(c.qty_affected)}개`,
        link: `/ops/quality/claims/${c.id}`, module: "mfg-quality", sourceId: c.id, at: near ? kstIso(today, "08:00") : kstIso(c.received_on, "10:00"),
      });
    }
    // 법정 일정: D-14 이내 → 대표·총무
    for (const l of get("legal_calendar_items")) {
      if (l.status === "done") continue;
      const diff = daysBetween(today, l.due_on);
      if (diff > 14) continue;
      for (const to of [ceo, admin]) {
        if (!to) continue;
        add({
          id: `ntf-lc-${l.id}-${to}`, recipient: to, kind: "safety_due", title: diff >= 0 ? `${l.title} 마감 D-${diff}` : `${l.title} 기한이 ${-diff}일 지났어요`,
          body: l.basis, link: "/company/safety", module: "safety-health", sourceId: l.id, at: kstIso(today, "08:00"),
        });
      }
    }
    // 위험성평가 개선대책 기한 지남 → 대표·총무(묶어서 1건)
    const overdueRisk = latestRisks(get("risk_assessments")).filter((r) => r.status !== "done" && r.due_on && r.due_on < today).length;
    if (overdueRisk > 0) {
      for (const to of [ceo, admin]) {
        if (!to) continue;
        add({ id: `ntf-risk-${to}`, recipient: to, kind: "safety_due", title: `기한 지난 개선대책 ${overdueRisk}건`, body: "위험성평가 개선대책 이행을 확인해 주세요", link: "/company/safety/risk", module: "safety-health", sourceId: null, at: kstIso(today, "08:05") });
      }
    }
    // SUS321 재고(앵커) → 총무·구매 담당
    const lot321 = get("stock_lots").find((s) => s.id === anchors.tr.stockLot321);
    if (lot321 && admin) {
      add({ id: "ntf-stock-321", recipient: admin, kind: "system", title: "SUS321 선재 재고가 안전재고 아래예요", body: "발주 초안을 확인해 주세요", link: "/ops/materials", module: "mfg-materials", sourceId: lot321.id, at: kstIso(addDays(today, -1), "16:30") });
    }
  }

  // ───── 앵커 대체(다른 그룹 시드가 아직 없을 때도 시나리오 알림이 보이게. 원본 행이 있으면 위 규칙이 만든 것을 씀)
  const hasRow = (r: ResourceName, id: string) => ctx.get(r).some((x) => (x as { id: string }).id === id);
  const at = (date: string, time: string) => kstIso(date, time);
  if (!isTr) {
    const lead = memberOf("R_EDU_LEAD");
    const staff = memberOf("R_EDU_STAFF");
    if (lead && !hasRow("submissions", anchors.crata.submissionV2)) {
      add({ id: `ntf-rr-${anchors.crata.submissionV2}`, recipient: lead, kind: "review_requested", title: "\"예시기업 특강 제안서 초안\" 검토 요청", body: `${nameOf(staff)}님이 AI 연결(Claude)로 제출했어요`, link: `/work/review?selected=${anchors.crata.submissionV2}`, module: "tasks", sourceId: anchors.crata.submissionV2, at: at(today, "08:40") });
    }
    if (staff && !hasRow("submissions", anchors.crata.submissionV1)) {
      add({ id: `ntf-sr-${anchors.crata.submissionV1}`, recipient: staff, kind: "submission_returned", title: "\"예시기업 특강 제안서 초안\" 수정 요청", body: "첫 장에 교육 목표를 3줄로 요약해 주세요", link: `/work/tasks/${anchors.crata.task}`, module: "tasks", sourceId: anchors.crata.submissionV1, at: at("2026-09-26", "16:10"), read: true });
    }
    if (!hasRow("meetings", anchors.crata.meeting)) {
      for (const to of [lead, memberOf("R_CEO")]) if (to) add({ id: `ntf-mr-${anchors.crata.meeting}-${to}`, recipient: to, kind: "meeting_review", title: "\"[강의] 예시기업 특강 요구사항 미팅\" 분류 확인이 필요해요", body: "자동 분류한 구간을 확인해 주세요", link: `/meetings/${anchors.crata.meeting}`, module: "meetings", sourceId: anchors.crata.meeting, at: at("2026-09-24", "15:30") });
    }
    if (lead && !hasRow("rules", anchors.crata.rule)) {
      add({ id: `ntf-rc-${anchors.crata.rule}`, recipient: lead, kind: "rule_candidate", title: "작성 규칙 후보가 생겼어요", body: "제안서 첫 장에 교육 목표를 3줄로 요약해요", link: `/docs/rules?selected=${anchors.crata.rule}`, module: "correction-rules", sourceId: anchors.crata.rule, at: at(addDays(today, -1), "16:20") });
    }
    if (!hasRow("notices", anchors.crata.notice)) {
      for (const p of personas) add({ id: `ntf-nm-${anchors.crata.notice}-${p.id}`, recipient: p.id, kind: "notice_must_read", title: "10월 전사 회의 일정 안내", body: "필독 공지예요. 읽고 확인해 주세요", link: `/company/notices/${anchors.crata.notice}`, module: "notices", sourceId: anchors.crata.notice, at: at("2026-09-28", "10:00"), sticky: true });
    }
  } else {
    const plant = memberOf("R_PLANT_MGR");
    const qa = memberOf("R_QA");
    if (plant && !hasRow("submissions", anchors.tr.submission)) {
      add({ id: `ntf-rr-${anchors.tr.submission}`, recipient: plant, kind: "review_requested", title: "\"CL-2026-03 8D D4 근거 정리\" 검토 요청", body: `${nameOf(qa)}님이 웹에서 제출했어요`, link: `/work/review?selected=${anchors.tr.submission}`, module: "tasks", sourceId: anchors.tr.submission, at: at(today, "07:55") });
    }
    if (plant && !hasRow("field_reports", anchors.tr.fieldReport)) {
      add({ id: `ntf-fr-${anchors.tr.fieldReport}`, recipient: plant, kind: "field_report", title: "설비 이상 등록: 프레스 PR-010-02 작업 중 이상 소음", body: `${people.find((p) => p.roleCode === "R_OPERATOR" && !p.persona)?.displayName ?? "생산 작업자"} · PR-010-02`, link: `/ops/report?tab=feed&selected=${anchors.tr.fieldReport}`, module: "mfg-quality", sourceId: anchors.tr.fieldReport, at: at(today, "08:40") });
    }
    if (qa && !hasRow("customer_claims", anchors.tr.claim)) {
      add({ id: `ntf-cl-${anchors.tr.claim}`, recipient: qa, kind: "claim", title: "CL-2026-03 8D 보고서 기한 10월 6일", body: "예시배기시스템(주) · 디커플링 링 · 1,200개", link: `/ops/quality/claims/${anchors.tr.claim}`, module: "mfg-quality", sourceId: anchors.tr.claim, at: at(today, "08:00") });
    }
    if (!hasRow("legal_calendar_items", anchors.tr.legalH2)) {
      for (const to of [memberOf("R_CEO"), memberOf("R_ADMIN_PUR_ACC")]) if (to) add({ id: `ntf-lc-${anchors.tr.legalH2}-${to}`, recipient: to, kind: "safety_due", title: `2026 하반기 반기 점검 마감 D-${daysBetween(today, "2026-10-14")}`, body: "산업안전보건 반기 점검", link: "/company/safety", module: "safety-health", sourceId: anchors.tr.legalH2, at: at(today, "08:00") });
    }
    if (plant && !hasRow("rules", anchors.tr.rules[0])) {
      add({ id: `ntf-rc-${anchors.tr.rules[0]}`, recipient: plant, kind: "rule_candidate", title: "작성 규칙 후보가 생겼어요", body: "D4에는 근거(LOT·검사 기록) 출처를 표로 적어요", link: `/docs/rules?selected=${anchors.tr.rules[0]}`, module: "correction-rules", sourceId: anchors.tr.rules[0], at: at(addDays(today, -1), "15:40") });
    }
    if (!hasRow("notices", anchors.tr.notice)) {
      for (const p of personas) if (p.id !== plant) add({ id: `ntf-nm-${anchors.tr.notice}-${p.id}`, recipient: p.id, kind: "notice_must_read", title: "하반기 반기 안전 점검 안내", body: "필독 공지예요. 읽고 확인해 주세요", link: `/company/notices/${anchors.tr.notice}`, module: "notices", sourceId: anchors.tr.notice, at: at("2026-09-25", "09:10"), sticky: true });
    }
  }

  // ───── 모두에게 가는 시스템 알림(읽음 기록)
  for (const p of personas) {
    add({ id: `ntf-sys-start-${p.id}`, recipient: p.id, kind: "system", title: "업무사이트 데모를 시작했어요", body: "모든 숫자와 사람은 예시예요", link: "/", module: "home-dashboard", at: at(addDays(today, -6), "09:00"), read: true });
    add({ id: `ntf-sys-digest-${p.id}`, recipient: p.id, kind: "system", title: "알림을 하루 2번 묶어서 보내요", body: "받을 곳과 묶음 주기는 알림 설정에서 바꿀 수 있어요", link: "/me/notifications", module: "notifications", at: at(addDays(today, -3), "10:00"), read: true });
    add({ id: `ntf-sys-ai-${p.id}`, recipient: p.id, kind: "system", title: "AI 연결 정책 안내가 새로 나왔어요", body: "10월 1일부터 안내 v1을 따라요", link: "/me/ai", module: "ai-connect", at: at(addDays(today, -1), "17:30") });
  }

  // ───── 페르소나별: 최신 20건, 안 읽음은 최근 것 위주로 6건까지
  const rng = ctx.rng("notifications");
  const out: SeedRow<Notification>[] = [];
  for (const p of personas) {
    const mine = [...drafts.values()].filter((d) => d.recipient === p.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
    const candidates = mine.filter((d) => !d.read && (d.sticky || daysBetween(toKstDate(d.at), today) <= 2));
    const unread = new Set([...candidates.filter((d) => d.sticky), ...candidates.filter((d) => !d.sticky)].slice(0, 6).map((d) => d.id));
    for (const d of mine) {
      let readAt: string | null = null;
      if (!unread.has(d.id)) {
        readAt = d.readAt ?? addMinutes(d.at, rng.int(8, 240));
        if (readAt > nowCap) readAt = nowCap;
      }
      out.push({
        id: d.id, recipient_id: d.recipient, kind: d.kind, title: d.title, body: d.body ?? null, link: d.link ?? null,
        source_module: d.module ?? null, source_id: d.sourceId ?? null, channel: "site", batched_at: null, read_at: readAt,
        created_at: d.at, updated_at: readAt ?? d.at,
      });
    }
  }
  return out;
}

function seed(ctx: SeedContext): SeedOutput {
  return {
    notifications: () => buildNotifications(ctx),
    notification_preferences: [
      {
        id: "npref-company", member_id: null, kind: "*", channels: { site: true, messenger: false, mail: false },
        digest: "twice_daily", quiet_hours: { from: "19:00", to: "08:00" },
      },
    ],
  };
}

// ═════════════════════════════════════════ 이름 있는 동작
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const rpc: Record<string, RpcHandler> = {
  /** 내 안 읽은 알림을 모두 읽음으로 */
  mark_all_notifications_read: (ctx) => {
    const unread = ctx.list("notifications", {
      filters: [{ field: "recipient_id", operator: "eq", value: ctx.persona.memberId }, { field: "read_at", operator: "null", value: true }],
    });
    const now = ctx.clock.now();
    for (const n of unread) ctx.update("notifications", n.id, { read_at: now });
    if (unread.length) ctx.audit({ action: "rpc:mark_all_notifications_read", resource: "notifications", resourceId: null, changes: { read_count: [0, unread.length] } });
    return { ok: true, count: unread.length };
  },
  /** 알림 설정 저장(본인 또는 회사 기본값). 종류별 사이트 받기 + 묶음 주기 + 조용한 시간 */
  save_notification_preferences: (ctx, p: SaveNotificationPrefsInput) => {
    const company = p?.scope === "company";
    const adminish = ctx.persona.role === "owner" || ctx.persona.role === "admin";
    if (company && !adminish) ctx.fail(403, "회사 기본값은 소유자·관리자만 바꿀 수 있어요");
    if (!["instant", "twice_daily", "daily"].includes(p?.digest)) ctx.fail(400, "묶음 주기를 골라 주세요");
    if (p.quietHours && (!TIME_RE.test(p.quietHours.from) || !TIME_RE.test(p.quietHours.to))) ctx.fail(400, "조용한 시간을 00:00 형식으로 적어 주세요");
    const owner = company ? null : ctx.persona.memberId;
    const base = company ? "npref-company" : `npref-${ctx.persona.memberId}`;
    const upsert = (id: string, row: Omit<SeedRow<NotificationPreference>, "id">) => {
      if (ctx.raw.get("notification_preferences", id)) ctx.update("notification_preferences", id, row);
      else ctx.insert("notification_preferences", { id, ...row });
    };
    const quiet = p.quietHours ? { from: p.quietHours.from, to: p.quietHours.to } : null;
    upsert(base, { member_id: owner, kind: "*", channels: { site: true, messenger: false, mail: false }, digest: p.digest, quiet_hours: quiet });
    for (const kind of NOTIFICATION_KINDS) {
      const site = kind === "notice_must_read" ? true : p.site?.[kind] !== false;
      upsert(`${base}-${kind}`, { member_id: owner, kind, channels: { site, messenger: false, mail: false }, digest: p.digest, quiet_hours: quiet });
    }
    ctx.audit({ action: "rpc:save_notification_preferences", resource: "notification_preferences", resourceId: base, changes: { scope: [null, company ? "company" : "me"], digest: [null, p.digest] } });
    return { ok: true };
  },
};

// ═════════════════════════════════════════ 셀렉터
type Ctx = SelectorContext;
const me = (c: Ctx) => c.persona.memberId;
const adminish = (c: Ctx) => c.persona.role === "owner" || c.persona.role === "admin";
const nowOf = (c: Ctx) => c.clock.now();
const personName = (c: Ctx, id: string | null | undefined) => c.tenant.people.find((p) => p.id === id)?.displayName ?? "구성원";
const isOperator = (c: Ctx) => !!c.tenant.roles.find((r) => r.code === c.persona.roleCode)?.mobileFirst;
const on = (c: Ctx, m: ModuleId) => c.isModuleOn(m);
const ls = <R extends ResourceName>(c: Ctx, r: R, filters?: NonNullable<Parameters<Ctx["list"]>[1]>["filters"]) => c.list(r, filters ? { filters } : undefined);
const st = <D extends Parameters<typeof statusOf>[0]>(d: D, v: string | null | undefined) => statusOf(d, v);
/** 주 끝(일요일) */
const weekEnd = (date: string) => addDays(weekStart(date), 6);
const shortDay = (date: string) => { const [, m, d] = date.split("-").map(Number); return `${m}/${d}`; };
const subOf = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

function myOpenTasks(c: Ctx): Task[] {
  if (!on(c, "tasks")) return [];
  return ls(c, "tasks", [{ field: "assignee_id", operator: "eq", value: me(c) }]).filter((t) => OPEN_TASK.has(t.status));
}
/** 내가 지정 검토자인 검토 대기 제출. scope "company"는 소유자·관리자가 대신 승인할 수 있는 회사 전체(참고용) */
function reviewableSubs(c: Ctx, scope: "mine" | "company" = "mine") {
  if (!on(c, "tasks") || !c.can("submissions", "approve")) return [];
  return ls(c, "submissions", [{ field: "status", operator: "eq", value: "submitted" }]).filter((s) => {
    if (!c.can("submissions", "approve", s as unknown as Record<string, unknown>)) return false;
    return scope === "company" || c.get("tasks", s.task_id)?.reviewer_id === me(c);
  });
}
function myMeetings(c: Ctx, from: string, to: string) {
  if (!on(c, "meetings")) return [];
  return ls(c, "meetings").filter((m) => m.attendee_ids.includes(me(c)) && toKstDate(m.started_at) >= from && toKstDate(m.started_at) <= to).sort((a, b) => byIso(a.started_at, b.started_at));
}
function kpiSeries(c: Ctx, kpiId: string) {
  if (!on(c, "reports")) return { kpi: null, values: [] as { period: string; value: number }[] };
  const kpi = c.get("kpis", kpiId);
  const values = ls(c, "kpi_values", [{ field: "kpi_id", operator: "eq", value: kpiId }]).map((v) => ({ period: v.period, value: v.value })).sort((a, b) => a.period.localeCompare(b.period));
  return { kpi, values };
}
const unitText = (u: string | null | undefined) => (u === "%" || u === "PPM" ? u : u ?? "");

function noticeAudienceHas(c: Ctx, n: RowOf<"notices">): boolean {
  const a = n.audience;
  if (!a || a.type === "all") return true;
  if (a.type === "unit") return (a.ids ?? []).includes(c.persona.unitId);
  if (a.type === "role") return (a.ids ?? []).includes(c.persona.roleCode) || (a.ids ?? []).includes(c.persona.role);
  if (a.type === "project") return (a.ids ?? []).some((id) => !!c.get("projects", id));
  return true;
}
function myNotices(c: Ctx) {
  if (!on(c, "notices")) return { list: [] as RowOf<"notices">[], read: new Set<string>() };
  const list = ls(c, "notices").filter((n) => noticeAudienceHas(c, n) && n.published_at <= nowOf(c) && (!n.expires_at || n.expires_at >= nowOf(c)));
  const read = new Set(ls(c, "read_receipts", [{ field: "member_id", operator: "eq", value: me(c) }]).map((r) => r.notice_id));
  // 내가 쓴 공지는 '안 읽은 필독'으로 세지 않아요(공지 목록에도 내 확인은 '작성자')
  for (const n of list) if (n.author_id === me(c)) read.add(n.id);
  return { list, read };
}

// ───── home.today / home.rail
const homeToday: SelectorHandler = (c): HomeToday => {
  const today = c.today;
  const open = myOpenTasks(c);
  const dueOn = (t: Task) => (t.due_at ? toKstDate(t.due_at) : null);
  const dueToday = open.filter((t) => dueOn(t) === today).length;
  const overdue = open.filter((t) => { const d = dueOn(t); return !!d && d < today; }).length;
  const dueSoon = open.filter((t) => { const d = dueOn(t); return !!d && d >= today && daysBetween(today, d) <= 2; }).length;
  const returned = open.filter((t) => t.status === "changes_requested");
  // 히어로 합에서 한 업무를 두 번 세지 않게: 기한 지남·오늘 마감에 이미 든 수정 요청은 뺀 수
  const returnedOnly = returned.filter((t) => { const d = dueOn(t); return !d || d > today; }).length;
  const operator = isOperator(c);
  let workOrdersToday: number | null = null;
  let checksPending: number | null = null;
  const todaysOrders = on(c, "mfg-production") ? ls(c, "work_orders", [{ field: "planned_date", operator: "eq", value: today }]).filter((w) => w.status !== "done") : [];
  let workOrdersByProcess: HomeToday["workOrdersByProcess"] = null;
  if (on(c, "mfg-production")) {
    workOrdersToday = todaysOrders.length;
    // 편조 / 가공(크림핑·프레스·스파이럴링 등) — 작업자 히어로가 '오늘 작업지시'를 공정별로 나눠 보여요
    const knit = todaysOrders.filter((w) => w.process_step_id.endsWith("-knit") || c.get("process_steps", w.process_step_id)?.name === "편조").length;
    workOrdersByProcess = [{ key: "knit", label: "편조", count: knit }, { key: "form", label: "가공", count: todaysOrders.length - knit }];
  }
  if (on(c, "mfg-equipment")) {
    // 작업자는 '내 설비'(오늘 작업지시가 걸린 설비)만 셉니다. 공장 전체 수가 아니에요.
    const mine = new Set(todaysOrders.map((w) => w.equipment_id).filter((x): x is string => !!x));
    const active = ls(c, "equipment").filter((e) => e.status === "active" && (!operator || mine.has(e.id)));
    const checked = new Set(ls(c, "equipment_checks", [{ field: "checked_on", operator: "eq", value: today }]).map((x) => x.equipment_id));
    checksPending = active.filter((e) => !checked.has(e.id)).length;
  }
  const agg = on(c, "ara-wellbeing") ? ls(c, "wellbeing_aggregates").sort((a, b) => b.period_month.localeCompare(a.period_month))[0] : undefined;
  return {
    mode: operator ? "operator" : c.persona.role === "member" ? "member" : "reviewer",
    myOpen: open.length,
    dueToday,
    reviewWaiting: reviewableSubs(c).length,
    companyReviewWaiting: adminish(c) ? reviewableSubs(c, "company").length : null,
    returnedToMe: returned.length,
    returnedOnly,
    overdue,
    meetingsToday: myMeetings(c, today, today).length,
    dueSoon,
    workOrdersToday,
    workOrdersByProcess,
    checksPending,
    population: agg?.population_n ?? 0,
  };
};

const homeRail: SelectorHandler = (c): HomeRail => {
  const today = c.today;
  const { list, read } = myNotices(c);
  const mustRead: RailItem[] = list
    .filter((n) => n.must_read && !read.has(n.id))
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, 1)
    .map((n) => ({ id: n.id, title: n.title, subtitle: subOf(labelOf("notices.category", n.category), formatDate(n.published_at)), to: `/company/notices/${n.id}` }));
  const todayItems: (RailItem & { sort: string })[] = [];
  if (on(c, "calendar")) {
    for (const e of ls(c, "calendar_events")) {
      const s = toKstDate(e.start_at);
      const end = toKstDate(e.end_at);
      if (!(s <= today && end >= today)) continue;
      todayItems.push({ id: e.id, title: e.title, subtitle: subOf(e.all_day ? "종일" : formatTime(e.start_at), labelOf("calendar_events.kind", e.kind)), to: "/company/calendar", sort: e.all_day ? "0" : e.start_at });
    }
  }
  for (const m of myMeetings(c, today, today)) {
    todayItems.push({ id: m.id, title: m.title, subtitle: subOf(formatTime(m.started_at), formatMinutes(m.duration_min), "회의"), to: `/meetings/${m.id}`, sort: m.started_at });
  }
  const upcoming: RailItem[] = myMeetings(c, addDays(today, 1), addDays(today, 7)).slice(0, 3).map((m) => ({
    id: m.id, title: m.title, subtitle: subOf(formatDate(m.started_at), formatTime(m.started_at)), to: `/meetings/${m.id}`,
  }));
  return {
    mustRead,
    today: todayItems.sort((a, b) => a.sort.localeCompare(b.sort)).slice(0, 3).map(({ sort: _s, ...r }) => r),
    upcoming,
  };
};

// ───── 검색
const norm = (s: string) => s.normalize("NFC").toLowerCase();
const searchSel: SelectorHandler = (c, query): SearchResult => {
  const q = String(query?.q ?? "").trim().slice(0, 60);
  if (!q) return { q, groups: [], total: 0 };
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  const hay = (...fields: (string | null | undefined | string[])[]) => norm(fields.flat().filter((x): x is string => typeof x === "string" && !!x).join(" "));
  const hit = (...fields: (string | null | undefined | string[])[]) => { const h = hay(...fields); return tokens.every((t) => h.includes(t)); };
  const limitOf = (key: SearchGroupKey) => (query?.group === key ? 20 : Math.min(20, Math.max(1, Number(query?.limit ?? 5))));
  const rank = (title: string) => (norm(title).startsWith(tokens[0]!) ? 0 : norm(title).includes(tokens.join(" ")) ? 1 : 2);
  const groups: SearchGroup[] = [];
  const push = (key: SearchGroupKey, label: string, items: SearchItem[]) => {
    if (!items.length) return;
    const sorted = items.map((it, i) => ({ it, i, r: rank(it.title) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.it);
    groups.push({ key, label, total: sorted.length, items: sorted.slice(0, limitOf(key)) });
  };
  const units = new Map(ls(c, "org_units").map((u) => [u.id, u.name]));
  const projects = indexBy(on(c, "business-structure") ? ls(c, "projects") : []);
  const lines = indexBy(on(c, "business-structure") ? ls(c, "business_lines") : []);
  const partners = indexBy(on(c, "partners") ? ls(c, "partners") : []);

  if (on(c, "org-members")) {
    push("people", "사람", ls(c, "members").filter((m) => m.status !== "inactive" && hit(m.display_name, m.job_title, m.duties, m.email, units.get(m.org_unit_id))).map((m) => ({
      id: m.id, title: m.display_name, subtitle: subOf(units.get(m.org_unit_id), m.job_title), to: `/company/people?selected=${m.id}`,
      person: { memberId: m.id, email: m.email, phone: m.phone_work },
    })));
  }
  push("projects", "프로젝트", [...projects.values()].filter((p) => hit(p.name, p.code, p.aliases, p.description)).map((p) => ({
    id: p.id, title: p.name, subtitle: subOf(lines.get(p.business_line_id)?.name, p.code), to: `/projects/${p.id}`, status: st("projects.status", p.status),
  })));
  push("partners", "거래처", [...partners.values()].filter((p) => hit(p.name, p.tags, p.note)).map((p) => ({
    id: p.id, title: p.name, subtitle: labelOf("partners.kind", p.kind), to: `/projects/partners/${p.id}`, status: st("partners.status", p.status),
  })));
  if (on(c, "tasks")) {
    push("tasks", "업무", ls(c, "tasks").filter((t) => hit(t.title, t.description)).sort((a, b) => Number(!LIVE_TASK.has(a.status)) - Number(!LIVE_TASK.has(b.status)) || byIso(a.due_at, b.due_at)).map((t) => ({
      id: t.id, title: t.title, subtitle: subOf(projects.get(t.project_id)?.name, `담당 ${personName(c, t.assignee_id)}`), to: `/work/tasks/${t.id}`,
      status: st("tasks.status", t.status), dday: t.due_at && OPEN_TASK.has(t.status) ? t.due_at : null,
    })));
  }
  if (on(c, "meetings")) {
    push("meetings", "회의", ls(c, "meetings").filter((m) => hit(m.title, m.summary)).sort((a, b) => b.started_at.localeCompare(a.started_at)).map((m) => ({
      id: m.id, title: m.title, subtitle: subOf(formatDate(m.started_at), formatTime(m.started_at)), to: `/meetings/${m.id}`, status: st("meetings.status", m.status),
    })));
  }
  if (on(c, "documents")) {
    push("docs", "문서", ls(c, "artifacts").filter((a) => hit(a.title, labelOf("artifacts.doc_type", a.doc_type))).map((a) => ({
      id: a.id, title: a.title, subtitle: subOf(labelOf("artifacts.doc_type", a.doc_type), projects.get(a.project_id ?? "")?.name), to: `/docs/artifacts/${a.id}`, status: st("artifacts.status", a.status),
    })));
  }
  const know: SearchItem[] = [];
  if (on(c, "knowledge")) {
    for (const k of ls(c, "knowledge_items")) if (hit(k.title, k.summary)) know.push({ id: k.id, title: k.title, subtitle: subOf(labelOf("knowledge_items.kind", k.kind), firstLine(k.summary, 40)), to: `/docs/knowledge?selected=${k.id}`, status: st("knowledge_items.status", k.status) });
    for (const g of ls(c, "glossary_terms")) if (!g.forbidden && hit(g.term, g.ui_label, g.aliases, g.definition)) know.push({ id: g.id, title: g.ui_label || g.term, subtitle: subOf("용어", firstLine(g.definition, 40)), to: `/docs/glossary?q=${encodeURIComponent(g.term)}` });
  }
  push("knowledge", "지식·용어", know);
  const { list: noticeList } = myNotices(c);
  push("notices", "공지", noticeList.filter((n) => hit(n.title, n.body)).sort((a, b) => b.published_at.localeCompare(a.published_at)).map((n) => ({
    id: n.id, title: n.title, subtitle: subOf(labelOf("notices.category", n.category), formatDate(n.published_at)), to: `/company/notices/${n.id}`,
  })));
  if (on(c, "mfg-master-data")) {
    push("items", "품목", ls(c, "items").filter((i) => hit(i.item_no, i.name, i.spec, i.customer_part_no, i.material_grade, i.application_category)).map((i) => ({
      id: i.id, title: i.name, subtitle: subOf(i.item_no, i.material_grade, i.application_category), to: `/ops/master?selected=${i.id}`,
    })));
  }
  if (on(c, "mfg-materials")) {
    const lots = new Map<string, string>();
    const itemName = indexBy(on(c, "mfg-master-data") ? ls(c, "items") : []);
    for (const s of ls(c, "stock_lots")) lots.set(s.lot_no, subOf("재고 LOT", itemName.get(s.item_id)?.name));
    for (const l of ls(c, "lot_links")) { if (!lots.has(l.parent_lot)) lots.set(l.parent_lot, "LOT 연결"); if (!lots.has(l.child_lot)) lots.set(l.child_lot, "LOT 연결"); }
    if (on(c, "mfg-quality")) for (const cl of ls(c, "customer_claims")) for (const lot of cl.lot_nos) if (!lots.has(lot)) lots.set(lot, subOf("클레임 LOT", cl.claim_no));
    push("lots", "LOT", [...lots.entries()].filter(([lot, sub]) => hit(lot, sub)).map(([lot, sub]) => ({ id: lot, title: lot, subtitle: sub, to: `/ops/trace?lot=${encodeURIComponent(lot)}` })));
  }
  if (on(c, "mfg-quality")) {
    push("claims", "클레임", ls(c, "customer_claims").filter((cl) => hit(cl.claim_no, cl.customer_ref_no, cl.description, cl.lot_nos, partners.get(cl.partner_id)?.name)).map((cl) => ({
      id: cl.id, title: subOf(cl.claim_no, firstLine(cl.description, 40)), subtitle: subOf(partners.get(cl.partner_id)?.name, formatDate(cl.received_on)), to: `/ops/quality/claims/${cl.id}`,
      status: st("customer_claims.status", cl.status), dday: cl.status !== "closed" ? cl.report_8d_due : null,
    })));
  }
  return { q, groups, total: groups.reduce((s, g) => s + g.total, 0) };
};

// ───── 위젯 셀렉터(widget.<id>)
const W: Record<string, SelectorHandler> = {};

W["my-tasks"] = (c): WList | null => {
  const open = myOpenTasks(c).sort((a, b) => byIso(a.due_at, b.due_at));
  if (!open.length) return null;
  const dueToday = open.filter((t) => t.due_at && toKstDate(t.due_at) === c.today).length;
  return {
    count: open.length, unit: "건", label: "진행할 업무", note: dueToday ? `오늘 마감 ${dueToday}건이 있어요` : null,
    rows: open.slice(0, 5).map((t) => ({
      id: t.id, title: t.title, subtitle: c.get("projects", t.project_id)?.name ?? undefined, to: `/work/tasks/${t.id}`,
      dday: t.due_at ? { date: t.due_at } : null, status: t.status === "changes_requested" ? st("tasks.status", t.status) : null,
    })),
  };
};

W["returned-submissions"] = (c): WList | null => {
  if (!on(c, "tasks")) return null;
  const subs = ls(c, "submissions", [{ field: "submitted_by", operator: "eq", value: me(c) }, { field: "status", operator: "eq", value: "rejected" }]);
  const rows: WRow[] = [];
  const seen = new Set<string>();
  for (const s of subs.sort((a, b) => byIso(b.reviewed_at, a.reviewed_at))) {
    const t = c.get("tasks", s.task_id);
    if (!t || t.status !== "changes_requested" || seen.has(t.id)) continue;
    seen.add(t.id);
    rows.push({ id: s.id, title: t.title, subtitle: firstLine(s.review_comment) || "수정 요청을 받았어요", to: `/work/tasks/${t.id}`, trailingText: s.reviewed_at ? formatRelative(s.reviewed_at, nowOf(c)) : null });
  }
  if (!rows.length) return null;
  return { count: rows.length, unit: "건", label: "수정 요청 받은 제출", note: "코멘트를 반영해 다시 제출해 주세요", rows: rows.slice(0, 5) };
};

W["review-queue"] = (c): WList | null => {
  const subs = reviewableSubs(c).sort((a, b) => byIso(a.submitted_at, b.submitted_at));
  if (!subs.length) return null;
  const oldest = daysBetween(toKstDate(subs[0]!.submitted_at), c.today);
  return {
    count: subs.length, unit: "건", label: "검토 대기", note: oldest > 0 ? `가장 오래 기다린 건 ${oldest}일째예요` : "모두 오늘 들어온 제출이에요",
    rows: subs.slice(0, 5).map((s) => {
      const t = c.get("tasks", s.task_id);
      const who = s.via === "ai_connection" ? `AI 연결(${s.via_client ?? "AI"}) · ${personName(c, s.submitted_by)}` : personName(c, s.submitted_by);
      return {
        id: s.id, title: t?.title ?? "업무", subtitle: subOf(formatRelative(s.submitted_at, nowOf(c)), who), to: `/work/review?selected=${s.id}`,
        dday: t?.due_at ? { date: t.due_at } : null,
      };
    }),
  };
};

// 승인 대기: 내 차례인 것만(같은 건이 두 사람 할 일로 보이지 않게) + 한 번 누르면 끝나는 것만 줄로.
//   검토 = 내가 지정 검토자인 제출 · 회의 액션·분류 = 회의 프로젝트의 검토자(프로젝트가 없으면 참석한 검토자)
//   회의 결정 = 결정 역할이 내 역할(역할이 없으면 회의 검토자) · 현장 배정 = 배정 역할(routing.fieldReportDispatcher) · 작성 규칙 = 지정 승인자
const APPROVAL_LABEL: Record<ApprovalKind, string> = { submission: "검토", action: "회의 액션", segment: "회의 분류", decision: "회의 결정", field: "현장 배정", rule: "작성 규칙" };
const APPROVAL_TO: Record<ApprovalKind, string> = {
  submission: "/work/review", action: "/meetings/inbox?kind=action", segment: "/meetings/inbox?kind=segment", decision: "/meetings/inbox?kind=decision",
  field: "/ops/report?tab=feed", rule: "/docs/rules",
};
W["approval-inbox"] = (c): ApprovalInbox | null => {
  const items: ApprovalItem[] = [];
  const manual: ApprovalInbox["manual"] = [];
  const myTitle = c.tenant.roles.find((r) => r.code === c.persona.roleCode)?.title;
  const memberOfRole = (code: string | undefined) => (code ? c.tenant.people.find((p) => p.roleCode === code && p.persona) ?? c.tenant.people.find((p) => p.roleCode === code) : undefined);

  // 1) 검토: 내가 지정 검토자인 제출 → 승인(수정 요청은 코멘트가 필요해서 검토함으로)
  for (const sb of reviewableSubs(c)) {
    const t = c.get("tasks", sb.task_id);
    const who = sb.via === "ai_connection" ? `${personName(c, sb.submitted_by)} · AI 연결(${sb.via_client ?? "AI"})` : personName(c, sb.submitted_by);
    items.push({
      key: `submission:${sb.id}`, kind: "submission", kindLabel: APPROVAL_LABEL.submission, title: t?.title ?? "업무",
      subtitle: subOf(who, formatRelative(sb.submitted_at, nowOf(c)) + " 제출"), to: `/work/review?selected=${sb.id}`, editLabel: "수정 요청",
      ai: sb.via === "ai_connection", at: sb.submitted_at,
      primary: { rpc: "approve_submission", payload: { submissionId: sb.id }, label: "승인", done: `"${t?.title ?? "업무"}" 승인했어요` },
    });
  }

  // 2~4) 회의: 프로젝트 검토자(없으면 참석한 검토자)가 확인
  if (on(c, "meetings") && c.can("meetings", "approve")) {
    const meetings = indexBy(ls(c, "meetings"));
    const projects = indexBy(on(c, "business-structure") ? ls(c, "projects") : []);
    const lineByCode = new Map((on(c, "business-structure") ? ls(c, "business_lines") : []).map((l) => [l.code, l.name]));
    const projectByCode = new Map([...projects.values()].map((p) => [p.code, p]));
    const mine = (m: RowOf<"meetings"> | undefined) => {
      if (!m) return false;
      const p = m.project_ids[0] ? projects.get(m.project_ids[0]) : undefined;
      return p ? p.reviewer_member_id === me(c) : m.attendee_ids.includes(me(c));
    };
    const meetingTitle = (m: RowOf<"meetings"> | undefined) => (m ? `${m.title} (${shortDay(toKstDate(m.started_at))})` : "회의");

    for (const ap of ls(c, "action_proposals", [{ field: "status", operator: "eq", value: "proposed" }])) {
      const m = meetings.get(ap.meeting_id);
      if (!m || !mine(m) || !m.project_ids[0]) continue;
      const assignee = ap.suggested_assignee_id ?? me(c);
      const who = assignee === me(c) ? "나" : personName(c, assignee);
      items.push({
        key: `action:${ap.id}`, kind: "action", kindLabel: APPROVAL_LABEL.action, title: ap.title,
        subtitle: subOf(meetingTitle(m), `추천 담당 ${who}`, ap.suggested_due_at ? `${shortDay(toKstDate(ap.suggested_due_at))}까지` : null),
        to: `/meetings/inbox?kind=action&meeting=${m.id}`, editLabel: "고치기", ai: true, at: m.started_at,
        primary: { rpc: "accept_action_proposal", payload: { proposalId: ap.id }, label: "업무로 만들기", done: assignee === me(c) ? `"${ap.title}" 업무를 내 업무에 넣었어요` : `"${ap.title}" 업무를 ${who}님에게 보냈어요` },
      });
    }

    let unclassified = 0;
    for (const sg of ls(c, "meeting_segments", [{ field: "review_status", operator: "in", value: ["pending", "unclassified"] }])) {
      const m = meetings.get(sg.meeting_id);
      if (!mine(m)) continue;
      // 미분류(AI가 사업을 못 고름)는 한 번에 끝낼 수 없어요 → 화면에서 고르기
      if (!sg.business_line_code) { unclassified++; continue; }
      const prj = sg.project_code ? projectByCode.get(sg.project_code)?.name : null;
      const guess = [lineByCode.get(sg.business_line_code) ?? sg.business_line_code, prj].filter(Boolean).join(" › ");
      items.push({
        key: `segment:${sg.id}`, kind: "segment", kindLabel: APPROVAL_LABEL.segment, title: `"${firstLine(sg.evidence_quote, 44)}"`,
        subtitle: subOf(meetingTitle(m), `AI 분류 ${guess}`, `확신 ${Math.round(sg.confidence * 100)}%`),
        to: `/meetings/inbox?kind=segment&meeting=${sg.meeting_id}`, editLabel: "고치기", ai: true, at: `${m!.started_at}|${String(sg.start_ts).padStart(6, "0")}`,
        primary: { rpc: "confirm_segment", payload: { segmentId: sg.id }, label: "분류 맞아요", done: `${guess}(으)로 확인했어요` },
      });
    }
    if (unclassified) manual.push({ label: "AI가 분류하지 못한 회의 구간", count: unclassified, to: "/meetings/inbox?kind=segment&conf=unclassified" });

    for (const d of ls(c, "decisions", [{ field: "status", operator: "eq", value: "proposed" }])) {
      const m = meetings.get(d.meeting_id);
      const turn = d.decided_by_role ? d.decided_by_role === myTitle : mine(m);
      if (!turn) continue;
      items.push({
        key: `decision:${d.id}`, kind: "decision", kindLabel: APPROVAL_LABEL.decision, title: firstLine(d.statement, 60),
        subtitle: subOf(meetingTitle(m), d.decided_by_role ? `${d.decided_by_role} 확정` : null), to: `/meetings/inbox?kind=decision&meeting=${d.meeting_id}`,
        editLabel: "고치기", ai: true, at: d.decided_at,
        primary: { rpc: "confirm_decision", payload: { decisionId: d.id }, label: "확정", done: "결정을 확정했어요" },
      });
    }
  }

  // 5) 현장 배정: 배정 역할의 홈에 모여요. AI(회사 규칙)가 고른 추천 담당에게 한 번 눌러 배정
  const dispatcher = c.tenant.routing?.fieldReportDispatcher;
  if (on(c, "mfg-quality") && c.can("field_reports", "approve") && (!dispatcher || dispatcher === c.persona.roleCode)) {
    for (const f of ls(c, "field_reports", [{ field: "status", operator: "eq", value: "new" }])) {
      const target = memberOfRole(c.tenant.routing?.fieldReportByKind?.[f.kind as FieldReportKind]);
      const by = f.anonymous || !f.reported_by ? "익명" : personName(c, f.reported_by);
      const base = { key: `field:${f.id}`, kind: "field" as const, kindLabel: APPROVAL_LABEL.field, title: firstLine(f.note, 50), to: `/ops/report?tab=feed&selected=${f.id}`, at: f.reported_at };
      if (!target) { manual.push({ label: "추천 담당이 없는 현장 등록", count: 1, to: base.to }); continue; }
      const self = target.id === me(c);
      items.push({
        ...base, editLabel: "다른 담당", ai: false,
        subtitle: subOf(`${labelOf("field_reports.kind", f.kind)} · ${by}`, formatRelative(f.reported_at, nowOf(c)), `추천 담당 ${self ? "나" : target.displayName}`),
        primary: { rpc: "assign_field_report", payload: { reportId: f.id, assigneeId: target.id }, label: self ? "내가 맡기" : "배정", done: self ? "내가 맡았어요" : `${target.displayName}님에게 배정했어요` },
      });
    }
  }

  // 6) 작성 규칙 후보: 지정 승인자(없으면 소유자·관리자)
  if (on(c, "correction-rules")) {
    for (const r of ls(c, "rules", [{ field: "status", operator: "eq", value: "candidate" }])) {
      const turn = r.approver_id ? r.approver_id === me(c) : adminish(c);
      if (!turn || !c.can("rules", "approve", r as unknown as Record<string, unknown>)) continue;
      items.push({
        key: `rule:${r.id}`, kind: "rule", kindLabel: APPROVAL_LABEL.rule, title: r.statement,
        subtitle: `같은 수정 ${r.evidence_ids.length}번 → 규칙으로 만들까요?`, to: `/docs/rules?selected=${r.id}`, editLabel: "고치기", ai: true, at: r.created_at,
        primary: { rpc: "approve_rule", payload: { ruleId: r.id }, label: "반영", done: "다음 초안부터 이 규칙을 써요" },
        secondary: { rpc: "reject_rule", payload: { ruleId: r.id }, label: "이번만", done: "이번 수정으로만 남겼어요" },
      });
    }
  }

  // 추천 담당이 없는 현장 등록은 한 줄로 묶어요
  const merged = manual.reduce<ApprovalInbox["manual"]>((acc, m) => {
    const same = acc.find((x) => x.label === m.label);
    if (same) { same.count += m.count; same.to = APPROVAL_TO.field; } else acc.push({ ...m });
    return acc;
  }, []);
  if (!items.length && !merged.length) return null;
  const order: ApprovalKind[] = ["submission", "field", "action", "decision", "segment", "rule"];
  items.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.at.localeCompare(b.at));
  const counts = order
    .map((kind) => ({ kind, label: APPROVAL_LABEL[kind], count: items.filter((i) => i.kind === kind).length, to: APPROVAL_TO[kind] }))
    .filter((x) => x.count > 0);
  return { total: items.length, counts, items, manual: merged };
};

W["team-workload"] = (c): TeamWorkload | null => {
  if (!on(c, "tasks")) return null;
  const tasks = ls(c, "tasks", [{ field: "reviewer_id", operator: "eq", value: me(c) }]).filter((t) => t.status !== "canceled");
  if (!tasks.length) return null;
  // 업무 흐름 순서. 같은 tone(진행 중·검토 대기 = info)이 붙지 않게 수정 요청을 사이에 둠
  const order: StatusValue<"tasks.status">[] = ["todo", "in_progress", "changes_requested", "submitted", "done"];
  const segments: WSeg[] = order.map((s) => ({ key: s, label: labelOf("tasks.status", s), value: tasks.filter((t) => t.status === s).length, tone: statusOf("tasks.status", s).tone }));
  const byPerson = new Map<string, number>();
  for (const t of tasks) if (t.status === "in_progress") byPerson.set(t.assignee_id, (byPerson.get(t.assignee_id) ?? 0) + 1);
  for (const t of tasks) if (!byPerson.has(t.assignee_id) && LIVE_TASK.has(t.status)) byPerson.set(t.assignee_id, 0);
  const people = [...byPerson.entries()].map(([memberId, n]) => ({ memberId, name: personName(c, memberId), inProgress: n })).sort((a, b) => a.name.localeCompare(b.name, "ko")).slice(0, 6);
  return { total: tasks.length, segments, people };
};

W["project-health"] = (c): ProjectHealth | null => {
  if (!on(c, "business-structure")) return null;
  const active = ls(c, "projects", [{ field: "status", operator: "eq", value: "active" }]);
  if (!active.length) return null;
  const health = (["good", "warning", "critical"] as const).map((h) => ({ ...statusOf("projects.health", h), count: active.filter((p) => p.health === h).length }));
  const lines = ls(c, "business_lines").sort((a, b) => a.sort_order - b.sort_order).map((l) => ({ id: l.id, name: l.name, count: active.filter((p) => p.business_line_id === l.id).length })).filter((l) => l.count > 0);
  const dueSoon = active
    .filter((p) => p.due_on >= c.today && daysBetween(c.today, p.due_on) <= 14)
    .sort((a, b) => a.due_on.localeCompare(b.due_on))
    .slice(0, 3)
    .map((p) => ({ id: p.id, title: p.name, subtitle: p.code, to: `/projects/${p.id}`, dday: { date: p.due_on }, status: st("projects.health", p.health) }));
  return { active: active.length, health, lines, dueSoon };
};

W["upcoming-meetings"] = (c, q): WList | null => {
  const days = q?.period === "month" ? 30 : 7;
  const meetings = myMeetings(c, c.today, addDays(c.today, days));
  const proposals = on(c, "meetings")
    ? ls(c, "action_proposals", [{ field: "suggested_assignee_id", operator: "eq", value: me(c) }, { field: "status", operator: "eq", value: "proposed" }])
    : [];
  if (!meetings.length && !proposals.length) return null;
  const needsReview = c.persona.role !== "member" && on(c, "meetings") ? ls(c, "meetings", [{ field: "status", operator: "eq", value: "needs_review" }]).length : 0;
  return {
    count: meetings.length, unit: "건", label: days === 7 ? "7일 안 회의" : "30일 안 회의",
    note: needsReview ? `분류 확인이 필요한 회의 ${needsReview}건이 있어요` : null,
    rows: meetings.slice(0, 4).map((m) => ({
      id: m.id, title: m.title, subtitle: subOf(formatDate(m.started_at), formatTime(m.started_at), formatMinutes(m.duration_min)), to: `/meetings/${m.id}`,
      status: m.status === "needs_review" ? st("meetings.status", m.status) : null,
    })),
    extra: proposals.length ? {
      title: "나에게 제안된 액션",
      rows: proposals.slice(0, 3).map((a) => ({ id: a.id, title: a.title, subtitle: c.get("meetings", a.meeting_id)?.title ?? "회의", to: `/meetings/${a.meeting_id}`, dday: a.suggested_due_at ? { date: a.suggested_due_at } : null })),
    } : null,
  };
};

W["recent-decisions"] = (c, q): WList | null => {
  if (!on(c, "meetings")) return null;
  const month = q?.period === "month";
  const from = month ? `${c.today.slice(0, 7)}-01` : addDays(c.today, -7);
  const rows = ls(c, "decisions", [{ field: "status", operator: "eq", value: "confirmed" }])
    .filter((d) => toKstDate(d.decided_at) >= from && toKstDate(d.decided_at) <= c.today)
    .sort((a, b) => b.decided_at.localeCompare(a.decided_at));
  if (!rows.length) return null;
  return {
    count: rows.length, unit: "건", label: month ? "이번 달 확정한 결정" : "지난 7일 확정한 결정",
    rows: rows.slice(0, 5).map((d) => ({ id: d.id, title: d.statement, subtitle: subOf(c.get("meetings", d.meeting_id)?.title, formatDate(d.decided_at)), to: `/meetings/${d.meeting_id}` })),
  };
};

W["notices"] = (c): WList | null => {
  const { list, read } = myNotices(c);
  if (!list.length) return null;
  const unreadMust = list.filter((n) => n.must_read && !read.has(n.id)).length;
  const sorted = [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.published_at.localeCompare(a.published_at));
  return {
    count: unreadMust, unit: "건", label: "안 읽은 필독", note: unreadMust ? null : "필독 공지를 모두 읽었어요",
    rows: sorted.slice(0, 3).map((n) => ({
      id: n.id, title: n.title, subtitle: subOf(labelOf("notices.category", n.category), formatDate(n.published_at)), to: `/company/notices/${n.id}`,
      tag: n.must_read ? "필독" : n.pinned ? "고정" : null, unread: n.must_read && !read.has(n.id),
    })),
  };
};

W["ai-connect-status"] = (c): AiConnect => {
  const pol = ls(c, "mcp_policies")[0];
  const enabled = pol ? pol.enabled : c.tenant.policies.mcpEnabled;
  const rows = on(c, "ai-connect")
    ? ls(c, "mcp_connections", [{ field: "member_id", operator: "eq", value: me(c) }, { field: "revoked_at", operator: "null", value: true }]).map((m) => ({
      id: m.id, title: m.client_name, subtitle: m.last_used_at ? `마지막 사용 ${formatRelative(m.last_used_at, nowOf(c))}` : "아직 쓰지 않았어요", to: "/me/ai",
    }))
    : [];
  return { enabled, rows };
};

W["company-kpi"] = (c): CompanyKpi | null => {
  if (!on(c, "reports")) return null;
  const kpis = ls(c, "kpis").filter((k) => k.id.startsWith("CR_"));
  const stats: WStat[] = [];
  for (const k of kpis) {
    const { values } = kpiSeries(c, k.id);
    const last = values.slice(-6);
    if (!last.length) continue;
    const cur = last[last.length - 1]!;
    const prev = last[last.length - 2];
    const unit = unitText(k.unit);
    stats.push({
      label: k.name, value: cur.value, unit, trend: last.map((v) => v.value),
      delta: prev ? { value: Math.round((cur.value - prev.value) * 10) / 10, unit, period: "지난달보다", goodWhen: "up" } : null,
      caption: k.target != null ? `목표 ${formatNumber(k.target)}${unit} · ${formatMonth(cur.period)} 기준` : `${formatMonth(cur.period)} 기준`,
    });
  }
  return stats.length ? { stats } : null;
};

W["ax-effect"] = (c): AxEffect | null => {
  if (!on(c, "reports")) return null;
  const defs: [string, "up" | "down", string][] = [["AX_REPEAT_RATE", "down", "같은 수정 재발률"], ["AX_FIRST_PASS", "up", "1차 통과율"], ["AX_REVIEW_MIN", "down", "평균 검토 시간"], ["AX_ACTIVE_AI", "up", "AI 연결 활성 인원"]];
  const stats: WStat[] = [];
  let bars: AxEffect["bars"] = [];
  let highlightKey: string | null = null;
  let latestLabel: string | null = null;
  for (const [id, good, fallback] of defs) {
    const { kpi, values } = kpiSeries(c, id);
    if (!values.length) continue;
    const cur = values[values.length - 1]!;
    const prev = values[values.length - 2];
    const unit = unitText(kpi?.unit) || (id === "AX_REVIEW_MIN" ? "분" : id === "AX_ACTIVE_AI" ? "명" : "%");
    stats.push({ label: kpi?.name ?? fallback, value: cur.value, unit, delta: prev ? { value: Math.round((cur.value - prev.value) * 10) / 10, unit, period: "지난주보다", goodWhen: good } : null });
    if (id === "AX_REPEAT_RATE") {
      const last = values.slice(-8);
      bars = last.map((v) => ({ key: v.period, label: shortDay(v.period), value: v.value }));
      highlightKey = cur.period;
      latestLabel = `${formatDate(cur.period, false)} 주`;
    }
  }
  return stats.length ? { stats, bars, highlightKey, latestLabel } : null;
};

W["approvals-pending"] = (c): WFigure | null => {
  if (!on(c, "approvals")) return null;
  const pending = ls(c, "approval_links", [{ field: "status", operator: "eq", value: "pending" }]);
  const mine = pending.filter((a) => a.current_approver_id === me(c)).length;
  const asked = pending.filter((a) => a.requester_id === me(c)).length;
  if (!mine && !asked) return null;
  return { stats: [{ label: "내가 결재할 문서", value: mine, unit: "건" }, { label: "내가 올린 진행 중 문서", value: asked, unit: "건" }] };
};

W["mail-followups"] = (c): WFigure | null => {
  if (!on(c, "mail-connector")) return null;
  const links = ls(c, "mail_links", [{ field: "member_id", operator: "eq", value: me(c) }]);
  if (!links.length) return null;
  const withProject = links.filter((l) => !!l.project_id).length;
  const pending = links.filter((l) => !!l.suggested_task_id && (l.suggestion_status == null || l.suggestion_status === "proposed")).length
    + links.filter((l) => !l.suggested_task_id && l.suggestion_status === "proposed").length;
  return { stats: [{ label: "프로젝트로 분류된 메일", value: withProject, unit: "건" }, { label: "처리할 후속 제안", value: pending, unit: "건" }] };
};

W["safety-status"] = (c, q): SafetyStatus | null => {
  if (!on(c, "safety-health")) return null;
  const risks = latestRisks(ls(c, "risk_assessments")).filter((r) => r.status !== "done");
  const overdue = risks.filter((r) => r.due_on && r.due_on < c.today).length;
  const next = ls(c, "legal_calendar_items").filter((l) => l.kind === "semiannual_review" && l.status !== "done").sort((a, b) => a.due_on.localeCompare(b.due_on))[0];
  const month = q?.period === "month";
  const from = month ? `${c.today.slice(0, 7)}-01` : weekStart(c.today);
  const nm = ls(c, "near_miss_reports").filter((n) => toKstDate(n.occurred_at) >= from && toKstDate(n.occurred_at) <= c.today).length;
  const stats: WStat[] = [
    { label: "이행 확인 전 위험요인", value: risks.length, unit: "건", tone: overdue ? "critical" : null, toneLabel: overdue ? `기한 지남 ${overdue}건` : null },
  ];
  if (next) {
    const d = daysBetween(c.today, next.due_on);
    stats.push({ label: "다음 반기 점검", value: d >= 0 ? `D-${d}` : `${-d}일 지남`, caption: formatDate(next.due_on) });
  }
  stats.push({ label: month ? "이번 달 아차사고 신고" : "이번 주 아차사고 신고", value: nm, unit: "건", caption: "많을수록 좋은 신호예요" });
  if (!risks.length && !next && !nm) return null;
  return { stats };
};

W["ara-aggregate"] = (c): WFigure | null => {
  if (!on(c, "ara-wellbeing")) return null;
  const agg = ls(c, "wellbeing_aggregates").sort((a, b) => b.period_month.localeCompare(a.period_month))[0];
  if (!agg || agg.population_n < c.tenant.policies.aggregateMinN) return null;
  const stats: WStat[] = [{ label: "참여 인원", value: agg.active_seats, unit: "명", caption: `${formatMonth(agg.period_month)} 기준` }];
  if (agg.card_share_rate != null) stats.push({ label: "카드 공유율", value: Math.round(agg.card_share_rate), unit: "%" });
  if (agg.assessment_completion_rate != null) stats.push({ label: "점검 완료율", value: Math.round(agg.assessment_completion_rate), unit: "%" });
  return { stats, note: "10명 미만이면 보이지 않아요" };
};

W["calendar-week"] = (c): WList | null => {
  const start = c.today;
  const end = weekEnd(c.today);
  const items: (WRow & { sort: string })[] = [];
  if (on(c, "calendar")) {
    for (const e of ls(c, "calendar_events")) {
      const s = toKstDate(e.start_at);
      if (s > end || toKstDate(e.end_at) < start) continue;
      items.push({ id: e.id, title: e.title, subtitle: subOf(formatDate(e.start_at), e.all_day ? "종일" : formatTime(e.start_at), labelOf("calendar_events.kind", e.kind)), to: "/company/calendar", sort: e.start_at });
    }
  }
  for (const m of myMeetings(c, start, end)) items.push({ id: m.id, title: m.title, subtitle: subOf(formatDate(m.started_at), formatTime(m.started_at), "회의"), to: `/meetings/${m.id}`, sort: m.started_at });
  for (const t of myOpenTasks(c)) {
    if (!t.due_at) continue;
    const d = toKstDate(t.due_at);
    if (d < start || d > end) continue;
    items.push({ id: t.id, title: t.title, subtitle: subOf(formatDate(t.due_at), "마감"), to: `/work/tasks/${t.id}`, sort: t.due_at, dday: { date: t.due_at } });
  }
  if (!items.length) return null;
  items.sort((a, b) => a.sort.localeCompare(b.sort));
  return { count: items.length, unit: "건", label: "이번 주 남은 일정", rows: items.slice(0, 5).map(({ sort: _s, ...r }) => r) };
};

W["admin-health"] = (c): WFigure | null => {
  if (!adminish(c)) return null;
  const from = kstIso(addDays(c.today, -7), "00:00");
  const inv = on(c, "admin-members") ? ls(c, "invitations", [{ field: "status", operator: "eq", value: "pending" }]).length : 0;
  const audits = on(c, "audit-log") ? ls(c, "audit_events").filter((a) => a.at >= from) : [];
  const roles = audits.filter((a) => a.resource === "role_assignments").length;
  const modules = audits.filter((a) => a.resource === "tenant_settings").length;
  return { stats: [{ label: "수락 대기 초대", value: inv, unit: "건" }, { label: "7일 역할 변경", value: roles, unit: "건" }, { label: "7일 설정 변경", value: modules, unit: "건" }] };
};

// ───── 제조 팩
const itemsIndex = (c: Ctx) => indexBy(on(c, "mfg-master-data") ? ls(c, "items") : []);
const partnerName = (c: Ctx, id: string | null | undefined) => (id ? c.get("partners", id)?.name : undefined) ?? "고객사";

W["mfg-delivery-due"] = (c, q): WList | null => {
  if (!on(c, "mfg-orders")) return null;
  const days = q?.period === "month" ? 30 : 7;
  const limit = addDays(c.today, days);
  const lines = ls(c, "sales_order_lines").filter((l) => !["shipped", "closed", "canceled"].includes(l.status) && l.due_date <= limit).sort((a, b) => a.due_date.localeCompare(b.due_date));
  if (!lines.length) return null;
  const items = itemsIndex(c);
  const orders = indexBy(ls(c, "sales_orders"));
  const ships = ls(c, "shipments");
  return {
    count: lines.length, unit: "건", label: days === 7 ? "7일 안 납기" : "30일 안 납기",
    note: lines.some((l) => l.due_date < c.today) ? `납기 지난 줄 ${lines.filter((l) => l.due_date < c.today).length}건이 있어요` : null,
    rows: lines.slice(0, 5).map((l) => {
      const it = items.get(l.item_id);
      const ship = ships.filter((s) => s.order_line_id === l.id || (!s.order_line_id && s.order_id === l.order_id)).sort((a, b) => b.ship_date.localeCompare(a.ship_date))[0];
      return {
        id: l.id, title: it?.name ?? "품목", to: "/ops/orders",
        subtitle: l.status === "late" && l.late_reason
          ? subOf(partnerName(c, orders.get(l.order_id)?.partner_id), l.late_reason.replace(/\(예상\)$/, ""))
          : subOf(partnerName(c, orders.get(l.order_id)?.partner_id), `${formatNumber(Math.max(0, l.qty - (l.shipped_qty ?? 0)))}${it?.unit ?? "개"}`, ship ? labelOf("shipments.status", ship.status) : "출하 준비 전"),
        // 납기가 지났으면 D-day가 "n일 지남"(critical)으로 보여 줘서 지연 태그는 따로 달지 않음. 납기 전이면 "지연 예상(+3일)"
        dday: { date: l.due_date, noun: "납기" }, status: l.status === "late" && l.due_date >= c.today ? orderLineStatus(l, c.today) : null,
      };
    }),
  };
};

function stepsOf(c: Ctx) {
  const steps = on(c, "mfg-master-data") ? ls(c, "process_steps").sort((a, b) => a.sequence - b.sequence) : [];
  const knit = steps.find((s) => /편조/.test(s.name));
  const forming = steps.filter((s) => /크림핑|프레스|스파이럴/.test(s.name));
  return { steps, knit, forming };
}

W["mfg-production-today"] = (c): ProductionToday | null => {
  if (!on(c, "mfg-production")) return null;
  const { knit, forming } = stepsOf(c);
  const wos = ls(c, "work_orders", [{ field: "planned_date", operator: "eq", value: c.today }]);
  const prs = ls(c, "production_results", [{ field: "date", operator: "eq", value: c.today }]);
  if (!wos.length && !prs.length) return null;
  const nowIso = nowOf(c);
  // 지금 시각까지 계획상 해야 할 양: 작업지시마다 근무조 창(주간 08~20시, 야간 20~익일 08시)이 지난 만큼
  const elapsed = (shift: "day" | "night") => {
    const start = Date.parse(kstIso(c.today, shift === "day" ? "08:00" : "20:00"));
    return Math.min(1, Math.max(0, (Date.parse(nowIso) - start) / (12 * 3_600_000)));
  };
  const rowOf = (key: string, label: string, unit: string) => {
    const mine = wos.filter((w) => w.process_step_id === key);
    return {
      key, label, unit,
      good: sum(prs.filter((p) => p.process_step_id === key).map((p) => p.good_qty)),
      planned: sum(mine.map((w) => w.planned_qty)),
      expected: Math.round(sum(mine.map((w) => w.planned_qty * elapsed(w.shift)))),
    };
  };
  const rows = [
    ...(knit ? [rowOf(knit.id, knit.name, "m")] : []),
    ...forming.map((s) => rowOf(s.id, s.name, "개")),
  ].filter((r) => r.planned > 0 || r.good > 0);
  const formingIds = new Set(forming.map((s) => s.id));
  const ends = prs.map((p) => p.end_at).filter((x): x is string => !!x && x <= nowIso).sort();
  return {
    rows,
    defects: sum(prs.filter((p) => formingIds.has(p.process_step_id)).map((p) => p.defect_qty)),
    asOf: ends.length ? formatTime(ends[ends.length - 1]!) : null,
    now: formatTime(nowIso),
  };
};

W["mfg-quality-ppm"] = (c): QualityPpm | null => {
  if (!on(c, "mfg-quality") && !on(c, "reports")) return null;
  const { kpi, values } = kpiSeries(c, "K06");
  const last = values.slice(-3);
  const target = kpi?.target ?? 10;
  const month = c.today.slice(0, 7);
  const claimsThisMonth = on(c, "mfg-quality") ? ls(c, "customer_claims").filter((x) => x.received_on.startsWith(month)).length : 0;
  const openActions = on(c, "mfg-quality") ? ls(c, "corrective_actions").filter((x) => x.status === "open").length : 0;
  if (!last.length && !claimsThisMonth && !openActions) return null;
  const cur = last[last.length - 1];
  const prev = last[last.length - 2];
  return {
    stat: cur ? {
      label: `고객 PPM(${formatMonth(cur.period)})`, value: cur.value, unit: "PPM", caption: `Single PPM 목표 ${formatNumber(target)} 미만`,
      delta: prev ? { value: Math.round((cur.value - prev.value) * 10) / 10, unit: "", period: "지난달보다", goodWhen: "down" } : null,
    } : null,
    bars: last.map((v) => ({ key: v.period, label: formatMonth(v.period), value: v.value })),
    highlightKey: cur?.period ?? null,
    target,
    claimsThisMonth,
    openActions,
  };
};

W["mfg-equipment-status"] = (c): EquipmentStatus | null => {
  if (!on(c, "mfg-production") || !on(c, "mfg-equipment")) return null;
  const equipment = ls(c, "equipment").filter((e) => e.status !== "retired");
  if (!equipment.length) return null;
  const hour = Number(formatTime(nowOf(c)).slice(0, 2));
  const shift: "day" | "night" = hour >= 8 && hour < 20 ? "day" : "night";
  const logs = ls(c, "equipment_run_logs", [{ field: "date", operator: "eq", value: c.today }, { field: "shift", operator: "eq", value: shift }]);
  const latest = new Map<string, (typeof logs)[number]>();
  for (const l of logs) { const cur = latest.get(l.equipment_id); if (!cur || l.recorded_at > cur.recorded_at) latest.set(l.equipment_id, l); }
  const statusOfEq = (id: string) => latest.get(id)?.status ?? "none";
  const order = ["running", "stopped", "breakdown", "setup", "none"] as const;
  // '준비'와 '기록 전'은 둘 다 중립이라 붙어 있으면 같은 색 → '기록 전'은 옅은 회색(chart-muted)
  const segments: WSeg[] = order.map((s) => ({ key: s, label: labelOf("equipment_run_logs.status", s), value: equipment.filter((e) => statusOfEq(e.id) === s).length, tone: statusOf("equipment_run_logs.status", s).tone, ...(s === "none" ? { color: "var(--ws-chart-muted)" } : {}) }));
  const knitEq = equipment.filter((e) => /편조/.test(e.kind) || /편조/.test(e.name));
  const checked = new Set(ls(c, "equipment_checks", [{ field: "checked_on", operator: "eq", value: c.today }]).map((x) => x.equipment_id));
  return {
    shiftLabel: shift === "day" ? "주간조" : "야간조",
    segments,
    total: equipment.length,
    knit: knitEq.length ? { running: knitEq.filter((e) => statusOfEq(e.id) === "running").length, total: knitEq.length } : null,
    checksMissing: equipment.filter((e) => e.status === "active" && !checked.has(e.id)).length,
  };
};

W["mfg-material-alert"] = (c): WList | null => {
  if (!on(c, "mfg-materials")) return null;
  const items = itemsIndex(c);
  const safety = ls(c, "safety_stocks");
  if (!safety.length) return null;
  const lots = ls(c, "stock_lots").filter((s) => s.status === "available");
  const from = kstIso(addDays(c.today, -28), "00:00");
  const lotItem = new Map(ls(c, "stock_lots").map((s) => [s.id, s.item_id]));
  const used = new Map<string, number>();
  for (const m of ls(c, "stock_movements")) {
    if ((m.kind !== "consume" && m.kind !== "out") || m.moved_at < from) continue;
    const it = lotItem.get(m.lot_id);
    if (it) used.set(it, (used.get(it) ?? 0) + Math.abs(m.qty));
  }
  const pos = ls(c, "purchase_orders").filter((p) => p.status !== "received");
  const rows: (WRow & { days: number })[] = [];
  for (const s of safety) {
    const onHand = sum(lots.filter((l) => l.item_id === s.item_id).map((l) => l.qty_on_hand));
    const daily = (used.get(s.item_id) ?? 0) / 28;
    if (daily <= 0) continue;
    const days = Math.floor(onHand / daily);
    if (days >= s.min_days) continue;
    const it = items.get(s.item_id);
    const po = pos.filter((p) => p.lines.some((l) => l.item_id === s.item_id)).sort((a, b) => byIso(a.due_on, b.due_on))[0];
    rows.push({
      id: s.id, days, title: it?.name ?? "자재", material: it?.material_grade ?? null, subtitle: `재고 ${days}일 · 안전재고 ${s.min_days}일`, to: "/ops/materials",
      dday: po?.due_on && po.status !== "draft" ? { date: po.due_on, noun: "입고" } : null,
      tag: !po ? "발주 전" : po.status === "draft" ? "발주 초안" : null,
    });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => a.days - b.days);
  return { count: rows.length, unit: "종", label: "안전재고보다 모자란 자재", rows: rows.slice(0, 5).map(({ days: _d, ...r }) => r) };
};

W["mfg-claims-8d"] = (c): WList | null => {
  if (!on(c, "mfg-quality")) return null;
  const claims = ls(c, "customer_claims").filter((x) => x.status !== "closed").sort((a, b) => byIso(a.report_8d_due, b.report_8d_due));
  if (!claims.length) return null;
  const cas = ls(c, "corrective_actions").filter((a) => a.related_type === "claim");
  const items = itemsIndex(c);
  return {
    count: claims.length, unit: "건", label: "진행 중 클레임",
    rows: claims.slice(0, 5).map((cl) => {
      const ca = cas.find((a) => a.related_id === cl.id);
      const step = ca?.d_steps.find((d) => d.status !== "done");
      return {
        // 제목 '클레임 번호 고객'은 빈칸으로 이어요('CL-2026-03 예시배기시스템(주)'): '8D 기한' 칩 옆 좁은 제목 칸(390 모바일·5fr 칸, 약 200px)에서
        // 두 줄이 될 때 'CL-2026-03 ·' 끝에 구분점만 남지 않고 번호 / 고객으로 나뉘어요(ListRow는 ' · ' 조각 끝에 구분점을 붙여요).
        // 고객을 부제로 옮기면 부제가 세 조각이 되어 두 줄 제한에 '현재 D4' 단계가 잘려요
        id: cl.id, title: [cl.claim_no, partnerName(c, cl.partner_id)].filter(Boolean).join(" "), to: `/ops/quality/claims/${cl.id}`,
        subtitle: subOf(items.get(cl.item_id)?.name, step ? `현재 ${step.step}(${labelOf("corrective_actions.step_status", step.status)})` : labelOf("customer_claims.status", cl.status)),
        dday: cl.report_8d_due ? { date: cl.report_8d_due, noun: "8D 기한" } : null,
      };
    }),
  };
};

W["mfg-inspection-queue"] = (c): WList | null => {
  if (!on(c, "mfg-quality")) return null;
  const items = itemsIndex(c);
  const rows: (WRow & { wait: number })[] = [];
  if (on(c, "mfg-materials")) {
    for (const r of ls(c, "material_receipts")) {
      if (r.inspection_id) continue;
      const wait = Math.max(0, daysBetween(r.received_on, c.today));
      rows.push({ id: r.id, wait, title: `LOT ${r.supplier_lot_no}`, subtitle: subOf("수입검사", wait ? `${wait}일째` : "오늘 입고", items.get(r.item_id)?.name), to: "/ops/quality?tab=inspections" });
    }
  }
  if (on(c, "mfg-orders")) {
    for (const s of ls(c, "shipments")) {
      if (s.status !== "planned" || s.outgoing_inspection_id) continue;
      const wait = Math.max(0, daysBetween(toKstDate(s.created_at), c.today));
      rows.push({ id: s.id, wait, title: s.lot_ids[0] ? `LOT ${s.lot_ids[0]}` : (s.delivery_note_no ?? "출하 예정"), subtitle: subOf("출하검사", wait ? `${wait}일째` : null, `${formatDate(s.ship_date, false)} 출하`), to: "/ops/quality?tab=inspections" });
    }
  }
  if (!rows.length) return null;
  rows.sort((a, b) => b.wait - a.wait);
  return { count: rows.length, unit: "LOT", label: "검사 대기", rows: rows.slice(0, 5).map(({ wait: _w, ...r }) => r) };
};

W["mfg-4m-changes"] = (c): WFigure | null => {
  if (!on(c, "mfg-quality")) return null;
  const live = ls(c, "change_requests_4m").filter((x) => ["drafting", "in_review", "waiting_customer"].includes(x.status));
  if (!live.length) return null;
  const waiting = live.filter((x) => x.status === "waiting_customer").map((x) => ({ x, days: daysBetween(x.requested_on, c.today) })).sort((a, b) => b.days - a.days)[0];
  const stats: WStat[] = [{ label: "진행 중 4M 변경", value: live.length, unit: "건" }];
  if (waiting) stats.push({ label: "고객 승인 대기 최장", value: waiting.days, unit: "일", caption: waiting.x.change_no });
  return { stats };
};

W["mfg-calibration-due"] = (c): WList | null => {
  if (!on(c, "mfg-quality")) return null;
  const limit = addDays(c.today, 30);
  const rows = ls(c, "gauges").filter((g) => g.status !== "retired" && g.next_due_on <= limit).sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  if (!rows.length) return null;
  return {
    count: rows.length, unit: "대", label: "30일 안 검교정",
    rows: rows.slice(0, 5).map((g) => ({ id: g.id, title: subOf(g.gauge_no, g.kind), subtitle: g.location ?? undefined, dday: { date: g.next_due_on, noun: "교정" }, to: "/ops/quality?tab=gauges" })),
  };
};

W["mfg-first-mid-last"] = (c): WList | null => {
  if (!on(c, "mfg-production") || !on(c, "mfg-quality")) return null;
  const wos = ls(c, "work_orders", [{ field: "planned_date", operator: "eq", value: c.today }]).filter((w) => w.status === "in_progress" || w.status === "done" || w.status === "released");
  if (!wos.length) return null;
  const ins = ls(c, "inspections", [{ field: "inspected_on", operator: "eq", value: c.today }]);
  const items = itemsIndex(c);
  const { steps } = stepsOf(c);
  const rows: WRow[] = [];
  for (const w of wos) {
    const kinds = new Set(ins.filter((i) => i.work_order_id === w.id).map((i) => i.kind));
    const missing = (["first", "mid", "last"] as const).filter((k) => !kinds.has(k));
    // 아직 시작하지 않은 작업지시는 초물만 확인
    const relevant = w.status === "released" ? [] : w.status === "in_progress" ? missing.filter((k) => k !== "last") : missing;
    if (!relevant.length) continue;
    rows.push({
      id: w.id, title: w.lot_no ?? items.get(w.item_id)?.name ?? w.id,
      subtitle: subOf(`${relevant.map((k) => labelOf("inspections.kind", k)).join("·")} 빠짐`, steps.find((s) => s.id === w.process_step_id)?.name, w.shift === "day" ? "주간조" : "야간조"),
      to: "/ops/production?tab=work-orders",
    });
  }
  if (!rows.length) return null;
  return { count: rows.length, unit: "건", label: "빠진 초중종물 검사", rows: rows.slice(0, 5) };
};

W["mfg-pm-due"] = (c): WList | null => {
  if (!on(c, "mfg-equipment")) return null;
  const end = weekEnd(c.today);
  const eq = indexBy(ls(c, "equipment"));
  // 개발 담당은 금형·지그 항목만(03 문서 10절). 나머지는 설비 전체
  const devOnly = c.persona.unitId === "U_DEV";
  const rows = ls(c, "pm_plans")
    .filter((p) => p.next_due_on <= end && (!devOnly || /금형|지그/.test(p.task)))
    .sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  if (!rows.length) return null;
  const late = rows.filter((p) => p.next_due_on < c.today).length;
  return {
    count: rows.length, unit: "건", label: devOnly ? "이번 주 금형·지그 보전" : "이번 주 보전", note: late ? `지난 보전 ${late}건이 있어요` : null,
    rows: rows.slice(0, 5).map((p) => ({ id: p.id, title: subOf(eq.get(p.equipment_id)?.equipment_no, p.task), subtitle: p.cycle, dday: { date: p.next_due_on, noun: "보전" }, to: "/ops/equipment?tab=pm" })),
  };
};

W["mfg-legal-calendar"] = (c): WList | null => {
  const rows: (WRow & { due: string })[] = [];
  if (on(c, "safety-health")) {
    for (const l of ls(c, "legal_calendar_items")) {
      if (l.status === "done") continue;
      rows.push({ id: l.id, due: l.due_on, title: l.title, subtitle: subOf(labelOf("legal_calendar_items.kind", l.kind), firstLine(l.basis, 30)), dday: { date: l.due_on }, to: "/company/safety" });
    }
  }
  if (on(c, "mfg-equipment")) {
    const eq = indexBy(ls(c, "equipment"));
    for (const li of ls(c, "legal_inspections")) {
      if (li.done_on || li.result !== "scheduled") continue;
      rows.push({ id: li.id, due: li.due_on, title: subOf(eq.get(li.equipment_id)?.equipment_no, li.kind), subtitle: "설비 법정 검사", dday: { date: li.due_on }, to: "/ops/equipment" });
    }
  }
  if (!rows.length) return null;
  rows.sort((a, b) => a.due.localeCompare(b.due));
  return { count: rows.length, unit: "건", label: "다가오는 법정 일정", rows: rows.slice(0, 4).map(({ due: _d, ...r }) => r) };
};

W["mfg-monthly-summary"] = (c): MonthlySummary | null => {
  const prod = kpiSeries(c, "K_PROD_QTY");
  const k01 = kpiSeries(c, "K01");
  const k06 = kpiSeries(c, "K06");
  const last = prod.values.slice(-3);
  if (!last.length && !k01.values.length) return null;
  const a = k01.values[k01.values.length - 1];
  const ap = k01.values[k01.values.length - 2];
  const p = k06.values[k06.values.length - 1];
  return {
    bars: last.map((v) => ({ key: v.period, label: formatMonth(v.period), value: v.value })),
    highlightKey: last[last.length - 1]?.period ?? null,
    unit: "개",
    achievement: a ? { label: `생산계획 달성률(${formatMonth(a.period)})`, value: a.value, unit: "%", delta: ap ? { value: Math.round((a.value - ap.value) * 10) / 10, unit: "%p", period: "지난달보다", goodWhen: "up" } : null } : null,
    // PPM은 낮을수록 좋아요: 목표와의 차이를 말로(‘목표 위’처럼 좋게 읽힐 수 있는 표현 대신)
    ppmSentence: p ? (() => {
      const target = k06.kpi?.target ?? 10;
      const gap = p.value - target;
      return gap >= 0
        ? `${formatMonth(p.period)} 고객 PPM은 ${formatNumber(p.value)}이에요. 목표(${formatNumber(target)} 미만)보다 ${formatNumber(gap)} 높아요.`
        : `${formatMonth(p.period)} 고객 PPM은 ${formatNumber(p.value)}이에요. 목표(${formatNumber(target)} 미만)를 지켰어요.`;
    })() : null,
  };
};

W["mfg-order-backlog"] = (c): OrderBacklog | null => {
  if (!on(c, "mfg-orders")) return null;
  const open = ls(c, "sales_order_lines").filter((l) => !["shipped", "closed", "canceled"].includes(l.status) && l.qty - (l.shipped_qty ?? 0) > 0);
  if (!open.length) return null;
  const items = itemsIndex(c);
  const byItem = new Map<string, number>();
  for (const l of open) byItem.set(l.item_id, (byItem.get(l.item_id) ?? 0) + (l.qty - (l.shipped_qty ?? 0)));
  const top: WRow[] = [...byItem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, rem]) => {
    const it = items.get(id);
    return { id, title: it?.name ?? "품목", subtitle: it?.item_no, trailingText: `${formatNumber(rem)}${it?.unit ?? "개"}`, to: "/ops/orders" };
  });
  const end = weekEnd(c.today);
  const next = addDays(end, 7);
  const segments: WSeg[] = [
    { key: "this", label: "이번 주(지난 납기 포함)", value: open.filter((l) => l.due_date <= end).length, slot: 1 },
    { key: "next", label: "다음 주", value: open.filter((l) => l.due_date > end && l.due_date <= next).length, slot: 2 },
    { key: "later", label: "그 뒤", value: open.filter((l) => l.due_date > next).length, slot: 3 },
  ];
  return { top, segments, openLines: open.length };
};

W["mfg-field-feed"] = (c): WList | null => {
  if (!on(c, "mfg-quality")) return null;
  const today = ls(c, "field_reports").filter((f) => toKstDate(f.reported_at) === c.today).sort((a, b) => b.reported_at.localeCompare(a.reported_at));
  if (!today.length) return null;
  const unassigned = today.filter((f) => f.status === "new").length;
  return {
    count: today.length, unit: "건", label: "오늘 현장 등록", note: unassigned ? `담당 미배정 ${unassigned}건이 있어요` : "모두 담당이 정해졌어요",
    rows: today.slice(0, 5).map((f) => ({
      id: f.id, title: firstLine(f.note, 40), subtitle: subOf(labelOf("field_reports.kind", f.kind), f.anonymous || !f.reported_by ? "익명" : personName(c, f.reported_by), formatRelative(f.reported_at, nowOf(c))),
      status: st("field_reports.status", f.status), to: `/ops/report?tab=feed&selected=${f.id}`,
    })),
  };
};

W["mfg-dev-projects"] = (c): WList | null => {
  if (!on(c, "business-structure")) return null;
  const line = ls(c, "business_lines").find((l) => l.id === "bl-tr-dev" || l.code === "DEV");
  if (!line) return null;
  const projects = ls(c, "projects", [{ field: "business_line_id", operator: "eq", value: line.id }]).filter((p) => p.status !== "done").sort((a, b) => a.due_on.localeCompare(b.due_on));
  if (!projects.length) return null;
  return {
    count: projects.length, unit: "건", label: "진행 중 개발 과제",
    rows: projects.slice(0, 5).map((p) => ({ id: p.id, title: p.name, subtitle: subOf(labelOf("projects.status", p.status), `담당 ${personName(c, p.owner_member_id)}`), status: st("projects.health", p.health), dday: { date: p.due_on }, to: `/projects/${p.id}` })),
  };
};

W["mfg-material-price"] = (c): MaterialPrice | null => {
  if (!on(c, "mfg-materials")) return null;
  const rows = ls(c, "price_indexes");
  if (!rows.length) return null;
  const by = new Map<string, typeof rows>();
  for (const r of rows) by.set(r.material, [...(by.get(r.material) ?? []), r]);
  return {
    rows: [...by.entries()].map(([material, list]) => {
      const s = list.sort((a, b) => a.period.localeCompare(b.period)).slice(-6);
      const last = s[s.length - 1]!;
      const prev = s[s.length - 2];
      return { material, unit: last.unit, latest: last.value, values: s.map((x) => x.value), changePct: prev && prev.value ? Math.round(((last.value - prev.value) / prev.value) * 1000) / 10 : null, period: last.period };
    }).slice(0, 4),
  };
};

// 자리만 있는 위젯(모듈이 꺼져 있거나 화면이 직접 그림)
W["attendance-today"] = () => null;
W["mfg-field-report"] = () => ({ ok: true });
W["ara-card"] = () => null;
W["greeting"] = homeToday;

const sel: Record<string, SelectorHandler> = {
  "home.today": homeToday,
  "home.rail": homeRail,
  search: searchSel,
  ...Object.fromEntries(Object.entries(W).map(([id, h]) => [`widget.${id}`, h])),
};

export default defineGroup({ group: "home", seed, rpc, sel });
