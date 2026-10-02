// 홈 위젯 mfg-field-feed · 오늘 현장 등록 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-field-feed(src/data/seed/home.ts) — 오늘 현장 등록 최신 5건 + 담당 미배정 수
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-field-feed",
  title: "오늘 현장 등록",
  size: "M",
  link: { label: "더보기", to: "/ops/report?tab=feed" },
  requires: { modules: ["mfg-quality"] },
  emptyText: "오늘 등록된 현장 기록이 없어요",
});
