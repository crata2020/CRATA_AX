// 홈 위젯 ax-effect · AX 운영 효과 · 템플릿 figure+chart · 크기 L (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.ax-effect — AX_REPEAT_RATE·AX_FIRST_PASS·AX_REVIEW_MIN·AX_ACTIVE_AI StatTile 4개 + 재발률 8주 막대(이번 주만 강조).
import { SimpleBarChart, type WidgetDef } from "@/components";
import { formatNumber } from "@/lib/format";
import { useWidgetData, WFigureBody, WidgetState } from "../lib/widgetKit";
import type { AxEffect } from "../lib/types";

const widget: WidgetDef = {
  id: "ax-effect",
  title: "AX 운영 효과",
  size: "L",
  link: { label: "더보기", to: "/docs/rules?tab=effect" },
  requires: { modules: ["reports", "correction-rules"] },
  emptyText: "수정 기록이 쌓이면 여기에 보여요",
  Body: ({ ctx }) => {
    const state = useWidgetData<AxEffect>("ax-effect", ctx);
    return (
      <WidgetState
        state={state}
        isEmpty={(d) => d.stats.length === 0}
        render={(d) => {
          const last = d.bars[d.bars.length - 1];
          const first = d.bars[0];
          return (
            <>
              <WFigureBody data={{ stats: d.stats }} />
              {d.bars.length > 1 && (
                <div style={{ marginTop: 24 }}>
                  <h3 className="wh-sub">같은 수정 재발률, 최근 {d.bars.length}주</h3>
                  <SimpleBarChart
                    data={d.bars}
                    unit="%"
                    highlightKey={d.highlightKey ?? undefined}
                    ariaLabel={`같은 수정 재발률 ${d.bars.length}주 추이. ${first ? `${first.label} 주 ${formatNumber(first.value)}%` : ""}에서 ${last ? `${last.label} 주 ${formatNumber(last.value)}%` : ""}`}
                    tableCaption="주 시작일(월요일)별 같은 수정 재발률"
                  />
                  {first && last && (
                    <p className="wh-sentence">
                      {d.bars.length}주 사이 재발률이 <strong>{formatNumber(first.value)}%</strong>에서 <strong>{formatNumber(last.value)}%</strong>로 {last.value <= first.value ? "줄었어요" : "늘었어요"}. 작성 규칙이 반영될수록 같은 수정을 덜 하게 돼요.
                    </p>
                  )}
                </div>
              )}
            </>
          );
        }}
      />
    );
  },
};

export default widget;
