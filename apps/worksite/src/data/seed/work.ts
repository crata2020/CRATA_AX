// work 그룹 시드(소유: work 그룹). 사업 구조 위의 업무·검토·회의 데이터를 만듭니다.
// 만들 리소스: GROUP_RESOURCES.work (tasks, progress_logs, submissions, meetings, meeting_segments, decisions, action_proposals, kpis·kpi_values의 CR_*)
// 앵커(정확한 id): ANCHORS.crata.task·submissionV1·submissionV2·meeting·decision·actionProposal, ANCHORS.tr.task·submission·meeting·decision·actionProposal
// 양·내용: 빌드 스펙 6.4절 work 표 · 지표 값 6.5절(CR_*)
// rpc: submit_task · approve_submission · request_changes · accept_action_proposal · confirm_segment (5.8절) + create_task(업무 만들기 + 담당자 알림)
//
// 데이터 원칙(6.1절): 사람은 TenantConfig의 가상 인물만, 거래처는 '예시…'만. TR은 공개 자료의 공정(편조·크림핑·프레스 성형·스파이럴링)·
// 설비 종류·제품 범주만 사실로 쓰고, 수량·불량·날짜·사람·회의 내용은 모두 지어낸 예시입니다. CRATA 학맞통 행에는 학생 정보가 없습니다.
// 날짜는 데모 '오늘'(기본 2026-09-30)에서 거꾸로 계산합니다(ctx.d / ctx.at).
import type { RowOf, SeedRow } from "@/types/entities";
import type { StatusValue } from "@/lib/status";
import type { Rng } from "@/lib/rng";
import { isOffDay } from "@/lib/clock";
import { defineGroup, type ActionContext, type SeedContext, type SeedOutput, type RpcHandler, type SelectorHandler } from "./types";

type TaskStatus = StatusValue<"tasks.status">;
type TaskSource = StatusValue<"tasks.source">;
type Sens = "L0" | "L1" | "L2";
type Row<R extends Parameters<SeedContext["get"]>[0]> = SeedRow<RowOf<R>>;

/** 업무 정의: [번호, 제목, 프로젝트 id, 파트 id, 담당, 검토자, 상태, 마감(오늘+n일), 옵션] */
interface TaskOpts {
  pr?: "high" | "normal" | "low";
  src?: TaskSource;
  ref?: string;
  type?: string;
  est?: number;
  /** 설명(한두 문장). 완료 기준은 crit */
  desc?: string;
  /** 완료 기준(가운뎃점으로 나눔) */
  crit?: string;
  /** 만든 날(오늘+n일) */
  c?: number;
  /** 만든 시각(기본 09:00) */
  ct?: string;
  /** 만든 사람(기본 검토자) — 현장 등록에서 온 업무는 그 등록을 맡은 사람 */
  cby?: string;
  /** 완료·취소된 날(오늘+n일) */
  end?: number;
  time?: string;
  sens?: Sens;
}
type TaskDef = [n: number, title: string, project: string, part: string | null, assignee: string, reviewer: string, status: TaskStatus, due: number, opts?: TaskOpts];

/** 제출 정의 */
interface SubDef {
  id?: string;
  task: number;
  v: number;
  status: StatusValue<"submissions.status">;
  /** 제출 시각 [오늘+n일, "HH:mm"] */
  at: [number, string];
  /** AI 연결 클라이언트(없으면 웹) */
  ai?: string;
  summary: string;
  comment?: string;
  reviewedAt?: [number, string];
  artifact?: string;
}

/** 회의 정의 */
interface MeetingDef {
  id: string;
  title: string;
  prefix: string | null;
  type: StatusValue<"meetings.meeting_type">;
  projects: string[];
  at: [number, string];
  min: number;
  who: string[];
  status: StatusValue<"meetings.status">;
  sens?: Sens;
  source?: "plaud" | "clova" | "manual" | "other";
  summary: string | null;
}
/** 구간: [시작 분, 끝 분, 사업 코드, 프로젝트 코드, 업무 유형, 신뢰도, 근거 발화, 상태] */
type SegDef = [from: number, to: number, bl: string | null, prj: string | null, type: string | null, conf: number, quote: string, status: StatusValue<"meeting_segments.review_status">];
/** 결정: [id 번호, 회의, 프로젝트, 문장, 결정 역할, [오늘+n일, 시각], 상태, 바꾼 결정 번호] */
type DecDef = [n: number, meeting: string, project: string | null, statement: string, role: string, at: [number, string], status: StatusValue<"decisions.status">, supersedes?: number];
/** 액션 제안: [번호, 회의, 제목, 제안 담당, 제안 마감(오늘+n일), 상태, 만든 업무 번호] */
type ApDef = [n: number, meeting: string, title: string, assignee: string, due: number, status: StatusValue<"action_proposals.status">, task?: number];

const pad = (n: number, w = 3) => String(n).padStart(w, "0");
const DEFAULT_CRIT = "결과물을 제출하고 검토자가 승인하면 끝나요";

// ─────────────────────────────────────────────── CRATA(crata-demo)
const CEO = "m-cr-ceo", OPS = "m-cr-ops", EL = "m-cr-edu-lead", E1 = "m-cr-edu-1", SL = "m-cr-ssi-lead", AL = "m-cr-ara-lead", A1 = "m-cr-ara-1";
const CR_AI: Record<string, string> = { [EL]: "Claude", [E1]: "Claude", [A1]: "Codex", [AL]: "ChatGPT" };
const P = {
  eduA: "prj-cr-edu-a", eduB: "prj-cr-edu-b", eduC: "prj-cr-edu-content", ssiA: "prj-cr-ssi-a", ssiR: "prj-cr-ssi-research",
  araCore: "prj-cr-ara-core", araPipe: "prj-cr-ara-pipeline", coreGen: "prj-cr-core-general", coreAx: "prj-cr-core-ax",
};

const CR_TASKS: TaskDef[] = [
  // 검토 대기 6
  [1, "예시기업 특강 제안서 초안", P.eduA, "part-cr-edu-a-1", E1, EL, "submitted", 2, { pr: "high", type: "EDU.proposal", est: 6, c: -9,
    desc: "임원 대상 생성형 AI 특강 제안서 초안을 만들어요. 킥오프 미팅에서 정한 3시간·3모듈 구성을 따라요.",
    crit: "첫 장에 교육 목표 3줄 요약 · 실습 비중과 모듈 구성 표 · 일정·장소 안내" }],
  [2, "예시고 연수 2차시 교안 수정", P.eduB, "part-cr-edu-b-1", E1, EL, "submitted", 3, { type: "EDU.materials", est: 4, c: -7,
    desc: "2차시 교안 리뷰에서 나온 의견을 반영해 슬라이드를 고쳐요.", crit: "실습 예제 2개 추가 · 슬라이드 글자 크기 조정 · 수정한 쪽 목록" }],
  [3, "회의 분류 정확도 9월 주간 점검표", P.araPipe, "part-cr-pipe-1", AL, CEO, "submitted", 1, { type: "ARA.eval", est: 2, c: -6,
    desc: "9월 회의 자동 분류 결과를 주간 단위로 모아 정확도를 봐요.", crit: "주차별 정확도 표 · 자주 틀리는 구간 유형 3가지" }],
  [4, "아라 대화 흐름 첫 인사 문구 수정", P.araCore, "part-cr-ara-1", A1, AL, "submitted", 0, { type: "ARA.prompt", est: 3, c: -5, src: "meeting", ref: "ap-cr-10",
    desc: "스프린트 리뷰에서 정한 대로 첫 인사 문구를 두 문장 이내로 줄여요.", crit: "바꾼 문구 3안 · 기존 문구와 비교표" }],
  [5, "관리자 연수 커리큘럼 1차안", P.ssiA, "part-cr-ssi-a-1", SL, CEO, "submitted", 5, { type: "SSI.training", est: 8, c: -12,
    desc: "기관 협의에서 정한 2회차 구성으로 관리자 연수 커리큘럼 1차안을 만들어요.", crit: "회차별 학습 목표 · 차시 구성표 · 필요한 서식 목록" }],
  [6, "워크사이트 권한표 초안", P.coreAx, "part-cr-ax-1", OPS, CEO, "submitted", 2, { type: "CORE.internal_ax", est: 3, c: -12, src: "meeting", ref: "ap-cr-12",
    desc: "역할 4개(소유자·관리자·검토자·구성원)로 메뉴별 권한표를 만들어요.", crit: "메뉴 × 역할 표 · 예외 규칙 정리" }],
  // 수정 요청 3
  [7, "예시고 연수 사전 설문 문항", P.eduB, "part-cr-edu-b-2", E1, EL, "changes_requested", 1, { type: "EDU.needs", est: 2, c: -6, desc: "연수 전에 교사들의 AI 활용 수준을 묻는 설문 문항을 만들어요." }],
  [8, "아라 평가 세트 30문항 정리", P.araCore, "part-cr-ara-3", AL, CEO, "changes_requested", 3, { type: "ARA.eval", est: 5, c: -5, src: "meeting", ref: "ap-cr-09",
    desc: "응답 품질을 볼 평가 세트를 30문항으로 맞춰요.", crit: "30문항 목록 · 문항별 평가 기준 한 줄" }],
  [9, "학맞통 시행령 개정 요약", P.ssiR, "part-cr-ssi-r-1", SL, CEO, "changes_requested", -1, { type: "SSI.law", est: 3, c: -9, src: "meeting", ref: "ap-cr-14",
    desc: "시행령에서 바뀐 부분을 기관 협의에 쓸 수 있게 요약해요.", crit: "바뀐 조문 표 · 조문 번호 · 기관 운영에 주는 영향" }],
  // 완료 13
  [10, "예시기업 특강 요구사항 정리", P.eduA, "part-cr-edu-a-1", E1, EL, "done", -14, { type: "EDU.needs", est: 3, c: -20, end: -5, src: "meeting", ref: "ap-cr-02" }],
  [11, "특강 장소·장비 확인", P.eduA, "part-cr-edu-a-2", E1, EL, "done", -3, { type: "EDU.ops", est: 1, c: -20, end: -2, src: "meeting", ref: "ap-cr-04" }],
  [12, "예시고 연수 1차시 교안", P.eduB, "part-cr-edu-b-1", E1, EL, "done", -9, { type: "EDU.materials", est: 6, c: -25, end: -8 }],
  [13, "표준 교안 생성형 AI 기초 개정", P.eduC, "part-cr-edu-c-1", EL, CEO, "done", -6, { type: "EDU.materials", est: 8, c: -15, end: -6 }],
  [14, "실습 예제 프롬프트 10종 정리", P.eduC, "part-cr-edu-c-2", E1, EL, "done", -12, { type: "EDU.materials", est: 4, c: -22, end: -12 }],
  [15, "학맞통 연수 강사 양성 과정 설계 메모", P.ssiR, "part-cr-ssi-r-2", SL, CEO, "done", -10, { type: "SSI.training", est: 3, c: -21, end: -9 }],
  [16, "아라 백엔드 모델 호출 비용 점검", P.araCore, "part-cr-ara-2", A1, AL, "done", -7, { type: "ARA.backend", est: 3, c: -16, end: -7 }],
  [17, "분류 체계 v0.2 반영", P.araPipe, "part-cr-pipe-1", AL, CEO, "done", -5, { type: "ARA.prd", est: 4, c: -14, end: -4 }],
  [18, "9월 비용 정리", P.coreGen, null, OPS, CEO, "done", -1, { type: "CORE.finance", est: 2, c: -8, end: -1 }],
  [19, "협업 도구 구독 정리", P.coreGen, null, OPS, CEO, "done", -13, { type: "CORE.ops", est: 1, c: -19, end: -13 }],
  [20, "워크사이트 메뉴 구성 확정", P.coreAx, "part-cr-ax-1", OPS, CEO, "done", -6, { type: "CORE.internal_ax", est: 2, c: -12, end: -5 }],
  [21, "예시재단 첫 통화 메모", P.coreGen, null, CEO, OPS, "done", -14, { type: "CORE.sales", est: 1, c: -16, end: -14, desc: "이전 도구에서 옮겨 온 완료 업무예요. 검토 이력은 없어요." }],
  [22, "10월 전사 회의 안건 정리", P.coreGen, null, CEO, OPS, "done", -2, { type: "CORE.ops", est: 1, c: -6, end: -2, desc: "이전 도구에서 옮겨 온 완료 업무예요. 검토 이력은 없어요." }],
  // 할 일 10
  [23, "특강 사전 과제 안내문", P.eduA, "part-cr-edu-a-2", E1, EL, "todo", 6, { type: "EDU.ops", est: 1, c: -2 }],
  [24, "특강 정산 서류 준비", P.eduA, "part-cr-edu-a-3", EL, CEO, "todo", 30, { type: "EDU.billing", est: 2, c: -3, pr: "low" }],
  [25, "예시고 연수 만족도 설문 준비", P.eduB, "part-cr-edu-b-2", E1, EL, "todo", 12, { type: "EDU.review", est: 2, c: -1 }],
  [26, "연수 서식 표준안 검토", P.ssiA, "part-cr-ssi-a-2", SL, CEO, "todo", 9, { type: "SSI.forms", est: 3, c: -2 }],
  [27, "아라 릴리스 체크리스트 갱신", P.araCore, "part-cr-ara-2", AL, CEO, "todo", 7, { type: "ARA.release", est: 2, c: -4 }],
  [28, "회의 분류 결과 알림 연동 설계", P.araPipe, "part-cr-pipe-2", AL, CEO, "todo", 10, { type: "ARA.backend", est: 5, c: -3 }],
  [29, "워크사이트 사용 교육 자료", P.coreAx, "part-cr-ax-2", OPS, CEO, "todo", 14, { type: "CORE.internal_ax", est: 4, c: -2 }],
  [30, "AI 바우처 공고 확인", P.coreGen, null, CEO, OPS, "todo", 5, { type: "CORE.gov", est: 1, c: -1 }],
  [31, "하반기 채용 조건 정리", P.coreGen, null, CEO, OPS, "todo", 20, { type: "CORE.hr", est: 2, c: -5, pr: "low" }],
  [32, "공통 교안 실습지 서식 정리", P.eduC, "part-cr-edu-c-2", EL, CEO, "todo", 8, { type: "EDU.materials", est: 2, c: -2 }],
  // 진행 중 14
  [33, "특강 교안 1차 슬라이드", P.eduA, "part-cr-edu-a-1", E1, EL, "in_progress", 4, { pr: "high", type: "EDU.materials", est: 8, c: -8,
    desc: "3모듈 구성에 맞춰 특강 교안 1차 슬라이드를 만들어요.", crit: "모듈별 슬라이드 · 실습 안내 쪽 · 발표자 메모" }],
  [34, "특강 보조 강사 배정", P.eduA, "part-cr-edu-a-2", EL, CEO, "in_progress", 0, { type: "EDU.instructor", est: 1, c: -20, src: "meeting", ref: "ap-cr-03" }],
  [35, "예시고 연수 2차시 실습지", P.eduB, "part-cr-edu-b-1", E1, EL, "in_progress", -2, { type: "EDU.materials", est: 3, c: -8, src: "meeting", ref: "ap-cr-05" }],
  [36, "교사 연수 일정 재조정 회신", P.eduB, "part-cr-edu-b-2", EL, CEO, "in_progress", 1, { type: "EDU.ops", est: 1, c: -2, src: "mail" }],
  [37, "관리자 연수 사전 설문 설계", P.ssiA, "part-cr-ssi-a-1", SL, CEO, "in_progress", 6, { type: "SSI.training", est: 3, c: -13, src: "meeting", ref: "ap-cr-07" }],
  [38, "학맞통 표준 서식 매뉴얼 목차", P.ssiR, "part-cr-ssi-r-2", SL, CEO, "in_progress", 11, { type: "SSI.forms", est: 4, c: -6 }],
  [39, "기관용 결과 화면 요구사항 정리", P.araCore, "part-cr-ara-1", AL, CEO, "in_progress", 3, { type: "ARA.prd", est: 4, c: -7 }],
  [40, "평가 기준 합의안", P.araCore, "part-cr-ara-3", AL, CEO, "in_progress", 0, { type: "ARA.eval", est: 2, c: -4 }],
  [41, "분류 신뢰도 기준 0.85 검증", P.araPipe, "part-cr-pipe-1", AL, CEO, "in_progress", 4, { type: "ARA.eval", est: 3, c: -7, src: "meeting", ref: "ap-cr-11" }],
  [42, "분기 비용 점검", P.coreGen, null, OPS, CEO, "in_progress", 2, { type: "CORE.finance", est: 2, c: -4 }],
  [43, "처리방침 국외이전 표 개정", P.coreGen, null, OPS, CEO, "in_progress", 8, { type: "CORE.legal", est: 3, c: -10 }],
  [44, "워크사이트 AI 연결 정책 안내문", P.coreAx, "part-cr-ax-2", OPS, CEO, "in_progress", 3, { type: "CORE.internal_ax", est: 2, c: -5 }],
  [45, "예시재단 워크숍 제안 방향 메모", P.coreGen, null, CEO, OPS, "in_progress", 1, { type: "CORE.sales", est: 1, c: -3 }],
  [46, "강의 만족도 결과 분석(8월)", P.eduC, "part-cr-edu-c-1", EL, CEO, "in_progress", 2, { type: "EDU.review", est: 2, c: -9 }],
  // 취소 2
  [47, "예시기업 오프라인 리허설 장소 섭외", P.eduA, "part-cr-edu-a-2", E1, EL, "canceled", 5, { type: "EDU.ops", c: -15, end: -10, desc: "리허설을 온라인으로 바꾸어 취소했어요." }],
  [48, "구 교안 템플릿 이관", P.eduC, "part-cr-edu-c-1", EL, CEO, "canceled", 10, { type: "EDU.materials", c: -20, end: -11, desc: "새 표준 교안으로 대신해서 취소했어요." }],
];

