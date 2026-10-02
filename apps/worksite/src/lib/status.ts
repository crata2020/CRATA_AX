// 공통 enum의 화면 글자와 tone(빌드 스펙 5.7절 표 그대로). 그룹은 상태 글자를 여기서만 가져옵니다.
// 쓰는 법: <StatusTag {...statusOf("tasks.status", row.status)} />  ·  labelOf("tasks.source", row.source)
import type { Tone } from "@/theme/tokens";

type Def = readonly [label: string, tone?: Tone];

export const STATUS = {
  "tasks.status": { todo: ["할 일", "neutral"], in_progress: ["진행 중", "info"], submitted: ["검토 대기", "info"], changes_requested: ["수정 요청", "serious"], done: ["완료", "good"], canceled: ["취소", "neutral"] },
  "tasks.priority": { high: ["높음"], normal: ["보통"], low: ["낮음"] },
  "tasks.source": { manual: ["직접"], meeting: ["회의"], mail: ["메일"], field_report: ["현장 등록"], claim: ["클레임"], rule: ["배분 규칙"] },
  "submissions.status": { submitted: ["검토 대기", "info"], approved: ["승인됨", "good"], rejected: ["수정 요청", "serious"] },
  via: { web: ["웹"], ai_connection: ["AI 연결"], system: ["시스템"] },
  "projects.status": { planned: ["준비", "neutral"], active: ["진행", "info"], on_hold: ["보류", "warning"], done: ["완료", "good"] },
  "projects.health": { good: ["정상", "good"], warning: ["주의", "warning"], critical: ["위험", "critical"] },
  sensitivity: { L0: ["공개"], L1: ["내부"], L2: ["고객 비밀"] },
  "meetings.status": { scheduled: ["예정", "neutral"], needs_review: ["확인 필요", "warning"], confirmed: ["분류 확인 완료", "good"] },
  "meetings.meeting_type": { client_meeting: ["고객 미팅"], agency_consult: ["기관 협의"], planning: ["기획·브레인스토밍"], internal_regular: ["내부 정기회의"], review: ["리뷰·회고"], one_on_one: ["1대1 면담"], lecture_rehearsal: ["강의 리허설"], production: ["생산회의"], quality: ["품질회의"], other: ["기타"] },
  "meeting_segments.review_status": { auto: ["자동 분류", "info"], pending: ["확인 필요", "warning"], confirmed: ["확인됨", "good"], corrected: ["고침", "good"], unclassified: ["미분류", "neutral"] },
  "decisions.status": { proposed: ["결정 제안", "info"], confirmed: ["확정", "good"], superseded: ["바뀜", "neutral"] },
  "action_proposals.status": { proposed: ["액션 제안", "info"], accepted: ["업무로 만듦", "good"], dismissed: ["안 만듦", "neutral"] },
  "artifacts.status": { draft: ["작성 중", "neutral"], in_review: ["검토 중", "info"], final: ["최종", "good"], archived: ["보관", "neutral"] },
  "artifacts.doc_type": { proposal: ["제안서"], curriculum: ["교안"], result_report: ["결과보고서"], quote: ["견적서"], minutes: ["회의록"], report_8d: ["8D 보고서"], outgoing_cert: ["출하 검사성적서"], daily_production: ["생산일보"], request_4m: ["4M 변경 신청서"], monthly_quality: ["월 품질 리포트"] },
  "artifact_versions.kind": { ai_draft: ["AI 초안"], draft: ["초안"], revision: ["수정본"], final: ["최종본"] },
  "templates.status": { draft: ["초안", "neutral"], active: ["사용 중", "good"], retired: ["사용 안 함", "neutral"] },
  "corrections.status": { new: ["새 수정"], grouped: ["후보에 묶임"], promoted: ["규칙이 됨"], dismissed: ["이번만"] },
  "corrections.scope": { template: ["양식"], writing_rule: ["작성 규칙"], one_off: ["이번 문서만"] },
  "rules.status": { candidate: ["승인 대기", "warning"], active: ["적용 중", "good"], paused: ["멈춤", "neutral"], rejected: ["반려", "neutral"], expired: ["만료", "neutral"], superseded: ["바뀜", "neutral"] },
  "knowledge_items.kind": { decision: ["결정"], policy: ["규정"], manual: ["매뉴얼"], faq: ["FAQ"], reference: ["참고"] },
  "knowledge_items.status": { draft: ["초안", "neutral"], verified: ["검증됨", "good"], review_due: ["재검토 필요", "warning"], archived: ["보관", "neutral"] },
  "notices.category": { general: ["일반"], policy: ["규정"], event: ["행사"], safety: ["안전"], system: ["시스템"] },
  "notifications.kind": { task_assigned: ["업무 배정"], review_requested: ["검토 요청"], submission_returned: ["수정 요청"], submission_approved: ["승인"], due_soon: ["마감 임박"], overdue: ["기한 지남"], notice_must_read: ["필독 공지"], meeting_review: ["회의 확인"], rule_candidate: ["규칙 후보"], field_report: ["현장 등록"], safety_due: ["안전 일정"], claim: ["클레임"], system: ["시스템"] },
  "calendar_events.kind": { meeting: ["회의"], due: ["마감"], delivery: ["납기"], inspection: ["검사·점검"], training: ["교육"], safety: ["안전"], company: ["회사"] },
  "calendar_events.visibility": { private: ["나만"], team: ["팀"], company: ["전체"] },
  "approval_links.status": { pending: ["진행 중", "info"], approved: ["승인", "good"], rejected: ["반려", "serious"], withdrawn: ["회수", "neutral"] },
  "partners.kind": { customer: ["고객사"], supplier: ["공급사"], vendor: ["외주처"], agency: ["기관"] },
  "partners.status": { active: ["거래 중", "good"], prospect: ["잠재", "info"], inactive: ["거래 없음", "neutral"] },
  "opportunities.stage": { inquiry: ["문의", "neutral"], needs: ["요구 확인", "neutral"], proposal: ["제안·견적", "neutral"], negotiation: ["협상", "neutral"], won: ["수주", "good"], lost: ["실패·보류", "neutral"] },
  "quotes.status": { draft: ["작성 중", "neutral"], sent: ["발송", "info"], accepted: ["수주", "good"], rejected: ["실패", "neutral"], expired: ["만료", "neutral"] },
  "field_reports.kind": { defect: ["불량"], equipment: ["설비 이상"], near_miss: ["아차사고"], other: ["기타"] },
  "field_reports.status": { new: ["미배정", "warning"], assigned: ["배정됨", "info"], in_action: ["조치 중", "info"], done: ["조치 완료", "good"] },
  "sales_orders.status": { open: ["진행", "info"], partially_shipped: ["일부 출하", "info"], shipped: ["출하 완료", "good"], closed: ["마감", "neutral"], canceled: ["취소", "neutral"], late: ["지연", "critical"] },
  "shipments.status": { planned: ["출하 예정", "neutral"], inspected: ["출하검사 완료", "info"], shipped: ["출하", "good"], delivered: ["납품 확인", "good"] },
  "work_orders.status": { planned: ["계획", "neutral"], released: ["발행", "info"], in_progress: ["작업 중", "info"], done: ["완료", "good"], on_hold: ["보류", "warning"] },
  "equipment_run_logs.status": { running: ["가동", "good"], stopped: ["정지", "warning"], breakdown: ["고장", "critical"], setup: ["준비", "neutral"], none: ["기록 전", "neutral"] },
  "equipment.status": { active: ["사용", "good"], idle: ["대기", "neutral"], repair: ["수리 중", "warning"], retired: ["폐기", "neutral"] },
  "inspections.kind": { incoming: ["수입"], first: ["초물"], mid: ["중물"], last: ["종물"], outgoing: ["출하"], periodic: ["정기"] },
  "inspections.result": { pass: ["합격", "good"], fail: ["불합격", "critical"], hold: ["보류", "warning"] },
  "nonconformances.status": { open: ["등록", "warning"], dispositioned: ["처분 결정", "info"], closed: ["종결", "good"] },
  "nonconformances.disposition": { rework: ["재작업"], scrap: ["폐기"], sort: ["선별"], concession: ["특채"] },
  "customer_claims.status": { received: ["접수", "warning"], containment: ["임시 조치", "serious"], investigating: ["원인 조사", "serious"], countermeasure: ["대책", "info"], closed: ["종결", "good"] },
  "customer_claims.severity": { high: ["높음"], medium: ["보통"], low: ["낮음"] },
  "corrective_actions.step_status": { todo: ["할 일", "neutral"], doing: ["진행 중", "info"], done: ["완료", "good"] },
  "change_requests_4m.category": { man: ["사람"], machine: ["설비"], material: ["재료"], method: ["방법"] },
  "change_requests_4m.customer_approval_status": { not_required: ["불필요", "neutral"], requested: ["승인 요청", "warning"], approved: ["승인", "good"], rejected: ["반려", "serious"] },
  "change_requests_4m.status": { drafting: ["작성 중", "neutral"], in_review: ["검토 중", "info"], waiting_customer: ["고객 승인 대기", "warning"], effective: ["적용", "good"], closed: ["완료", "neutral"] },
  "breakdown_records.status": { open: ["고장", "critical"], repairing: ["수리 중", "warning"], repaired: ["수리 완료", "good"] },
  "legal_inspections.result": { scheduled: ["예정", "neutral"], pass: ["합격", "good"], fail: ["불합격", "critical"] },
  "stock_lots.status": { available: ["사용 가능", "good"], hold: ["보류", "warning"], consumed: ["소진", "neutral"] },
  "purchase_orders.status": { draft: ["초안", "neutral"], ordered: ["발주", "info"], partially_received: ["일부 입고", "info"], received: ["입고 완료", "good"] },
  "risk_assessments.kind": { initial: ["최초"], regular: ["정기"], ad_hoc: ["수시"] },
  "risk_assessments.risk_level": { high: ["상", "critical"], medium: ["중", "warning"], low: ["하", "neutral"] },
  "risk_assessments.status": { open: ["개선 필요", "warning"], in_progress: ["조치 중", "info"], done: ["이행 확인", "good"] },
  "near_miss_reports.status": { new: ["접수", "warning"], reviewing: ["검토 중", "info"], action: ["조치 중", "info"], closed: ["완료", "good"] },
  "semiannual_reviews.result": { pending: ["확인 전", "neutral"], ok: ["이상 없음", "good"], action_needed: ["조치 필요", "serious"], not_applicable: ["해당 없음", "neutral"] },
  "legal_calendar_items.kind": { semiannual_review: ["반기 점검"], risk_regular: ["위험성평가 정기"], safety_inspection: ["안전검사"], legal_training: ["법정 교육"], work_env: ["작업환경측정"], health_exam: ["특수건강진단"] },
  "legal_calendar_items.status": { upcoming: ["예정", "neutral"], done: ["완료", "good"], overdue: ["기한 지남", "critical"] },
  "members.status": { active: ["활성", "good"], invited: ["초대 중", "info"], inactive: ["비활성", "neutral"] },
  "invitations.status": { pending: ["대기", "info"], accepted: ["수락", "good"], expired: ["만료", "neutral"], canceled: ["취소", "neutral"] },
  "audit_events.actor_type": { member: ["구성원"], ai_connection: ["AI 연결"], system: ["시스템"], crata_operator: ["CRATA 운영자"] },
  "mcp_connections.client_name": { ChatGPT: ["ChatGPT"], Claude: ["Claude"], Codex: ["Codex"] },
  "work_style_cards.share_scope": { private: ["나만"], team: ["팀"], company: ["회사"] },
  platform_role: { owner: ["소유자"], admin: ["관리자"], reviewer: ["검토자"], member: ["구성원"] },
} as const satisfies Record<string, Record<string, Def>>;

