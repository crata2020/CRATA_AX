// 홈 위젯 mfg-first-mid-last · 초중종물 미실시 · 템플릿 list · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-first-mid-last(src/data/seed/home.ts) — 오늘 작업지시 중 초물·중물·종물 검사가 빠진 것
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-first-mid-last",
  title: "초중종물 미실시",
  size: "S",
  link: { label: "더보기", to: "/ops/production?tab=work-orders" },
  requires: { modules: ["mfg-production", "mfg-quality"] },
  emptyText: "오늘 빠진 초중종물 검사가 없어요",
});