const CR_SUBS: SubDef[] = [
  // v1은 추석 연휴(9/24~26) 전 9/23에 제출 → 연휴 뒤 9/28 아침에 수정 요청(산출물 v1 9/23 17:30 · v2 9/28 10:10과 같은 흐름)
  { id: "sub-cr-001", task: 1, v: 1, status: "rejected", at: [-7, "17:40"], summary: "제안서 초안 1차예요. 과정 구성과 일정을 담았어요.", comment: "첫 장에 교육 목표를 3줄로 요약해 주세요", reviewedAt: [-2, "09:10"], artifact: "art-cr-001" },
  { id: "sub-cr-002", task: 1, v: 2, status: "submitted", at: [0, "08:40"], ai: "Claude", summary: "첫 장에 교육 목표 3줄 요약을 넣고, 실습 비중을 60%로 고쳤어요.", artifact: "art-cr-001" },
  { task: 2, v: 1, status: "submitted", at: [-1, "17:10"], ai: "Claude", summary: "실습 예제 2개를 더하고 슬라이드 글자 크기를 키웠어요. 바뀐 쪽은 7쪽이에요." },
  { task: 3, v: 1, status: "submitted", at: [0, "09:05"], summary: "9월 1~4주 정확도 표와 자주 틀리는 구간 유형 3가지를 정리했어요." },
  { task: 4, v: 1, status: "submitted", at: [-1, "18:20"], ai: "Codex", summary: "첫 인사 문구 3안과 기존 문구 비교표를 만들었어요." },
  { task: 5, v: 1, status: "submitted", at: [-2, "16:30"], summary: "2회차 구성의 커리큘럼 1차안이에요. 서식 목록도 붙였어요." },
  { task: 6, v: 1, status: "submitted", at: [-1, "11:00"], summary: "메뉴 × 역할 권한표 초안과 예외 규칙 4가지를 정리했어요." },
  { task: 7, v: 1, status: "rejected", at: [-3, "14:00"], ai: "Claude", summary: "설문 문항 15개 초안이에요.", comment: "문항 수를 10개 이내로 줄여 주세요", reviewedAt: [-2, "10:10"] },
  { task: 8, v: 1, status: "rejected", at: [-3, "16:40"], ai: "ChatGPT", summary: "평가 세트 30문항 목록이에요.", comment: "평가 기준 설명을 문항마다 한 줄씩 붙여 주세요", reviewedAt: [-2, "09:30"] },
  { task: 9, v: 1, status: "rejected", at: [-2, "13:20"], summary: "시행령 개정 사항 요약이에요.", comment: "조문 번호를 함께 적어 주세요", reviewedAt: [-1, "10:00"] },
  { task: 10, v: 1, status: "approved", at: [-6, "15:00"], ai: "Claude", summary: "요구사항 12가지를 대상·수준·목표로 나눠 정리했어요.", reviewedAt: [-5, "10:30"] },
  { task: 11, v: 1, status: "approved", at: [-3, "11:30"], summary: "교육장 좌석·프로젝터·와이파이를 확인했어요.", reviewedAt: [-2, "09:20"] },
  { task: 12, v: 1, status: "approved", at: [-9, "17:00"], summary: "1차시 교안 32쪽이에요.", reviewedAt: [-8, "11:00"] },
  { task: 13, v: 1, status: "approved", at: [-7, "15:30"], ai: "ChatGPT", summary: "생성형 AI 기초 표준 교안 개정본이에요. 바뀐 쪽 표를 붙였어요.", reviewedAt: [-6, "14:00"] },
  { task: 14, v: 1, status: "approved", at: [-13, "16:00"], summary: "실습용 프롬프트 예제 10종이에요.", reviewedAt: [-12, "10:00"] },
  { task: 15, v: 1, status: "approved", at: [-10, "14:10"], summary: "강사 양성 과정 설계 메모예요.", reviewedAt: [-9, "09:40"] },
  { task: 16, v: 1, status: "approved", at: [-8, "18:00"], summary: "모델 호출 비용 점검표예요. 지난달보다 줄었어요.", reviewedAt: [-7, "10:20"] },
  { task: 17, v: 1, status: "approved", at: [-5, "13:00"], summary: "분류 체계 v0.2 변경을 파이프라인에 반영했어요.", reviewedAt: [-4, "16:00"] },
  { task: 18, v: 1, status: "approved", at: [-2, "17:30"], summary: "9월 비용 정리표예요.", reviewedAt: [-1, "09:10"] },
  { task: 19, v: 1, status: "approved", at: [-14, "15:00"], summary: "협업 도구 구독 목록과 정리 결과예요.", reviewedAt: [-13, "10:00"] },
  { task: 20, v: 1, status: "approved", at: [-6, "16:20"], summary: "메뉴 9개 구성 확정안이에요.", reviewedAt: [-5, "11:10"] },
];

