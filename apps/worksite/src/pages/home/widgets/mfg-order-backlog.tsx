// 홈 위젯 mfg-order-backlog · 수주 잔량 · 템플릿 chart · 크기 M (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-order-backlog — 미납 수량 상위 5 품목(목록, 품목마다 단위가 달라 합치지 않음) + 납기 구간별 미납 줄 수(StackedShareBar).
import { StackedShareBar, type WidgetDef } from "@/components";
import { ListHead, useWidgetData, WidgetState, WRows } from "../lib/widgetKit";
import type { OrderBacklog } from "../lib/types";

const widget: WidgetDef = {
  id: "mfg-order-backlog",
  title: "수주 잔량",
  size: "M",
  link: { label: "더보기", to: "/ops/orders" },
  requires: { modules: ["mfg-orders"] },
  emptyText: "남은 수주가 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<OrderBacklog>("mfg-order-backlog", ctx);
    return (
      <WidgetState
        state={state}
        isEmpty={(d) => d.openLines === 0}
        render={(d) => (
          <>
            <ListHead count={d.openLines} unit="건" label="미납 수주 줄" />
            <StackedShareBar segments={d.segments} unit="건" ariaLabel="납기 구간별 미납 수주 줄" />
            <h3 className="wh-sub" style={{ marginTop: 16 }}>미납 수량이 많은 품목</h3>
            <WRows rows={d.top} ariaLabel="미납 수량이 많은 품목" />
          </>
        )}
      />
    );
  },
};

export default widget;
