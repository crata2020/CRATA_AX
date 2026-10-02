// 홈 위젯 mail-followups · 메일 후속 제안 · 템플릿 figure · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mail-followups(src/data/seed/home.ts) — 내 메일 중 프로젝트로 분류된 수 · 처리할 후속 제안 수(연동 미리보기)
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { figureWidget } from "../lib/widgetKit";

export default figureWidget({
  id: "mail-followups",
  title: "메일 후속 제안",
  size: "S",
  link: { label: "더보기", to: "/work/mail" },
  requires: { modules: ["mail-connector"] },
  integrationPreview: true,
  emptyText: "분류된 메일이 없어요",
});