const CR_MEETINGS: MeetingDef[] = [
  { id: "mtg-cr-01", title: "[강의] 예시기업 특강 요구사항 미팅", prefix: "[강의]", type: "client_meeting", projects: [P.eduA], at: [-6, "14:00"], min: 52, who: [EL, E1, CEO], status: "needs_review", source: "plaud",
    summary: "고객사는 실습 위주의 3시간 특강을 원해요. 실습 비중을 60%로 올리고, 실습 예제 3종을 따로 준비하기로 했어요. 다음 분기 영업 이야기와 미분류 구간이 있어 확인이 필요해요." },
  { id: "mtg-cr-02", title: "[공통] 9월 5주 주간 회의", prefix: "[공통]", type: "internal_regular", projects: [P.coreGen, P.eduA, P.eduB, P.ssiR, P.araCore, P.araPipe, P.coreAx], at: [-2, "10:00"], min: 85, who: [CEO, OPS, EL, E1, SL, AL, A1], status: "needs_review", source: "plaud",
    summary: "사업별 진행 상황을 짧게 나눴어요. 여러 사업 이야기가 섞여 분류가 애매한 구간이 많아요. 배포 일정과 워크사이트 교육 일정을 정했어요." },
  { id: "mtg-cr-03", title: "[강의] 예시기업 특강 킥오프", prefix: "[강의]", type: "client_meeting", projects: [P.eduA], at: [-20, "15:00"], min: 40, who: [EL, E1, CEO], status: "confirmed", source: "plaud",
    summary: "임원 20명 정도 대상, 3시간 3모듈 과정으로 시작해요. 제안서는 다음 주 금요일까지 보내기로 했어요." },
  { id: "mtg-cr-04", title: "[강의] 예시고 교사 연수 2차시 교안 리뷰", prefix: "[강의]", type: "review", projects: [P.eduB], at: [-8, "16:00"], min: 45, who: [EL, E1], status: "confirmed", source: "plaud",
    summary: "2차시 실습지에 예제를 두 개 더 넣고, 슬라이드 글자 크기를 키우기로 했어요." },
  { id: "mtg-cr-05", title: "[학맞통] 관리자 연수 커리큘럼 기관 협의", prefix: "[학맞통]", type: "agency_consult", projects: [P.ssiA], at: [-13, "10:30"], min: 60, who: [SL, CEO], status: "confirmed", sens: "L2", source: "manual",
    summary: "기관은 관리자 연수를 2회로 나누길 원해요. 1회차는 법령과 지원팀 역할, 2회차는 실습 위주로 구성해요." },
  { id: "mtg-cr-06", title: "[아라] 9월 스프린트 리뷰", prefix: "[아라]", type: "review", projects: [P.araCore], at: [-5, "14:00"], min: 50, who: [AL, A1], status: "confirmed", source: "plaud",
    summary: "버그 7건을 닫았어요. 첫 인사 문구를 줄이고, 평가 세트는 30문항으로 맞춰요." },
  { id: "mtg-cr-07", title: "[아라] 회의 분류 정확도 주간 점검", prefix: "[아라]", type: "internal_regular", projects: [P.araPipe], at: [-7, "11:00"], min: 30, who: [AL, CEO, A1], status: "confirmed", source: "plaud",
    summary: "지난주 자동 분류 정확도는 82%였어요. 확인 필요 구간은 하루 안에 처리하기로 했어요." },
  { id: "mtg-cr-08", title: "[AX] 워크사이트 내부 적용 설정 회의", prefix: "[AX]", type: "planning", projects: [P.coreAx], at: [-12, "14:00"], min: 55, who: [OPS, CEO, AL], status: "confirmed", source: "plaud",
    summary: "메뉴는 레지스트리 9개를 그대로 쓰고, 권한은 역할 4개로 시작해요. AI 연결 정책은 대표 확인 뒤 정해요." },
  { id: "mtg-cr-09", title: "[공통] 9월 4주 주간 회의", prefix: "[공통]", type: "internal_regular", projects: [P.coreGen, P.eduA, P.araCore, P.ssiR], at: [-9, "10:00"], min: 70, who: [CEO, OPS, EL, E1, SL, AL, A1], status: "confirmed", source: "plaud",
    summary: "9월 비용은 예산 안이에요. 제안서 마감과 배포 일정을 확인했어요." },
  { id: "mtg-cr-10", title: "[강의] 표준 교안 개정 기획", prefix: "[강의]", type: "planning", projects: [P.eduC], at: [-15, "13:00"], min: 40, who: [EL, E1], status: "confirmed", source: "plaud",
    summary: "표준 교안은 생성형 AI 기초부터 고치고, 8월 만족도 결과를 반영해요." },
  { id: "mtg-cr-11", title: "[강의] 예시기업 특강 리허설", prefix: "[강의]", type: "lecture_rehearsal", projects: [P.eduA], at: [2, "14:00"], min: 60, who: [EL, E1], status: "scheduled", source: "manual", summary: null },
  { id: "mtg-cr-12", title: "[공통] 10월 2주 주간 회의", prefix: "[공통]", type: "internal_regular", projects: [P.coreGen], at: [5, "10:00"], min: 60, who: [CEO, OPS, EL, E1, SL, AL, A1], status: "scheduled", source: "manual", summary: null },
];

const CR_SEGS: Record<string, SegDef[]> = {
  "mtg-cr-01": [
    [0, 28.5, "EDU", "EDU-2026-A", "EDU.needs", 0.91, "실습 위주로 해 주시면 좋겠다는 요청이 있었어요.", "auto"],
    [28.5, 41 + 1 / 6, "CORE", "CORE-GENERAL", "CORE.sales", 0.72, "다음 분기 영업 계획도 같이 보면 좋겠어요.", "pending"],
    [41 + 1 / 6, 52, null, null, null, 0.41, "그건 다음에 따로 정리해서 공유할게요.", "unclassified"],
  ],
  "mtg-cr-02": [
    [0, 10, "CORE", "CORE-GENERAL", "CORE.ops", 0.88, "사무실 프린터 계약은 이번 달로 끝내요.", "auto"],
    [10, 22, "EDU", "EDU-2026-A", "EDU.ops", 0.79, "특강 날짜가 확정되면 장소부터 잡을게요.", "pending"],
    [22, 31, "EDU", "EDU-2026-B", "EDU.review", 0.66, "연수 1차 설문은 다음 주에 정리해서 볼게요.", "pending"],
    [31, 40, "SSI", "SSI-RESEARCH", "SSI.law", 0.74, "시행령 바뀐 부분은 따로 표로 만들어 둘게요.", "pending"],
    [40, 52, "ARA", "ARA-CORE", "ARA.release", 0.89, "다음 주 배포 체크리스트는 금요일까지 봐요.", "auto"],
    [52, 60, "ARA", "ARA-MEETING-PIPELINE", "ARA.eval", 0.63, "분류가 애매한 회의는 일단 사람이 다 확인해요.", "pending"],
    [60, 70, "CORE", "CORE-INTERNAL-AX", "CORE.internal_ax", 0.7, "워크사이트 교육은 10월 둘째 주에 해요.", "pending"],
    [70, 78, null, null, null, 0.38, "그건 제가 따로 연락드릴게요.", "unclassified"],
    [78, 85, null, null, null, 0.45, "오늘은 여기까지 할까요?", "unclassified"],
  ],
  "mtg-cr-03": [
    [0, 12, "EDU", "EDU-2026-A", "EDU.needs", 0.93, "참석자는 임원 20명 정도로 예상하고 있어요.", "auto"],
    [12, 22, "EDU", "EDU-2026-A", "EDU.curriculum", 0.9, "3시간 과정으로 3개 모듈을 생각하고 있어요.", "auto"],
    [22, 31, "EDU", "EDU-2026-A", "EDU.proposal", 0.81, "제안서는 다음 주 금요일까지 보내 드릴게요.", "confirmed"],
    [31, 40, "EDU", "EDU-2026-A", "EDU.ops", 0.87, "교육장은 고객사 대회의실을 쓰기로 했어요.", "auto"],
  ],
  "mtg-cr-04": [
    [0, 18, "EDU", "EDU-2026-B", "EDU.materials", 0.92, "2차시 실습지는 예제를 두 개 더 넣어요.", "auto"],
    [18, 33, "EDU", "EDU-2026-B", "EDU.materials", 0.88, "슬라이드 글자 크기를 조금 키워 주세요.", "auto"],
    [33, 45, "EDU", "EDU-2026-B", "EDU.ops", 0.77, "노트북 대여 수량을 다시 확인해요.", "confirmed"],
  ],
  // L2(고객 비밀) 회의: AI 분류 꺼짐(국내 경로 개통 전) → 학맞통 리드가 직접 분류(confirmed)
  "mtg-cr-05": [
    [0, 15, "SSI", "SSI-2026-A", "SSI.agency", 1, "기관에서는 관리자 연수를 두 번으로 나누길 원해요.", "confirmed"],
    [15, 32, "SSI", "SSI-2026-A", "SSI.training", 1, "1회차는 법령과 지원팀 역할을 다뤄요.", "confirmed"],
    [32, 48, "SSI", "SSI-2026-A", "SSI.forms", 1, "운영계획서 서식은 기관 양식을 먼저 받아 볼게요.", "confirmed"],
    [48, 60, "SSI", "SSI-2026-A", "SSI.training", 1, "2회차는 실습 위주로 구성해요.", "confirmed"],
  ],
  "mtg-cr-06": [
    [0, 14, "ARA", "ARA-CORE", "ARA.release", 0.91, "이번 스프린트에서 버그 7건을 닫았어요.", "auto"],
    [14, 27, "ARA", "ARA-CORE", "ARA.prompt", 0.88, "첫 인사 문구는 더 짧게 바꿔요.", "auto"],
    [27, 39, "ARA", "ARA-CORE", "ARA.backend", 0.86, "모델 호출 비용은 지난달보다 줄었어요.", "auto"],
    [39, 50, "ARA", "ARA-CORE", "ARA.eval", 0.83, "평가 세트는 30문항으로 맞춰요.", "confirmed"],
  ],
  "mtg-cr-07": [
    [0, 12, "ARA", "ARA-MEETING-PIPELINE", "ARA.eval", 0.94, "지난주 자동 분류 정확도는 82%였어요.", "auto"],
    [12, 22, "ARA", "ARA-MEETING-PIPELINE", "ARA.prd", 0.87, "확인 필요 구간은 하루 안에 처리해요.", "auto"],
    [22, 30, "CORE", "CORE-INTERNAL-AX", "CORE.internal_ax", 0.71, "분류 결과를 워크사이트로 바로 보내요.", "corrected"],
  ],
  "mtg-cr-08": [
    [0, 15, "CORE", "CORE-INTERNAL-AX", "CORE.internal_ax", 0.92, "메뉴는 레지스트리 9개를 그대로 써요.", "auto"],
    [15, 30, "CORE", "CORE-INTERNAL-AX", "CORE.internal_ax", 0.9, "권한표는 역할 4개로 시작해요.", "auto"],
    [30, 43, "CORE", "CORE-INTERNAL-AX", "CORE.internal_ax", 0.86, "AI 연결은 읽기만 끄고 나머지는 켜요.", "auto"],
    [43, 55, "CORE", "CORE-GENERAL", "CORE.legal", 0.76, "처리방침에 국외이전 항목을 더해요.", "confirmed"],
  ],
  "mtg-cr-09": [
    [0, 15, "CORE", "CORE-GENERAL", "CORE.finance", 0.88, "9월 비용은 예산 안에 있어요.", "auto"],
    [15, 33, "EDU", "EDU-2026-A", "EDU.proposal", 0.86, "예시기업 제안서는 이번 주에 마무리해요.", "auto"],
    [33, 50, "ARA", "ARA-CORE", "ARA.release", 0.9, "배포는 다음 주 화요일로 잡아요.", "auto"],
    [50, 70, "SSI", "SSI-RESEARCH", "SSI.law", 0.78, "시행령 개정 요약을 공유할게요.", "confirmed"],
  ],
  "mtg-cr-10": [
    [0, 22, "EDU", "EDU-CONTENT", "EDU.materials", 0.93, "표준 교안은 생성형 AI 기초부터 고쳐요.", "auto"],
    [22, 40, "EDU", "EDU-CONTENT", "EDU.review", 0.87, "8월 만족도 결과를 반영해요.", "auto"],
  ],
};

const CR_DECS: DecDef[] = [
  [1, "mtg-cr-01", P.eduA, "실습 비중을 60%로 하기로 했어요", "강의·워크샵 리드", [-6, "14:40"], "confirmed", 2],
  [2, "mtg-cr-03", P.eduA, "실습 비중을 50%로 하기로 했어요", "강의·워크샵 리드", [-20, "15:30"], "superseded"],
  [3, "mtg-cr-03", P.eduA, "특강은 3시간 3모듈로 하기로 했어요", "강의·워크샵 리드", [-20, "15:20"], "confirmed"],
  [4, "mtg-cr-03", P.eduA, "교육장은 고객사 대회의실을 쓰기로 했어요", "강의·워크샵 리드", [-20, "15:35"], "confirmed"],
  [5, "mtg-cr-04", P.eduB, "2차시 실습 예제를 두 개 더 넣기로 했어요", "강의·워크샵 리드", [-8, "16:30"], "confirmed"],
  [6, "mtg-cr-05", P.ssiA, "관리자 연수를 2회로 나누기로 했어요", "학맞통 리드", [-13, "11:00"], "confirmed"],
  [7, "mtg-cr-06", P.araCore, "평가 세트는 30문항으로 맞추기로 했어요", "아라 개발 리드", [-5, "14:45"], "confirmed"],
  [8, "mtg-cr-06", P.araCore, "첫 인사 문구는 두 문장 이내로 하기로 했어요", "아라 개발 리드", [-5, "14:20"], "confirmed"],
  [9, "mtg-cr-07", P.araPipe, "확인 필요 구간은 하루 안에 처리하기로 했어요", "아라 개발 리드", [-7, "11:20"], "confirmed"],
  [10, "mtg-cr-07", P.araPipe, "자동 분류 기준을 신뢰도 0.85로 두기로 했어요", "대표", [-7, "11:25"], "confirmed"],
  [11, "mtg-cr-08", P.coreAx, "메뉴는 레지스트리 9개를 그대로 쓰기로 했어요", "대표", [-12, "14:20"], "confirmed"],
  [12, "mtg-cr-08", P.coreAx, "AI 연결은 읽기만 끄고 시작하기로 했어요", "경영지원 담당", [-12, "14:40"], "proposed"],
  [13, "mtg-cr-09", P.araCore, "아라 배포는 9월 29일에 하기로 했어요", "아라 개발 리드", [-9, "10:40"], "superseded"],
  [14, "mtg-cr-02", P.araCore, "아라 배포를 10월 6일로 미루기로 했어요", "아라 개발 리드", [-2, "10:50"], "confirmed", 13],
  [15, "mtg-cr-02", P.coreAx, "워크사이트 교육은 10월 둘째 주에 하기로 했어요", "경영지원 담당", [-2, "11:05"], "proposed"],
];

