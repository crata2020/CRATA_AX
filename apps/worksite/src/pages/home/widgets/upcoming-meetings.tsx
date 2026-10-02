// 홈 위젯 upcoming-meetings · 회의와 내 액션 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.upcoming-meetings(src/data/seed/home.ts) — 오늘~7일(이번 달이면 30일) 내가 참석하는 회의 + 나에게 제안된 액션
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "upcoming-meetings",
  title: "회의와 내 액션",
  size: "M",
  link: { label: "더보기", to: "/meetings" },
  requires: { modules: ["meetings"] },
  periodAware: true,
  emptyText: "이번 주 회의가 없어요",
});
