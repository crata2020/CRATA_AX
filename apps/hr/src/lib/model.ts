// 인사 데이터 모델과 CRATA 4종 행동방식검사 어휘.
// 검사 구조(색채 외면·내면·컴포트존·챌린지존 / 행동동기 시작·지속, 고유·현재 / 문제해결 중심·핵심·성장·잠재역량 /
// 관계성장 생각 정리·자신감)는 crata.co.kr/tests 공개 설명을 따릅니다.
// 색 이름, 동기·역량 항목 이름은 화면을 만들기 위한 예시예요. 실제 CRATA 결과 항목으로 바꿔 끼우면 됩니다.

export type ColorKey = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
export type Motive = "goal" | "recognition" | "autonomy" | "people" | "novelty" | "stability" | "growth" | "meaning" | "rhythm" | "reward";
export type Core = "check" | "execute" | "structure" | "mediate" | "explore" | "own";
export type Center = "predictable" | "focus" | "contact" | "field" | "open";
export type Growth = "delegate" | "speak" | "slow" | "start" | "connect";
export type Think = "solo" | "together";
export type Conf = "peer" | "mixed";

export interface Pair<T> { own: T; now: T }

export interface CrataProfile {
  takenAt: string;
  /** 색채검사: 외면(행동적 태도) · 내면(심리적 태도) · 지금 필요한 환경 · 지금 필요하지 않은 환경 */
  color: { outer: ColorKey; inner: ColorKey; comfort: ColorKey; challenge: ColorKey };
  /** 행동동기검사: 무엇이 있어야 시작하는가 · 무엇이 있어야 오래 가는가 (고유 · 현재) */
  motive: { start: Pair<Motive>; keep: Pair<Motive> };
  /** 문제해결방식검사: 중심(환경 조건) · 핵심(해결 패턴) · 성장(넘어서는 행동) · 잠재 */
  problem: { center: Center; core: Core; growth: Growth; latent: string };
  /** 관계성장방식검사: 생각을 정리하는 방식 · 자신감이 자라는 방식 (고유 · 현재) */
  relation: { think: Pair<Think>; conf: Pair<Conf> };
}

export const COLOR: Record<ColorKey, { label: string; hex: string; env: string }> = {
  red: { label: "빨강", hex: "#e5484d", env: "속도와 결과가 바로 보이는 환경" },
  orange: { label: "주황", hex: "#f6924a", env: "직접 부딪혀 해 보는 현장" },
  yellow: { label: "노랑", hex: "#f5b83d", env: "사람을 만나고 표현하는 환경" },
  green: { label: "초록", hex: "#4cc38a", env: "안정되고 조화로운 환경" },
  blue: { label: "파랑", hex: "#5b8def", env: "기준과 절차가 분명한 환경" },
  purple: { label: "보라", hex: "#a07cf0", env: "새 생각과 의미를 찾는 환경" },
};

export const MOTIVE: Record<Motive, string> = {
  goal: "분명한 목표", recognition: "인정", autonomy: "스스로 정할 여지", people: "함께하는 사람", novelty: "새로운 것",
  stability: "안정된 계획", growth: "성장 실감", meaning: "일의 의미", rhythm: "일정한 리듬", reward: "눈에 보이는 보상",
};
export const CORE: Record<Core, string> = {
  check: "꼼꼼한 확인", execute: "빠른 실행", structure: "구조 설계", mediate: "관계 조율", explore: "새 방법 찾기", own: "끝까지 책임",
};
export const CENTER: Record<Center, string> = {
  predictable: "예측 가능한 일정", focus: "혼자 몰입할 시간", contact: "사람과의 접점", field: "몸으로 하는 현장", open: "정해지지 않은 과제",
};
export const GROWTH: Record<Growth, string> = {
  delegate: "맡기고 기다리기", speak: "먼저 말 꺼내기", slow: "속도 늦추고 확인하기", start: "완벽하기 전에 시작하기", connect: "다른 팀과 잇기",
};
export const THINK: Record<Think, string> = { solo: "혼자 정리해야 분명해져요", together: "함께 이야기하며 정리돼요" };
export const CONF: Record<Conf, string> = { peer: "비슷한 수준과 함께 도전할 때 힘이 나요", mixed: "수준이 다른 사람과 어울릴 때 의욕이 생겨요" };
export const THINK_SHORT: Record<Think, string> = { solo: "혼자 정리", together: "함께 정리" };
export const CONF_SHORT: Record<Conf, string> = { peer: "비슷한 수준", mixed: "다른 수준" };

/** 팀이 주는 환경. 진단(인터뷰·셰도잉)에서 정하고 팀장이 확인해요. */
export interface TeamEnv {
  color: ColorKey;
  starts: Motive[];
  keeps: Motive[];
  needs: Core[];
  centers: Center[];
  think: Think;
  conf: Conf;
}

export interface Team {
  id: string;
  name: string;
  aliases: string[];
  parentId: string | null;
  leaderId?: string;
  /** 일이 돌아가는 최소 인원 */
  min: number;
  env: TeamEnv;
  /** 이 팀에 꼭 있어야 하는 기술(사람 수를 셉니다) */
  keySkills: string[];
  /** 이 팀으로 오려면 있어야 하는 교육·자격 */
  requires: string[];
  shift: boolean;
  desc: string;
  /** 대표이사실·공장장처럼 조직도 위쪽 칸(사람을 옮기는 대상이 아님) */
  office?: boolean;
}

/** CRATA 결과 활용 동의. placement = 배치·채용 참고까지 동의, self = 본인만(회사는 5명 이상 팀 분포만), none = 미응시 */
export type Consent = "placement" | "self" | "none";

export interface Person {
  id: string;
  name: string;
  title: string;
  teamId: string;
  leader?: boolean;
  joined: string;
  lastMoved?: string;
  skills: string[];
  licenses: string[];
  shiftOk: boolean;
  consent: Consent;
  crata?: CrataProfile;
}

export type Stage = "applied" | "screened" | "testing" | "tested" | "shortlist" | "interview" | "offer" | "hold" | "closed";

export interface Position {
  id: string;
  title: string;
  teamId: string;
  count: number;
  status: "open" | "closed";
  opened: string;
  deadline: string;
  /** 회사가 적은 "이런 사람을 뽑고 싶어요" */
  brief: string;
  mustLicenses: string[];
  minYears: number;
  shift: boolean;
  /** fit = 팀 환경에 맞는 사람 / complement = 팀에 없는 방식을 채울 사람 */
  mode: "fit" | "complement";
  /** 회사가 강조한 항목(없으면 팀 환경 그대로) */
  want: Partial<Pick<TeamEnv, "needs" | "starts" | "keeps" | "centers" | "think" | "conf">>;
}

export interface Applicant {
  id: string;
  positionId: string;
  name: string;
  appliedAt: string;
  source: "고용24" | "사람인" | "잡코리아" | "직접 지원" | "추천";
  years: number;
  licenses: string[];
  shiftOk: boolean;
  summary: string;
  stage: Stage;
  testSentAt?: string;
  testedAt?: string;
  crata?: CrataProfile;
  note?: string;
}

export const STAGE: Record<Stage, { label: string; step: number }> = {
  applied: { label: "접수", step: 1 },
  screened: { label: "서류 통과", step: 1 },
  testing: { label: "검사 중", step: 2 },
  tested: { label: "검사 완료", step: 2 },
  shortlist: { label: "면접 추천", step: 3 },
  interview: { label: "면접", step: 4 },
  offer: { label: "합격", step: 5 },
  hold: { label: "보류", step: 0 },
  closed: { label: "불합격", step: 0 },
};