const CR_APS: ApDef[] = [
  [1, "mtg-cr-01", "실습 예제 3종 준비", E1, 6, "proposed"],
  [2, "mtg-cr-03", "예시기업 특강 요구사항 정리", E1, -14, "accepted", 10],
  [3, "mtg-cr-03", "특강 보조 강사 배정", EL, 0, "accepted", 34],
  [4, "mtg-cr-03", "특강 장소·장비 확인", E1, -3, "accepted", 11],
  [5, "mtg-cr-04", "예시고 연수 2차시 실습지", E1, -2, "accepted", 35],
  [6, "mtg-cr-04", "노트북 대여 수량 확인", E1, -4, "dismissed"],
  [7, "mtg-cr-05", "관리자 연수 사전 설문 설계", SL, 6, "accepted", 37],
  [8, "mtg-cr-05", "기관 운영계획서 양식 받기", SL, -6, "dismissed"],
  [9, "mtg-cr-06", "평가 세트 30문항 정리", AL, 3, "accepted", 8],
  [10, "mtg-cr-06", "첫 인사 문구 수정", A1, 0, "accepted", 4],
  [11, "mtg-cr-07", "분류 신뢰도 기준 검증", AL, 4, "accepted", 41],
  [12, "mtg-cr-08", "워크사이트 권한표 초안", OPS, 2, "accepted", 6],
  [13, "mtg-cr-08", "처리방침 국외이전 표 개정", OPS, 8, "dismissed"],
  [14, "mtg-cr-09", "시행령 개정 요약 공유", SL, -1, "accepted", 9],
  [15, "mtg-cr-09", "9월 비용 정리", OPS, -1, "dismissed"],
  [16, "mtg-cr-10", "8월 만족도 결과 분석", EL, 2, "proposed"],
  [17, "mtg-cr-02", "특강 장소 예약", E1, 7, "proposed"],
  [18, "mtg-cr-02", "연수 1차 설문 정리", E1, 8, "proposed"],
  [19, "mtg-cr-02", "시행령 변경 표 만들기", SL, 9, "proposed"],
  [20, "mtg-cr-02", "워크사이트 교육 일정 공지", OPS, 4, "proposed"],
];

// ─────────────────────────────────────────────── TR(tr-technology)
const T_CEO = "m-tr-ceo", PL = "m-tr-plant", QA = "m-tr-qa", SA = "m-tr-sales", AD = "m-tr-admin", DV = "m-tr-dev", OA = "m-tr-op-a", OB = "m-tr-op-b";
const TR_AI: Record<string, string> = { [QA]: "Claude", [SA]: "ChatGPT", [DV]: "Claude", [PL]: "ChatGPT" };
const Q = {
  exh: "prj-tr-mass-exh", saf: "prj-tr-mass-saf", flt: "prj-tr-mass-flt", dev: "prj-tr-dev-dr", ppm: "prj-tr-qual-ppm", clm: "prj-tr-qual-clm",
  h2: "prj-tr-safe-h2", press: "prj-tr-safe-press", ax: "prj-tr-ax-pilot",
};

const TR_TASKS: TaskDef[] = [
  // 검토 대기 5
  [1, "CL-2026-03 8D D4 근거 정리", Q.clm, null, QA, PL, "submitted", 2, { pr: "high", src: "claim", ref: "clm-tr-2026-03", type: "클레임 대응", est: 6, c: -11,
    desc: "클레임 CL-2026-03의 근본 원인(D4) 근거를 LOT·검사 기록으로 정리해요. 8D 보고서 기한은 10월 6일이에요.",
    crit: "LOT 체인 표 · 검사 기록 출처 · 원인 후보별 판단 근거" }],
  [2, "9월 고객 PPM 월간 보고 초안", Q.ppm, null, QA, PL, "submitted", 3, { type: "품질 지표", est: 3, c: -5,
    desc: "9월 고객 PPM과 공정 불량률을 월간 보고 양식으로 정리해요.", crit: "고객 PPM 추이 · 불량 유형 상위 3개 · 다음 달 조치" }],
  [3, "편조 롤 폭 규격 확인 회신", Q.flt, null, SA, PL, "submitted", 1, { src: "mail", type: "납기 대응", est: 1, c: -3,
    desc: "고객이 메일로 물어본 편조 롤 폭 규격을 확인해 회신 초안을 만들어요." }],
  [4, "디커플링 링 초품 검사 계획", Q.dev, null, DV, PL, "submitted", 4, { type: "검사 기준", est: 4, c: -8,
    desc: "시제품 초품 검사 항목과 일정을 정해요.", crit: "검사 항목 표 · 측정 도구 · 일정" }],
  [5, "반기 점검 증빙 목록 1차 정리", Q.h2, null, AD, T_CEO, "submitted", 5, { type: "안전 점검", est: 4, c: -10,
    desc: "2026 하반기 반기 점검에 필요한 증빙을 항목별로 모아요.", crit: "점검 항목별 증빙 이름 · 빠진 증빙 목록" }],
  // 수정 요청 2
  [6, "출하 검사성적서 양식 정리", Q.exh, null, QA, PL, "changes_requested", 1, { type: "검사 기준", est: 3, c: -8, src: "meeting", ref: "ap-tr-03",
    desc: "품목마다 다른 출하 검사성적서 양식을 하나로 맞춰요." }],
  [7, "아차사고 신고 3건 조치 결과 정리", Q.h2, null, AD, T_CEO, "changes_requested", -1, { type: "안전 점검", est: 2, c: -7 }],
  // 완료 12
  [8, "CL-2026-03 임시 조치 재고 선별 결과", Q.clm, null, QA, PL, "done", -10, { pr: "high", src: "meeting", ref: "ap-tr-04", type: "클레임 대응", est: 4, c: -12, end: -10 }],
  [9, "S-260916-012 LOT 출하 이력 확인", Q.clm, null, SA, PL, "done", -10, { src: "claim", ref: "clm-tr-2026-03", type: "클레임 대응", est: 2, c: -12, end: -11 }],
  [10, "9월 3주 출하 계획 확정", Q.exh, null, SA, PL, "done", -12, { src: "meeting", ref: "ap-tr-09", type: "생산 계획", est: 2, c: -16, end: -12 }],
  [11, "에어백 필터 LOT 라벨 점검", Q.saf, null, OA, PL, "done", -6, { src: "meeting", ref: "ap-tr-06", type: "검사 기준", est: 2, c: -15, end: -6 }],
  [12, "프레스 작업자 안전교육 확인서 정리", Q.press, null, AD, T_CEO, "done", -8, { type: "안전 점검", est: 2, c: -16, end: -8 }],
  [13, "KN-21 고장 원인 1차 기록", Q.exh, null, PL, T_CEO, "done", -3, { pr: "high", type: "설비 이상", est: 1, c: -9, end: -3 }],
  [14, "8월 초중종물 실시율 집계", Q.ppm, null, QA, PL, "done", -14, { type: "품질 지표", est: 2, c: -22, end: -14 }],
  [15, "9월 2주 주간 생산회의 안건 정리", Q.exh, null, SA, PL, "done", -16, { type: "생산 계획", est: 1, c: -18, end: -16, desc: "이전 도구에서 옮겨 온 완료 업무예요. 검토 이력은 없어요." }],
  [16, "편조기 일일 점검표 배포", Q.exh, null, PL, T_CEO, "done", -15, { type: "설비 보전", est: 1, c: -23, end: -15, desc: "이전 도구에서 옮겨 온 완료 업무예요. 검토 이력은 없어요." }],
  [17, "선재 입고 성적서 9월분 정리", Q.flt, null, AD, PL, "done", -5, { type: "자재·구매", est: 2, c: -12, end: -5, desc: "이전 도구에서 옮겨 온 완료 업무예요. 검토 이력은 없어요." }],
  [18, "작업 전 안전점검 기록 9월분", Q.h2, null, OB, AD, "done", -4, { type: "안전 점검", est: 1, c: -29, end: -4, desc: "이전 도구에서 옮겨 온 완료 업무예요. 검토 이력은 없어요." }],
  [19, "업무사이트 파일럿 범위 1차 협의", Q.ax, null, T_CEO, AD, "done", -7, { type: "파일럿 준비", est: 1, c: -12, end: -7, desc: "이전 도구에서 옮겨 온 완료 업무예요. 검토 이력은 없어요." }],
  // 할 일 8
  [20, "CL-2026-03 D5 대책안 초안", Q.clm, null, QA, PL, "todo", 5, { pr: "high", src: "claim", ref: "clm-tr-2026-03", type: "클레임 대응", est: 5, c: -2 }],
  [21, "디커플링 링 프레스 금형 조건 검토", Q.dev, null, DV, PL, "todo", 9, { type: "4M 변경", est: 4, c: -4 }],
  [22, "크림핑 불량 사진 기준표", Q.ppm, null, OA, QA, "todo", 7, { src: "meeting", ref: "ap-tr-16", type: "검사 기준", est: 2, c: -2, ct: "10:00",
    desc: "크림핑 공정에서 자주 나오는 불량을 사진 기준표로 만들어요. 사진은 파일 이름만 남겨요." }],
  [23, "프레스 안전검사 서류 준비", Q.press, null, PL, T_CEO, "todo", 20, { type: "안전 점검", est: 3, c: -6 }],
  [24, "현장 등록 사용 안내문 초안", Q.ax, null, AD, T_CEO, "todo", 6, { src: "meeting", ref: "ap-tr-15", type: "파일럿 준비", est: 2, c: -2, ct: "10:00" }],
  [25, "에어백 필터 포장 사양 변경 확인", Q.saf, null, SA, PL, "todo", 8, { src: "mail", type: "납기 대응", est: 1, c: -1 }],
  [26, "계측기 검교정 10월 일정 확인", Q.ppm, null, QA, PL, "todo", 4, { src: "meeting", ref: "ap-tr-07", type: "계측기", est: 1, c: -22 }],
  [27, "파일럿 대상 업무 목록 확정", Q.ax, null, T_CEO, AD, "todo", 10, { type: "파일럿 준비", est: 2, c: -5 }],
  // 진행 중 12
  [28, "프레스 PR-010-02 이상 소음 점검", Q.press, null, PL, T_CEO, "in_progress", 0, { pr: "high", src: "field_report", ref: "fr-tr-0085", type: "설비 이상", est: 2, c: 0, ct: "08:45", cby: PL,
    desc: "현장 등록으로 들어온 이상 소음을 점검해요. 점검 전까지 해당 프레스는 쓰지 않아요.", crit: "소음 원인 기록 · 조치 내용 · 재가동 판단" }],
  [29, "10월 1주 출하 계획 확정", Q.exh, null, SA, PL, "in_progress", 0, { pr: "high", type: "생산 계획", est: 2, c: -2 }],
  [30, "예시배기시스템 10월 내시 반영 생산계획", Q.exh, null, SA, PL, "in_progress", 2, { type: "생산 계획", est: 3, c: -4 }],
  [31, "9월 공정 불량 유형 집계", Q.ppm, null, QA, PL, "in_progress", 1, { type: "품질 지표", est: 2, c: -3 }],
  [32, "초중종물 체크시트 누락 원인 정리", Q.ppm, null, QA, PL, "in_progress", -2, { src: "meeting", ref: "ap-tr-05", type: "검사 기준", est: 3, c: -15 }],
  [33, "디커플링 링 시제품 치수 측정 정리", Q.dev, null, DV, PL, "in_progress", 3, { type: "검사 기준", est: 3, c: -6 }],
  [34, "위험성평가 개선대책 이행 사진 모으기", Q.h2, null, OA, AD, "in_progress", 6, { type: "안전 점검", est: 2, c: -5,
    desc: "개선대책을 이행한 자리의 사진 이름을 모아요. 실제 사진은 회사 저장소에 두어요." }],
  [35, "반기 점검 근로자 의견 청취 기록", Q.h2, null, AD, T_CEO, "in_progress", 8, { type: "안전 점검", est: 2, c: -6 }],
  [36, "KN-21 수리 부품 발주 확인", Q.exh, null, AD, PL, "in_progress", 1, { src: "meeting", ref: "ap-tr-08", type: "설비 보전", est: 1, c: -9 }],
  [37, "SUS321 선재 2차 공급사 후보 정리", Q.exh, null, AD, PL, "in_progress", 7, { src: "meeting", ref: "ap-tr-02", type: "자재·구매", est: 3, c: -1 }],
  [38, "편조기 KN-03·KN-15 정지 사유 기록", Q.exh, null, OA, PL, "in_progress", 1, { type: "설비 이상", est: 1, c: -1 }],
  [39, "파일럿 데이터 등급표 검토", Q.ax, null, T_CEO, AD, "in_progress", 3, { type: "파일럿 준비", est: 1, c: -4 }],
  // 취소 1
  [40, "8월 생산일보 양식 변경", Q.exh, null, SA, PL, "canceled", -20, { type: "생산 계획", c: -35, end: -21, desc: "업무사이트 파일럿 뒤에 다시 정하기로 해서 취소했어요." }],
];

