// 홈 위젯 recent-decisions · 최근 결정 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.recent-decisions(src/data/seed/home.ts) — 확정된 결정, 지난 7일(이번 달이면 이번 달) 최신 5건
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "recent-decisions",
  title: "최근 결정",
  size: "M",
  link: { label: "더보기", to: "/meetings/decisions" },
  requires: { modules: ["meetings"] },
  periodAware: true,
  emptyText: "지난 7일 동안 확정된 결정이 없어요",
});
