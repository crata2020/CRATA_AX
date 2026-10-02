// 홈 히어로 '오늘 할 일' 숫자 모델(소유: home 그룹). 화면 없이 테스트할 수 있게 순수 함수로 둡니다(tests/unit/hero.test.ts).
// 규칙: 큰 숫자 = 그 아래 rows의 합(같은 단위 '건'만). 합에 들지 않는 참고 정보는 aside로 따로(구분선 아래 작은 링크).
//   검토자 이상: 오늘 마감 + 검토 요청 · 구성원: 오늘 마감 + 수정 요청 · TR 생산 작업자: 오늘 작업지시(건)만
//   aside: 진행 중인 내 업무(검토자·구성원), 점검 전 내 설비(대)·오늘 마감 업무(작업자)
import type { HomeToday } from "./types";

export interface HeroRow { key: string; label: string; value: number; unit: string; to: string }
export interface HeroModel {
  total: number;
  /** 큰 숫자 위 라벨 */
  label: string;
  /** 큰 숫자를 이루는 줄(합 = total) */
  rows: HeroRow[];
  /** 합에 넣지 않는 참고 링크 */
  aside: HeroRow[];
  button: { label: string; to: string };
}

const sum = (rows: HeroRow[]) => rows.reduce((s, r) => s + r.value, 0);

export function heroModel(d: HomeToday): HeroModel {
  if (d.mode === "operator" && d.workOrdersToday != null) {
    const rows: HeroRow[] = [{ key: "wo", label: "오늘 작업지시", value: d.workOrdersToday, unit: "건", to: "/ops/production?tab=work-orders" }];
    const aside: HeroRow[] = [];
    if (d.checksPending != null) aside.push({ key: "chk", label: "점검 전 내 설비", value: d.checksPending, unit: "대", to: "/ops/production/board" });
    if (d.dueToday > 0) aside.push({ key: "due", label: "오늘 마감 업무", value: d.dueToday, unit: "건", to: "/work?due=today" });
    return { total: sum(rows), label: "오늘 작업지시", rows, aside, button: { label: "현장 등록하기", to: "/ops/report" } };
  }
  const openAside: HeroRow = { key: "open", label: "진행 중인 내 업무", value: d.myOpen, unit: "건", to: "/work" };
  if (d.mode === "member") {
    const rows: HeroRow[] = [
      { key: "due", label: "오늘 마감", value: d.dueToday, unit: "건", to: "/work?due=today" },
      { key: "ret", label: "수정 요청", value: d.returnedToMe, unit: "건", to: "/work?status=changes_requested" },
    ];
    return { total: sum(rows), label: "오늘 처리할 일", rows, aside: [openAside], button: { label: "내 업무 보기", to: "/work" } };
  }
  const rows: HeroRow[] = [
    { key: "due", label: "오늘 마감", value: d.dueToday, unit: "건", to: "/work?due=today" },
    { key: "rev", label: "검토 요청", value: d.reviewWaiting, unit: "건", to: "/work/review" },
  ];
  return {
    total: sum(rows),
    label: "오늘 처리할 일",
    rows,
    aside: [openAside],
    button: { label: d.reviewWaiting > 0 ? "검토함 열기" : "내 업무 보기", to: d.reviewWaiting > 0 ? "/work/review" : "/work" },
  };
}
