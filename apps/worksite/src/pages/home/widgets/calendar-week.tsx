// 홈 위젯 calendar-week · 이번 주 일정 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.calendar-week(src/data/seed/home.ts) — 이번 주 남은 일정(회사 일정·내 회의·내 마감) 5건
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "calendar-week",
  title: "이번 주 일정",
  size: "M",
  link: { label: "더보기", to: "/company/calendar" },
  requires: { modules: ["calendar"] },
  emptyText: "이번 주 일정이 없어요",
});
