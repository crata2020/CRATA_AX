// 홈 위젯 approvals-pending · 결재 대기 · 템플릿 figure · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.approvals-pending(src/data/seed/home.ts) — 내가 결재할 문서 수 · 내가 올린 진행 중 문서 수(연동 미리보기)
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { figureWidget } from "../lib/widgetKit";

export default figureWidget({
  id: "approvals-pending",
  title: "결재 대기",
  size: "S",
  link: { label: "더보기", to: "/company/approvals" },
  requires: { modules: ["approvals"] },
  integrationPreview: true,
  emptyText: "결재할 문서가 없어요",
});
