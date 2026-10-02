// 홈 위젯 mfg-4m-changes · 4M 변경 · 템플릿 figure · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-4m-changes(src/data/seed/home.ts) — 진행 중 4M 변경 수 + 고객 승인 대기 최장 일수
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { figureWidget } from "../lib/widgetKit";

export default figureWidget({
  id: "mfg-4m-changes",
  title: "4M 변경",
  size: "S",
  link: { label: "더보기", to: "/ops/quality?tab=changes" },
  requires: { modules: ["mfg-quality"] },
  emptyText: "진행 중인 4M 변경이 없어요",
});
