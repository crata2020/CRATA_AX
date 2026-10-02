// 홈 위젯 mfg-legal-calendar · 법정 일정 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-legal-calendar(src/data/seed/home.ts) — 법정 일정·설비 법정 검사, 가까운 순 4건
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-legal-calendar",
  title: "법정 일정",
  size: "M",
  link: { label: "더보기", to: "/company/safety" },
  requires: { modules: ["safety-health"] },
  emptyText: "다가오는 법정 일정이 없어요",
});
