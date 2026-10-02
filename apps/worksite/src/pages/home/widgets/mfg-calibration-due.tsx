// 홈 위젯 mfg-calibration-due · 계측기 검교정 · 템플릿 list · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-calibration-due(src/data/seed/home.ts) — 다음 검교정이 30일 안인 계측기
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-calibration-due",
  title: "계측기 검교정",
  size: "S",
  link: { label: "더보기", to: "/ops/quality?tab=gauges" },
  requires: { modules: ["mfg-quality"] },
  emptyText: "30일 안 검교정이 없어요",
});