export type StatusDomain = keyof typeof STATUS;
/** 도메인의 값 유니언. 예: StatusValue<"tasks.status"> = "todo" | "in_progress" | … */
export type StatusValue<D extends StatusDomain> = Extract<keyof (typeof STATUS)[D], string>;

export interface StatusInfo { tone: Tone; label: string }

/** 값 → { tone, label }. 모르는 값은 neutral + 값 그대로(개발 중 발견용 경고) */
export function statusOf<D extends StatusDomain>(domain: D, value: StatusValue<D> | string | null | undefined): StatusInfo {
  const table = STATUS[domain] as Record<string, Def>;
  const def = value != null ? table[value] : undefined;
  if (!def) {
    if (import.meta.env.DEV && value != null) console.warn(`[status] ${domain}에 없는 값: ${String(value)}`);
    return { tone: "neutral", label: value == null ? "—" : String(value) };
  }
  return { label: def[0], tone: def[1] ?? "neutral" };
}

/** 업무 상태 막대·보드 열 점의 색(홈 '팀 업무 현황', 프로젝트 상세 '업무 상태', 업무 보드가 함께 씀).
 *  순서 = 업무 흐름(할 일 → 진행 중 → 수정 요청 → 검토 대기 → 완료). 상태마다 색이 하나라 '진행 중'과 '검토 대기'가 같은 색이 되지 않아요.
 *  할 일 chart-muted(회색) · 진행 중 chart-progress(밝은 파랑 단계, 브랜드가 초록·청록이면 파랑으로 옮김) · 수정 요청 serious · 검토 대기 brand · 완료 good-fill(차분한 초록, 넓은 면이라 진한 good.mark 대신).
 *  validate_palette.js(라이트, 흰 바탕, 이 순서의 인접 쌍, 2026-10-02): TR CVD ΔE 19.1 · 일반 20.8 / CRATA CVD 16.3 · 일반 20.1 — 통과.
 *  (회색·브랜드는 범주색이 아닌 상태·중립 색이라 명도 띠·채도 검사는 대상이 아님. 늘 범례에 글자·값을 함께 적어요) */
