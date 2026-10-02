// 홈 위젯 admin-health · 운영 점검 · 템플릿 figure · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.admin-health(src/data/seed/home.ts) — 수락 대기 초대 · 최근 7일 역할 변경 · 최근 7일 설정 변경
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { figureWidget } from "../lib/widgetKit";

export default figureWidget({
  id: "admin-health",
  title: "운영 점검",
  size: "S",
  link: { label: "더보기", to: "/admin/members" },
  requires: { modules: ["admin-members"] },
  emptyText: "점검할 것이 없어요",
});
