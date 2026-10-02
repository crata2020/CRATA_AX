// 홈 위젯 mfg-dev-projects · 개발 진행 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-dev-projects(src/data/seed/home.ts) — 신규 품목 개발 사업의 프로젝트
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "mfg-dev-projects",
  title: "개발 진행",
  size: "M",
  link: { label: "더보기", to: "/projects?line=bl-tr-dev" },
  requires: { modules: ["business-structure"] },
  emptyText: "진행 중인 개발 과제가 없어요",
});
