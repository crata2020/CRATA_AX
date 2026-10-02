// 홈 위젯 mfg-inspection-queue · 검사 대기 · 템플릿 list · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-inspection-queue(src/data/seed/home.ts) — 수입검사 전 입고 LOT + 출하검사 전 출하 예정, 오래된 순
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-inspection-queue",
  title: "검사 대기",
  size: "S",
  link: { label: "더보기", to: "/ops/quality?tab=inspections" },
  requires: { modules: ["mfg-quality"] },
  emptyText: "검사 대기 LOT이 없어요",
});
