// 홈 위젯 my-tasks · 내 업무 · 템플릿 list · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.my-tasks(src/data/seed/home.ts) — 담당=나, 할 일·진행 중·수정 요청, 마감 순 5건
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "my-tasks",
  title: "내 업무",
  size: "M",
  link: { label: "더보기", to: "/work" },
  requires: { modules: ["tasks"] },
  emptyText: "맡은 업무가 없어요",
});
