// home 그룹 셀렉터 결과 타입(시드 파일 src/data/seed/home.ts의 sel과 화면이 함께 씀). 소유: home 그룹.
// 셀렉터는 권한 경로를 거친 행만 읽고, 화면에 보일 글자(날짜·이름)는 셀렉터가 만들어 보냅니다.
import type { Tone } from "@/theme/tokens";

/** 홈 머리·히어로(sel:home.today) */
export interface HomeToday {
  /** reviewer 이상 · member · TR 생산 작업자 */
  mode: "reviewer" | "member" | "operator";
  myOpen: number;
  dueToday: number;
  reviewWaiting: number;
  returnedToMe: number;
  meetingsToday: number;
  /** 3일 안 마감(오늘 포함) */
  dueSoon: number;
  workOrdersToday: number | null;
  checksPending: number | null;
  /** 복지 집계 모수(ara-aggregate 위젯 판단용) */
  population: number;
}

/** 오늘 레일 한 줄 */
export interface RailItem { id: string; title: string; subtitle: string; to: string }
/** 오늘 레일(sel:home.rail): 필독 공지 · 오늘 일정 · 다가오는 회의 */
export interface HomeRail { mustRead: RailItem[]; today: RailItem[]; upcoming: RailItem[] }

/** 위젯 목록 한 줄(셀렉터가 글자를 만들어 보냄) */
export interface WRow {
  id: string;
  title: string;
  subtitle?: string;
  to?: string;
  /** DdayBadge */
  dday?: { date: string; noun?: string } | null;
  /** StatusTag */
  status?: { tone: Tone; label: string } | null;
  /** 작은 회색 태그(예: "필독", "수입검사") */
  tag?: string | null;
  /** 재질 코드(MaterialGradeTag) */
  material?: string | null;
  /** AI 연결로 제출 등 */
  ai?: "submitted" | "draft" | "summary" | null;
  unread?: boolean;
  /** 오른쪽 작은 글자(예: "9일째", "3분 전") */
  trailingText?: string | null;
}

/** list 템플릿: 숫자 1개 + 행 최대 5 */
export interface WList {
  count: number;
  unit: string;
  /** 숫자 옆 설명(예: "검토 대기") */
  label: string;
  /** 숫자 아래 보조 문장(예: "가장 오래 기다린 건 2일") */
  note?: string | null;
  rows: WRow[];
  /** 두 번째 묶음(예: 회의 위젯의 '내 액션 제안') */
  extra?: { title: string; rows: WRow[] } | null;
}

/** figure 템플릿: StatTile 1~4개 */
export interface WStat {
  label: string;
  value: number | string;
  unit?: string;
  caption?: string | null;
  delta?: { value: number; unit?: string; period: string; goodWhen: "up" | "down" | "none" } | null;
  trend?: number[] | null;
  tone?: Tone | null;
  toneLabel?: string | null;
}
export interface WFigure { stats: WStat[]; note?: string | null; empty?: boolean }

/** 차트 막대 한 개 */
export interface WBar { key: string; label: string; value: number; previous?: number }
/** 비중 조각 */
export interface WSeg { key: string; label: string; value: number; tone?: Tone; slot?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | "other"; color?: string }

// ───────── 위젯별 결과
export interface TeamWorkload { total: number; segments: WSeg[]; people: { memberId: string; name: string; inProgress: number }[] }
export interface ProjectHealth { active: number; health: { tone: Tone; label: string; count: number }[]; lines: { id: string; name: string; count: number }[]; dueSoon: WRow[] }
export interface CompanyKpi { stats: WStat[] }
export interface AxEffect { stats: WStat[]; bars: WBar[]; highlightKey: string | null; latestLabel: string | null }
export interface AiConnect { enabled: boolean; rows: WRow[] }
/** 오늘 생산: 공정마다 한 줄(양품 / 오늘 계획 + 지금 시각까지 계획상 양 눈금) */
export interface ProductionRow { key: string; label: string; good: number; planned: number; unit: string; expected: number }
export interface ProductionToday {
  rows: ProductionRow[];
  defects: number;
  /** 최근 실적 등록 시각("09:20"). 없으면 null */
  asOf: string | null;
  /** 지금 시각("09:30") */
  now: string;
}
export interface QualityPpm {
  stat: WStat | null;
  bars: WBar[];
  highlightKey: string | null;
  target: number;
  claimsThisMonth: number;
  openActions: number;
}
export interface EquipmentStatus {
  shiftLabel: string;
  segments: WSeg[];
  total: number;
  knit: { running: number; total: number } | null;
  checksMissing: number;
}
export interface MonthlySummary { bars: WBar[]; highlightKey: string | null; unit: string; achievement: WStat | null; ppmSentence: string | null }
export interface OrderBacklog { top: WRow[]; segments: WSeg[]; openLines: number }
export interface MaterialPrice { rows: { material: string; unit: string; latest: number; values: number[]; changePct: number | null; period: string }[] }
export interface SafetyStatus { stats: WStat[] }

/** 검색 결과(sel:search) */
export interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  to: string;
  status?: { tone: Tone; label: string } | null;
  dday?: string | null;
  /** 사람 결과: 업무 연락처(복사) */
  person?: { memberId: string; email: string | null; phone: string | null } | null;
}
export type SearchGroupKey = "people" | "projects" | "partners" | "tasks" | "meetings" | "docs" | "knowledge" | "notices" | "items" | "lots" | "claims";
export interface SearchGroup { key: SearchGroupKey; label: string; total: number; items: SearchItem[] }
export interface SearchResult { q: string; groups: SearchGroup[]; total: number }

/** 알림 설정 저장(rpc:save_notification_preferences) */
export interface SaveNotificationPrefsInput {
  scope: "me" | "company";
  digest: "instant" | "twice_daily" | "daily";
  quietHours: { from: string; to: string } | null;
  site: Record<string, boolean>;
}
