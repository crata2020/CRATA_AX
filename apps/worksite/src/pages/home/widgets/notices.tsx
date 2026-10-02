// 홈 위젯 notices · 공지 · 템플릿 list · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.notices(src/data/seed/home.ts) — 안 읽은 필독 수 + 고정·최신 3건
// 카드 틀(제목·알약·예시 배지·더보기)은 WidgetSlot이 그리고, 여기서는 카드 안 내용만 그립니다. 비면 emptyText.
import { listWidget } from "../lib/widgetKit";

export default listWidget({
  id: "notices",
  title: "공지",
  size: "S",
  link: { label: "더보기", to: "/company/notices" },
  requires: { modules: ["notices"] },
  emptyText: "새 공지가 없어요",
});
