// 홈 위젯 mfg-delivery-due · 납기 임박 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-delivery-due(src/data/seed/home.ts) — 납기 7일(이번 달이면 30일) 안, 출하 전 수주 줄
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-delivery-due",
  title: "납기 임박",
  size: "M",
  link: { label: "더보기", to: "/ops/orders" },
  requires: { modules: ["mfg-orders"] },
  periodAware: true,
  emptyText: "7일 안 납기가 없어요",
});
