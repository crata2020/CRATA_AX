// work 그룹이 함께 쓰는 도우미(소유: work 그룹). 같은 그룹 폴더(work-list·work-board·work-review·project-detail·meetings …)만 import합니다.
// 범위(scope)·마감 필터, 설명/완료 기준 나누기, 회의 분류 라벨, 권한 판단을 한곳에 둡니다.
import { useMemo } from "react";
import type { CrudFilter } from "@refinedev/core";
import { useWorksite } from "@/app/TenantBoundary";
import { addDays, kstIso, daysBetween, toKstDate } from "@/lib/clock";
import { useUrlParam } from "@/lib/url";
import { useList } from "@/lib/refine";
import type { BusinessLine, Project, Task, Meeting } from "@/types/entities";

/** 설명 안의 완료 기준 줄 머리말(시드·만들기 서랍이 같은 형식으로 저장) */
export const CRITERIA_PREFIX = "완료 기준: ";

/** "본문\n완료 기준: a · b" → { body, criteria[] } */
export function splitDescription(desc: string | null | undefined): { body: string; criteria: string[] } {
  if (!desc) return { body: "", criteria: [] };
  const lines = desc.split("\n");
  const critLine = lines.find((l) => l.startsWith(CRITERIA_PREFIX));
  const body = lines.filter((l) => l !== critLine).join("\n").trim();
  // " · "(띄어 쓴 가운뎃점)으로 나눕니다. 띄어 쓴 것이 없으면 붙여 쓴 "·"로 나눕니다("일정·장소 안내"처럼 낱말 안 가운뎃점은 살림)
  const raw = critLine ? critLine.slice(CRITERIA_PREFIX.length) : "";
  const criteria = (raw.includes(" · ") ? raw.split(" · ") : raw.split("·")).map((s) => s.trim()).filter(Boolean);
  return { body, criteria };
}

export function joinDescription(body: string, criteria: string): string | null {
  const b = body.trim();
  const c = criteria.trim();
  if (!b && !c) return null;
  return c ? `${b}${b ? "\n" : ""}${CRITERIA_PREFIX}${c}` : b;
}

// ───────── 범위(내 업무 · 내가 검토 · 회사 전체)
export type Scope = "mine" | "review" | "all";
export const SCOPE_LABEL: Record<Scope, string> = { mine: "내 업무", review: "내가 검토", all: "회사 전체" };

/** 역할별로 고를 수 있는 범위와 URL ?scope= 값. member는 늘 mine */
export function useScope() {
  const { persona } = useWorksite();
  const options: Scope[] = persona.role === "member" ? ["mine"] : persona.role === "reviewer" ? ["mine", "review"] : ["mine", "review", "all"];
  const [raw] = useUrlParam("scope", "mine");
  const scope: Scope = (options as string[]).includes(raw) ? (raw as Scope) : "mine";
  const filters = useMemo<CrudFilter[]>(() => {
    if (scope === "mine") return [{ field: "assignee_id", operator: "eq", value: persona.memberId }];
    if (scope === "review") return [{ field: "reviewer_id", operator: "eq", value: persona.memberId }];
    return [];
  }, [scope, persona.memberId]);
  return { scope, options, filters, canChoose: options.length > 1 };
}

// ───────── 마감 필터(오늘 · 이번 주 · 지난 마감)
export type DueFilter = "today" | "week" | "overdue";
export const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: "today", label: "오늘" }, { value: "week", label: "이번 주" }, { value: "overdue", label: "기한 지남" },
];

/** 이번 주 일요일까지 남은 날(월요일 시작 주) */
function daysToSunday(today: string): number {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  return dow === 0 ? 0 : 7 - dow;
}

export function dueFilters(due: string, today: string): CrudFilter[] {
  const start = kstIso(today, "00:00");
  if (due === "today") return [{ field: "due_at", operator: "gte", value: start }, { field: "due_at", operator: "lt", value: kstIso(addDays(today, 1), "00:00") }];
  if (due === "week") return [{ field: "due_at", operator: "gte", value: start }, { field: "due_at", operator: "lt", value: kstIso(addDays(today, daysToSunday(today) + 1), "00:00") }];
  if (due === "overdue") return [{ field: "due_at", operator: "lt", value: start }, { field: "status", operator: "nin", value: ["done", "canceled"] }];
  return [];
}

export const OPEN_STATUSES = ["todo", "in_progress", "submitted", "changes_requested"] as const;
export const isOpen = (t: Pick<Task, "status">) => (OPEN_STATUSES as readonly string[]).includes(t.status);

