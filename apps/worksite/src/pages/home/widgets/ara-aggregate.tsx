// 홈 위젯 ara-aggregate · 복지 집계 · 템플릿 figure · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.ara-aggregate(src/data/seed/home.ts) — 최신 월 복지 집계(모수 10명 미만이면 위젯 자체를 숨김)
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { figureWidget } from "../lib/widgetKit";

export default figureWidget({
  id: "ara-aggregate",
  title: "복지 집계",
  size: "M",
  link: { label: "더보기", to: "/ara/privacy" },
  requires: { modules: ["ara-wellbeing"], minPopulation: 10 },
  emptyText: "복지 집계는 10명 이상일 때만 보여요",
});