const TR_SUBS: SubDef[] = [
  // 고객 비밀(L2) 업무는 국내 처리 경로가 열리기 전까지 AI 연결에 보이지 않아요 → 웹에서 사람이 제출(앵커 sub-tr-001)
  { id: "sub-tr-001", task: 1, v: 1, status: "submitted", at: [0, "07:55"], summary: "D4 근본 원인 근거를 LOT·검사 기록 표로 정리했어요. 원인 후보 3가지와 판단 근거를 붙였어요.", artifact: "art-tr-8d-03" },
  { task: 2, v: 1, status: "submitted", at: [-1, "16:30"], ai: "Claude", summary: "9월 고객 PPM 18, 공정 불량률 0.62%로 정리했어요. 불량 유형 상위 3개를 붙였어요." },
  { task: 3, v: 1, status: "submitted", at: [0, "08:20"], summary: "편조 롤 폭 규격과 공차를 확인해 회신 초안을 썼어요." },
  { task: 4, v: 1, status: "submitted", at: [-1, "11:00"], summary: "초품 검사 항목 9개와 측정 도구, 일정을 표로 만들었어요." },
  { task: 5, v: 1, status: "submitted", at: [-1, "15:00"], summary: "반기 점검 10개 항목별 증빙 이름을 모았어요. 빠진 증빙은 2건이에요." },
  { task: 6, v: 1, status: "rejected", at: [-3, "14:00"], summary: "출하 검사성적서 통합 양식 초안이에요.", comment: "LOT 번호와 검사 수량 칸을 맨 위로 옮겨 주세요", reviewedAt: [-2, "09:00"] },
  { task: 7, v: 1, status: "rejected", at: [-2, "16:00"], summary: "아차사고 3건 조치 결과예요.", comment: "조치 전후 사진 이름을 함께 적어 주세요", reviewedAt: [-1, "10:30"] },
  { task: 8, v: 1, status: "approved", at: [-11, "17:00"], summary: "임시 조치 재고 선별 결과예요. 선별 수량과 보관 장소를 적었어요.", reviewedAt: [-10, "09:30"] },
  { task: 9, v: 1, status: "approved", at: [-11, "15:20"], summary: "S-260916-012 LOT의 출하 이력을 날짜별로 정리했어요.", reviewedAt: [-11, "17:40"] },
  { task: 10, v: 1, status: "approved", at: [-13, "16:00"], summary: "9월 3주 출하 계획 확정안이에요.", reviewedAt: [-12, "08:50"] },
  { task: 11, v: 1, status: "approved", at: [-7, "15:30"], summary: "에어백 필터 LOT 라벨 40건을 점검했어요. 잘못된 라벨은 없었어요.", reviewedAt: [-6, "10:00"] },
  { task: 12, v: 1, status: "approved", at: [-9, "16:00"], summary: "프레스 작업자 안전교육 확인서를 모았어요.", reviewedAt: [-8, "11:00"] },
  { task: 13, v: 1, status: "approved", at: [-4, "17:30"], summary: "KN-21 고장 증상과 1차 원인 추정을 기록했어요.", reviewedAt: [-3, "09:00"] },
  { task: 14, v: 1, status: "approved", at: [-15, "16:40"], summary: "8월 초중종물 실시율은 85%예요. 누락 조를 표시했어요.", reviewedAt: [-14, "10:20"] },
];

const TR_MEETINGS: MeetingDef[] = [
  { id: "mtg-tr-01", title: "주간 품질회의(예시)", prefix: null, type: "quality", projects: [Q.ppm, Q.exh], at: [-1, "09:00"], min: 45, who: [PL, QA, SA, DV], status: "confirmed", source: "manual",
    summary: "9월 고객 PPM은 지난달보다 내려갔어요. SUS321 선재 공급사를 2곳으로 늘리는 안을 검토하고, KN-07 조건표 개정(CR4M-2026-04)은 고객 승인 회신을 받은 뒤 적용하기로 했어요." },
  { id: "mtg-tr-02", title: "주간 품질회의(예시)", prefix: null, type: "quality", projects: [Q.ppm, Q.clm], at: [-8, "09:00"], min: 40, who: [PL, QA, SA], status: "confirmed", sens: "L2", source: "manual",
    summary: "초중종물 실시율이 올라왔어요. 클레임 임시 조치 재고 선별을 끝냈고, 출하 검사성적서 양식을 하나로 맞추기로 했어요." },
  { id: "mtg-tr-03", title: "주간 품질회의(예시)", prefix: null, type: "quality", projects: [Q.ppm, Q.saf], at: [-15, "09:00"], min: 40, who: [PL, QA], status: "confirmed", source: "manual",
    summary: "8월 공정 불량률을 확인했어요. 초중종물 기록 누락은 주로 야간조에서 나와요." },
  { id: "mtg-tr-04", title: "주간 품질회의(예시)", prefix: null, type: "quality", projects: [Q.ppm], at: [-22, "09:00"], min: 35, who: [PL, QA], status: "confirmed", source: "manual",
    summary: "Single PPM 목표까지 남은 차이를 봤어요. 계측기 검교정 일정을 10월 전에 확정해요." },
  { id: "mtg-tr-05", title: "주간 생산회의(예시)", prefix: null, type: "production", projects: [Q.exh, Q.flt, Q.press, Q.ppm], at: [-2, "08:30"], min: 60, who: [PL, SA, QA, OA], status: "needs_review", source: "manual",
    summary: "10월 1주는 배기계 출하를 먼저 맞춰요. KN-21은 부품이 와야 고칠 수 있어요. 프레스 소음과 편조 롤 문의 구간은 분류 확인이 필요해요." },
  { id: "mtg-tr-06", title: "주간 생산회의(예시)", prefix: null, type: "production", projects: [Q.exh, Q.flt], at: [-9, "08:30"], min: 50, who: [PL, SA, QA, OA], status: "confirmed", source: "manual",
    summary: "배기계 품목 편조를 먼저 해요. KN-21 이상으로 같은 품목을 KN-22로 돌리고, SUS321 안전재고를 7일로 올리기로 했어요." },
  { id: "mtg-tr-07", title: "주간 생산회의(예시)", prefix: null, type: "production", projects: [Q.exh, Q.saf, Q.press], at: [-16, "08:30"], min: 45, who: [PL, SA, AD], status: "confirmed", source: "manual",
    summary: "9월 3주 출하 계획을 확정했어요. 에어백 필터 물량이 조금 늘었어요." },
  { id: "mtg-tr-08", title: "주간 생산회의(예시)", prefix: null, type: "production", projects: [Q.exh, Q.flt], at: [-23, "08:30"], min: 40, who: [PL, SA, AD], status: "confirmed", source: "manual",
    summary: "편조기 일일 점검표를 다시 나눠요. 선재 입고 성적서는 월별로 묶어요." },
  { id: "mtg-tr-09", title: "[AX] 업무사이트 파일럿 준비 1차(예시)", prefix: "[AX]", type: "planning", projects: [Q.ax], at: [-7, "14:00"], min: 50, who: [T_CEO, AD, PL, QA], status: "needs_review", source: "manual",
    summary: "1차 파일럿은 품질과 현장 등록부터 해요. 작업자 등록 방법과 반기 점검 증빙 모으기는 확인이 필요해요." },
  { id: "mtg-tr-10", title: "[AX] 업무사이트 파일럿 준비 2차(예시)", prefix: "[AX]", type: "planning", projects: [Q.ax], at: [2, "14:00"], min: 60, who: [T_CEO, AD, PL, QA], status: "scheduled", source: "manual", summary: null },
];

const TR_SEGS: Record<string, SegDef[]> = {
  "mtg-tr-01": [
    [0, 15, "QUAL", "QUAL-PPM-26H2", "품질 지표", 0.92, "9월 고객 PPM은 지난달보다 내려갔어요.", "auto"],
    [15, 30, "MASS", "MASS-EXH", "자재·구매", 0.79, "SUS321 선재는 공급사 한 곳에만 기대고 있어요.", "confirmed"],
    [30, 45, "QUAL", "QUAL-PPM-26H2", "검사 기준", 0.88, "KN-07 조건표 개정은 고객 승인 회신을 이번 주에 받아요.", "auto"],
  ],
  // L2(고객 비밀) 회의: AI 분류가 꺼져 있어서(국내 경로 개통 전) 품질보증 담당이 직접 분류했어요 → 모두 confirmed(신뢰도는 화면에 안 보여요)
  "mtg-tr-02": [
    [0, 14, "QUAL", "QUAL-PPM-26H2", "품질 지표", 1, "초중종물 실시율이 85%까지 올라왔어요.", "confirmed"],
    [14, 27, "QUAL", "QUAL-CLM-2026-03", "클레임 대응", 1, "임시 조치 재고 선별은 끝냈어요.", "confirmed"],
    [27, 40, "QUAL", "QUAL-PPM-26H2", "검사 기준", 1, "출하 검사성적서 양식을 하나로 맞춰요.", "confirmed"],
  ],
  "mtg-tr-03": [
    [0, 13, "QUAL", "QUAL-PPM-26H2", "품질 지표", 0.91, "8월 공정 불량률을 같이 봐요.", "auto"],
    [13, 27, "QUAL", "QUAL-PPM-26H2", "검사 기준", 0.89, "초중종물 기록 누락이 주로 야간조에서 나와요.", "auto"],
    [27, 40, "MASS", "MASS-SAF", "검사 기준", 0.87, "에어백 필터 LOT 라벨을 다시 점검해요.", "auto"],
  ],
  "mtg-tr-04": [
    [0, 20, "QUAL", "QUAL-PPM-26H2", "품질 지표", 0.93, "Single PPM 목표까지 아직 차이가 있어요.", "auto"],
    [20, 35, "QUAL", "QUAL-PPM-26H2", "계측기", 0.88, "계측기 검교정 일정을 10월 전에 확인해요.", "auto"],
  ],
  "mtg-tr-05": [
    [0, 12, "MASS", "MASS-EXH", "생산 계획", 0.9, "10월 1주는 배기계 출하를 먼저 맞춰요.", "auto"],
    [12, 22, "MASS", "MASS-EXH", "설비 이상", 0.88, "KN-21은 부품이 와야 고칠 수 있어요.", "auto"],
    [22, 33, "SAFE", "SAFE-PRESS", "설비 이상", 0.68, "프레스 쪽 소리가 다시 나면 바로 알려 주세요.", "pending"],
    [33, 42, "MASS", "MASS-FLT", "납기 대응", 0.75, "편조 롤 폭 문의는 내일까지 회신해요.", "pending"],
    [42, 51, "QUAL", "QUAL-PPM-26H2", "검사 기준", 0.62, "야간조 초중종물은 사진으로 남겨요.", "pending"],
    [51, 60, null, null, null, 0.35, "그건 끝나고 따로 얘기해요.", "unclassified"],
  ],
  "mtg-tr-06": [
    [0, 18, "MASS", "MASS-EXH", "생산 계획", 0.92, "이번 주 편조 계획은 배기계 품목이 먼저예요.", "auto"],
    [18, 34, "MASS", "MASS-EXH", "설비 이상", 0.8, "KN-21에서 소리가 나서 오늘 멈췄어요.", "confirmed"],
    [34, 50, "MASS", "MASS-FLT", "납기 대응", 0.89, "편조 롤은 다음 주 화요일에 출하해요.", "auto"],
  ],
  "mtg-tr-07": [
    [0, 16, "MASS", "MASS-EXH", "생산 계획", 0.91, "9월 3주 출하 계획을 확정했어요.", "auto"],
    [16, 30, "MASS", "MASS-SAF", "생산 계획", 0.88, "에어백 필터 물량이 조금 늘었어요.", "auto"],
    [30, 45, "SAFE", "SAFE-PRESS", "안전 점검", 0.86, "프레스 안전교육 확인서를 모아요.", "auto"],
  ],
  "mtg-tr-08": [
    [0, 22, "MASS", "MASS-EXH", "설비 보전", 0.9, "편조기 일일 점검표를 다시 나눠 드려요.", "auto"],
    [22, 40, "MASS", "MASS-FLT", "자재·구매", 0.74, "선재 입고 성적서를 월별로 묶어요.", "confirmed"],
  ],
  "mtg-tr-09": [
    [0, 12, "AX", "AX-PILOT-1", "파일럿 준비", 0.89, "1차 파일럿은 품질과 현장 등록부터 해요.", "auto"],
    [12, 22, "AX", "AX-PILOT-1", "파일럿 준비", 0.73, "작업자분들은 휴대폰으로 등록하는 게 편해요.", "pending"],
    [22, 32, "SAFE", "SAFE-2026-H2", "안전 점검", 0.7, "반기 점검 증빙도 여기서 모으면 좋겠어요.", "pending"],
    [32, 42, "QUAL", "QUAL-PPM-26H2", "품질 지표", 0.66, "불량 사진 기준을 먼저 정해야 해요.", "pending"],
    [42, 50, null, null, null, 0.4, "이 부분은 대표님 확인을 받아 볼게요.", "unclassified"],
  ],
};