/** 모바일 목록 오른쪽: 태그를 세로로 쌓아 제목 자리를 넓힘 */
export const STACK_STYLE = { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 } as const;

/** 업무 마감이 오늘인지 */
export const isDueToday = (t: Pick<Task, "due_at" | "status">, today: string) => !!t.due_at && isOpen(t) && daysBetween(today, toKstDate(t.due_at)) === 0;

// ───────── 권한 판단(버튼 숨기기·끄기용. 실제 막기는 공급자·rpc가 함)
export function useWorkPermissions() {
  const { persona, can, role } = useWorksite();
  const adminish = persona.role === "owner" || persona.role === "admin";
  const reviewerPlus = persona.role !== "member";
  return {
    me: persona.memberId,
    adminish,
    reviewerPlus,
    /** 이 업무의 제출을 승인할 수 있는지(내가 담당인 업무는 소유자·관리자여도 못 함 — 지정 검토자가 승인) */
    canReviewTask: (t: Pick<Task, "reviewer_id" | "assignee_id"> | null | undefined) =>
      !!t && reviewerPlus && t.assignee_id !== persona.memberId && (adminish || t.reviewer_id === persona.memberId),
    /** 승인하지 못하는 이유(버튼 툴팁) */
    reviewBlockReason: (t: Pick<Task, "reviewer_id" | "assignee_id"> | null | undefined): string => {
      if (!reviewerPlus) return "완료는 검토자가 승인하면 바뀌어요";
      if (t && t.assignee_id === persona.memberId) return "내 제출은 지정된 검토자가 승인해요";
      return "이 업무의 검토자가 승인할 수 있어요";
    },
    /** 지정 검토자가 아닌 소유자·관리자의 승인(대신 승인) */
    isSubstituteReview: (t: Pick<Task, "reviewer_id" | "assignee_id"> | null | undefined) => !!t && adminish && t.reviewer_id !== persona.memberId && t.assignee_id !== persona.memberId,
    /** 업무 만들기(검토자 이상) */
    canCreateTask: reviewerPlus && can("tasks", "create").can,
    /** 회의 분류·결정·액션 확정(검토자 이상) */
    canReviewMeetings: can("meetings", "approve").can,
    /** 결정 확정: 검토자 이상 + 결정 역할이 정해져 있으면 그 역할(또는 owner·admin)만. 못 하면 이유 문장 */
    decisionConfirm: (d: { decided_by_role: string | null }): { can: boolean; reason?: string } => {
      if (!can("meetings", "approve").can) return { can: false };
      if (!d.decided_by_role || adminish || role.title === d.decided_by_role) return { can: true };
      return { can: false, reason: `${d.decided_by_role} 확인이 필요해요` };
    },
  };
}

// ───────── 참조 데이터(사업·프로젝트) 한 번에 읽기
export function useStructure() {
  const lines = useList<BusinessLine>({ resource: "business_lines", pagination: { mode: "off" }, sorters: [{ field: "sort_order", order: "asc" }] });
  const projects = useList<Project>({ resource: "projects", pagination: { mode: "off" }, sorters: [{ field: "code", order: "asc" }] });
  return useMemo(() => {
    const lineList = lines.result?.data ?? [];
    const projectList = projects.result?.data ?? [];
    return {
      isLoading: lines.query.isLoading || projects.query.isLoading,
      isError: lines.query.isError || projects.query.isError,
      lines: lineList,
      projects: projectList,
      lineById: new Map(lineList.map((l) => [l.id, l])),
      lineByCode: new Map(lineList.map((l) => [l.code, l])),
      projectById: new Map(projectList.map((p) => [p.id, p])),
      projectByCode: new Map(projectList.map((p) => [p.code, p])),
    };
  }, [lines.result, projects.result, lines.query.isLoading, projects.query.isLoading, lines.query.isError, projects.query.isError]);
}

// ───────── 회의
/** "[강의] 예시기업 …" → "예시기업 …"(접두어는 태그로 따로 보여 줌) */
export function meetingTitle(m: Pick<Meeting, "title" | "title_prefix">): string {
  if (m.title_prefix && m.title.startsWith(m.title_prefix)) return m.title.slice(m.title_prefix.length).trim();
  return m.title;
}

