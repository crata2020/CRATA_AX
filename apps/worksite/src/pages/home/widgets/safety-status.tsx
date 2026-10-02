// 홈 위젯 safety-status · 안전보건 현황 · 템플릿 figure · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.safety-status(src/data/seed/home.ts) — 개선 필요 위험성평가(기한 지남) · 다음 반기 점검 D-day · 아차사고 신고 수
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { figureWidget } from "../lib/widgetKit";

export default figureWidget({
  id: "safety-status",
  title: "안전보건 현황",
  size: "M",
  link: { label: "더보기", to: "/company/safety" },
  requires: { modules: ["safety-health"] },
  periodAware: true,
  emptyText: "안전보건 기록이 아직 없어요",
});