const TR_DECS: DecDef[] = [
  [1, "mtg-tr-01", Q.exh, "SUS321 선재 공급사를 2곳으로 늘리는 안을 검토하기로 했어요", "공장장", [-1, "09:30"], "confirmed"],
  [2, "mtg-tr-01", Q.ppm, "KN-07 조건표 개정은 고객 승인 회신을 받은 뒤 적용하기로 했어요", "공장장", [-1, "09:40"], "confirmed"],
  [3, "mtg-tr-02", Q.ppm, "출하 검사성적서 양식을 하나로 맞추기로 했어요", "공장장", [-8, "09:35"], "confirmed"],
  [4, "mtg-tr-02", Q.clm, "임시 조치 재고는 선별한 뒤 별도 구역에 보관하기로 했어요", "품질보증 담당", [-8, "09:20"], "confirmed"],
  [5, "mtg-tr-03", Q.ppm, "야간조 초중종물 기록은 조장이 확인하기로 했어요", "공장장", [-15, "09:30"], "confirmed"],
  [6, "mtg-tr-04", Q.ppm, "계측기 검교정 일정은 10월 전에 확정하기로 했어요", "품질보증 담당", [-22, "09:25"], "confirmed"],
  [7, "mtg-tr-06", Q.exh, "KN-21 수리 전까지 같은 품목을 KN-22로 돌리기로 했어요", "공장장", [-9, "08:50"], "confirmed"],
  [8, "mtg-tr-07", Q.exh, "9월 3주 출하는 예시배기시스템 품목을 먼저 하기로 했어요", "영업·생산 담당", [-16, "08:50"], "confirmed"],
  [9, "mtg-tr-08", Q.flt, "SUS321 선재 안전재고를 5일로 하기로 했어요", "공장장", [-23, "08:55"], "superseded"],
  [10, "mtg-tr-06", Q.flt, "SUS321 선재 안전재고를 7일로 올리기로 했어요", "공장장", [-9, "09:05"], "confirmed", 9],
  [11, "mtg-tr-05", Q.ppm, "야간조 초중종물은 사진으로 남기기로 했어요", "공장장", [-2, "09:15"], "proposed", 5],
  [12, "mtg-tr-09", Q.ax, "1차 파일럿은 품질과 현장 등록부터 하기로 했어요", "대표이사", [-7, "14:20"], "proposed"],
];

const TR_APS: ApDef[] = [
  [1, "mtg-tr-01", "CR4M-2026-04 고객 승인 회신 받기", DV, 6, "proposed"],
  [2, "mtg-tr-01", "SUS321 선재 2차 공급사 후보 정리", AD, 7, "accepted", 37],
  [3, "mtg-tr-02", "출하 검사성적서 양식 정리", QA, 1, "accepted", 6],
  [4, "mtg-tr-02", "임시 조치 재고 선별 결과 정리", QA, -10, "accepted", 8],
  [5, "mtg-tr-03", "초중종물 체크시트 누락 원인 정리", QA, -2, "accepted", 32],
  [6, "mtg-tr-03", "에어백 필터 LOT 라벨 점검", OA, -6, "accepted", 11],
  [7, "mtg-tr-04", "계측기 검교정 10월 일정 확인", QA, 4, "accepted", 26],
  [8, "mtg-tr-06", "KN-21 수리 부품 발주 확인", AD, 1, "accepted", 36],
  [9, "mtg-tr-07", "9월 3주 출하 계획 확정", SA, -12, "accepted", 10],
  [10, "mtg-tr-07", "프레스 안전교육 확인서 정리", AD, -8, "dismissed"],
  [11, "mtg-tr-08", "선재 입고 성적서 월별 묶기", AD, -5, "dismissed"],
  [12, "mtg-tr-06", "편조 롤 출하 일정 고객 회신", SA, -7, "dismissed"],
  [13, "mtg-tr-05", "프레스 소음 재발 시 보고 절차 공지", PL, 3, "proposed"],
  // 이미 있는 업무와 같은 액션은 새로 만들지 않고 그 업무에 연결했어요(리뷰 3차 — '업무로 만들기'를 누르면 같은 업무가 두 번 생기던 문제)
  [14, "mtg-tr-05", "편조 롤 폭 문의 회신", SA, 1, "accepted", 3],
  [15, "mtg-tr-09", "작업자용 현장 등록 안내문", AD, 6, "accepted", 24],
  [16, "mtg-tr-09", "불량 사진 기준 정하기", QA, 7, "accepted", 22],
];

// ─────────────────────────────────────────────── 진행 기록 문장(해요체 한 줄, 지어낸 예시)
const LOG_START = ["자료를 모으기 시작했어요.", "관련 회의 기록을 다시 읽었어요.", "필요한 자료 목록을 정리했어요.", "지난번 비슷한 업무 결과를 찾아봤어요."];
const ASK_REVIEWER = "검토자에게 방향을 한 번 물어봤어요.";
const LOG_MID_CR = ["초안 절반 정도 썼어요.", ASK_REVIEWER, "빠진 자료를 담당자에게 요청했어요.", "앞부분 구성을 바꿨어요.", "고객 요청 사항과 다시 맞춰 봤어요.", "표 구성을 한 번 더 다듬었어요."];
/** TR 중간 기록은 업무 종류에 맞는 문장만(리뷰 3차 — 총무 증빙 업무에 'LOT 번호 대조'가 나오던 문제) */
const LOG_MID_TR: Record<"quality" | "safety" | "purchase" | "plan" | "equipment" | "pilot", string[]> = {
  quality: ["LOT 번호를 다시 대조했어요.", "검사 기록과 숫자를 맞춰 봤어요.", "측정값을 표로 옮겼어요."],
  safety: ["점검표 사진 이름을 정리했어요.", "현장에서 확인한 내용을 적었어요.", "빠진 서명을 담당자에게 요청했어요."],
  purchase: ["공급사 견적을 비교했어요.", "입고 성적서와 수량을 맞춰 봤어요."],
  plan: ["작업일보와 숫자를 맞춰 봤어요.", "출하 수량을 고객 납기와 맞춰 봤어요."],
  equipment: ["현장에서 확인한 내용을 적었어요.", "정지 시간과 사유를 기록했어요.", "보전 이력을 다시 확인했어요."],
  pilot: ["초안 절반 정도 썼어요.", "빠진 자료를 담당자에게 요청했어요."],
};
const TR_TYPE_GROUP: Record<string, keyof typeof LOG_MID_TR> = {
  "검사 기준": "quality", "품질 지표": "quality", "클레임 대응": "quality", 계측기: "quality", "4M 변경": "quality",
  "안전 점검": "safety", "자재·구매": "purchase", "생산 계획": "plan", "납기 대응": "plan", "설비 이상": "equipment", "설비 보전": "equipment", "파일럿 준비": "pilot",
};
/** AI 연결이 남기는 기록: AI 도구 6개(내 업무·상세·시작·진행 기록·제출·검토 상태) 안에서 할 수 있는 일만(회의·작성 규칙은 못 봐요) */
const LOG_AI = ["초안 1차를 완성했어요. 근거 자료 3건을 붙였어요.", "지난 버전과 달라진 부분을 표로 정리했어요.", "완료 기준 3개 중 2개를 채웠어요.", "빠진 항목 2개를 채웠어요.", "업무 기준을 다시 확인하고 남은 일을 정리했어요."];
const LOG_END = ["제출 전에 마지막으로 확인했어요.", "검토자 의견을 반영해 마무리했어요."];
const LOG_REWORK = "검토 코멘트대로 고치는 중이에요.";
const LOG_CANCEL = "일정이 바뀌어 이 업무는 멈추기로 했어요.";
const LOG_TIMES = ["09:10", "10:20", "11:40", "13:30", "14:50", "16:10", "17:30"];

/** 업무 상세의 완료 기준 줄 머리말(화면이 이 줄을 나눠 보여 줌) */
const CRITERIA_PREFIX = "완료 기준: ";