/** CRATA 회의 분류 체계 v0.2 업무 유형(config/meeting_taxonomy.yaml). TR은 자유 입력 글자를 그대로 씁니다 */
export const TASK_TYPES: Record<string, { code: string; name: string }[]> = {
  EDU: [
    { code: "EDU.inquiry", name: "문의·수요 발굴" }, { code: "EDU.proposal", name: "제안·견적" }, { code: "EDU.needs", name: "사전진단·요구분석" },
    { code: "EDU.curriculum", name: "커리큘럼 설계" }, { code: "EDU.materials", name: "교안·실습자료" }, { code: "EDU.instructor", name: "강사 배정·강사교육" },
    { code: "EDU.ops", name: "운영·일정·장소" }, { code: "EDU.review", name: "만족도·사후 리뷰" }, { code: "EDU.billing", name: "정산·계산서" }, { code: "EDU.followup", name: "후속 제안" },
  ],
  SSI: [
    { code: "SSI.law", name: "법령·지침 해석" }, { code: "SSI.agency", name: "기관 협의" }, { code: "SSI.system", name: "체계 구축 컨설팅" },
    { code: "SSI.training", name: "연수" }, { code: "SSI.diagnosis", name: "진단도구 적용" }, { code: "SSI.forms", name: "서식·매뉴얼·도구 개발" },
    { code: "SSI.procurement", name: "입찰·조달" }, { code: "SSI.report", name: "성과보고" },
  ],
  ARA: [
    { code: "ARA.prd", name: "제품기획·요구사항" }, { code: "ARA.prompt", name: "대화·프롬프트 설계" }, { code: "ARA.data", name: "데이터모델" },
    { code: "ARA.ux", name: "UX·UI" }, { code: "ARA.backend", name: "백엔드·인프라" }, { code: "ARA.safety", name: "안전장치" }, { code: "ARA.privacy", name: "개인정보·보안" },
    { code: "ARA.eval", name: "평가·QA" }, { code: "ARA.release", name: "배포" }, { code: "ARA.bm", name: "요금제" }, { code: "ARA.feedback", name: "사용자 피드백" }, { code: "ARA.pilot", name: "기관 파일럿" },
  ],
  CORE: [
    { code: "CORE.sales", name: "영업·파이프라인" }, { code: "CORE.finance", name: "경영·재무" }, { code: "CORE.hr", name: "채용·인사" },
    { code: "CORE.marketing", name: "마케팅·브랜딩" }, { code: "CORE.partnership", name: "파트너십" }, { code: "CORE.legal", name: "법무·개인정보" },
    { code: "CORE.gov", name: "정부지원사업" }, { code: "CORE.ops", name: "운영·총무" }, { code: "CORE.internal_ax", name: "사내 AX" },
  ],
};
/** TR(제조) 업무 유형 예시(자유 입력 제안 목록) */
export const FREE_TASK_TYPES = ["생산 계획", "납기 대응", "설비 이상", "설비 보전", "품질 지표", "검사 기준", "클레임 대응", "4M 변경", "자재·구매", "계측기", "안전 점검", "파일럿 준비"];

const TYPE_NAME = new Map(Object.values(TASK_TYPES).flat().map((t) => [t.code, t.name]));
/** 업무 유형 코드 → 화면 글자(코드가 아니면 그대로) */
export const taskTypeLabel = (code: string | null | undefined) => (code ? TYPE_NAME.get(code) ?? code : "—");

/** 구간 신뢰도 표시(02 문서 신뢰도 게이트): 자동 분류 / 확인 필요 / 미분류 */
export function confidenceInfo(conf: number, status: string): { tone: "info" | "warning" | "neutral"; label: string } {
  if (status === "unclassified" || conf < 0.6) return { tone: "neutral", label: "미분류" };
  if (conf >= 0.85 && status === "auto") return { tone: "info", label: "자동 분류" };
  if (conf >= 0.85) return { tone: "info", label: "자동 분류" };
  return { tone: "warning", label: "확인 필요" };
}

/** 신뢰도(0~1) → "68%" */
export const formatConf = (c: number) => `${Math.round(c * 100)}%`;

/** 녹음 안 위치(초) → "녹음 22분–33분". 회의 날짜 옆에 붙어도 시계 시각(22:00)으로 읽히지 않게 */
export function formatSegRange(startSec: number, endSec: number): string {
  const a = Math.floor(startSec / 60);
  const b = Math.max(a + 1, Math.round(endSec / 60));
  return `녹음 ${a}분–${b}분`;
}

/** 회의 접두어 선택지(분류 체계 v0.2 6종). 제조 테넌트는 회사 정례 회의에 접두어 없이도 둡니다 */
export const MEETING_PREFIXES = ["[강의]", "[학맞통]", "[아라]", "[AX]", "[공통]", "[혼합]"];
export const MFG_MEETING_PREFIXES = ["[AX]", "[공통]"];
