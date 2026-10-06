// 홈 히어로 '오늘 할 일' 숫자 모델(소유: home 그룹). 화면 없이 테스트할 수 있게 순수 함수로 둡니다(tests/unit/hero.test.ts).
// 규칙: 큰 숫자 = 그 아래 rows의 합(같은 단위 '건'만). 0인 줄은 숨기고, 모든 줄이 0일 때만 빈 문장을 보여요.
//   검토자 이상·구성원: 기한 지남 + 오늘 마감 + 수정 요청(+ 검토 요청: 검토자 이상, 내가 지정 검토자인 것만)
//     한 업무는 한 줄에만 들어가요(기한 지남 → 오늘 마감 → 수정 요청 순)
//   TR 생산 작업자: 오늘 작업지시를 공정별(편조 · 가공)로. 한 공정뿐이면 줄 없이 큰 숫자만(같은 말을 두 번 쓰지 않게)
//   aside(합에 넣지 않는 참고, 0이면 숨김): 남은 내 업무, 회사 전체 검토 대기(소유자·관리자), 점검 전 내 설비(대)·오늘 마감 업무(작업자)
import type { HomeToday } from "./types";

export interface HeroRow { key: string; label: string; value: number; unit: string; to: string }
export interface HeroModel {
  total: number;
  /** 큰 숫자 위 라벨 */
  label: string;
  /** 큰 숫자를 이루는 줄(합 = total). 비어 있으면 큰 숫자만 */
  rows: HeroRow[];
  /** 합에 넣지 않는 참고 링크 */
  aside: HeroRow[];
  button: { label: string; to: string };
}

const sum = (rows: HeroRow[]) => rows.reduce((s, r) => s + r.value, 0);

export function heroModel(d: HomeToday): HeroModel {
  if (d.mode === "operator" && d.workOrdersToday != null) {
    const total = d.workOrdersToday;
    const parts = (d.workOrdersByProcess ?? []).filter((p) => p.count > 0);
    const rows: HeroRow[] = parts.length > 1
      ? parts.map((p) => ({ key: `wo-${p.key}`, label: `${p.label} 작업지시`, value: p.count, unit: "건", to: "/ops/production?tab=work-orders" }))
      : [];
    const aside: HeroRow[] = [];
    // 점검할 설비가 남았을 때만(0대 링크는 갈 곳이 없고, 히어로의 단 하나의 주 동작 '현장 등록하기'와 다투기만 해요)
    if (d.checksPending != null && d.checksPending > 0) aside.push({ key: "chk", label: "점검 전 내 설비", value: d.checksPending, unit: "대", to: "/ops/production/board" });
    if (d.dueToday > 0) aside.push({ key: "due", label: "오늘 마감 업무", value: d.dueToday, unit: "건", to: "/work?due=today" });
    return { total, label: "오늘 작업지시", rows, aside, button: { label: "현장 등록하기", to: "/ops/report" } };
  }
  const reviewer = d.mode === "reviewer";
  const all: HeroRow[] = [
    { key: "late", label: "기한 지남", value: d.overdue, unit: "건", to: "/work?due=overdue" },
    { key: "due", label: "오늘 마감", value: d.dueToday, unit: "건", to: "/work?due=today" },
    { key: "ret", label: "수정 요청", value: d.returnedOnly, unit: "건", to: "/work?status=changes_requested" },
    ...(reviewer ? [{ key: "rev", label: "검토 요청", value: d.reviewWaiting, unit: "건", to: "/work/review" }] : []),
  ];
  const rows = all.filter((r) => r.value > 0);
  const aside: HeroRow[] = [];
  if (d.myOpen > 0) aside.push({ key: "open", label: "남은 내 업무", value: d.myOpen, unit: "건", to: "/work" });
  if (d.companyReviewWaiting != null && d.companyReviewWaiting > d.reviewWaiting) {
    aside.push({ key: "company", label: "회사 전체 검토 대기", value: d.companyReviewWaiting, unit: "건", to: "/work/review?scope=all" });
  }
  const onlyReview = rows.length > 0 && rows.every((r) => r.key === "rev");
  return {
    total: sum(rows),
    label: "오늘 처리할 일",
    rows,
    aside,
    button: onlyReview ? { label: "검토함 열기", to: "/work/review" } : { label: "내 업무 보기", to: "/work" },
  };
}
