// 홈 위젯 returned-submissions · 수정 요청 받은 제출 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.returned-submissions(src/data/seed/home.ts) — 내가 낸 제출 중 수정 요청을 받은 것(업무가 아직 수정 요청 상태)
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "returned-submissions",
  title: "수정 요청 받은 제출",
  size: "M",
  link: { label: "더보기", to: "/work?status=changes_requested" },
  requires: { modules: ["tasks"] },
  emptyText: "수정 요청 받은 제출이 없어요",
});
