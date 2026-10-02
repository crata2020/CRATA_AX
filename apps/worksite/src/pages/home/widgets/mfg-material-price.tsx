// 홈 위젯 mfg-material-price · 원재료 가격 · 템플릿 figure · 크기 S (빌드 스펙 3.1.1절). 소유: home 그룹.
// 데이터: sel:widget.mfg-material-price — price_indexes 재질별 6개월 추이(LineSpark) + 지난달 대비 변동률.
// requires.bundle=view_prices: 묶음이 없으면 homeLayout이 위젯을 빼고, 공급자도 0행을 돌려줍니다.
import { DeltaText, LineSpark, type WidgetDef } from "@/components";
import { formatMonth, formatNumber } from "@/lib/format";
import { useWidgetData, WidgetState } from "../lib/widgetKit";
import type { MaterialPrice } from "../lib/types";

const widget: WidgetDef = {
  id: "mfg-material-price",
  title: "원재료 가격",
  size: "S",
  link: { label: "더보기", to: "/ops/materials?tab=prices" },
  requires: { modules: ["mfg-materials"], bundle: "view_prices" },
  caption: "가격 지수는 예시 값이에요.",
  emptyText: "가격 기록이 없어요",
  Body: ({ ctx }) => {
    const state = useWidgetData<MaterialPrice>("mfg-material-price", ctx);
    return (
      <WidgetState
        state={state}
        isEmpty={(d) => d.rows.length === 0}
        render={(d) => (
          <div>
            {d.rows.map((r) => (
              <div key={r.material} className="wh-pricerow">
                <span className="wh-pricerow__name">{r.material}</span>
                <span className="wh-pricerow__val">{formatNumber(r.latest)}<span className="ws-t-caption"> {r.unit}</span></span>
                <span className="wh-pricerow__meta">
                  {r.changePct != null ? <DeltaText value={r.changePct} unit="%" period="지난달보다" goodWhen="down" /> : <span className="ws-t-caption">{formatMonth(r.period)} 기준</span>}
                  <LineSpark values={r.values} ariaLabel={`${r.material} 가격 ${r.values.length}개월 추이, 최저 ${formatNumber(Math.min(...r.values))}, 최고 ${formatNumber(Math.max(...r.values))}, 마지막 ${formatNumber(r.latest)}`} />
                </span>
              </div>
            ))}
          </div>
        )}
      />
    );
  },
};

export default widget;
