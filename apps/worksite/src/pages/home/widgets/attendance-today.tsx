// 홈 위젯 attendance-today · 오늘 근무·휴가 · 자리만(빌드 스펙 3.1.1절). 소유: home 그룹.
// 근무·휴가(attendance-leave) 모듈이 두 데모 테넌트에서 꺼져 있어 homeLayout이 이 위젯을 빼고, 그리지 않습니다.
// 2단계에서 근태 연동을 켜면 '오늘 휴가·외근 인원'을 보여 줄 자리입니다.
import type { WidgetDef } from "@/components";

const widget: WidgetDef = {
  id: "attendance-today",
  title: "오늘 근무·휴가",
  size: "S",
  requires: { modules: ["attendance-leave"] },
  integrationPreview: true,
  demo: false,
  emptyText: "근무·휴가 연동이 꺼져 있어요",
  Body: () => null,
};

export default widget;
