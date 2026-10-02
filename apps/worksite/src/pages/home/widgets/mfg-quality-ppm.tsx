// 홈 위젯 mfg-quality-ppm · 품질 지표 · 템플릿 figure+chart · 크기 L (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-quality-ppm — K06 고객 PPM 이번 달(목표 "Single PPM 목표 10 미만") + 3개월 막대(목표 수평선) + 이번 달 클레임·미결 시정조치 수.
import { SimpleBarChart, StatTile, type WidgetDef } from "@/components";
import { formatNumber } from "@/lib/format";
import { useWidgetData, WidgetState } from "../lib/widgetKit";
import type { QualityPpm } from "../lib/types";

const widget: WidgetDef = {
  id: "mfg-quality-ppm",
  title: "품질 지표",
  size: "L",
  link: { label: "더보기", to: "/ops/quality" },
  requires: { modules: ["mfg-quality"] },
  emptyText: "품질 기록이 아직 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<QualityPpm>("mfg-quality-ppm", ctx);
    return (
      <WidgetState
        state={state}
        render={(d) => (
          <div className="wh-split">
            <div>
              {d.stat && (
                <StatTile label={d.stat.label} value={d.stat.value} unit={d.stat.unit} caption={d.stat.caption ?? undefined} delta={d.stat.delta ?? undefined} />
              )}
              <div className="wh-mini">
                <StatTile label="이번 달 클레임" value={d.claimsThisMonth} unit="건" />
                <StatTile label="미결 시정조치" value={d.openActions} unit="건" />
              </div>
            </div>
            {d.bars.length > 0 && (
              <div>
                <h3 className="wh-sub">고객 PPM, 최근 {d.bars.length}개월</h3>
                <SimpleBarChart
                  data={d.bars}
                  unit="PPM"
                  highlightKey={d.highlightKey ?? undefined}
                  target={{ value: d.target, label: `Single PPM 목표 ${formatNumber(d.target)}` }}
                  ariaLabel={`고객 PPM 월별: ${d.bars.map((b) => `${b.label} ${formatNumber(b.value)}`).join(", ")}. 목표 ${formatNumber(d.target)} 미만`}
                  tableCaption="월별 고객 PPM"
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