function seedTenant(ctx: SeedContext, def: {
  key: "cr" | "tr"; tasks: TaskDef[]; subs: SubDef[]; meetings: MeetingDef[]; segs: Record<string, SegDef[]>; decs: DecDef[]; aps: ApDef[];
  ai: Record<string, string>; midLogs: (type: string | null, assignee: string) => string[]; aiRate: number;
}): SeedOutput {
  const { key } = def;
  const projects = new Map(ctx.get("projects").map((p) => [p.id, p]));
  const sensOf = (prj: string): Sens => (projects.get(prj)?.sensitivity as Sens | undefined) ?? "L1";
  const tid = (n: number) => `t-${key}-${pad(n)}`;

  // 업무
  // 업무를 만든 날은 일하는 날로(쉬는 날이면 다음 일하는 날 — 마감·완료일을 넘으면 앞쪽 일하는 날)
  const off = (d: number) => isOffDay(ctx.d(d), { saturday: key === "cr" });
  const workdayOf = (d: number, cap: number) => {
    if (!off(d)) return d;
    let f = d;
    while (off(f) && f < cap) f += 1;
    if (!off(f) && f <= cap) return f;
    let b = d;
    while (off(b) && b > d - 7) b -= 1;
    return off(b) ? d : b;
  };
  const createdOf = (due: number, o: TaskOpts, status: TaskStatus) => {
    const raw = o.c ?? Math.min(due - 7, -3);
    const end = status === "done" || status === "canceled" ? o.end ?? Math.min(due, 0) : 0;
    return workdayOf(raw, Math.min(0, due, end));
  };
  const tasks: Row<"tasks">[] = def.tasks.map(([n, title, project, part, assignee, reviewer, status, due, o = {}]) => {
    const created = createdOf(due, o, status);
    const end = status === "done" || status === "canceled" ? o.end ?? Math.min(due, 0) : null;
    const desc = (o.desc ?? `${projects.get(project)?.name ?? "프로젝트"} 업무예요.`) + `\n${CRITERIA_PREFIX}${o.crit ?? DEFAULT_CRIT}`;
    return {
      id: tid(n), project_id: project, part_id: part, title, description: desc, task_type: o.type ?? null,
      assignee_id: assignee, reviewer_id: reviewer, due_at: ctx.at(due, o.time ?? "18:00"), priority: o.pr ?? "normal", status,
      source: o.src ?? "manual", source_ref: o.ref ?? null, estimate_hours: o.est ?? null, sensitivity: o.sens ?? sensOf(project),
      created_by: o.cby ?? reviewer, created_at: ctx.at(created, o.ct ?? "09:00"),
      updated_at: end != null ? ctx.at(end, "17:00") : status === "todo" ? ctx.at(created, o.ct ?? "09:00") : created === 0 ? ctx.at(0, "09:15") : ctx.at(-1, "17:50"),
    };
  });

  // 제출
  const subIds = new Map<SubDef, string>();
  let subSeq = def.subs.filter((s) => s.id).length;
  const submissions: Row<"submissions">[] = def.subs.map((s) => {
    const id = s.id ?? `sub-${key}-${pad(++subSeq)}`;
    subIds.set(s, id);
    const t = def.tasks.find((x) => x[0] === s.task)!;
    const reviewer = t[5];
    const reviewed = s.status !== "submitted";
    // L2(고객 비밀) 업무는 AI 연결 제출이 없어요(국내 경로 개통 전, 빌드 스펙 6.3절·A-10). 시드가 실수해도 웹 제출로 만듦
    const l2 = tasks.find((x) => x.id === tid(s.task))?.sensitivity === "L2";
    const ai = l2 ? undefined : s.ai;
    return {
      id, task_id: tid(s.task), version: s.v, artifact_id: s.artifact ?? null, summary: s.summary, submitted_by: t[4],
      via: ai ? "ai_connection" : "web", via_client: ai ?? null, idempotency_key: ai ? `mcp-${id}` : null, status: s.status,
      review_comment: s.comment ?? null, reviewed_by: reviewed ? reviewer : null, reviewed_at: reviewed && s.reviewedAt ? ctx.at(...s.reviewedAt) : null,
      submitted_at: ctx.at(...s.at), created_by: t[4], created_at: ctx.at(...s.at),
      updated_at: reviewed && s.reviewedAt ? ctx.at(...s.reviewedAt) : ctx.at(...s.at),
    };
  });

  // 진행 기록(추가만): 상태별 개수, AI 연결이 있는 담당자는 일부를 AI 연결이 남김
  const rng: Rng = ctx.rng("work.progress_logs");
  const logs: Row<"progress_logs">[] = [];
  let logSeq = 0;
  // 같은 사람이 같은 날 같은 시각·같은 문장으로 두 번 남기지 않게(감사 로그에 똑같은 줄이 겹쳐 보이던 문제)
  const usedSlot = new Set<string>();
  const usedBody = new Set<string>();
  const pushLog = (taskN: number, author: string, body: string, day: number, time: string, ai: string | null) => {
    logs.push({ id: `pl-${key}-${pad(++logSeq)}`, task_id: tid(taskN), author_id: author, body, via: ai ? "ai_connection" : "web", via_client: ai,
      created_by: author, created_at: ctx.at(day, time), updated_at: ctx.at(day, time) });
  };
  for (const [n, , , , assignee, , status, due, o = {}] of def.tasks) {
    const created = createdOf(due, o, status);
    if (key === "cr" && n === 1) {
      // 앵커 업무 t-cr-001: 9/23 AI 연결(Claude) 초안 1차 완성 → (추석 연휴) → 9/28 수정 요청 → AI 연결로 v2
      pushLog(1, E1, "킥오프 회의 기록과 요구사항 정리본을 다시 읽었어요.", -8, "10:10", null);
      pushLog(1, E1, "제안서 초안 1차를 완성했어요. 과정 구성 표를 붙였어요.", -7, "16:20", "Claude");
      pushLog(1, E1, LOG_REWORK, -2, "09:40", null);
      pushLog(1, E1, "첫 장에 교육 목표 3줄 요약을 넣었어요. 실습 비중을 60%로 고쳤어요.", -1, "17:20", "Claude");
      pushLog(1, E1, LOG_END[0]!, 0, "08:30", null);
      continue;
    }
    if (key === "tr" && n === 28) {
      // 앵커 현장 등록 fr-tr-0085(08:40) → 공장장이 08:45에 업무로 → 점검(현장 등록보다 앞선 기록이 없게)
      pushLog(28, PL, "PR-010-02에 사용 중지 표시를 붙였어요.", 0, "08:50", null);
      pushLog(28, PL, "클러치·브레이크 쪽에서 소리가 나는지 확인했어요.", 0, "09:15", null);
      continue;
    }
    if (key === "tr" && n === 1) {
      pushLog(1, QA, "S-260916-012 LOT의 편조·프레스 기록을 모았어요.", -9, "10:30", null);
      pushLog(1, QA, "LOT 체인 4단계를 표로 정리했어요.", -7, "14:10", null);
      pushLog(1, QA, "KN-07 편조 조건 기록을 같은 기간과 비교했어요.", -2, "11:20", null);
      pushLog(1, QA, "원인 후보 3가지와 판단 근거를 정리했어요.", -1, "16:40", null);
      pushLog(1, QA, LOG_END[0]!, 0, "07:40", null);
      continue;
    }
    const count = status === "todo" ? (rng.chance(0.5) ? 1 : 0)
      : status === "in_progress" ? rng.int(3, 5)
      : status === "submitted" ? rng.int(4, 5)
      : status === "changes_requested" ? rng.int(3, 5)
      : status === "done" ? (o.desc?.startsWith("이전 도구") ? 1 : rng.int(3, 4))
      : 1;
    const last = status === "done" || status === "canceled" ? o.end ?? -1 : status === "todo" ? Math.min(created + 1, 0) : 0;
    const span = Math.max(0, last - created);
    // L2 업무에는 AI 연결 기록을 만들지 않아요(위 제출과 같은 규칙)
    const aiClient = tasks.find((x) => x.id === tid(n))?.sensitivity === "L2" ? null : def.ai[assignee] ?? null;
    const createdTime = o.ct ?? "09:00";
    const mids = def.midLogs(o.type ?? null, assignee);
    for (let i = 0; i < count; i += 1) {
      // 쉬는 날(일요일·공휴일, CRATA는 토요일도)에는 기록을 남기지 않아요 → 같은 구간 안의 앞쪽 일하는 날로
      let day = Math.min(0, created + Math.round(((i + 1) / (count + 1)) * span));
      while (day > created && isOffDay(ctx.d(day), { saturday: key === "cr" })) day -= 1;
      if (isOffDay(ctx.d(day), { saturday: key === "cr" })) continue;
      // 만든 날의 기록은 만든 시각 뒤에만(오늘은 지금 09:30 전까지)
      const pool = (day === 0 ? ["08:05", "08:20", "08:45", "09:05"] : LOG_TIMES).filter((t) => day !== created || t > createdTime);
      if (!pool.length) continue;
      const free = pool.filter((t) => !usedSlot.has(`${assignee}|${day}|${t}`));
      const time = rng.pick(free.length ? free : pool);
      usedSlot.add(`${assignee}|${day}|${time}`);
      let body: string;
      let ai: string | null = null;
      if (status === "canceled") body = LOG_CANCEL;
      else if (i === 0) body = rng.pick(LOG_START);
      else if (status === "changes_requested" && i === count - 1) body = LOG_REWORK;
      else if ((status === "submitted" || status === "done") && i === count - 1) body = rng.pick(LOG_END);
      else if (aiClient && rng.chance(def.aiRate)) { body = rng.pick(LOG_AI); ai = aiClient; }
      else {
        const fresh = mids.filter((b) => !usedBody.has(`${assignee}|${day}|${b}`));
        body = rng.pick(fresh.length ? fresh : mids);
      }
      if (aiClient && i > 0 && !ai && status !== "canceled" && rng.chance(def.aiRate / 2) && body !== LOG_REWORK) { body = rng.pick(LOG_AI); ai = aiClient; }
      usedBody.add(`${assignee}|${day}|${body}`);
      pushLog(n, assignee, body, day, time, ai);
    }
  }

  // 회의·구간·결정·액션 제안
  const meetings: Row<"meetings">[] = def.meetings.map((m) => {
    const sens: Sens = m.sens ?? (m.projects.some((p) => sensOf(p) === "L2") ? "L2" : "L1");
    return {
      id: m.id, title: m.title, title_prefix: m.prefix, meeting_type: m.type, project_ids: m.projects, started_at: ctx.at(...m.at), duration_min: m.min,
      attendee_ids: m.who, source: m.source ?? "manual",
      transcript_ref: m.status === "scheduled" ? null : `https://meetings.example.invalid/${key}/${m.id}`,
      summary: m.summary, sensitivity: sens, status: m.status, created_by: m.who[0], created_at: ctx.at(m.at[0] > 0 ? -1 : m.at[0], m.status === "scheduled" ? "10:00" : "18:00"),
    };
  });
  const meetingById = new Map(def.meetings.map((m) => [m.id, m]));
  const segments: Row<"meeting_segments">[] = [];
  const firstSegOf = new Map<string, string>();
  for (const [mid, list] of Object.entries(def.segs)) {
    const m = meetingById.get(mid)!;
    list.forEach(([from, to, bl, prj, type, conf, quote, status], i) => {
      const id = `seg-${mid.slice(4)}-${i + 1}`;
      if (!firstSegOf.has(mid)) firstSegOf.set(mid, id);
      segments.push({ id, meeting_id: mid, start_ts: Math.round(from * 60), end_ts: Math.round(to * 60), business_line_code: bl, project_code: prj, task_type: type,
        confidence: conf, evidence_quote: quote, review_status: status, created_at: ctx.at(m.at[0], "18:10") });
    });
  }
  const decId = (n: number) => `dec-${key}-${pad(n, 2)}`;
  const decisions: Row<"decisions">[] = def.decs.map(([n, meeting, project, statement, role, at, status, sup]) => ({
    id: decId(n), meeting_id: meeting, project_id: project, statement, decided_by_role: role, decided_at: ctx.at(...at), supersedes_id: sup ? decId(sup) : null, status,
    created_at: ctx.at(at[0], "18:10"),
  }));
  const actionProposals: Row<"action_proposals">[] = def.aps.map(([n, meeting, title, assignee, due, status, task]) => ({
    id: `ap-${key}-${pad(n, 2)}`, meeting_id: meeting, segment_id: firstSegOf.get(meeting) ?? null, title, suggested_assignee_id: assignee,
    suggested_due_at: ctx.at(due, "18:00"), status, task_id: task ? tid(task) : null, created_at: ctx.at(meetingById.get(meeting)!.at[0], "18:10"),
  }));

  return { tasks, submissions, progress_logs: logs, meetings, meeting_segments: segments, decisions, action_proposals: actionProposals };
}

/** CRATA 지표(CR_*, 6.5절): 최근 6개월(오늘이 속한 달까지) */
function crataKpis(ctx: SeedContext): SeedOutput {
  const [y, m] = ctx.today.split("-").map(Number) as [number, number];
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const defs: { id: string; name: string; unit: string; values: number[]; target: number | null; target_label: string | null; source: string; owner: string }[] = [
    { id: "CR_PROPOSAL_WIN", name: "제안 수주율", unit: "%", values: [31, 33, 35, 38, 40, 44], target: 50, target_label: "목표 50%", source: "영업 파이프라인 수주 ÷ 제안(예시)", owner: CEO },
    { id: "CR_ACTIVE_PROJECTS", name: "진행 중 프로젝트", unit: "개", values: [6, 7, 7, 8, 8, 9], target: null, target_label: null, source: "사업·프로젝트 진행 상태(예시)", owner: OPS },
    { id: "CR_SATISFACTION", name: "강의 만족도", unit: "점", values: [4.3, 4.4, 4.4, 4.5, 4.6, 4.6], target: 4.5, target_label: "목표 4.5점(5점 만점)", source: "강의 후 설문 평균(예시)", owner: EL },
  ];
  return {
    kpis: defs.map((k) => ({ id: k.id, name: k.name, unit: k.unit, baseline: k.values[0]!, target: k.target, target_label: k.target_label, measure_source: k.source, owner_id: k.owner, review_cycle: "월" })),
    kpi_values: defs.flatMap((k) => k.values.map((v, i) => ({
      id: `kv-${k.id}-${months[i]}`, kpi_id: k.id, period: months[i]!, value: v, note: "예시 값이에요", recorded_at: ctx.at(-30 * (5 - i), "18:00"),
    }))),
  };
}

function seed(ctx: SeedContext): SeedOutput {
  if (ctx.tenant.slug === "crata-demo") {
    return {
      ...seedTenant(ctx, { key: "cr", tasks: CR_TASKS, subs: CR_SUBS, meetings: CR_MEETINGS, segs: CR_SEGS, decs: CR_DECS, aps: CR_APS, ai: CR_AI, aiRate: 0.42,
        // 대표는 검토를 받는 쪽이 아니라서 '검토자에게 물어봤어요'를 쓰지 않아요
        midLogs: (_type, assignee) => (assignee === CEO ? LOG_MID_CR.filter((x) => x !== ASK_REVIEWER) : LOG_MID_CR) }),
      ...crataKpis(ctx),
    };
  }
  if (ctx.tenant.slug === "tr-technology") {
    return seedTenant(ctx, { key: "tr", tasks: TR_TASKS, subs: TR_SUBS, meetings: TR_MEETINGS, segs: TR_SEGS, decs: TR_DECS, aps: TR_APS, ai: TR_AI, aiRate: 0.25,
      // 업무 종류별 문장 + '검토자에게 물어봤어요'(공장장·대표가 담당이면 빼요)
      midLogs: (type, assignee) => {
        const base = type && TR_TYPE_GROUP[type] ? LOG_MID_TR[TR_TYPE_GROUP[type]!] : LOG_MID_TR.plan;
        return assignee === PL || assignee === T_CEO ? base : [...base, ASK_REVIEWER];
      } });
  }
  return {};
}

// ─────────────────────────────────────────────── 이름 있는 동작(5.8절). 동기 함수, 권한은 ctx.can으로 직접 확인
const me = (ctx: ActionContext) => ctx.persona.memberId;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function requireTask(ctx: ActionContext, id: unknown) {
  return (typeof id === "string" ? ctx.get("tasks", id) : null) ?? ctx.fail(404, "찾는 항목이 없어요");
}
function requireSubmission(ctx: ActionContext, id: unknown) {
  return (typeof id === "string" ? ctx.get("submissions", id) : null) ?? ctx.fail(404, "찾는 항목이 없어요");
}
function canReview(ctx: ActionContext, sub: RowOf<"submissions">) {
  const task = ctx.raw.get("tasks", sub.task_id);
  if (task?.assignee_id === me(ctx) || sub.submitted_by === me(ctx)) ctx.fail(403, "내 제출은 지정된 검토자가 승인해요");
  if (!ctx.can("submissions", "approve", sub as unknown as Record<string, unknown>)) ctx.fail(403, "이 업무의 검토자가 승인할 수 있어요");
  if (sub.status !== "submitted") ctx.fail(409, "이미 처리한 제출이에요");
}