export const TASK_STATUS_ORDER = ["todo", "in_progress", "changes_requested", "submitted", "done"] as const;
export const TASK_STATUS_COLOR: Record<(typeof TASK_STATUS_ORDER)[number] | "canceled", string> = {
  todo: "var(--ws-chart-muted)",
  in_progress: "var(--ws-chart-progress)",
  changes_requested: "var(--ws-serious-mark)",
  submitted: "var(--ws-brand)",
  done: "var(--ws-good-fill)",
  canceled: "var(--ws-chart-muted)",
};
/** 상태별 수 → StackedShareBar 조각(상태마다 고정 색) */
export function taskStatusSegments(count: (status: (typeof TASK_STATUS_ORDER)[number]) => number): { key: string; label: string; value: number; color: string }[] {
  return TASK_STATUS_ORDER.map((s) => ({ key: s, label: STATUS["tasks.status"][s][0], value: count(s), color: TASK_STATUS_COLOR[s] }));
}

/** 수주 줄 상태: '지연'은 아직 납기 전이면 "지연 예상(+3일)"(약속일 기준)으로 — 납기 전에 '지연'만 보이면 모순처럼 읽혀요 */
export function orderLineStatus(l: { status: string; due_date: string; promised_date: string | null }, today: string): StatusInfo {
  const base = statusOf("sales_orders.status", l.status);
  if (l.status !== "late" || l.due_date < today) return base;
  const days = l.promised_date ? Math.round((Date.parse(l.promised_date) - Date.parse(l.due_date)) / 86_400_000) : 0;
  return { ...base, label: days > 0 ? `지연 예상(+${days}일)` : "지연 예상" };
}

/** 글자만 */
export const labelOf = <D extends StatusDomain>(domain: D, value: StatusValue<D> | string | null | undefined) => statusOf(domain, value).label;

/** 필터 칩·선택칸 옵션 */
export function optionsOf<D extends StatusDomain>(domain: D): { value: StatusValue<D>; label: string }[] {
  return Object.entries(STATUS[domain] as Record<string, Def>).map(([value, def]) => ({ value: value as StatusValue<D>, label: def[0] }));
}
