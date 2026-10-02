// 홈 위젯 mfg-monthly-summary · 이달 요약 · 템플릿 chart · 크기 L (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-monthly-summary — K_PROD_QTY 3개월 막대(이번 달 강조) + K01 생산계획 달성률 + K06 고객 PPM 문장.
import { SimpleBarChart, StatTile, type WidgetDef } from "@/components";
import { formatNumber } from "@/lib/format";
import { useWidgetData, WidgetState } from "../lib/widgetKit";
import type { MonthlySummary } from "../lib/types";

const widget: WidgetDef = {
  id: "mfg-monthly-summary",
  title: "이달 요약",
  size: "L",
  link: { label: "더보기", to: "/ops/production" },
  requires: { modules: ["mfg-production"] },
  emptyText: "이달 기록이 아직 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<MonthlySummary>("mfg-monthly-summary", ctx);
    return (
      <WidgetState
        state={state}
        render={(d) => (
          <div className="wh-split">
            <div>
              {d.achievement && (
                <StatTile label={d.achievement.label} value={d.achievement.value} unit={d.achievement.unit} delta={d.achievement.delta ?? undefined} />
              )}
              {d.ppmSentence && <p className="wh-sentence">{d.ppmSentence}</p>}
            </div>
            {d.bars.length > 0 && (
              <div>
                <h3 className="wh-sub">가공 완제품 생산 수량, 최근 {d.bars.length}개월</h3>
                <SimpleBarChart
                  data={d.bars}
                  unit={d.unit}
                  highlightKey={d.highlightKey ?? undefined}
                  ariaLabel={`가공 완제품 생산 수량 월별: ${d.bars.map((b) => `${b.label} ${formatNumber(b.value)}${d.unit}`).join(", ")}`}
                  tableCaption="월별 가공 완제품 생산 수량(개)"
                />
              </div>
            )}
          </div>
        )}
      />
    );
  },
};

export default widget;