const rpc: Record<string, RpcHandler> = {
  /** 담당자 제출: 새 버전 + 업무 '검토 대기' + 검토자 알림 */
  submit_task: (ctx, p: { taskId?: string; summary?: string; artifactId?: string | null; link?: string | null }) => {
    const task = requireTask(ctx, p.taskId);
    if (task.assignee_id !== me(ctx)) ctx.fail(403, "담당자만 제출할 수 있어요");
    if (!["todo", "in_progress", "changes_requested"].includes(task.status)) ctx.fail(409, "지금은 제출할 수 없어요. 검토가 끝난 뒤 다시 시도해 주세요");
    const summary = text(p.summary);
    if (summary.length < 5) ctx.fail(400, "제출 요약을 5자 이상 적어 주세요");
    const link = text(p.link);
    const prev = ctx.raw.list("submissions", { filters: [{ field: "task_id", operator: "eq", value: task.id }] });
    const version = prev.reduce((mx, s) => Math.max(mx, s.version), 0) + 1;
    const now = ctx.clock.now();
    const sub = ctx.insert("submissions", {
      task_id: task.id, version, artifact_id: p.artifactId || null, summary: link ? `${summary}\n외부 링크: ${link}` : summary, submitted_by: me(ctx), via: "web", via_client: null,
      idempotency_key: null, status: "submitted", review_comment: null, reviewed_by: null, reviewed_at: null, submitted_at: now,
    });
    ctx.update("tasks", task.id, { status: "submitted" });
    if (task.reviewer_id !== me(ctx)) {
      ctx.notify({ recipientId: task.reviewer_id, kind: "review_requested", title: `"${task.title}" 검토 요청(v${version})`, link: `/work/review?selected=${sub.id}`, sourceModule: "tasks", sourceId: sub.id });
    }
    ctx.audit({ action: "rpc:submit_task", resource: "tasks", resourceId: task.id, changes: { status: [task.status, "submitted"] } });
    return { ok: true, submissionId: sub.id, version };
  },

  /** 검토자 승인: 제출 승인 + 업무 완료 + 담당자 알림 */
  approve_submission: (ctx, p: { submissionId?: string; comment?: string | null }) => {
    const sub = requireSubmission(ctx, p.submissionId);
    canReview(ctx, sub);
    const task = ctx.raw.get("tasks", sub.task_id) ?? ctx.fail(404, "찾는 항목이 없어요");
    const now = ctx.clock.now();
    ctx.update("submissions", sub.id, { status: "approved", review_comment: text(p.comment) || null, reviewed_by: me(ctx), reviewed_at: now });
    ctx.update("tasks", task.id, { status: "done" });
    ctx.notify({ recipientId: task.assignee_id, kind: "submission_approved", title: `"${task.title}" 승인됐어요`, link: `/work/tasks/${task.id}`, sourceModule: "tasks", sourceId: sub.id });
    // 지정 검토자가 아닌 소유자·관리자가 승인하면 '대신 승인'으로 남겨요(지정 검토자에게도 알림)
    const substitute = task.reviewer_id !== me(ctx);
    if (substitute) {
      ctx.notify({ recipientId: task.reviewer_id, kind: "submission_approved", title: `"${task.title}" 대신 승인됐어요`, link: `/work/tasks/${task.id}`, sourceModule: "tasks", sourceId: sub.id });
    }
    ctx.audit({ action: substitute ? "rpc:approve_submission_substitute" : "rpc:approve_submission", resource: "submissions", resourceId: sub.id, changes: { status: ["submitted", "approved"] } });
    return { ok: true, taskId: task.id };
  },

  /** 검토자 수정 요청: 코멘트 필수 + 업무 '수정 요청' + 담당자 알림 */
  request_changes: (ctx, p: { submissionId?: string; comment?: string }) => {
    const sub = requireSubmission(ctx, p.submissionId);
    canReview(ctx, sub);
    const comment = text(p.comment);
    if (comment.length < 5) ctx.fail(400, "수정 요청 코멘트를 5자 이상 적어 주세요");
    const task = ctx.raw.get("tasks", sub.task_id) ?? ctx.fail(404, "찾는 항목이 없어요");
    const now = ctx.clock.now();
    ctx.update("submissions", sub.id, { status: "rejected", review_comment: comment, reviewed_by: me(ctx), reviewed_at: now });
    ctx.update("tasks", task.id, { status: "changes_requested" });
    ctx.notify({ recipientId: task.assignee_id, kind: "submission_returned", title: `"${task.title}" 수정 요청`, body: comment, link: `/work/tasks/${task.id}`, sourceModule: "tasks", sourceId: sub.id });
    ctx.audit({ action: "rpc:request_changes", resource: "submissions", resourceId: sub.id, changes: { status: ["submitted", "rejected"] } });
    return { ok: true, taskId: task.id };
  },

  /** 회의 액션 제안 → 업무(source=meeting) + 담당자 알림 */
  accept_action_proposal: (ctx, p: { proposalId?: string; assigneeId?: string; dueAt?: string | null; title?: string; reviewerId?: string }) => {
    if (!ctx.can("meetings", "approve")) ctx.fail(403, "검토자가 확인하면 업무가 돼요");
    const ap = (typeof p.proposalId === "string" ? ctx.get("action_proposals", p.proposalId) : null) ?? ctx.fail(404, "찾는 항목이 없어요");
    if (ap.status !== "proposed") ctx.fail(409, "이미 처리한 제안이에요");
    const meeting = ctx.raw.get("meetings", ap.meeting_id) ?? ctx.fail(404, "찾는 항목이 없어요");
    const assignee = text(p.assigneeId) || ap.suggested_assignee_id || me(ctx);
    if (!ctx.tenant.people.some((x) => x.id === assignee)) ctx.fail(400, "담당자를 골라 주세요");
    const projectId = meeting.project_ids[0] ?? null;
    if (!projectId) ctx.fail(400, "회의에 프로젝트가 없어서 업무를 만들 수 없어요");
    const project = ctx.raw.get("projects", projectId!);
    const reviewer = text(p.reviewerId) || project?.reviewer_member_id || me(ctx);
    const title = text(p.title) || ap.title;
    const task = ctx.insert("tasks", {
      project_id: projectId!, part_id: null, title, description: `회의 "${meeting.title}"에서 나온 액션이에요.\n${CRITERIA_PREFIX}${DEFAULT_CRIT}`, task_type: null,
      assignee_id: assignee, reviewer_id: reviewer, due_at: p.dueAt || ap.suggested_due_at, priority: "normal", status: "todo",
      source: "meeting", source_ref: ap.id, estimate_hours: null, sensitivity: meeting.sensitivity,
    });
    ctx.update("action_proposals", ap.id, { status: "accepted", task_id: task.id });
    if (assignee !== me(ctx)) {
      ctx.notify({ recipientId: assignee, kind: "task_assigned", title: `새 업무 "${title}"`, link: `/work/tasks/${task.id}`, sourceModule: "tasks", sourceId: task.id });
    }
    ctx.audit({ action: "rpc:accept_action_proposal", resource: "action_proposals", resourceId: ap.id, changes: { status: ["proposed", "accepted"] } });
    ctx.audit({ action: "create", resource: "tasks", resourceId: task.id, changes: { source: [null, "meeting"] } });
    return { ok: true, taskId: task.id };
  },

  /** 구간 분류 확인(맞아요) 또는 고치기. 확인할 구간이 남지 않으면 회의를 '확인 완료'로 */
  confirm_segment: (ctx, p: { segmentId?: string; correction?: { businessLineCode?: string | null; projectCode?: string | null; taskType?: string | null } | null }) => {
    if (!ctx.can("meetings", "approve")) ctx.fail(403, "검토자가 분류를 확인할 수 있어요");
    const seg = (typeof p.segmentId === "string" ? ctx.get("meeting_segments", p.segmentId) : null) ?? ctx.fail(404, "찾는 항목이 없어요");
    const c = p.correction;
    const patch = c
      ? { review_status: "corrected" as const, business_line_code: c.businessLineCode ?? null, project_code: c.projectCode ?? null, task_type: c.taskType ?? null }
      : { review_status: "confirmed" as const };
    if (!c && !seg.business_line_code) ctx.fail(400, "미분류 구간은 '고치기'로 사업을 골라 주세요");
    ctx.update("meeting_segments", seg.id, patch);
    const rest = ctx.raw.list("meeting_segments", { filters: [{ field: "meeting_id", operator: "eq", value: seg.meeting_id }] })
      .filter((s) => s.id !== seg.id && (s.review_status === "pending" || s.review_status === "unclassified"));
    const meeting = ctx.raw.get("meetings", seg.meeting_id);
    if (!rest.length && meeting?.status === "needs_review") ctx.update("meetings", meeting.id, { status: "confirmed" });
    ctx.audit({ action: "rpc:confirm_segment", resource: "meeting_segments", resourceId: seg.id, changes: { review_status: [seg.review_status, patch.review_status] } });
    return { ok: true, meetingConfirmed: !rest.length };
  },

  /** 업무 만들기(W-03 서랍): 행 생성 + 담당자 알림(task_assigned) */
  create_task: (ctx, p: Partial<RowOf<"tasks">>) => {
    if (!ctx.can("tasks", "create") || ctx.persona.role === "member") ctx.fail(403, "업무는 검토자 이상이 만들 수 있어요");
    const title = text(p.title);
    if (title.length < 2) ctx.fail(400, "업무 제목을 적어 주세요");
    if (!p.project_id || !ctx.get("projects", p.project_id)) ctx.fail(400, "프로젝트를 골라 주세요");
    if (!p.assignee_id || !p.reviewer_id) ctx.fail(400, "담당과 검토자를 골라 주세요");
    const task = ctx.insert("tasks", {
      project_id: p.project_id!, part_id: p.part_id ?? null, title, description: p.description ?? null, task_type: p.task_type ?? null,
      assignee_id: p.assignee_id!, reviewer_id: p.reviewer_id!, due_at: p.due_at ?? null, priority: p.priority ?? "normal", status: "todo",
      source: "manual", source_ref: null, estimate_hours: p.estimate_hours ?? null, sensitivity: p.sensitivity ?? "L1",
    });
    if (task.assignee_id !== me(ctx)) {
      ctx.notify({ recipientId: task.assignee_id, kind: "task_assigned", title: `새 업무 "${title}"`, link: `/work/tasks/${task.id}`, sourceModule: "tasks", sourceId: task.id });
    }
    ctx.audit({ action: "rpc:create_task", resource: "tasks", resourceId: task.id, changes: { title: [null, title], assignee_id: [null, task.assignee_id] } });
    return { ok: true, taskId: task.id };
  },

  /** 결정 확정: 바꾼 결정이 있으면 이전 결정을 '바뀜'으로 */
  confirm_decision: (ctx, p: { decisionId?: string }) => {
    if (!ctx.can("meetings", "approve")) ctx.fail(403, "검토자가 결정을 확정할 수 있어요");
    const dec = (typeof p.decisionId === "string" ? ctx.get("decisions", p.decisionId) : null) ?? ctx.fail(404, "찾는 항목이 없어요");
    if (dec.status !== "proposed") ctx.fail(409, "이미 처리한 결정이에요");
    // 결정 역할이 정해져 있으면 그 역할(또는 owner·admin)만 확정해요
    const myTitle = ctx.tenant.roles.find((r) => r.code === ctx.persona.roleCode)?.title;
    const adminish = ctx.persona.role === "owner" || ctx.persona.role === "admin";
    if (dec.decided_by_role && !adminish && myTitle !== dec.decided_by_role) ctx.fail(403, `${dec.decided_by_role} 확인이 필요해요`);
    ctx.update("decisions", dec.id, { status: "confirmed" });
    if (dec.supersedes_id) {
      const old = ctx.raw.get("decisions", dec.supersedes_id);
      if (old && old.status !== "superseded") ctx.update("decisions", old.id, { status: "superseded" });
    }
    ctx.audit({ action: "rpc:confirm_decision", resource: "decisions", resourceId: dec.id, changes: { status: ["proposed", "confirmed"] } });
    return { ok: true };
  },
};

const sel: Record<string, SelectorHandler> = {};

export default defineGroup({ group: "work", seed, rpc, sel });
