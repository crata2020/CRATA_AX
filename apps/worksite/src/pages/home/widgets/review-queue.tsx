// 홈 위젯 review-queue · 검토 대기 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.review-queue(src/data/seed/home.ts) — 검토 대기 제출(내가 검토자, owner·admin은 전체), 오래 기다린 순
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "review-queue",
  title: "검토 대기",
  size: "M",
  link: { label: "더보기", to: "/work/review" },
  requires: { modules: ["tasks"] },
  emptyText: "검토할 제출이 없어요",
});
