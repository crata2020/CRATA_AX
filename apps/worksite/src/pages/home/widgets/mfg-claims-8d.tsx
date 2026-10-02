// 홈 위젯 mfg-claims-8d · 클레임·8D · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-claims-8d(src/data/seed/home.ts) — 종결 전 클레임: 현재 D단계·8D 기한
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-claims-8d",
  title: "클레임·8D",
  size: "M",
  link: { label: "더보기", to: "/ops/quality/claims" },
  requires: { modules: ["mfg-quality"] },
  emptyText: "진행 중인 클레임이 없어요",
});
