// 홈 위젯 mfg-pm-due · 보전 일정 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-pm-due(src/data/seed/home.ts) — 이번 주 끝까지의 예방보전(지난 것 포함). 개발 담당은 금형·지그 항목만.
// 설비 번호 + 작업 이름이 길어서 S(4열)에서는 잘려요 → M.
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-pm-due",
  title: "보전 일정",
  size: "M",
  link: { label: "더보기", to: "/ops/equipment?tab=pm" },
  requires: { modules: ["mfg-equipment"] },
  emptyText: "이번 주 보전 일정이 없어요",
});
