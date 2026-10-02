// 홈 위젯 greeting · 인사·오늘 · 템플릿 머리+히어로 · 크기 L (빌드 스펙 3.1.1절). 소유: home 그룹.
// H-01이 인사말(PageHeader greeting)과 '오늘 할 일' 히어로를 직접 그립니다(히어로가 늘 정확히 1장이 되게).
// 이 정의는 다른 곳에서 WidgetSlot으로 부를 때를 위한 것이고, 같은 히어로 내용(TodayHeroBody)을 씁니다.
import type { WidgetDef } from "@/components";
import { TodayHeroBody } from "../lib/TodayHero";
import { useWidgetData, WidgetState } from "../lib/widgetKit";
import type { HomeToday } from "../lib/types";

const widget: WidgetDef = {
  id: "greeting",
  title: "오늘 할 일",
  size: "L",
  emptyText: "오늘 처리할 일이 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<HomeToday>("greeting", ctx);
    return <WidgetState state={state} render={(d) => <TodayHeroBody data={d} />} />;
  },
};

export default widget;
