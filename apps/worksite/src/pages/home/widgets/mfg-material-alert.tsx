// 홈 위젯 mfg-material-alert · 자재 부족 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-material-alert(src/data/seed/home.ts) — 재고일수가 안전재고 일수보다 적은 자재 + 입고 예정
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-material-alert",
  title: "자재 부족",
  size: "M",
  link: { label: "더보기", to: "/ops/materials" },
  requires: { modules: ["mfg-materials"] },
  emptyText: "모자란 자재가 없어요",
});
